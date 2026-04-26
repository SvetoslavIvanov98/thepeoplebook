const webpush = require('web-push');
const logger = require('../utils/logger');
const prisma = require('../config/prisma');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@thepeoplebook.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn('VAPID keys not configured. Web push will not work.');
}

const sendWebPush = async (userId, payload) => {
  try {
    const subs = await prisma.web_push_subscriptions.findMany({
      where: { user_id: BigInt(userId) },
      select: { id: true, subscription: true },
    });
    if (!subs.length) return;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          await prisma.web_push_subscriptions.delete({
            where: { id: sub.id },
          });
        } else {
          logger.error('Error sending web push:', err);
        }
      }
    }
  } catch (err) {
    logger.error('Error fetching push subs:', err);
  }
};

module.exports = { sendWebPush, webpush };
