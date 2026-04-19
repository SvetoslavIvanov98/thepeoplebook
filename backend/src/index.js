require('dotenv').config();
const app = require('./app');
const http = require('http');
const { initSocket } = require('./services/socket.service');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 4000;

const applyMigrations = async () => {
  // Idempotent migrations safe to run on every start
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
  await pool.query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy VARCHAR(10) NOT NULL DEFAULT 'public'`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_join_requests (
      id          BIGSERIAL PRIMARY KEY,
      group_id    BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      VARCHAR(10) NOT NULL DEFAULT 'pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (group_id, user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_join_requests ON group_join_requests (group_id, status)`);
  await pool.query(`
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
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`
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
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_reports_post ON content_reports (post_id) WHERE post_id IS NOT NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_reports_comment ON content_reports (comment_id) WHERE comment_id IS NOT NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_reports_user ON content_reports (reported_user_id) WHERE reported_user_id IS NOT NULL`);
  await pool.query(`
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
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_moderation_decisions_user ON moderation_decisions (target_user_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_moderation_decisions_report ON moderation_decisions (report_id) WHERE report_id IS NOT NULL`);
  // Patch existing content_reports tables that predate the reported_user_id column
  await pool.query(`ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS reported_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE`);

  // Promote the configured admin user if set
  const adminUsername = process.env.ADMIN_USERNAME;
  if (adminUsername) {
    const result = await pool.query(
      `UPDATE users SET role = 'admin' WHERE username = $1 AND role != 'admin' RETURNING username`,
      [adminUsername]
    );
    if (result.rows[0]) console.log(`Promoted '${adminUsername}' to admin`);
  }

  console.log('Migrations applied');
};

const start = async () => {
  await applyMigrations();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
