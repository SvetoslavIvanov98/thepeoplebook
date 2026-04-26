const prisma = require('../config/prisma');
const { emitNotification } = require('../services/notification.service');
const { deleteS3Object } = require('../config/s3');
const { buildPostQuery } = require('../models/post.model');

const getFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

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
        ? [BigInt(req.user.id), limit, BigInt(req.user.id), cursor]
        : [BigInt(req.user.id), limit, BigInt(req.user.id)]
      : cursor
        ? [req.user?.id || 0, limit, cursor]
        : [req.user?.id || 0, limit];

    const result = await prisma.$queryRawUnsafe(query, ...params);
    res.json(result);
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
      : (content?.match(/#w+/g) || []).map((t) => t.slice(1).toLowerCase());

    const post = await prisma.posts.create({
      data: {
        user_id: BigInt(req.user.id),
        content: content || null,
        media_urls: media_urls,
        hashtags: hashtagArr,
        group_id: group_id ? BigInt(group_id) : null,
      },
    });

    res.status(201).json(post);
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

    const params = req.user
      ? [BigInt(req.params.id), BigInt(req.user.id)]
      : [BigInt(req.params.id)];
    const result = await prisma.$queryRawUnsafe(query, ...params);

    if (!result[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(result[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/posts/:id — edit a post
const editPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    const postId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const postToUpdate = await prisma.posts.findFirst({
      where: { id: postId, user_id: userId, deleted_at: null },
    });

    if (!postToUpdate) return res.status(403).json({ error: 'Not allowed' });

    const hashtagArr = (content?.match(/#w+/g) || []).map((t) => t.slice(1).toLowerCase());

    const updated = await prisma.posts.update({
      where: { id: postId },
      data: {
        content,
        edited_at: new Date(),
        hashtags: hashtagArr,
      },
      select: { id: true, content: true, edited_at: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const postId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const postToDelete = await prisma.posts.findFirst({
      where: { id: postId, user_id: userId, deleted_at: null },
    });

    if (!postToDelete) return res.status(403).json({ error: 'Not allowed' });

    const deleted = await prisma.posts.update({
      where: { id: postId },
      data: { deleted_at: new Date() },
      select: { id: true, media_urls: true },
    });

    const mediaUrls = Array.isArray(deleted.media_urls) ? deleted.media_urls : [];
    await Promise.all(mediaUrls.map((url) => deleteS3Object(url)));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const repost = async (req, res, next) => {
  try {
    const repostId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const original = await prisma.posts.findFirst({
      where: { id: repostId, deleted_at: null },
      select: { user_id: true },
    });

    if (!original) return res.status(404).json({ error: 'Post not found' });

    // Toggle: un-repost if already reposted
    const existing = await prisma.posts.findFirst({
      where: { user_id: userId, repost_id: repostId, deleted_at: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.posts.update({
        where: { id: existing.id },
        data: { deleted_at: new Date() },
      });
      return res.json({ reposted: false });
    }

    await prisma.posts.create({
      data: { user_id: userId, repost_id: repostId },
    });

    if (original.user_id !== userId) {
      await emitNotification(original.user_id, {
        type: 'repost',
        actor_id: req.user.id,
        post_id: req.params.id,
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
        ? [JSON.stringify([tag]), limit, BigInt(req.user.id), cursor]
        : [JSON.stringify([tag]), limit, BigInt(req.user.id)]
      : cursor
        ? [JSON.stringify([tag]), limit, cursor]
        : [JSON.stringify([tag]), limit];

    const result = await prisma.$queryRawUnsafe(query, ...params);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed, createPost, getPost, editPost, deletePost, repost, getByHashtag };
