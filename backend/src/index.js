require('dotenv').config();
BigInt.prototype.toJSON = function() { return this.toString(); };
require('./instrument'); // Initialize Sentry before anything else
const app = require('./app');
const http = require('http');
const { initSocket } = require('./services/socket.service');
const prisma = require('./config/prisma');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const syncDatabase = require('./config/migrate');

// Initialize background queues
require('./queues/email.queue');

const PORT = process.env.PORT || 4000;

const applyMigrations = async () => {
  // Sync database with schema.sql
  await syncDatabase();

  // Promote the configured admin user if set
  const adminUsername = process.env.ADMIN_USERNAME;
  if (adminUsername) {
    const result = await prisma.$queryRawUnsafe(
      `UPDATE users SET role = 'admin' WHERE username = $1 AND role != 'admin' RETURNING username`,
      adminUsername
    );
    if (result.length > 0) logger.info(`Promoted '${adminUsername}' to admin`);
  }

  logger.info('Migrations and patches applied');
};

let server;

const start = async () => {
  await applyMigrations();
  server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    // Close database pool
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (err) {
    logger.error('Error disconnecting database:', err);
  }

  try {
    // Close Redis connection
    if (redis.isReady) {
      await redis.quit();
      logger.info('Redis connection closed');
    }
  } catch (err) {
    logger.error('Error closing Redis:', err);
  }

  process.exit(0);
};

// Force exit after 10s if graceful shutdown hangs
const forceShutdown = (signal) => {
  shutdown(signal);
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => forceShutdown('SIGTERM'));
process.on('SIGINT', () => forceShutdown('SIGINT'));

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
