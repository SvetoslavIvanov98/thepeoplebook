const request = require('supertest');
const app = require('../../app');
const db = require('../../config/db');

describe('Auth Integration Tests', () => {
  // Clean up database before/after tests if using a real test DB
  // For now, we assume a clean state or handle collisions

  const testUser = {
    username: `user_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    full_name: 'Test User',
    date_of_birth: '1990-01-01',
  };

  afterAll(async () => {
    // Only cleanup if we are in a test environment that supports it
    if (process.env.DATABASE_URL) {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['test_%@example.com']);
    }
    await db.pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toEqual(testUser.username);
      expect(res.body).toHaveProperty('token');
      expect(res.get('Set-Cookie')).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'not-an-email' });

      expect(res.statusCode).toEqual(422); // express-validator error
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toEqual(testUser.email);
    });

    it('should fail with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'wrong-password',
      });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });
  });
});
