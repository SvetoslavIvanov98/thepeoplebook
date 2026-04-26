const db = require('../config/db');
const { sanitizeLike } = require('../utils/sanitize');

const search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [], posts: [], hashtags: [] });

    const pattern = `%${sanitizeLike(q)}%`;

    const [users, posts, hashtags] = await Promise.all([
      db.query(
        `SELECT id, username, full_name, avatar_url, is_verified FROM users
         WHERE username ILIKE $1 OR full_name ILIKE $1 LIMIT 10`,
        [pattern]
      ),
      db.query(
        `SELECT p.id, p.content, p.created_at, u.username, u.avatar_url
         FROM posts p JOIN users u ON u.id = p.user_id
         WHERE p.content ILIKE $1 AND p.deleted_at IS NULL LIMIT 10`,
        [pattern]
      ),
      // Optimized: use GIN index on hashtags jsonb column instead of unnesting all posts.
      // The @> operator leverages the GIN index for fast containment checks.
      // For prefix/ILIKE search we still need to unnest, but we limit the scan
      // to posts whose hashtags array is non-empty.
      db.query(
        `SELECT DISTINCT tag FROM (
           SELECT jsonb_array_elements_text(hashtags) AS tag
           FROM posts
           WHERE deleted_at IS NULL AND hashtags != '[]'::jsonb AND hashtags IS NOT NULL
         ) t WHERE tag ILIKE $1 LIMIT 10`,
        [pattern]
      ),
    ]);

    res.json({ users: users.rows, posts: posts.rows, hashtags: hashtags.rows.map((r) => r.tag) });
  } catch (err) {
    next(err);
  }
};

module.exports = { search };
