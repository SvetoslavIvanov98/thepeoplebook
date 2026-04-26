const db = require('../config/db');
const { getIO } = require('../services/socket.service');
const { sendPush } = require('../services/push.service');

const getConversations = async (req, res, next) => {
  try {
    // Optimized: use LATERAL joins instead of correlated subqueries to avoid O(n²)
    const result = await db.query(
      `SELECT c.id, c.created_at,
              u.id AS partner_id, u.username AS partner_username, u.full_name AS partner_name,
              u.avatar_url AS partner_avatar,
              lm.content AS last_message,
              lm.created_at AS last_message_at,
              COALESCE(uc.cnt, 0) AS unread_count
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
       JOIN users u ON u.id = cp2.user_id
       LEFT JOIN LATERAL (
         SELECT content, created_at FROM messages
         WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS cnt FROM messages
         WHERE conversation_id = c.id AND read = FALSE AND sender_id != $1
       ) uc ON TRUE
       ORDER BY lm.created_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// Wrapped in transaction: creates conversation + two participants atomically
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

    const convId = await db.withTransaction(async (client) => {
      const conv = await client.query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
      const id = conv.rows[0].id;
      await client.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [id, req.user.id, userId]
      );
      return id;
    });

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
      'UPDATE messages SET read = TRUE WHERE conversation_id = $1 AND sender_id != $2 AND read = FALSE',
      [conversationId, req.user.id]
    );

    // Notify the other participant(s) their messages were read
    const io = getIO();
    if (io) {
      const others = await db.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
        [conversationId, req.user.id]
      );
      others.rows.forEach(({ user_id }) =>
        io.to(`user:${user_id}`).emit('messages_read', { conversationId })
      );
    }

    res.json(result.rows.reverse());
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const media_url = req.file?.location ?? null;

    // Validate: must have either content or media
    if (!content && !media_url) {
      return res.status(400).json({ error: 'Message must have content or media' });
    }

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

    // Fetch other participants once (eliminated duplicate query)
    const others = await db.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
      [conversationId, req.user.id]
    );

    const io = getIO();
    if (io) {
      others.rows.forEach(({ user_id }) => io.to(`user:${user_id}`).emit('new_message', msg));
      // Also emit to the conv room so the sender's socket sees it (dedup handled on frontend)
      io.to(`conv:${conversationId}`).emit('new_message', msg);
    }

    // Send push notification to other participants
    const sender = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const senderName = sender.rows[0]?.username || 'Someone';
    for (const { user_id } of others.rows) {
      sendPush(user_id, {
        title: senderName,
        body: content || '📷 Media',
        data: { type: 'message', conversationId },
      }).catch((err) => console.error('Message push error', err));
    }

    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getOrCreateConversation, getMessages, sendMessage };
