const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', async (conversationId) => {
      try {
        const member = await db.query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );
        if (member.rows[0]) socket.join(`conv:${conversationId}`);
      } catch (_) { /* ignore */ }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
