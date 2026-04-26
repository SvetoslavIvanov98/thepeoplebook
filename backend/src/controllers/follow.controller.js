const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');

const follow = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId == req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existing = await db.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, userId]
    );

    if (existing.rows[0]) {
      await db.query('DELETE FROM follows WHERE id = $1', [existing.rows[0].id]);
      return res.json({ following: false });
    }

    await db.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [
      req.user.id,
      userId,
    ]);

    await emitNotification(userId, { type: 'follow', actor_id: req.user.id });

    res.json({ following: true });
  } catch (err) {
    next(err);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor; // ISO date string for cursor pagination

    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, f.created_at
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1
         ${cursor ? 'AND f.created_at < $3' : ''}
       ORDER BY f.created_at DESC LIMIT $2`,
      cursor ? [userId, limit, cursor] : [userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, f.created_at
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1
         ${cursor ? 'AND f.created_at < $3' : ''}
       ORDER BY f.created_at DESC LIMIT $2`,
      cursor ? [userId, limit, cursor] : [userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { follow, getFollowers, getFollowing };
