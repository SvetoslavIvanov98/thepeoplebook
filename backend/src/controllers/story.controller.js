const db = require('../config/db');

const createStory = async (req, res, next) => {
  try {
    const media_url = req.file?.location ?? null;
    if (!media_url) return res.status(400).json({ error: 'Media required for story' });

    const result = await db.query(
      `INSERT INTO stories (user_id, media_url, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours') RETURNING *`,
      [req.user.id, media_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getFeedStories = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.media_url, s.created_at, s.expires_at,
              u.id AS user_id, u.username, u.full_name, u.avatar_url
       FROM stories s JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
         AND (s.user_id = $1 OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1))
       ORDER BY u.id, s.created_at`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const deleteStory = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not allowed' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createStory, getFeedStories, deleteStory };
