const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');

const toggle = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const existing = await db.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, req.user.id]
    );

    if (existing.rows[0]) {
      await db.query('DELETE FROM likes WHERE id = $1', [existing.rows[0].id]);
      return res.json({ liked: false });
    }

    await db.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, req.user.id]);

    const post = await db.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (post.rows[0] && post.rows[0].user_id !== req.user.id) {
      await emitNotification(post.rows[0].user_id, {
        type: 'like', actor_id: req.user.id, post_id: postId,
      });
    }

    res.json({ liked: true });
  } catch (err) {
    next(err);
  }
};

const toggleComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const existing = await db.query(
      'SELECT id FROM likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, req.user.id]
    );

    if (existing.rows[0]) {
      await db.query('DELETE FROM likes WHERE id = $1', [existing.rows[0].id]);
      return res.json({ liked: false });
    }

    await db.query('INSERT INTO likes (comment_id, user_id) VALUES ($1, $2)', [commentId, req.user.id]);
    res.json({ liked: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggle, toggleComment };
