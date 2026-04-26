const prisma = require('../config/prisma');

const subscribe = async (req, res, next) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    // Check if subscription already exists for this user to avoid duplicates
    const existing = await prisma.$queryRawUnsafe(
      "SELECT id FROM web_push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2",
      BigInt(req.user.id),
      subscription.endpoint
    );

    if (existing.length === 0) {
      await prisma.web_push_subscriptions.create({
        data: {
          user_id: BigInt(req.user.id),
          subscription,
        },
      });
    }

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getPublicKey = (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

module.exports = { subscribe, getPublicKey };
