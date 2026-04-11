const db = require('../config/db');
const { getIO } = require('./socket.service');

const emitNotification = async (userId, payload) => {
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id, group_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, payload.type, payload.actor_id || null, payload.post_id || null, payload.comment_id || null, payload.group_id || null]
    );
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('notification', result.rows[0]);
  } catch (err) {
    console.error('Notification error', err);
  }
};

module.exports = { emitNotification };
