require('dotenv').config();
const app = require('./app');
const http = require('http');
const { initSocket } = require('./services/socket.service');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 4000;

const applyMigrations = async () => {
  // Idempotent migrations safe to run on every start
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT`);
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
