require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const run = async () => {
  if (!pool) {
    console.error('Database pool not initialized. Migration aborted.');
    return;
  }

  // Inside Docker the file is mounted at /app/db/schema.sql
  // Locally (from src/config/) it's ../../db/schema.sql which also resolves to <project>/db/schema.sql
  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found at ${schemaPath}`);
    return;
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('Database synchronization complete');
  } catch (err) {
    console.error('Database synchronization failed:', err.message);
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  run().then(() => pool && pool.end());
}

module.exports = run;
