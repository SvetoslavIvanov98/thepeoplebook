const db = require('../config/db');
const { emitNotification } = require('../services/notification.service');
const { sanitizeLike } = require('../utils/sanitize');

const createGroup = async (req, res, next) => {
  try {
    const { name, description, privacy = 'public' } = req.body;
    if (!['public', 'private'].includes(privacy))
      return res.status(400).json({ error: 'privacy must be public or private' });
    const cover_url = req.file ? req.file.location : null;

    const result = await db.query(
      'INSERT INTO groups (name, description, cover_url, owner_id, privacy) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description || null, cover_url, req.user.id, privacy]
    );
    const group = result.rows[0];
    await db.query('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [
      group.id,
      req.user.id,
      'admin',
    ]);
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, privacy } = req.body;

    const admin = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
      [id, req.user.id, 'admin']
    );
    if (!admin.rows[0]) return res.status(403).json({ error: 'Not a group admin' });

    if (privacy && !['public', 'private'].includes(privacy))
      return res.status(400).json({ error: 'privacy must be public or private' });

    const setParts = [];
    const vals = [];
    let idx = 1;
    if (name !== undefined) {
      setParts.push(`name = $${idx++}`);
      vals.push(name);
    }
    if (description !== undefined) {
      setParts.push(`description = $${idx++}`);
      vals.push(description);
    }
    if (privacy !== undefined) {
      setParts.push(`privacy = $${idx++}`);
      vals.push(privacy);
    }
    if (req.file) {
      setParts.push(`cover_url = $${idx++}`);
      vals.push(req.file.location);
    }
    if (!setParts.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    const result = await db.query(
      `UPDATE groups SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM groups WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not the group owner' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getGroup = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    let query, params;
    if (userId) {
      query = `
        SELECT g.*, u.username AS owner_username, u.avatar_url AS owner_avatar,
               g.members_count,
               EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = $2) AS is_member,
               (SELECT role FROM group_members WHERE group_id = g.id AND user_id = $2) AS my_role,
               EXISTS(SELECT 1 FROM group_join_requests WHERE group_id = g.id AND user_id = $2 AND status = 'pending') AS join_requested
        FROM groups g JOIN users u ON u.id = g.owner_id
        WHERE g.id = $1`;
      params = [req.params.id, userId];
    } else {
      query = `
        SELECT g.*, u.username AS owner_username, u.avatar_url AS owner_avatar,
               g.members_count,
               FALSE AS is_member, NULL AS my_role, FALSE AS join_requested
        FROM groups g JOIN users u ON u.id = g.owner_id
        WHERE g.id = $1`;
      params = [req.params.id];
    }

    const result = await db.query(query, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Group not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const listGroups = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const q = (req.query.q || '').trim();

    const params = [];
    let pIdx = 1;
    const memberExpr = userId
      ? `EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = $${pIdx++})`
      : 'FALSE';
    if (userId) params.push(userId);

    let whereExtra = '';
    if (q) {
      whereExtra = `AND (g.name ILIKE $${pIdx} OR g.description ILIKE $${pIdx})`;
      params.push(`%${sanitizeLike(q)}%`);
      pIdx++;
    }

    const publicResult = await db.query(
      `SELECT g.id, g.name, g.description, g.cover_url, g.privacy, g.created_at,
              u.username AS owner_username,
              g.members_count,
              ${memberExpr} AS is_member
       FROM groups g JOIN users u ON u.id = g.owner_id
       WHERE g.privacy = 'public' ${whereExtra}
       ORDER BY members_count DESC, g.created_at DESC
       LIMIT 50`,
      params
    );

    let mine = [];
    if (userId) {
      const myResult = await db.query(
        `SELECT g.id, g.name, g.description, g.cover_url, g.privacy, g.created_at,
                u.username AS owner_username,
                g.members_count,
                TRUE AS is_member, gm.role AS my_role
         FROM group_members gm
         JOIN groups g ON g.id = gm.group_id
         JOIN users u ON u.id = g.owner_id
         WHERE gm.user_id = $1
         ORDER BY gm.joined_at DESC`,
        [userId]
      );
      mine = myResult.rows;
    }

    res.json({ public: publicResult.rows, mine });
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
      return res.json({ member: false, requested: false });
    }

    const group = await db.query('SELECT privacy FROM groups WHERE id = $1', [id]);
    if (!group.rows[0]) return res.status(404).json({ error: 'Group not found' });

    if (group.rows[0].privacy === 'private') {
      await db.query(
        `INSERT INTO group_join_requests (group_id, user_id)
         VALUES ($1, $2) ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'pending'`,
        [id, req.user.id]
      );
      return res.json({ member: false, requested: true });
    }

    await db.query('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [
      id,
      req.user.id,
      'member',
    ]);
    res.json({ member: true, requested: false });
  } catch (err) {
    next(err);
  }
};

const listJoinRequests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
      [id, req.user.id, 'admin']
    );
    if (!admin.rows[0]) return res.status(403).json({ error: 'Not a group admin' });

    const result = await db.query(
      `SELECT jr.id, jr.user_id, jr.status, jr.created_at,
              u.username, u.full_name, u.avatar_url
       FROM group_join_requests jr JOIN users u ON u.id = jr.user_id
       WHERE jr.group_id = $1 AND jr.status = 'pending'
       ORDER BY jr.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const respondToJoinRequest = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const { action } = req.body;
    if (!['approve', 'deny'].includes(action))
      return res.status(400).json({ error: 'action must be approve or deny' });

    const admin = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
      [id, req.user.id, 'admin']
    );
    if (!admin.rows[0]) return res.status(403).json({ error: 'Not a group admin' });

    const reqRow = await db.query(
      "SELECT * FROM group_join_requests WHERE id = $1 AND group_id = $2 AND status = 'pending'",
      [requestId, id]
    );
    if (!reqRow.rows[0]) return res.status(404).json({ error: 'Request not found' });

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    await db.query('UPDATE group_join_requests SET status = $1 WHERE id = $2', [
      newStatus,
      requestId,
    ]);

    if (action === 'approve') {
      await db.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [id, reqRow.rows[0].user_id]
      );
    }
    res.json({ success: true, status: newStatus });
  } catch (err) {
    next(err);
  }
};

const getGroupPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const group = await db.query('SELECT privacy FROM groups WHERE id = $1', [id]);
    if (!group.rows[0]) return res.status(404).json({ error: 'Group not found' });

    if (group.rows[0].privacy === 'private') {
      if (!userId) return res.status(403).json({ error: 'Private group' });
      const member = await db.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (!member.rows[0]) return res.status(403).json({ error: 'Members only' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(
      `SELECT p.*, u.username, u.full_name, u.avatar_url, u.is_verified,
              p.likes_count,
              p.comments_count,
              ${userId ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $4)` : 'FALSE'} AS liked_by_me
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.group_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      userId ? [id, limit, offset, userId] : [id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  listGroups,
  joinLeaveGroup,
  listJoinRequests,
  respondToJoinRequest,
  getGroupPosts,
  inviteToGroup,
  respondToInvite,
};

// ─── Invite friends to a group ───────────────────────────────────────────────

async function inviteToGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { user_ids } = req.body; // array of user IDs to invite

    if (!Array.isArray(user_ids) || user_ids.length === 0)
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    if (user_ids.length > 20)
      return res.status(400).json({ error: 'Cannot invite more than 20 users at once' });

    // Inviter must be a member
    const member = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!member.rows[0])
      return res.status(403).json({ error: 'You must be a member to invite others' });

    const group = await db.query('SELECT id, name FROM groups WHERE id = $1', [id]);
    if (!group.rows[0]) return res.status(404).json({ error: 'Group not found' });

    const results = [];
    for (const uid of user_ids) {
      // Skip if already a member
      const alreadyMember = await db.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [id, uid]
      );
      if (alreadyMember.rows[0]) {
        results.push({ user_id: uid, status: 'already_member' });
        continue;
      }

      // Upsert invite (reset to pending if previously declined)
      await db.query(
        `INSERT INTO group_invites (group_id, inviter_id, invitee_id, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (group_id, invitee_id) DO UPDATE SET status = 'pending', inviter_id = $2`,
        [id, req.user.id, uid]
      );

      // Send in-app notification
      await emitNotification(uid, {
        type: 'group_invite',
        actor_id: req.user.id,
        group_id: parseInt(id),
      });

      results.push({ user_id: uid, status: 'invited' });
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
}

async function respondToInvite(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!['accept', 'decline'].includes(action))
      return res.status(400).json({ error: 'action must be accept or decline' });

    const invite = await db.query(
      "SELECT * FROM group_invites WHERE group_id = $1 AND invitee_id = $2 AND status = 'pending'",
      [id, req.user.id]
    );
    if (!invite.rows[0]) return res.status(404).json({ error: 'No pending invite found' });

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await db.query('UPDATE group_invites SET status = $1 WHERE id = $2', [
      newStatus,
      invite.rows[0].id,
    ]);

    if (action === 'accept') {
      await db.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [id, req.user.id]
      );
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    next(err);
  }
}
