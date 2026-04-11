const db = require('../config/db');

const getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(
      `SELECT n.*, u.username AS actor_username, u.full_name AS actor_name, u.avatar_url AS actor_avatar,
              g.name AS group_name, g.privacy AS group_privacy
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN groups g ON g.id = n.group_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [req.user.id]);
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
    await db.query(
      `INSERT INTO push_tokens (user_id, token)
       VALUES ($1, $2)
       ON CONFLICT (user_id, token) DO NOTHING`,
      [req.user.id, token]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const removePushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    await db.query(
      'DELETE FROM push_tokens WHERE user_id = $1 AND token = $2',
      [req.user.id, token]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, registerPushToken, removePushToken };
