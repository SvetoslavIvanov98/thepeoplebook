const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

describe('App endpoints', () => {
  afterAll(async () => {
    await db.pool.end();
  });

  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
