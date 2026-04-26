require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = 4000;
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';

// Always use localhost for tests, ensuring Prisma can connect
process.env.DATABASE_URL = 'postgresql://social:Svetli5254@localhost:5432/social_db';

const prisma = require('../config/prisma');

afterAll(async () => {
  await prisma.$disconnect();
  if (prisma.pool) {
    await prisma.pool.end();
  }
});
