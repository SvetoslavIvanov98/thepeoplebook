require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const run = async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'db', 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
