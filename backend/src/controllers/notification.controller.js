const prisma = require('../config/prisma');

const getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await prisma.$queryRawUnsafe(
      `SELECT n.*, u.username AS actor_username, u.full_name AS actor_name, u.avatar_url AS actor_avatar,
              g.name AS group_name, g.privacy AS group_privacy
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN groups g ON g.id = n.group_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      BigInt(req.user.id),
      limit,
      offset
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Mark all notifications as read
const markRead = async (req, res, next) => {
  try {
    await prisma.notifications.updateMany({
      where: { user_id: BigInt(req.user.id), read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read — mark a single notification as read
const markOneRead = async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const existing = await prisma.notifications.findFirst({
      where: { id, user_id: userId },
    });

    if (!existing) return res.status(404).json({ error: 'Notification not found' });

    await prisma.notifications.update({
      where: { id },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const registerPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }

    const userId = BigInt(req.user.id);

    const existing = await prisma.push_tokens.findFirst({
      where: { user_id: userId, token },
    });

    if (!existing) {
      await prisma.push_tokens.create({
        data: { user_id: userId, token },
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const removePushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    await prisma.push_tokens.deleteMany({
      where: { user_id: BigInt(req.user.id), token },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markOneRead, registerPushToken, removePushToken };
