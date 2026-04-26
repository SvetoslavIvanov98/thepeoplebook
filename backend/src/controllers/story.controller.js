const prisma = require('../config/prisma');
const { deleteS3Object } = require('../config/s3');
const logger = require('../utils/logger');

const createStory = async (req, res, next) => {
  try {
    const media_url = req.file?.location ?? null;
    if (!media_url) return res.status(400).json({ error: 'Media required for story' });

    const story = await prisma.stories.create({
      data: {
        user_id: BigInt(req.user.id),
        media_url,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    res.status(201).json(story);
  } catch (err) {
    next(err);
  }
};

const getFeedStories = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.id);

    // Get IDs the user follows
    const followingRows = await prisma.follows.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });
    const followingIds = followingRows.map((r) => r.following_id);

    // Get blocked user IDs (both directions)
    const [blockedByMe, blockedMe] = await Promise.all([
      prisma.user_blocks.findMany({
        where: { blocker_id: userId },
        select: { blocked_id: true },
      }),
      prisma.user_blocks.findMany({
        where: { blocked_id: userId },
        select: { blocker_id: true },
      }),
    ]);
    const blockedIds = new Set([
      ...blockedByMe.map((r) => r.blocked_id),
      ...blockedMe.map((r) => r.blocker_id),
    ]);

    // Include self + following, exclude blocked
    const allowedUserIds = [userId, ...followingIds].filter((id) => !blockedIds.has(id));

    const stories = await prisma.stories.findMany({
      where: {
        expires_at: { gt: new Date() },
        user_id: { in: allowedUserIds },
      },
      orderBy: [{ user_id: 'asc' }, { created_at: 'asc' }],
      include: {
        users: {
          select: { id: true, username: true, full_name: true, avatar_url: true },
        },
      },
    });

    const result = stories.map((s) => ({
      id: s.id,
      media_url: s.media_url,
      created_at: s.created_at,
      expires_at: s.expires_at,
      user_id: s.users.id,
      username: s.users.username,
      full_name: s.users.full_name,
      avatar_url: s.users.avatar_url,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteStory = async (req, res, next) => {
  try {
    const story = await prisma.stories.findFirst({
      where: {
        id: BigInt(req.params.id),
        user_id: BigInt(req.user.id),
      },
    });
    if (!story) return res.status(403).json({ error: 'Not allowed' });

    await prisma.stories.delete({ where: { id: story.id } });
    await deleteS3Object(story.media_url);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Clean up expired stories: remove from DB and delete S3 objects.
 * Call this periodically (e.g., from a cron job or on-demand admin endpoint).
 */
const cleanupExpiredStories = async () => {
  try {
    const expired = await prisma.stories.findMany({
      where: { expires_at: { lte: new Date() } },
      select: { id: true, media_url: true },
    });

    if (expired.length > 0) {
      await prisma.stories.deleteMany({
        where: { id: { in: expired.map((s) => s.id) } },
      });
      await Promise.all(expired.map((s) => deleteS3Object(s.media_url)));
      logger.info(`Cleaned up ${expired.length} expired stories`);
    }
    return expired.length;
  } catch (err) {
    logger.error('Story cleanup error:', err);
    return 0;
  }
};

module.exports = { createStory, getFeedStories, deleteStory, cleanupExpiredStories };
