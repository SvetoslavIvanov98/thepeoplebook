const router = require('express').Router();
const prisma = require('../config/prisma');
const { getIO } = require('../services/socket.service');

// GET /api/stats — public, lightweight
router.get('/', async (_req, res, next) => {
  try {
    const [usersResult, postsResult] = await Promise.all([
      prisma.users.count(),
      prisma.posts.count(),
    ]);

    const io = getIO();
    const onlineCount = io ? io.engine.clientsCount : 0;

    res.json({
      registered_users: usersResult,
      total_posts: postsResult,
      online_now: onlineCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
