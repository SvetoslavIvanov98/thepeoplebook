const db = require('../config/db');

const toggleBlock = async (req, res, next) => {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId, 10);

    if (blockerId === blockedId) return res.status(400).json({ error: 'Cannot block yourself' });

    const existing = await db.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );

    if (existing.rows[0]) {
      await db.query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, blockedId]);
      return res.json({ blocked: false });
    }

    await db.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [blockerId, blockedId]
    );

    // Remove any follow relationships in both directions when blocking
    await db.query(
      'DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)',
      [blockerId, blockedId]
    );

    res.json({ blocked: true });
  } catch (err) {
    next(err);
  }
};

const toggleMute = async (req, res, next) => {
  try {
    const muterId = req.user.id;
    const mutedId = parseInt(req.params.userId, 10);

    if (muterId === mutedId) return res.status(400).json({ error: 'Cannot mute yourself' });

    const existing = await db.query(
      'SELECT id FROM user_mutes WHERE muter_id = $1 AND muted_id = $2',
      [muterId, mutedId]
    );

    if (existing.rows[0]) {
      await db.query('DELETE FROM user_mutes WHERE muter_id = $1 AND muted_id = $2', [muterId, mutedId]);
      return res.json({ muted: false });
    }

    await db.query(
      'INSERT INTO user_mutes (muter_id, muted_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [muterId, mutedId]
    );

    res.json({ muted: true });
  } catch (err) {
    next(err);
  }
};

const getBlockedUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url
       FROM user_blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getMutedUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url
       FROM user_mutes m JOIN users u ON u.id = m.muted_id
       WHERE m.muter_id = $1 ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleBlock, toggleMute, getBlockedUsers, getMutedUsers };
