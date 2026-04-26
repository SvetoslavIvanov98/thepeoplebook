const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');

describe('App endpoints', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
