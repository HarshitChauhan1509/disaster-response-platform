import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/auth/user.model.js';
import { Responder } from '../src/modules/responders/responder.model.js';
import { Incident } from '../src/modules/incidents/incident.model.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const app = createApp();

describe('Assignment Workflow & State Machine', () => {
  let coordinatorToken: string;
  let coordinatorId: string;
  let responderUserToken: string;
  let responderUserId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const coord = await User.create({
      name: 'Coord User',
      email: 'coord.assign@test.com',
      passwordHash,
      role: 'COORDINATOR',
    });
    coordinatorId = coord._id.toString();
    coordinatorToken = AuthService.generateToken(coordinatorId, 'COORDINATOR');

    const respUser = await User.create({
      name: 'Field Medic',
      email: 'field.medic@test.com',
      passwordHash,
      role: 'RESPONDER',
    });
    responderUserId = respUser._id.toString();
    responderUserToken = AuthService.generateToken(responderUserId, 'RESPONDER');
  });

  it('successfully creates an assignment when responder has matching skill and is available', async () => {
    const responder = await Responder.create({
      userId: responderUserId,
      skills: ['MEDICAL'],
      status: 'AVAILABLE',
      organization: 'Emergency Medical Taskforce',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const incident = await Incident.create({
      title: 'Roadside Multi-Vehicle Collision',
      description: 'Multiple injuries requiring immediate medical triage.',
      type: 'MEDICAL',
      severity: 'HIGH',
      status: 'ACTIVE',
      affectedPeople: 15,
      address: 'Highway KM 14',
      location: { type: 'Point', coordinates: [77.6, 12.98] },
      requiredSkills: ['MEDICAL'],
      priorityScore: 65,
      reportedBy: coordinatorId,
    });

    const res = await request(app)
      .post(`/api/v1/incidents/${incident._id}/assignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        responderId: responder._id.toString(),
        notes: 'Priority dispatch for trauma triage',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');

    // Verify responder status changed to ASSIGNED
    const updatedResponder = await Responder.findById(responder._id);
    expect(updatedResponder?.status).toBe('ASSIGNED');
  });

  it('rejects assignment when responder skills do not match required incident skills', async () => {
    const responder = await Responder.create({
      userId: responderUserId,
      skills: ['DRIVER'], // Only DRIVER skill
      status: 'AVAILABLE',
      organization: 'Logistics Transport Unit',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const incident = await Incident.create({
      title: 'Chemical Factory Blaze',
      description: 'Dangerous fire requiring specialized firefighting.',
      type: 'FIRE',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      affectedPeople: 50,
      address: 'Industrial Sector 5',
      location: { type: 'Point', coordinates: [77.6, 12.98] },
      requiredSkills: ['FIRE'],
      priorityScore: 85,
      reportedBy: coordinatorId,
    });

    const res = await request(app)
      .post(`/api/v1/incidents/${incident._id}/assignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        responderId: responder._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SKILL_MISMATCH');
  });

  it('rejects assignment when responder already has an active assignment', async () => {
    const responder = await Responder.create({
      userId: responderUserId,
      skills: ['MEDICAL'],
      status: 'AVAILABLE',
      organization: 'Emergency Medical Taskforce',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const incident1 = await Incident.create({
      title: 'Incident 1',
      description: 'First active incident',
      type: 'MEDICAL',
      severity: 'MEDIUM',
      status: 'ACTIVE',
      affectedPeople: 5,
      address: 'Location 1',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
      requiredSkills: ['MEDICAL'],
      priorityScore: 50,
      reportedBy: coordinatorId,
    });

    const incident2 = await Incident.create({
      title: 'Incident 2',
      description: 'Second active incident',
      type: 'MEDICAL',
      severity: 'MEDIUM',
      status: 'ACTIVE',
      affectedPeople: 5,
      address: 'Location 2',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
      requiredSkills: ['MEDICAL'],
      priorityScore: 50,
      reportedBy: coordinatorId,
    });

    // First assignment succeeds
    await request(app)
      .post(`/api/v1/incidents/${incident1._id}/assignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ responderId: responder._id.toString() });

    // Second assignment fails with conflict
    const res = await request(app)
      .post(`/api/v1/incidents/${incident2._id}/assignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ responderId: responder._id.toString() });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects assignment when incident is in unassignable status (REPORTED or RESOLVED)', async () => {
    const responder = await Responder.create({
      userId: responderUserId,
      skills: ['MEDICAL'],
      status: 'AVAILABLE',
      organization: 'Emergency Medical Taskforce',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const reportedIncident = await Incident.create({
      title: 'Unverified Incident',
      description: 'Has not yet been verified by coordinator',
      type: 'MEDICAL',
      severity: 'MEDIUM',
      status: 'REPORTED',
      affectedPeople: 2,
      address: 'Location A',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
      requiredSkills: ['MEDICAL'],
      priorityScore: 40,
      reportedBy: coordinatorId,
    });

    const res = await request(app)
      .post(`/api/v1/incidents/${reportedIncident._id}/assignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ responderId: responder._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows responder to transition assignment through lifecycle: ACCEPTED -> IN_PROGRESS -> COMPLETED', async () => {
    const responder = await Responder.create({
      userId: responderUserId,
      skills: ['MEDICAL'],
      status: 'AVAILABLE',
      organization: 'Emergency Medical Taskforce',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const incident = await Incident.create({
      title: 'Active Rescue Site',
      description: 'Active rescue operation in progress',
      type: 'MEDICAL',
      severity: 'HIGH',
      status: 'ACTIVE',
      affectedPeople: 10,
      address: 'Rescue Site 1',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
      requiredSkills: ['MEDICAL'],
      priorityScore: 70,
      reportedBy: coordinatorId,
    });

    const createRes = await request(app)
      .post(`/api/v1/incidents/${incident._id}/assignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ responderId: responder._id.toString() });

    const assignmentId = createRes.body.data._id;

    // 1. Accept
    const acceptRes = await request(app)
      .patch(`/api/v1/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${responderUserToken}`)
      .send({ status: 'ACCEPTED' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('ACCEPTED');

    // 2. In Progress
    const inProgRes = await request(app)
      .patch(`/api/v1/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${responderUserToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(inProgRes.status).toBe(200);
    expect(inProgRes.body.data.status).toBe('IN_PROGRESS');

    // 3. Completed
    const completeRes = await request(app)
      .patch(`/api/v1/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${responderUserToken}`)
      .send({ status: 'COMPLETED' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');

    // Responder status returns to AVAILABLE after completion
    const refreshedResponder = await Responder.findById(responder._id);
    expect(refreshedResponder?.status).toBe('AVAILABLE');
  });
});
