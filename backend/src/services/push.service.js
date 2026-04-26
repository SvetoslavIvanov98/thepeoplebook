const prisma = require('../config/prisma');

/**
 * Send push notifications to a user's registered devices via Expo's push API.
 * @param {number|bigint} userId - Recipient user ID
 * @param {object} opts - { title, body, data }
 */
const sendPush = async (userId, { title, body, data }) => {
  try {
    const tokensResult = await prisma.push_tokens.findMany({
      where: { user_id: BigInt(userId) },
      select: { token: true },
    });

    const tokens = tokensResult.map((r) => r.token);
    if (!tokens.length) return;

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    // Expo push API accepts batches of up to 100
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const json = await resp.json();

      // Clean up invalid tokens
      if (json.data) {
        const invalid = [];
        json.data.forEach((receipt, i) => {
          if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            invalid.push(chunk[i].to);
          }
        });
        if (invalid.length) {
          await prisma.push_tokens.deleteMany({
            where: { token: { in: invalid } },
          });
        }
      }
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

module.exports = { sendPush };
