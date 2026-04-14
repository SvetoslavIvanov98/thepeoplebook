const db = require('../config/db');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [users, posts, comments, groups, stories] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) FROM groups'),
      db.query('SELECT COUNT(*) FROM stories'),
    ]);

    const [newUsersToday, newPostsToday] = await Promise.all([
      db.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'"),
      db.query("SELECT COUNT(*) FROM posts WHERE created_at >= NOW() - INTERVAL '24 hours' AND deleted_at IS NULL"),
    ]);

    res.json({
      total_users: parseInt(users.rows[0].count, 10),
      total_posts: parseInt(posts.rows[0].count, 10),
      total_comments: parseInt(comments.rows[0].count, 10),
      total_groups: parseInt(groups.rows[0].count, 10),
      total_stories: parseInt(stories.rows[0].count, 10),
      new_users_today: parseInt(newUsersToday.rows[0].count, 10),
      new_posts_today: parseInt(newPostsToday.rows[0].count, 10),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users?page=1&limit=20&q=search
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const q = req.query.q ? `%${req.query.q}%` : null;

    const params = q ? [q, limit, offset] : [limit, offset];
    const whereClause = q ? "WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR u.full_name ILIKE $1" : '';
    const limitParam = q ? '$2' : '$1';
    const offsetParam = q ? '$3' : '$2';

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, u.is_verified, u.role, u.created_at,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND deleted_at IS NULL) AS post_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
         FROM users u
         ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM users u ${whereClause}`,
        q ? [q] : []
      ),
    ]);

    res.json({
      users: rows.rows,
      total: parseInt(total.rows[0].count, 10),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count, 10) / limit),
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role  { role: 'admin' | 'user' }
const setUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or user' });
    }
    // Prevent self-demotion
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/ban  { banned: true|false }
const setBan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;
    if (typeof banned !== 'boolean') {
      return res.status(400).json({ error: 'banned must be a boolean' });
    }
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }
    const result = await db.query(
      'UPDATE users SET is_banned = $1 WHERE id = $2 RETURNING id, username, is_banned',
      [banned, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/posts?page=1&limit=20&q=search
const getPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const q = req.query.q ? `%${req.query.q}%` : null;

    const params = q ? [q, limit, offset] : [limit, offset];
    const whereClause = q ? "WHERE p.content ILIKE $1 AND p.deleted_at IS NULL" : 'WHERE p.deleted_at IS NULL';
    const limitParam = q ? '$2' : '$1';
    const offsetParam = q ? '$3' : '$2';

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT p.id, p.content, p.media_urls, p.created_at,
                u.id AS user_id, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count
         FROM posts p
         JOIN users u ON u.id = p.user_id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM posts p ${whereClause}`,
        q ? [q] : []
      ),
    ]);

    res.json({
      posts: rows.rows,
      total: parseInt(total.rows[0].count, 10),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count, 10) / limit),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/posts/:id
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE posts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/groups?page=1&limit=20
const getGroups = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT g.id, g.name, g.description, g.cover_url, g.privacy, g.created_at,
                u.username AS owner_username,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
                (SELECT COUNT(*) FROM posts WHERE group_id = g.id AND deleted_at IS NULL) AS post_count
         FROM groups g
         JOIN users u ON u.id = g.owner_id
         ORDER BY g.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM groups'),
    ]);

    res.json({
      groups: rows.rows,
      total: parseInt(total.rows[0].count, 10),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count, 10) / limit),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/groups/:id
const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM groups WHERE id = $1 RETURNING id',
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Group not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getUsers, setUserRole, setBan, getPosts, deletePost, getGroups, deleteGroup };
