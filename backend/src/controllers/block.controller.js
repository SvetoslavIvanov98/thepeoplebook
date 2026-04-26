const prisma = require('../config/prisma');

const toggleBlock = async (req, res, next) => {
  try {
    const blockerId = BigInt(req.user.id);
    const blockedId = BigInt(req.params.userId);

    if (blockerId === blockedId) return res.status(400).json({ error: 'Cannot block yourself' });

    const existing = await prisma.user_blocks.findFirst({
      where: { blocker_id: blockerId, blocked_id: blockedId },
    });

    if (existing) {
      await prisma.user_blocks.delete({
        where: { id: existing.id },
      });
      return res.json({ blocked: false });
    }

    // Use transaction: insert block + remove follow relationships atomically
    await prisma.$transaction(async (tx) => {
      // Create block (will throw if conflict, but that's handled by finding first)
      await tx.user_blocks.create({
        data: { blocker_id: blockerId, blocked_id: blockedId },
      });

      // Remove any follow relationships in both directions when blocking
      await tx.follows.deleteMany({
        where: {
          OR: [
            { follower_id: blockerId, following_id: blockedId },
            { follower_id: blockedId, following_id: blockerId },
          ],
        },
      });
    });

    res.json({ blocked: true });
  } catch (err) {
    next(err);
  }
};

const toggleMute = async (req, res, next) => {
  try {
    const muterId = BigInt(req.user.id);
    const mutedId = BigInt(req.params.userId);

    if (muterId === mutedId) return res.status(400).json({ error: 'Cannot mute yourself' });

    const existing = await prisma.user_mutes.findFirst({
      where: { muter_id: muterId, muted_id: mutedId },
    });

    if (existing) {
      await prisma.user_mutes.delete({
        where: { id: existing.id },
      });
      return res.json({ muted: false });
    }

    await prisma.user_mutes.create({
      data: { muter_id: muterId, muted_id: mutedId },
    });

    res.json({ muted: true });
  } catch (err) {
    next(err);
  }
};

const getBlockedUsers = async (req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT u.id, u.username, u.full_name, u.avatar_url
       FROM user_blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      BigInt(req.user.id)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getMutedUsers = async (req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT u.id, u.username, u.full_name, u.avatar_url
       FROM user_mutes m JOIN users u ON u.id = m.muted_id
       WHERE m.muter_id = $1 ORDER BY m.created_at DESC`,
      BigInt(req.user.id)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleBlock, toggleMute, getBlockedUsers, getMutedUsers };
