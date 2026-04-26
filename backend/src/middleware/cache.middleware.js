const redis = require('../config/redis');

/**
 * Cache middleware for GET requests
 * @param {number} ttlSeconds - Time to live in seconds
 */
const cache = (ttlSeconds = 60) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Include user ID in cache key if authenticated (for personalized responses like "is_following")
    const userId = req.user ? req.user.id : 'guest';
    const key = `cache:${userId}:${req.originalUrl}`;

    try {
      if (!redis.isReady) {
        return next();
      }

      const cachedResponse = await redis.get(key);
      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

      // Override res.json to cache the response before sending it
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache the response asynchronously
        redis.setEx(key, ttlSeconds, JSON.stringify(body)).catch(console.error);
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Redis cache error:', err);
      next();
    }
  };
};

/**
 * Invalidate cached keys matching a pattern using SCAN (non-blocking) instead of KEYS.
 * KEYS blocks Redis on large databases; SCAN iterates incrementally.
 */
const invalidateCache = async (pattern) => {
  try {
    if (!redis.isReady) return;
    const keysToDelete = [];
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keysToDelete.push(key);
    }
    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete);
    }
  } catch (err) {
    console.error('Redis invalidate error:', err);
  }
};

module.exports = { cache, invalidateCache };
