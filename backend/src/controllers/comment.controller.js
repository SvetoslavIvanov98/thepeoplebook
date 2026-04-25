const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');

const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(
      `SELECT c.id, c.content, c.created_at, c.parent_id,
              u.id AS user_id, u.username, u.full_name, u.avatar_url,
              c.likes_count
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 AND c.deleted_at IS NULL AND c.parent_id IS NULL
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parent_id } = req.body;

    const post = await db.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (!post.rows[0]) return res.status(404).json({ error: 'Post not found' });

    const result = await db.query(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [postId, req.user.id, content, parent_id || null]
    );

    if (post.rows[0].user_id !== req.user.id) {
      await emitNotification(post.rows[0].user_id, {
        type: 'comment', actor_id: req.user.id, post_id: postId, comment_id: result.rows[0].id,
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE comments SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not allowed' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, addComment, deleteComment };
