const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Explicit pool configuration for production reliability
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT) || 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

/**
 * Run a function inside a database transaction.
 * The callback receives a `client` that must be used for all queries in the tx.
 * Automatically rolls back on error and releases the client.
 *
 * Usage:
 *   const result = await withTransaction(async (client) => {
 *     await client.query('INSERT ...');
 *     await client.query('UPDATE ...');
 *     return someValue;
 *   });
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  withTransaction,
};
