const db = require('../config/db');

const createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const cover_url = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await db.query(
      'INSERT INTO groups (name, description, cover_url, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, cover_url, req.user.id]
    );
    const group = result.rows[0];
    await db.query('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [group.id, req.user.id, 'admin']);
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

const getGroup = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT g.*, u.username AS owner_username,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS members_count
       FROM groups g JOIN users u ON u.id = g.owner_id
       WHERE g.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Group not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const joinLeaveGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows[0]) {
      const group = await db.query('SELECT owner_id FROM groups WHERE id = $1', [id]);
      if (group.rows[0]?.owner_id === req.user.id)
        return res.status(400).json({ error: 'Owner cannot leave group' });
      await db.query('DELETE FROM group_members WHERE id = $1', [existing.rows[0].id]);
      return res.json({ member: false });
    }

    await db.query('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [id, req.user.id, 'member']);
    res.json({ member: true });
  } catch (err) {
    next(err);
  }
};

const getGroupPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(
      `SELECT p.*, u.username, u.full_name, u.avatar_url,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.group_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { createGroup, getGroup, joinLeaveGroup, getGroupPosts };
