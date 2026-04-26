const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

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
        const member = await prisma.conversation_participants.findUnique({
          where: {
            conversation_id_user_id: {
              conversation_id: BigInt(conversationId),
              user_id: BigInt(socket.userId),
            },
          },
        });
        if (member) socket.join(`conv:${conversationId}`);
      } catch (_) {
        /* ignore */
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Typing indicator — forward to other members of the conv room
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing', { userId: socket.userId, conversationId });
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
