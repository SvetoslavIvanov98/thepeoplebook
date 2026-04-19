const db = require('../config/db');
const { getIO } = require('./socket.service');
const { sendPush } = require('./push.service');

const NOTIFICATION_TITLES = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  repost: 'reposted your post',
  group_invite: 'invited you to a group',
  group_join_request: 'requested to join your group',
  group_join_approved: 'approved your join request',
  mention: 'mentioned you',
  moderation_decision: 'A moderation decision has been issued on your account',
};

const emitNotification = async (userId, payload) => {
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id, group_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, payload.type, payload.actor_id || null, payload.post_id || null, payload.comment_id || null, payload.group_id || null]
    );
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('notification', result.rows[0]);

    // Send push notification
    if (payload.actor_id) {
      const actor = await db.query('SELECT username FROM users WHERE id = $1', [payload.actor_id]);
      const actorName = actor.rows[0]?.username || 'Someone';
      const body = `${actorName} ${NOTIFICATION_TITLES[payload.type] || 'sent you a notification'}`;
      sendPush(userId, {
        title: 'New notification',
        body,
        data: { type: payload.type, post_id: payload.post_id, group_id: payload.group_id },
      }).catch(err => console.error('Push notification error', err));
    } else if (payload.type === 'moderation_decision') {
      sendPush(userId, {
        title: 'Moderation notice',
        body: NOTIFICATION_TITLES.moderation_decision,
        data: { type: payload.type },
      }).catch(err => console.error('Push notification error', err));
    }
  } catch (err) {
    console.error('Notification error', err);
  }
};

module.exports = { emitNotification };
