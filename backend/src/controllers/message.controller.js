const db = require('../config/db');
const { getIO } = require('../services/socket.service');

const getConversations = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.created_at,
              u.id AS partner_id, u.username AS partner_username, u.full_name AS partner_name,
              u.avatar_url AS partner_avatar,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read = FALSE AND sender_id != $1) AS unread_count
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
       JOIN users u ON u.id = cp2.user_id
       WHERE cp.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOrCreateConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId == req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

    const existing = await db.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       LIMIT 1`,
      [req.user.id, userId]
    );

    if (existing.rows[0]) return res.json({ id: existing.rows[0].id });

    const conv = await db.query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
    const convId = conv.rows[0].id;
    await db.query(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [convId, req.user.id, userId]
    );
    res.status(201).json({ id: convId });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const cursor = req.query.cursor;

    // Verify participant
    const member = await db.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );
    if (!member.rows[0]) return res.status(403).json({ error: 'Not a member' });

    const result = await db.query(
      `SELECT m.id, m.content, m.media_url, m.created_at, m.read,
              u.id AS sender_id, u.username, u.avatar_url
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 ${cursor ? 'AND m.created_at < $3' : ''}
       ORDER BY m.created_at DESC LIMIT $2`,
      cursor ? [conversationId, limit, cursor] : [conversationId, limit]
    );

    // Mark as read
    await db.query(
      'UPDATE messages SET read = TRUE WHERE conversation_id = $1 AND sender_id != $2',
      [conversationId, req.user.id]
    );

    res.json(result.rows.reverse());
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const media_url = req.file ? `/uploads/${req.file.filename}` : null;

    const member = await db.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );
    if (!member.rows[0]) return res.status(403).json({ error: 'Not a member' });

    const result = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, content, media_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversationId, req.user.id, content || null, media_url]
    );

    const msg = result.rows[0];
    const io = getIO();
    if (io) io.to(`conv:${conversationId}`).emit('new_message', msg);

    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getOrCreateConversation, getMessages, sendMessage };
