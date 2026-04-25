process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = 4000;
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';

// If running in CI or locally with a test DB, use this
if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
