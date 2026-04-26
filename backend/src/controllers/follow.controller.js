const prisma = require('../config/prisma');
const { emitNotification } = require('../services/notification.service');

const follow = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId == req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existing = await prisma.follows.findFirst({
      where: {
        follower_id: BigInt(req.user.id),
        following_id: BigInt(userId),
      },
    });

    if (existing) {
      await prisma.follows.delete({ where: { id: existing.id } });
      return res.json({ following: false });
    }

    await prisma.follows.create({
      data: {
        follower_id: BigInt(req.user.id),
        following_id: BigInt(userId),
      },
    });

    await emitNotification(userId, { type: 'follow', actor_id: req.user.id });

    res.json({ following: true });
  } catch (err) {
    next(err);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor; // ISO date string for cursor pagination

    const where = {
      following_id: BigInt(userId),
    };
    if (cursor) {
      where.created_at = { lt: new Date(cursor) };
    }

    const rows = await prisma.follows.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        users_follows_follower_idTousers: {
          select: {
            id: true,
            username: true,
            full_name: true,
            avatar_url: true,
            is_verified: true,
          },
        },
      },
    });

    const result = rows.map((r) => ({
      id: r.users_follows_follower_idTousers.id,
      username: r.users_follows_follower_idTousers.username,
      full_name: r.users_follows_follower_idTousers.full_name,
      avatar_url: r.users_follows_follower_idTousers.avatar_url,
      is_verified: r.users_follows_follower_idTousers.is_verified,
      created_at: r.created_at,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    const where = {
      follower_id: BigInt(userId),
    };
    if (cursor) {
      where.created_at = { lt: new Date(cursor) };
    }

    const rows = await prisma.follows.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        users_follows_following_idTousers: {
          select: {
            id: true,
            username: true,
            full_name: true,
            avatar_url: true,
            is_verified: true,
          },
        },
      },
    });

    const result = rows.map((r) => ({
      id: r.users_follows_following_idTousers.id,
      username: r.users_follows_following_idTousers.username,
      full_name: r.users_follows_following_idTousers.full_name,
      avatar_url: r.users_follows_following_idTousers.avatar_url,
      is_verified: r.users_follows_following_idTousers.is_verified,
      created_at: r.created_at,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { follow, getFollowers, getFollowing };
