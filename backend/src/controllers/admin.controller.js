const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [users, posts, comments, groups, stories, pendingReports] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) FROM groups'),
      db.query('SELECT COUNT(*) FROM stories'),
      db.query("SELECT COUNT(*) FROM content_reports WHERE status = 'pending'"),
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
      pending_reports: parseInt(pendingReports.rows[0].count, 10),
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

// GET /api/admin/reports?status=pending&page=1&limit=20
const getReports = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status || null;

    const params = status ? [status, limit, offset] : [limit, offset];
    const whereClause = status ? 'WHERE r.status = $1' : '';
    const limitParam = status ? '$2' : '$1';
    const offsetParam = status ? '$3' : '$2';

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT r.id, r.reason, r.description, r.status, r.created_at, r.decided_at,
                r.post_id, r.comment_id, r.reported_user_id,
                reporter.username AS reporter_username,
                CASE
                  WHEN r.post_id IS NOT NULL THEN p.content
                  WHEN r.comment_id IS NOT NULL THEN c.content
                  ELSE NULL
                END AS target_content,
                CASE
                  WHEN r.post_id IS NOT NULL THEN pu.username
                  WHEN r.comment_id IS NOT NULL THEN cu.username
                  ELSE ru.username
                END AS target_username
         FROM content_reports r
         JOIN users reporter ON reporter.id = r.reporter_id
         LEFT JOIN posts p ON p.id = r.post_id
         LEFT JOIN users pu ON pu.id = p.user_id
         LEFT JOIN comments c ON c.id = r.comment_id
         LEFT JOIN users cu ON cu.id = c.user_id
         LEFT JOIN users ru ON ru.id = r.reported_user_id
         ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM content_reports r ${whereClause}`,
        status ? [status] : []
      ),
    ]);

    res.json({
      reports: rows.rows,
      total: parseInt(total.rows[0].count, 10),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count, 10) / limit),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/reports/:id/resolve  { action_type, reason, legal_basis, dismiss }
const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action_type, reason, legal_basis, dismiss } = req.body;

    const report = await db.query('SELECT * FROM content_reports WHERE id = $1', [id]);
    if (!report.rows[0]) return res.status(404).json({ error: 'Report not found' });
    if (report.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Report has already been resolved' });
    }

    const rpt = report.rows[0];

    if (dismiss) {
      await db.query(
        `UPDATE content_reports SET status = 'dismissed', admin_note = $1, decided_by = $2, decided_at = NOW()
         WHERE id = $3`,
        [reason || null, req.user.id, id]
      );
      return res.json({ success: true, status: 'dismissed' });
    }

    // Determine the target user
    let targetUserId;
    if (rpt.post_id) {
      const p = await db.query('SELECT user_id FROM posts WHERE id = $1', [rpt.post_id]);
      targetUserId = p.rows[0]?.user_id;
    } else if (rpt.comment_id) {
      const c = await db.query('SELECT user_id FROM comments WHERE id = $1', [rpt.comment_id]);
      targetUserId = c.rows[0]?.user_id;
    } else if (rpt.reported_user_id) {
      targetUserId = rpt.reported_user_id;
    }

    if (!targetUserId) return res.status(400).json({ error: 'Could not determine target user' });

    const validActions = ['content_removed', 'account_suspended', 'warning', 'no_action'];
    if (!validActions.includes(action_type)) {
      return res.status(400).json({ error: `action_type must be one of: ${validActions.join(', ')}` });
    }
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    // Apply the action
    if (action_type === 'content_removed') {
      if (rpt.post_id) await db.query('UPDATE posts SET deleted_at = NOW() WHERE id = $1', [rpt.post_id]);
      if (rpt.comment_id) await db.query('UPDATE comments SET deleted_at = NOW() WHERE id = $1', [rpt.comment_id]);
    } else if (action_type === 'account_suspended') {
      await db.query('UPDATE users SET is_banned = TRUE WHERE id = $1', [targetUserId]);
    }

    // Create statement of reasons (DSA Art. 17)
    await db.query(
      `INSERT INTO moderation_decisions (report_id, target_user_id, action_type, reason, legal_basis, decided_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, targetUserId, action_type, reason, legal_basis || null, req.user.id]
    );

    await db.query(
      `UPDATE content_reports SET status = 'action_taken', admin_note = $1, decided_by = $2, decided_at = NOW()
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    // Notify the target user about the moderation decision (DSA Art. 17)
    await emitNotification(targetUserId, { type: 'moderation_decision', actor_id: null });

    res.json({ success: true, status: 'action_taken', action_type });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/appeals?page=1&limit=20
const getAppeals = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT d.id, d.action_type, d.reason, d.legal_basis, d.appeal_note,
                d.appeal_outcome, d.created_at,
                u.username AS target_username,
                r.reason AS report_reason, r.description AS report_description
         FROM moderation_decisions d
         JOIN users u ON u.id = d.target_user_id
         LEFT JOIN content_reports r ON r.id = d.report_id
         WHERE d.appealed = TRUE AND d.appeal_outcome IS NULL
         ORDER BY d.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) FROM moderation_decisions WHERE appealed = TRUE AND appeal_outcome IS NULL`
      ),
    ]);

    res.json({
      appeals: rows.rows,
      total: parseInt(total.rows[0].count, 10),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count, 10) / limit),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/appeals/:id/resolve  { outcome: 'upheld' | 'overturned', note }
const resolveAppeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { outcome, note } = req.body;

    if (!['upheld', 'overturned'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be upheld or overturned' });
    }

    const decision = await db.query(
      'SELECT * FROM moderation_decisions WHERE id = $1 AND appealed = TRUE',
      [id]
    );
    if (!decision.rows[0]) return res.status(404).json({ error: 'Appeal not found' });
    if (decision.rows[0].appeal_outcome) {
      return res.status(400).json({ error: 'Appeal already resolved' });
    }

    // If overturning, reverse the action
    if (outcome === 'overturned') {
      const d = decision.rows[0];
      if (d.action_type === 'content_removed' && d.report_id) {
        const rpt = await db.query('SELECT post_id, comment_id FROM content_reports WHERE id = $1', [d.report_id]);
        if (rpt.rows[0]?.post_id) await db.query('UPDATE posts SET deleted_at = NULL WHERE id = $1', [rpt.rows[0].post_id]);
        if (rpt.rows[0]?.comment_id) await db.query('UPDATE comments SET deleted_at = NULL WHERE id = $1', [rpt.rows[0].comment_id]);
      } else if (d.action_type === 'account_suspended') {
        await db.query('UPDATE users SET is_banned = FALSE WHERE id = $1', [d.target_user_id]);
      }
    }

    const result = await db.query(
      `UPDATE moderation_decisions SET appeal_outcome = $1, appeal_note = COALESCE($2, appeal_note)
       WHERE id = $3 RETURNING id, appeal_outcome`,
      [outcome, note || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getUsers, setUserRole, setBan, getPosts, deletePost, getGroups, deleteGroup, getReports, resolveReport, getAppeals, resolveAppeal };
