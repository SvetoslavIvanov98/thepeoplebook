const prisma = require('../config/prisma');
const { emitNotification } = require('../services/notification.service');

const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await prisma.$queryRawUnsafe(
      `SELECT c.id, c.content, c.created_at, c.edited_at, c.parent_id,
              u.id AS user_id, u.username, u.full_name, u.avatar_url,
              c.likes_count
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 AND c.deleted_at IS NULL AND c.parent_id IS NULL
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      BigInt(postId),
      limit,
      offset
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parent_id } = req.body;

    const post = await prisma.posts.findUnique({
      where: { id: BigInt(postId) },
      select: { user_id: true },
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await prisma.comments.create({
      data: {
        post_id: BigInt(postId),
        user_id: BigInt(req.user.id),
        content,
        parent_id: parent_id ? BigInt(parent_id) : null,
      },
    });

    if (post.user_id !== BigInt(req.user.id)) {
      await emitNotification(post.user_id, {
        type: 'comment',
        actor_id: req.user.id,
        post_id: postId,
        comment_id: comment.id,
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/comments/:id — edit a comment
const editComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const commentId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const existing = await prisma.comments.findFirst({
      where: { id: commentId, user_id: userId, deleted_at: null },
    });

    if (!existing) return res.status(403).json({ error: 'Not allowed' });

    const updated = await prisma.comments.update({
      where: { id: commentId },
      data: { content, edited_at: new Date() },
      select: { id: true, content: true, edited_at: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const existing = await prisma.comments.findFirst({
      where: { id: commentId, user_id: userId, deleted_at: null },
    });

    if (!existing) return res.status(403).json({ error: 'Not allowed' });

    const deleted = await prisma.comments.update({
      where: { id: commentId },
      data: { deleted_at: new Date() },
      select: { id: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, addComment, editComment, deleteComment };
