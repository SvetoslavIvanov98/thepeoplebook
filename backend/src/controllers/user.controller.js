const db = require('../config/db');
const { deleteS3Object } = require('../config/s3');
const { invalidateCache } = require('../middleware/cache.middleware');
const { changePassword } = require('../services/auth.service');
const { buildPostQuery } = require('../models/post.model');

const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.cover_url, u.bio, u.is_verified, u.created_at,
              u.followers_count,
              u.following_count,
              ${req.user ? `EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id)` : 'FALSE'} AS is_following,
              ${req.user ? `EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id = $2 AND blocked_id = u.id)` : 'FALSE'} AS is_blocked,
              ${req.user ? `EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id = u.id AND blocked_id = $2)` : 'FALSE'} AS has_blocked_me,
              ${req.user ? `EXISTS(SELECT 1 FROM user_mutes WHERE muter_id = $2 AND muted_id = u.id)` : 'FALSE'} AS is_muted
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
    const avatar_url = req.files?.avatar?.[0]?.location;
    const cover_url = req.files?.cover?.[0]?.location;

    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(full_name);
    }
    if (bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(bio);
    }
    if (avatar_url) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(avatar_url);
    }
    if (cover_url) {
      fields.push(`cover_url = $${idx++}`);
      values.push(cover_url);
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    // Fetch old URLs before overwriting so we can delete them from S3
    const oldResult = await db.query('SELECT avatar_url, cover_url FROM users WHERE id = $1', [
      req.user.id,
    ]);
    const old = oldResult.rows[0] || {};

    values.push(req.user.id);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, username, full_name, bio, avatar_url, cover_url`,
      values
    );

    // Remove replaced files from S3
    if (avatar_url && old.avatar_url) await deleteS3Object(old.avatar_url);
    if (cover_url && old.cover_url) await deleteS3Object(old.cover_url);

    // Invalidate cached profile
    await invalidateCache(`cache:*:/api/users/${result.rows[0].username}*`);

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getSuggestedUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              u.followers_count
       FROM users u
       WHERE u.id != $1
         AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = $1)
         AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $1)
         AND u.id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = $1)
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

    const query =
      buildPostQuery({
        where: 'AND u.username = $1',
        userId: req.user?.id,
        userParamRef: '$4',
        limitRef: '$2',
      }) + ` OFFSET $3`;

    const params = req.user ? [username, limit, offset, req.user.id] : [username, limit, offset];

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/me — wrapped in transaction for atomicity
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    // Re-verify password for non-OAuth accounts before deletion
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (user.password_hash) {
      if (!password)
        return res.status(400).json({ error: 'Password is required to delete account' });
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    }

    // Delete user inside a transaction — cascade removes posts, follows, likes, comments, tokens, etc.
    await db.withTransaction(async (client) => {
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
      await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    });

    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/me/password — change password
const updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    await changePassword(req.user.id, current_password, new_password);
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

const exportMyData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      userResult,
      postsResult,
      commentsResult,
      followingResult,
      followersResult,
      storiesResult,
      notificationsResult,
      messagesResult,
      blocksResult,
      mutesResult,
    ] = await Promise.all([
      db.query(
        'SELECT id, username, email, full_name, bio, avatar_url, date_of_birth, is_verified, created_at FROM users WHERE id = $1',
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
      db.query(
        'SELECT id, media_url, created_at, expires_at FROM stories WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
      db.query(
        'SELECT id, type, actor_id, post_id, comment_id, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
      db.query(
        `SELECT m.id, m.conversation_id, m.content, m.media_url, m.created_at
         FROM messages m
         WHERE m.sender_id = $1
         ORDER BY m.created_at DESC`,
        [userId]
      ),
      db.query(
        'SELECT b.blocked_id, u.username, b.created_at FROM user_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = $1',
        [userId]
      ),
      db.query(
        'SELECT m.muted_id, u.username, m.created_at FROM user_mutes m JOIN users u ON u.id = m.muted_id WHERE m.muter_id = $1',
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
      stories: storiesResult.rows,
      notifications: notificationsResult.rows,
      messages_sent: messagesResult.rows,
      blocked_users: blocksResult.rows,
      muted_users: mutesResult.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="thepeoplebook-data-${userId}.json"`
    );
    res.json(exportData);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSuggestedUsers,
  getUserPosts,
  deleteAccount,
  updatePassword,
  exportMyData,
};
