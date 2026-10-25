import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/auth/user.model.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const app = createApp();

describe('Role-Based Access Control (RBAC)', () => {
  let adminToken: string;
  let coordinatorToken: string;
  let responderToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const [admin, coordinator, responder] = await Promise.all([
      User.create({
        name: 'Admin User',
        email: 'admin.rbac@test.com',
        passwordHash,
        role: 'ADMIN',
      }),
      User.create({
        name: 'Coordinator User',
        email: 'coord.rbac@test.com',
        passwordHash,
        role: 'COORDINATOR',
      }),
      User.create({
        name: 'Responder User',
        email: 'resp.rbac@test.com',
        passwordHash,
        role: 'RESPONDER',
      }),
    ]);

    adminToken = AuthService.generateToken(admin._id.toString(), 'ADMIN');
    coordinatorToken = AuthService.generateToken(coordinator._id.toString(), 'COORDINATOR');
    responderToken = AuthService.generateToken(responder._id.toString(), 'RESPONDER');
  });

  const sampleIncident = {
    title: 'Flash Flood in Lowland Basin',
    description: 'Rapidly rising water levels threatening residential buildings.',
    type: 'FLOOD',
    severity: 'HIGH',
    affectedPeople: 120,
    address: 'Basin Road 12',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
    },
    requiredSkills: ['WATER_RESCUE', 'MEDICAL'],
  };

  it('allows ADMIN to create incidents', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(sampleIncident);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(sampleIncident.title);
  });

  it('allows COORDINATOR to create incidents', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(sampleIncident);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('forbids RESPONDER from creating incidents (403)', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${responderToken}`)
      .send(sampleIncident);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows RESPONDER to read incident listings (200)', async () => {
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${responderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('forbids RESPONDER from viewing audit logs (403)', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${responderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows COORDINATOR and ADMIN to view audit logs (200)', async () => {
    const coordRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(coordRes.status).toBe(200);

    const adminRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
  });
});
