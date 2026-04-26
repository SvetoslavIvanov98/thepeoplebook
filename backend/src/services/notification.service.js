const prisma = require('../config/prisma');
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
    const notification = await prisma.notifications.create({
      data: {
        user_id: BigInt(userId),
        type: payload.type,
        actor_id: payload.actor_id ? BigInt(payload.actor_id) : null,
        post_id: payload.post_id ? BigInt(payload.post_id) : null,
        comment_id: payload.comment_id ? BigInt(payload.comment_id) : null,
        group_id: payload.group_id ? BigInt(payload.group_id) : null,
      },
    });

    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('notification', notification);

    // Send push notification
    if (payload.actor_id) {
      const actor = await prisma.users.findUnique({
        where: { id: BigInt(payload.actor_id) },
        select: { username: true },
      });
      const actorName = actor?.username || 'Someone';
      const body = `${actorName} ${NOTIFICATION_TITLES[payload.type] || 'sent you a notification'}`;
      sendPush(userId, {
        title: 'New notification',
        body,
        data: { type: payload.type, post_id: payload.post_id, group_id: payload.group_id },
      }).catch((err) => console.error('Push notification error', err));
    } else if (payload.type === 'moderation_decision') {
      sendPush(userId, {
        title: 'Moderation notice',
        body: NOTIFICATION_TITLES.moderation_decision,
        data: { type: payload.type },
      }).catch((err) => console.error('Push notification error', err));
    }
  } catch (err) {
    console.error('Notification error', err);
  }
};

module.exports = { emitNotification };
