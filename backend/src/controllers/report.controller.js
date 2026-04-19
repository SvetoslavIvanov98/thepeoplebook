const db = require('../config/db');

// POST /api/reports — submit a content report
const createReport = async (req, res, next) => {
  try {
    const { post_id, comment_id, reported_user_id, reason, description } = req.body;

    if (!post_id && !comment_id && !reported_user_id) {
      return res.status(400).json({ error: 'Either post_id, comment_id, or reported_user_id is required' });
    }
    if (reported_user_id && Number(reported_user_id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }
    const validReasons = ['illegal_content', 'harassment', 'spam', 'misinformation', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
    }

    // Prevent duplicate pending reports from same user on same target
    const existing = await db.query(
      `SELECT id FROM content_reports
       WHERE reporter_id = $1 AND status = 'pending'
         AND (
           ($2::bigint IS NOT NULL AND post_id = $2) OR
           ($3::bigint IS NOT NULL AND comment_id = $3) OR
           ($4::bigint IS NOT NULL AND reported_user_id = $4)
         )`,
      [req.user.id, post_id || null, comment_id || null, reported_user_id || null]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'You already have a pending report for this content' });
    }

    const result = await db.query(
      `INSERT INTO content_reports (reporter_id, post_id, comment_id, reported_user_id, reason, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, created_at`,
      [req.user.id, post_id || null, comment_id || null, reported_user_id || null, reason, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/mine — user's own reports & decisions (transparency)
const getMyReports = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.post_id, r.comment_id, r.reason, r.description, r.status, r.created_at,
              r.decided_at
       FROM content_reports r
       WHERE r.reporter_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/decisions — moderation decisions affecting current user (DSA Art. 17)
const getMyDecisions = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT d.id, d.action_type, d.reason, d.legal_basis, d.appealed,
              d.appeal_outcome, d.appeal_note, d.created_at,
              r.reason AS report_reason
       FROM moderation_decisions d
       LEFT JOIN content_reports r ON r.id = d.report_id
       WHERE d.target_user_id = $1
       ORDER BY d.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/decisions/:id/appeal — appeal a moderation decision
const appealDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const decision = await db.query(
      'SELECT id, target_user_id, appealed FROM moderation_decisions WHERE id = $1',
      [id]
    );
    if (!decision.rows[0]) return res.status(404).json({ error: 'Decision not found' });
    if (decision.rows[0].target_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only appeal decisions about your own content' });
    }
    if (decision.rows[0].appealed) {
      return res.status(409).json({ error: 'This decision has already been appealed' });
    }

    const result = await db.query(
      `UPDATE moderation_decisions SET appealed = TRUE, appeal_note = $1
       WHERE id = $2 RETURNING id, appealed`,
      [note || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { createReport, getMyReports, getMyDecisions, appealDecision };
