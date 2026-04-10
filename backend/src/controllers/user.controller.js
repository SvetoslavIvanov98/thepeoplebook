const db = require('../config/db');

const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.cover_url, u.bio, u.is_verified, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
              ${req.user ? `EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id)` : 'FALSE'} AS is_following
       FROM users u WHERE u.username = $1`,
      req.user ? [username, req.user.id] : [username]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, bio } = req.body;
    const avatar_url = req.files?.avatar?.[0] ? `/uploads/${req.files.avatar[0].filename}` : undefined;
    const cover_url = req.files?.cover?.[0] ? `/uploads/${req.files.cover[0].filename}` : undefined;

    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
    if (bio !== undefined) { fields.push(`bio = $${idx++}`); values.push(bio); }
    if (avatar_url) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
    if (cover_url) { fields.push(`cover_url = $${idx++}`); values.push(cover_url); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.user.id);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, username, full_name, bio, avatar_url, cover_url`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getSuggestedUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
       FROM users u
       WHERE u.id != $1
         AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = $1)
       ORDER BY followers_count DESC
       LIMIT 10`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getUserPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(
      `SELECT p.*, u.username, u.full_name, u.avatar_url,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE u.username = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [username, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    // Re-verify password for non-OAuth accounts before deletion
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (user.password_hash) {
      if (!password) return res.status(400).json({ error: 'Password is required to delete account' });
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    }

    // Delete user — cascade removes posts, follows, likes, comments, tokens, etc.
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const exportMyData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [userResult, postsResult, commentsResult, followingResult, followersResult] = await Promise.all([
      db.query(
        'SELECT id, username, email, full_name, bio, avatar_url, is_verified, created_at FROM users WHERE id = $1',
        [userId]
      ),
      db.query(
        'SELECT id, content, media_urls, hashtags, created_at FROM posts WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
        [userId]
      ),
      db.query(
        'SELECT id, post_id, content, created_at FROM comments WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
        [userId]
      ),
      db.query(
        'SELECT u.username, u.full_name, f.created_at AS followed_at FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = $1',
        [userId]
      ),
      db.query(
        'SELECT u.username, u.full_name, f.created_at AS followed_at FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = $1',
        [userId]
      ),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      account: userResult.rows[0],
      posts: postsResult.rows,
      comments: commentsResult.rows,
      following: followingResult.rows,
      followers: followersResult.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="thepeoplebook-data-${userId}.json"`);
    res.json(exportData);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, getSuggestedUsers, getUserPosts, deleteAccount, exportMyData };
