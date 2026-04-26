const prisma = require('../config/prisma');

// POST /api/reports — submit a content report
const createReport = async (req, res, next) => {
  try {
    const { post_id, comment_id, reported_user_id, reason, description } = req.body;

    if (!post_id && !comment_id && !reported_user_id) {
      return res
        .status(400)
        .json({ error: 'Either post_id, comment_id, or reported_user_id is required' });
    }
    if (reported_user_id && Number(reported_user_id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }
    const validReasons = ['illegal_content', 'harassment', 'spam', 'misinformation', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
    }

    // Prevent duplicate pending reports from same user on same target
    const existingWhere = {
      reporter_id: BigInt(req.user.id),
      status: 'pending',
    };
    if (post_id) existingWhere.post_id = BigInt(post_id);
    if (comment_id) existingWhere.comment_id = BigInt(comment_id);
    if (reported_user_id) existingWhere.reported_user_id = BigInt(reported_user_id);

    const existing = await prisma.content_reports.findFirst({ where: existingWhere });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending report for this content' });
    }

    const report = await prisma.content_reports.create({
      data: {
        reporter_id: BigInt(req.user.id),
        post_id: post_id ? BigInt(post_id) : null,
        comment_id: comment_id ? BigInt(comment_id) : null,
        reported_user_id: reported_user_id ? BigInt(reported_user_id) : null,
        reason,
        description: description || null,
      },
      select: { id: true, status: true, created_at: true },
    });
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/mine — user's own reports & decisions (transparency)
const getMyReports = async (req, res, next) => {
  try {
    const reports = await prisma.content_reports.findMany({
      where: { reporter_id: BigInt(req.user.id) },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        post_id: true,
        comment_id: true,
        reason: true,
        description: true,
        status: true,
        created_at: true,
        decided_at: true,
      },
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/decisions — moderation decisions affecting current user (DSA Art. 17)
const getMyDecisions = async (req, res, next) => {
  try {
    const decisions = await prisma.moderation_decisions.findMany({
      where: { target_user_id: BigInt(req.user.id) },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        action_type: true,
        reason: true,
        legal_basis: true,
        appealed: true,
        appeal_outcome: true,
        appeal_note: true,
        created_at: true,
        content_reports: {
          select: { reason: true },
        },
      },
    });

    const result = decisions.map((d) => ({
      id: d.id,
      action_type: d.action_type,
      reason: d.reason,
      legal_basis: d.legal_basis,
      appealed: d.appealed,
      appeal_outcome: d.appeal_outcome,
      appeal_note: d.appeal_note,
      created_at: d.created_at,
      report_reason: d.content_reports?.reason || null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/decisions/:id/appeal — appeal a moderation decision
const appealDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const decision = await prisma.moderation_decisions.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, target_user_id: true, appealed: true },
    });
    if (!decision) return res.status(404).json({ error: 'Decision not found' });
    if (decision.target_user_id !== BigInt(req.user.id)) {
      return res
        .status(403)
        .json({ error: 'You can only appeal decisions about your own content' });
    }
    if (decision.appealed) {
      return res.status(409).json({ error: 'This decision has already been appealed' });
    }

    const updated = await prisma.moderation_decisions.update({
      where: { id: BigInt(id) },
      data: { appealed: true, appeal_note: note || null },
      select: { id: true, appealed: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = { createReport, getMyReports, getMyDecisions, appealDecision };
