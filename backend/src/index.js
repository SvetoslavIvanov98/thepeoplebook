require('dotenv').config();
require('./instrument'); // Initialize Sentry before anything else
const app = require('./app');
const http = require('http');
const { initSocket } = require('./services/socket.service');
const prisma = require('./config/prisma');
const redis = require('./config/redis');
const logger = require('./utils/logger');

// Initialize background queues
require('./queues/email.queue');

const PORT = process.env.PORT || 4000;

const applyMigrations = async () => {
  // Idempotent migrations safe to run on every start
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy VARCHAR(10) NOT NULL DEFAULT 'public'`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS group_join_requests (
      id          BIGSERIAL PRIMARY KEY,
      group_id    BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      VARCHAR(10) NOT NULL DEFAULT 'pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (group_id, user_id)
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_group_join_requests ON group_join_requests (group_id, status)`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS group_invites (
      id          BIGSERIAL PRIMARY KEY,
      group_id    BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      inviter_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invitee_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      VARCHAR(10) NOT NULL DEFAULT 'pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (group_id, invitee_id)
    )
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id               BIGSERIAL PRIMARY KEY,
      reporter_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id          BIGINT REFERENCES posts(id) ON DELETE CASCADE,
      comment_id       BIGINT REFERENCES comments(id) ON DELETE CASCADE,
      reported_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      reason           VARCHAR(50) NOT NULL,
      description      TEXT,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending',
      admin_note       TEXT,
      decided_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
      decided_at       TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT report_has_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL OR reported_user_id IS NOT NULL)
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_content_reports_post ON content_reports (post_id) WHERE post_id IS NOT NULL`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_content_reports_comment ON content_reports (comment_id) WHERE comment_id IS NOT NULL`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_content_reports_user ON content_reports (reported_user_id) WHERE reported_user_id IS NOT NULL`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS moderation_decisions (
      id             BIGSERIAL PRIMARY KEY,
      report_id      BIGINT REFERENCES content_reports(id) ON DELETE SET NULL,
      target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action_type    VARCHAR(30) NOT NULL,
      reason         TEXT NOT NULL,
      legal_basis    TEXT,
      decided_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
      appealed       BOOLEAN NOT NULL DEFAULT FALSE,
      appeal_outcome VARCHAR(20),
      appeal_note    TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_moderation_decisions_user ON moderation_decisions (target_user_id, created_at DESC)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_moderation_decisions_report ON moderation_decisions (report_id) WHERE report_id IS NOT NULL`
  );
  // Patch existing content_reports tables that predate the reported_user_id column
  await prisma.$executeRawUnsafe(
    `ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS reported_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE`
  );

  // Add edited_at columns for post/comment editing support
  await prisma.$executeRawUnsafe(
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`
  );

  // Add web push subscriptions
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Promote the configured admin user if set
  const adminUsername = process.env.ADMIN_USERNAME;
  if (adminUsername) {
    const result = await prisma.$queryRawUnsafe(
      `UPDATE users SET role = 'admin' WHERE username = $1 AND role != 'admin' RETURNING username`,
      adminUsername
    );
    if (result.length > 0) logger.info(`Promoted '${adminUsername}' to admin`);
  }

  logger.info('Migrations applied');
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
