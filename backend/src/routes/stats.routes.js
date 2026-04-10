const router = require('express').Router();
const db = require('../config/db');
const { getIO } = require('../services/socket.service');

// GET /api/stats — public, lightweight
router.get('/', async (_req, res, next) => {
  try {
    const [usersResult, postsResult] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM posts'),
    ]);

    const io = getIO();
    const onlineCount = io ? io.engine.clientsCount : 0;

    res.json({
      registered_users: parseInt(usersResult.rows[0].count, 10),
      total_posts: parseInt(postsResult.rows[0].count, 10),
      online_now: onlineCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
