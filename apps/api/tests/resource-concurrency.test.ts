import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/auth/user.model.js';
import { Incident } from '../src/modules/incidents/incident.model.js';
import { Resource } from '../src/modules/resources/resource.model.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const app = createApp();

describe('Resource Allocation & Atomic Concurrency Safety', () => {
  let coordinatorToken: string;
  let coordinatorId: string;
  let incidentId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const coord = await User.create({
      name: 'Coord User',
      email: 'coord.res@test.com',
      passwordHash,
      role: 'COORDINATOR',
    });
    coordinatorId = coord._id.toString();
    coordinatorToken = AuthService.generateToken(coordinatorId, 'COORDINATOR');

    const incident = await Incident.create({
      title: 'Active Flood Response Sector A',
      description: 'Mass evacuation and resource distribution site.',
      type: 'FLOOD',
      severity: 'HIGH',
      status: 'ACTIVE',
      affectedPeople: 200,
      address: 'Riverside Camp',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
      requiredSkills: ['WATER_RESCUE'],
      priorityScore: 75,
      reportedBy: coordinatorId,
    });
    incidentId = incident._id.toString();
  });

  it('allocates resources when availableQuantity is sufficient', async () => {
    const resource = await Resource.create({
      name: 'Emergency Medical Field Kits',
      type: 'MEDICAL',
      totalQuantity: 50,
      availableQuantity: 50,
      unit: 'kits',
      status: 'AVAILABLE',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .post(`/api/v1/resources/${resource._id}/allocate`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        incidentId,
        quantity: 15,
        notes: 'Initial triage kit batch',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quantity).toBe(15);
    expect(res.body.data.status).toBe('ALLOCATED');

    const refreshed = await Resource.findById(resource._id);
    expect(refreshed?.availableQuantity).toBe(35);
    expect(refreshed?.status).toBe('AVAILABLE');
  });

  it('rejects allocation when requested quantity exceeds available quantity', async () => {
    const resource = await Resource.create({
      name: 'Heavy Rescue Boats',
      type: 'VEHICLE',
      totalQuantity: 5,
      availableQuantity: 5,
      unit: 'boats',
      status: 'AVAILABLE',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .post(`/api/v1/resources/${resource._id}/allocate`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        incidentId,
        quantity: 10, // Requesting more than available
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESOURCE_INSUFFICIENT');

    // Verify quantity was not decremented
    const refreshed = await Resource.findById(resource._id);
    expect(refreshed?.availableQuantity).toBe(5);
  });

  it('CRITICAL CONCURRENCY: prevents race condition / oversubscription under concurrent requests', async () => {
    // Initial: 10 units available
    const resource = await Resource.create({
      name: 'Satellite Communication Terminals',
      type: 'EQUIPMENT',
      totalQuantity: 10,
      availableQuantity: 10,
      unit: 'terminals',
      status: 'AVAILABLE',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    // Fire 10 concurrent requests, each requesting 2 units (total attempted = 20 units)
    // Only 5 requests can succeed before supply is exhausted!
    const concurrentRequests = Array.from({ length: 10 }).map((_, index) =>
      request(app)
        .post(`/api/v1/resources/${resource._id}/allocate`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          incidentId,
          quantity: 2,
          notes: `Concurrent batch request #${index + 1}`,
        })
    );

    const responses = await Promise.all(concurrentRequests);

    const successful = responses.filter((r) => r.status === 201);
    const failed = responses.filter((r) => r.status === 409);

    // Exactly 5 should succeed (5 * 2 = 10)
    expect(successful.length).toBe(5);
    // Exactly 5 should fail with RESOURCE_INSUFFICIENT
    expect(failed.length).toBe(5);
    failed.forEach((f) => {
      expect(f.body.error.code).toBe('RESOURCE_INSUFFICIENT');
    });

    // Available quantity must be exactly 0, never negative
    const refreshed = await Resource.findById(resource._id);
    expect(refreshed?.availableQuantity).toBe(0);
    expect(refreshed?.status).toBe('EXHAUSTED');
  });

  it('successfully releases an allocation and restores availableQuantity', async () => {
    const resource = await Resource.create({
      name: 'Portable Generators',
      type: 'EQUIPMENT',
      totalQuantity: 20,
      availableQuantity: 20,
      unit: 'generators',
      status: 'AVAILABLE',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    // Allocate 8
    const allocRes = await request(app)
      .post(`/api/v1/resources/${resource._id}/allocate`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ incidentId, quantity: 8 });

    const allocationId = allocRes.body.data._id;
    let refreshed = await Resource.findById(resource._id);
    expect(refreshed?.availableQuantity).toBe(12);

    // Release the allocation
    const releaseRes = await request(app)
      .post(`/api/v1/resources/allocations/${allocationId}/release`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.data.status).toBe('RELEASED');

    refreshed = await Resource.findById(resource._id);
    expect(refreshed?.availableQuantity).toBe(20);
  });
});
