const prisma = require('../config/prisma');
const { getIO } = require('../services/socket.service');
const { sendPush } = require('../services/push.service');

const getConversations = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.id);

    // Get conversations the user participates in
    const participations = await prisma.conversation_participants.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });
    const convIds = participations.map((p) => p.conversation_id);

    if (convIds.length === 0) return res.json([]);

    // For each conversation, get partner info, last message, and unread count
    const conversations = await Promise.all(
      convIds.map(async (convId) => {
        const [partner, lastMessage, unreadCount] = await Promise.all([
          // Get the other participant
          prisma.conversation_participants.findFirst({
            where: { conversation_id: convId, user_id: { not: userId } },
            include: {
              users: {
                select: { id: true, username: true, full_name: true, avatar_url: true },
              },
            },
          }),
          // Get last message
          prisma.messages.findFirst({
            where: { conversation_id: convId },
            orderBy: { created_at: 'desc' },
            select: { content: true, created_at: true },
          }),
          // Count unread
          prisma.messages.count({
            where: { conversation_id: convId, read: false, sender_id: { not: userId } },
          }),
        ]);

        return {
          id: convId,
          partner_id: partner?.users?.id,
          partner_username: partner?.users?.username,
          partner_name: partner?.users?.full_name,
          partner_avatar: partner?.users?.avatar_url,
          last_message: lastMessage?.content || null,
          last_message_at: lastMessage?.created_at || null,
          unread_count: unreadCount,
        };
      })
    );

    // Sort by last message time descending
    conversations.sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at) - new Date(a.last_message_at);
    });

    res.json(conversations);
  } catch (err) {
    next(err);
  }
};

// Wrapped in transaction: creates conversation + two participants atomically
const getOrCreateConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId == req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

    const myId = BigInt(req.user.id);
    const theirId = BigInt(userId);

    // Check for existing conversation between these two users
    const myConvs = await prisma.conversation_participants.findMany({
      where: { user_id: myId },
      select: { conversation_id: true },
    });
    const myConvIds = myConvs.map((c) => c.conversation_id);

    if (myConvIds.length > 0) {
      const existing = await prisma.conversation_participants.findFirst({
        where: {
          user_id: theirId,
          conversation_id: { in: myConvIds },
        },
        select: { conversation_id: true },
      });

      if (existing) return res.json({ id: existing.conversation_id });
    }

    // Create new conversation with participants in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversations.create({ data: {} });
      await tx.conversation_participants.createMany({
        data: [
          { conversation_id: conv.id, user_id: myId },
          { conversation_id: conv.id, user_id: theirId },
        ],
      });
      return conv.id;
    });

    res.status(201).json({ id: result });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const cursor = req.query.cursor;
    const convId = BigInt(conversationId);
    const userId = BigInt(req.user.id);

    // Verify participant
    const member = await prisma.conversation_participants.findFirst({
      where: { conversation_id: convId, user_id: userId },
    });
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const where = { conversation_id: convId };
    if (cursor) {
      where.created_at = { lt: new Date(cursor) };
    }

    const messages = await prisma.messages.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        users: {
          select: { id: true, username: true, avatar_url: true },
        },
      },
    });

    const result = messages.map((m) => ({
      id: m.id,
      content: m.content,
      media_url: m.media_url,
      created_at: m.created_at,
      read: m.read,
      sender_id: m.users.id,
      username: m.users.username,
      avatar_url: m.users.avatar_url,
    }));

    // Mark as read
    await prisma.messages.updateMany({
      where: { conversation_id: convId, sender_id: { not: userId }, read: false },
      data: { read: true },
    });

    // Notify the other participant(s) their messages were read
    const io = getIO();
    if (io) {
      const others = await prisma.conversation_participants.findMany({
        where: { conversation_id: convId, user_id: { not: userId } },
        select: { user_id: true },
      });
      others.forEach(({ user_id }) =>
        io
          .to(`user:${user_id.toString()}`)
          .emit('messages_read', { conversationId: conversationId.toString() })
      );
    }

    res.json(result.reverse());
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const media_url = req.file?.location ?? null;
    const convId = BigInt(conversationId);
    const userId = BigInt(req.user.id);

    // Validate: must have either content or media
    if (!content && !media_url) {
      return res.status(400).json({ error: 'Message must have content or media' });
    }

    const member = await prisma.conversation_participants.findFirst({
      where: { conversation_id: convId, user_id: userId },
    });
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const msg = await prisma.messages.create({
      data: {
        conversation_id: convId,
        sender_id: userId,
        content: content || null,
        media_url,
      },
    });

    // Fetch other participants once
    const others = await prisma.conversation_participants.findMany({
      where: { conversation_id: convId, user_id: { not: userId } },
      select: { user_id: true },
    });

    const io = getIO();
    if (io) {
      others.forEach(({ user_id }) => io.to(`user:${user_id.toString()}`).emit('new_message', msg));
      // Also emit to the conv room so the sender's socket sees it (dedup handled on frontend)
      io.to(`conv:${conversationId.toString()}`).emit('new_message', msg);
    }

    // Send push notification to other participants
    const sender = await prisma.users.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const senderName = sender?.username || 'Someone';
    for (const { user_id } of others) {
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
