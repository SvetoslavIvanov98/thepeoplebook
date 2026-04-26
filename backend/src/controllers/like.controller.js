const prisma = require('../config/prisma');
const { emitNotification } = require('../services/notification.service');

const toggle = async (req, res, next) => {
  try {
    const postId = BigInt(req.params.postId);
    const userId = BigInt(req.user.id);

    const existing = await prisma.likes.findFirst({
      where: { post_id: postId, user_id: userId },
      select: { id: true },
    });

    if (existing) {
      await prisma.likes.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }

    await prisma.likes.create({
      data: { post_id: postId, user_id: userId },
    });

    const post = await prisma.posts.findUnique({
      where: { id: postId },
      select: { user_id: true },
    });

    if (post && post.user_id !== userId) {
      await emitNotification(post.user_id, {
        type: 'like',
        actor_id: req.user.id,
        post_id: req.params.postId,
      });
    }

    res.json({ liked: true });
  } catch (err) {
    next(err);
  }
};

const toggleComment = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.commentId);
    const userId = BigInt(req.user.id);

    const existing = await prisma.likes.findFirst({
      where: { comment_id: commentId, user_id: userId },
      select: { id: true },
    });

    if (existing) {
      await prisma.likes.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }

    await prisma.likes.create({
      data: { comment_id: commentId, user_id: userId },
    });

    res.json({ liked: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggle, toggleComment };
