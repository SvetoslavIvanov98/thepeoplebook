const prisma = require('../config/prisma');
const { emitNotification } = require('../services/notification.service');
const { sanitizeLike } = require('../utils/sanitize');
const { revokeAllTokens } = require('../services/auth.service');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      totalGroups,
      totalStories,
      pendingReports,
      newUsersToday,
      newPostsToday,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.posts.count({ where: { deleted_at: null } }),
      prisma.comments.count({ where: { deleted_at: null } }),
      prisma.groups.count(),
      prisma.stories.count(),
      prisma.content_reports.count({ where: { status: 'pending' } }),
      prisma.users.count({
        where: { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.posts.count({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          deleted_at: null,
        },
      }),
    ]);

    res.json({
      total_users: totalUsers,
      total_posts: totalPosts,
      total_comments: totalComments,
      total_groups: totalGroups,
      total_stories: totalStories,
      pending_reports: pendingReports,
      new_users_today: newUsersToday,
      new_posts_today: newPostsToday,
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
    const q = req.query.q ? req.query.q.trim() : null;

    const where = {};
    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { full_name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          username: true,
          email: true,
          full_name: true,
          avatar_url: true,
          is_verified: true,
          role: true,
          is_banned: true,
          created_at: true,
          post_count: true,
          following_count: true,
          followers_count: true,
        },
      }),
      prisma.users.count({ where }),
    ]);

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
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

    try {
      const result = await prisma.users.update({
        where: { id: BigInt(id) },
        data: { role },
        select: { id: true, username: true, role: true },
      });
      res.json(result);
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      throw e;
    }
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

    // Prevent banning other admins
    const target = await prisma.users.findUnique({
      where: { id: BigInt(id) },
      select: { role: true },
    });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin' && banned) {
      return res.status(400).json({ error: 'Cannot ban another admin' });
    }

    const result = await prisma.users.update({
      where: { id: BigInt(id) },
      data: { is_banned: banned },
      select: { id: true, username: true, is_banned: true },
    });

    // Revoke all sessions when banning so the user is immediately logged out
    if (banned) {
      await revokeAllTokens(parseInt(id, 10));
    }

    res.json(result);
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
    const q = req.query.q ? req.query.q.trim() : null;

    const where = { deleted_at: null };
    if (q) {
      where.content = { contains: q, mode: 'insensitive' };
    }

    const [posts, total] = await Promise.all([
      prisma.posts.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          users: {
            select: { id: true, username: true, avatar_url: true },
          },
        },
      }),
      prisma.posts.count({ where }),
    ]);

    const result = posts.map((p) => ({
      id: p.id,
      content: p.content,
      media_urls: p.media_urls,
      created_at: p.created_at,
      user_id: p.users.id,
      username: p.users.username,
      avatar_url: p.users.avatar_url,
      like_count: p.likes_count,
      comment_count: p.comments_count,
    }));

    res.json({
      posts: result,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/posts/:id
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await prisma.posts.findFirst({
      where: { id: BigInt(id), deleted_at: null },
      select: { id: true, user_id: true },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await prisma.$transaction([
      prisma.posts.update({
        where: { id: post.id },
        data: { deleted_at: new Date() },
      }),
      prisma.users.update({
        where: { id: post.user_id },
        data: { post_count: { decrement: 1 } },
      }),
    ]);

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

    const [groups, total] = await Promise.all([
      prisma.groups.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          users: { select: { username: true } },
        },
      }),
      prisma.groups.count(),
    ]);

    const result = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      cover_url: g.cover_url,
      privacy: g.privacy,
      created_at: g.created_at,
      owner_username: g.users.username,
      member_count: g.members_count,
      post_count: g.post_count,
    }));

    res.json({
      groups: result,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/groups/:id
const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.groups.delete({ where: { id: BigInt(id) } });
      res.json({ success: true });
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Group not found' });
      throw e;
    }
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

    const where = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.content_reports.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          users_content_reports_reporter_idTousers: {
            select: { username: true },
          },
          posts: {
            select: { content: true, users: { select: { username: true } } },
          },
          comments: {
            select: { content: true, users: { select: { username: true } } },
          },
          users_content_reports_reported_user_idTousers: {
            select: { username: true },
          },
        },
      }),
      prisma.content_reports.count({ where }),
    ]);

    const result = reports.map((r) => {
      let target_content = null;
      let target_username = null;

      if (r.post_id && r.posts) {
        target_content = r.posts.content;
        target_username = r.posts.users?.username;
      } else if (r.comment_id && r.comments) {
        target_content = r.comments.content;
        target_username = r.comments.users?.username;
      } else if (r.reported_user_id) {
        target_username = r.users_content_reports_reported_user_idTousers?.username;
      }

      return {
        id: r.id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        created_at: r.created_at,
        decided_at: r.decided_at,
        post_id: r.post_id,
        comment_id: r.comment_id,
        reported_user_id: r.reported_user_id,
        reporter_username: r.users_content_reports_reporter_idTousers?.username,
        target_content,
        target_username,
      };
    });

    res.json({
      reports: result,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/reports/:id/resolve  { action_type, reason, legal_basis, dismiss }
// Wrapped in a transaction for atomicity
const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action_type, reason, legal_basis, dismiss } = req.body;
    const reportId = BigInt(id);

    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.content_reports.findUnique({ where: { id: reportId } });
      if (!report) return { status: 404, error: 'Report not found' };
      if (report.status !== 'pending') {
        return { status: 400, error: 'Report has already been resolved' };
      }

      if (dismiss) {
        await tx.content_reports.update({
          where: { id: reportId },
          data: {
            status: 'dismissed',
            admin_note: reason || null,
            decided_by: BigInt(req.user.id),
            decided_at: new Date(),
          },
        });
        return { success: true, status: 'dismissed' };
      }

      // Determine the target user
      let targetUserId;
      if (report.post_id) {
        const p = await tx.posts.findUnique({
          where: { id: report.post_id },
          select: { user_id: true },
        });
        targetUserId = p?.user_id;
      } else if (report.comment_id) {
        const c = await tx.comments.findUnique({
          where: { id: report.comment_id },
          select: { user_id: true },
        });
        targetUserId = c?.user_id;
      } else if (report.reported_user_id) {
        targetUserId = report.reported_user_id;
      }

      if (!targetUserId) return { status: 400, error: 'Could not determine target user' };

      const validActions = ['content_removed', 'account_suspended', 'warning', 'no_action'];
      if (!validActions.includes(action_type)) {
        return { status: 400, error: `action_type must be one of: ${validActions.join(', ')}` };
      }
      if (!reason) return { status: 400, error: 'reason is required' };

      // Apply the action
      if (action_type === 'content_removed') {
        if (report.post_id)
          await tx.posts.update({
            where: { id: report.post_id },
            data: { deleted_at: new Date() },
          });
        if (report.comment_id)
          await tx.comments.update({
            where: { id: report.comment_id },
            data: { deleted_at: new Date() },
          });
      } else if (action_type === 'account_suspended') {
        await tx.users.update({
          where: { id: targetUserId },
          data: { is_banned: true },
        });
        // Revoke all sessions so the ban takes effect immediately
        await revokeAllTokens(Number(targetUserId));
      }

      // Create statement of reasons (DSA Art. 17)
      await tx.moderation_decisions.create({
        data: {
          report_id: reportId,
          target_user_id: targetUserId,
          action_type,
          reason,
          legal_basis: legal_basis || null,
          decided_by: BigInt(req.user.id),
        },
      });

      await tx.content_reports.update({
        where: { id: reportId },
        data: {
          status: 'action_taken',
          admin_note: reason,
          decided_by: BigInt(req.user.id),
          decided_at: new Date(),
        },
      });

      return { success: true, status: 'action_taken', action_type, targetUserId };
    });

    // Handle validation errors returned from inside the transaction
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    // Notify the target user about the moderation decision (DSA Art. 17)
    // Done outside the transaction so it doesn't block the response
    if (result.targetUserId) {
      await emitNotification(Number(result.targetUserId), {
        type: 'moderation_decision',
        actor_id: null,
      });
    }

    res.json({ success: result.success, status: result.status, action_type: result.action_type });
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

    const [appeals, total] = await Promise.all([
      prisma.moderation_decisions.findMany({
        where: { appealed: true, appeal_outcome: null },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          users_moderation_decisions_target_user_idTousers: {
            select: { username: true },
          },
          content_reports: {
            select: { reason: true, description: true },
          },
        },
      }),
      prisma.moderation_decisions.count({
        where: { appealed: true, appeal_outcome: null },
      }),
    ]);

    const result = appeals.map((d) => ({
      id: d.id,
      action_type: d.action_type,
      reason: d.reason,
      legal_basis: d.legal_basis,
      appeal_note: d.appeal_note,
      appeal_outcome: d.appeal_outcome,
      created_at: d.created_at,
      target_username: d.users_moderation_decisions_target_user_idTousers?.username,
      report_reason: d.content_reports?.reason,
      report_description: d.content_reports?.description,
    }));

    res.json({
      appeals: result,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/appeals/:id/resolve  { outcome: 'upheld' | 'overturned', note }
// Wrapped in a transaction for atomicity
const resolveAppeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { outcome, note } = req.body;
    const decisionId = BigInt(id);

    if (!['upheld', 'overturned'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be upheld or overturned' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const decision = await tx.moderation_decisions.findFirst({
        where: { id: decisionId, appealed: true },
      });
      if (!decision) return { status: 404, error: 'Appeal not found' };
      if (decision.appeal_outcome) {
        return { status: 400, error: 'Appeal already resolved' };
      }

      // If overturning, reverse the action
      if (outcome === 'overturned') {
        if (decision.action_type === 'content_removed' && decision.report_id) {
          const rpt = await tx.content_reports.findUnique({
            where: { id: decision.report_id },
            select: { post_id: true, comment_id: true },
          });
          if (rpt?.post_id)
            await tx.posts.update({
              where: { id: rpt.post_id },
              data: { deleted_at: null },
            });
          if (rpt?.comment_id)
            await tx.comments.update({
              where: { id: rpt.comment_id },
              data: { deleted_at: null },
            });
        } else if (decision.action_type === 'account_suspended') {
          await tx.users.update({
            where: { id: decision.target_user_id },
            data: { is_banned: false },
          });
        }
      }

      const updated = await tx.moderation_decisions.update({
        where: { id: decisionId },
        data: {
          appeal_outcome: outcome,
          appeal_note: note || undefined,
        },
        select: { id: true, appeal_outcome: true },
      });
      return { data: updated };
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getUsers,
  setUserRole,
  setBan,
  getPosts,
  deletePost,
  getGroups,
  deleteGroup,
  getReports,
  resolveReport,
  getAppeals,
  resolveAppeal,
};
