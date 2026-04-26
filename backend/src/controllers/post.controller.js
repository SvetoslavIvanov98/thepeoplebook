const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');
const { deleteS3Object } = require('../config/s3');
const { buildPostQuery } = require('../models/post.model');

const getFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor; // ISO date string for cursor-based pagination

    const query = buildPostQuery({
      where: `AND (p.user_id = $1 OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1))
          AND p.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $1)
          AND p.user_id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = $1)
          AND p.user_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = $1)
          ${cursor ? `AND p.created_at < $4` : ''}`,
      userId: req.user?.id,
      userParamRef: '$3',
      limitRef: '$2',
    });

    const params = req.user
      ? cursor
        ? [req.user.id, limit, req.user.id, cursor]
        : [req.user.id, limit, req.user.id]
      : cursor
        ? [req.user?.id || 0, limit, cursor]
        : [req.user?.id || 0, limit];

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const createPost = async (req, res, next) => {
  try {
    const { content, hashtags, group_id } = req.body;
    const media_urls = req.files ? req.files.map((f) => f.location) : [];

    const hashtagArr = hashtags
      ? JSON.parse(hashtags)
      : (content?.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase());

    const result = await db.query(
      `INSERT INTO posts (user_id, content, media_urls, hashtags, group_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.user.id,
        content || null,
        JSON.stringify(media_urls),
        JSON.stringify(hashtagArr),
        group_id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const query = buildPostQuery({
      where: 'AND p.id = $1',
      userId: req.user?.id,
      userParamRef: '$2',
    });

    const result = await db.query(query, req.user ? [req.params.id, req.user.id] : [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/posts/:id — edit a post
const editPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    const result = await db.query(
      `UPDATE posts SET content = $1, edited_at = NOW()
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING id, content, edited_at`,
      [content, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not allowed' });

    // Re-extract hashtags from the updated content
    const hashtagArr = (content?.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase());
    await db.query('UPDATE posts SET hashtags = $1 WHERE id = $2', [
      JSON.stringify(hashtagArr),
      req.params.id,
    ]);

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
    await Promise.all(mediaUrls.map((url) => deleteS3Object(url)));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const repost = async (req, res, next) => {
  try {
    const { id: repost_id } = req.params;
    const original = await db.query(
      'SELECT user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [repost_id]
    );
    if (!original.rows[0]) return res.status(404).json({ error: 'Post not found' });

    // Toggle: un-repost if already reposted
    const existing = await db.query(
      'SELECT id FROM posts WHERE user_id = $1 AND repost_id = $2 AND deleted_at IS NULL',
      [req.user.id, repost_id]
    );
    if (existing.rows[0]) {
      await db.query('UPDATE posts SET deleted_at = NOW() WHERE id = $1', [existing.rows[0].id]);
      return res.json({ reposted: false });
    }

    await db.query('INSERT INTO posts (user_id, repost_id) VALUES ($1, $2)', [
      req.user.id,
      repost_id,
    ]);

    if (original.rows[0].user_id !== req.user.id) {
      await emitNotification(original.rows[0].user_id, {
        type: 'repost',
        actor_id: req.user.id,
        post_id: repost_id,
      });
    }

    res.status(201).json({ reposted: true });
  } catch (err) {
    next(err);
  }
};

const getByHashtag = async (req, res, next) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    const query = buildPostQuery({
      where: `AND p.hashtags @> $1::jsonb ${cursor ? `AND p.created_at < $${req.user ? 4 : 3}` : ''}`,
      userId: req.user?.id,
      userParamRef: '$3',
      limitRef: '$2',
    });

    const params = req.user
      ? cursor
        ? [JSON.stringify([tag]), limit, req.user.id, cursor]
        : [JSON.stringify([tag]), limit, req.user.id]
      : cursor
        ? [JSON.stringify([tag]), limit, cursor]
        : [JSON.stringify([tag]), limit];

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed, createPost, getPost, editPost, deletePost, repost, getByHashtag };
