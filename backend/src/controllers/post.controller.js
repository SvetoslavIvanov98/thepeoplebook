const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');
const { deleteS3Object } = require('../config/s3');

const getFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor; // ISO date string for cursor-based pagination

    const result = await db.query(
      `SELECT p.id, p.content, p.media_urls, p.hashtags, p.created_at,
              u.id AS user_id, u.username, u.full_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) AS comments_count,
              (SELECT COUNT(*) FROM posts WHERE repost_id = p.id) AS reposts_count,
              ${req.user ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $3)` : 'FALSE'} AS liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.deleted_at IS NULL
         AND (p.user_id = $1 OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1))
         ${cursor ? `AND p.created_at < $4` : ''}
       ORDER BY p.created_at DESC
       LIMIT $2`,
      req.user
        ? cursor ? [req.user.id, limit, req.user.id, cursor] : [req.user.id, limit, req.user.id]
        : cursor ? [req.user?.id || 0, limit, cursor] : [req.user?.id || 0, limit]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const createPost = async (req, res, next) => {
  try {
    const { content, hashtags, group_id } = req.body;
    const media_urls = req.files ? req.files.map(f => f.location) : [];

    const hashtagArr = hashtags
      ? JSON.parse(hashtags)
      : (content?.match(/#\w+/g) || []).map(t => t.slice(1).toLowerCase());

    const result = await db.query(
      `INSERT INTO posts (user_id, content, media_urls, hashtags, group_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, content || null, JSON.stringify(media_urls), JSON.stringify(hashtagArr), group_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.username, u.full_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) AS comments_count,
              ${req.user ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2)` : 'FALSE'} AS liked_by_me
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      req.user ? [req.params.id, req.user.id] : [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE posts SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id, media_urls',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not allowed' });

    const mediaUrls = result.rows[0].media_urls || [];
    await Promise.all(mediaUrls.map(url => deleteS3Object(url)));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const repost = async (req, res, next) => {
  try {
    const { id: repost_id } = req.params;
    const original = await db.query('SELECT user_id FROM posts WHERE id = $1', [repost_id]);
    if (!original.rows[0]) return res.status(404).json({ error: 'Post not found' });

    const result = await db.query(
      'INSERT INTO posts (user_id, repost_id) VALUES ($1, $2) RETURNING *',
      [req.user.id, repost_id]
    );

    if (original.rows[0].user_id !== req.user.id) {
      await emitNotification(original.rows[0].user_id, {
        type: 'repost', actor_id: req.user.id, post_id: repost_id,
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed, createPost, getPost, deletePost, repost };
