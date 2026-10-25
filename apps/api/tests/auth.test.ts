import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/auth/user.model.js';

const app = createApp();

describe('Authentication API & Middleware', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);

    await User.create([
      {
        name: 'Active Coordinator',
        email: 'active.coord@test.com',
        passwordHash,
        role: 'COORDINATOR',
        isActive: true,
      },
      {
        name: 'Deactivated User',
        email: 'inactive@test.com',
        passwordHash,
        role: 'RESPONDER',
        isActive: false,
      },
    ]);
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 and JWT token on valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active.coord@test.com',
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('active.coord@test.com');
      expect(res.body.data.user.role).toBe('COORDINATOR');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('returns 401 when password does not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active.coord@test.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for nonexistent user email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user account is deactivated', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 422 for malformed email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 200 with current user profile when authenticated', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active.coord@test.com',
          password: 'CorrectPassword123!',
        });

      const token = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('active.coord@test.com');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when Authorization header has invalid format', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidBearerToken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
