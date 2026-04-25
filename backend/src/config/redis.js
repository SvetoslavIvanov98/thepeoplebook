const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => console.error('Redis Client Error:', err));

// Connect automatically
if (process.env.NODE_ENV !== 'test') {
  client.connect().catch(console.error);
}

module.exports = client;
