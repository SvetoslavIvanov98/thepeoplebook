const prisma = require('../config/prisma');
const { deleteS3Object } = require('../config/s3');
const { invalidateCache } = require('../middleware/cache.middleware');
const { changePassword } = require('../services/auth.service');
const { buildPostQuery } = require('../models/post.model');

const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await prisma.users.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        full_name: true,
        avatar_url: true,
        cover_url: true,
        bio: true,
        is_verified: true,
        created_at: true,
        followers_count: true,
        following_count: true,
        ...(req.user
          ? {
              follows_follows_following_idTousers: {
                where: { follower_id: BigInt(req.user.id) },
                select: { id: true },
              },
              user_blocks_user_blocks_blocked_idTousers: {
                where: { blocker_id: BigInt(req.user.id) },
                select: { id: true },
              },
              user_blocks_user_blocks_blocker_idTousers: {
                where: { blocked_id: BigInt(req.user.id) },
                select: { id: true },
              },
              user_mutes_user_mutes_muted_idTousers: {
                where: { muter_id: BigInt(req.user.id) },
                select: { id: true },
              },
            }
          : {}),
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = {
      ...user,
      is_following: user.follows_follows_following_idTousers?.length > 0 || false,
      is_blocked: user.user_blocks_user_blocks_blocked_idTousers?.length > 0 || false,
      has_blocked_me: user.user_blocks_user_blocks_blocker_idTousers?.length > 0 || false,
      is_muted: user.user_mutes_user_mutes_muted_idTousers?.length > 0 || false,
    };

    delete profile.follows_follows_following_idTousers;
    delete profile.user_blocks_user_blocks_blocked_idTousers;
    delete profile.user_blocks_user_blocks_blocker_idTousers;
    delete profile.user_mutes_user_mutes_muted_idTousers;

    res.json(profile);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, bio } = req.body;
    const avatar_url = req.files?.avatar?.[0]?.location;
    const cover_url = req.files?.cover?.[0]?.location;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar_url) updateData.avatar_url = avatar_url;
    if (cover_url) updateData.cover_url = cover_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const oldUser = await prisma.users.findUnique({
      where: { id: BigInt(req.user.id) },
      select: { avatar_url: true, cover_url: true },
    });

    updateData.updated_at = new Date();

    const updatedUser = await prisma.users.update({
      where: { id: BigInt(req.user.id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        full_name: true,
        bio: true,
        avatar_url: true,
        cover_url: true,
      },
    });

    if (avatar_url && oldUser?.avatar_url) await deleteS3Object(oldUser.avatar_url);
    if (cover_url && oldUser?.cover_url) await deleteS3Object(oldUser.cover_url);

    await invalidateCache(`cache:*:/api/users/${updatedUser.username}*`);

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
};

const getSuggestedUsers = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.id);
    const result = await prisma.$queryRaw`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
             u.followers_count
      FROM users u
      WHERE u.id != ${userId}
        AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ${userId})
        AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ${userId})
        AND u.id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ${userId})
      ORDER BY followers_count DESC
      LIMIT 10
    `;
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getUserPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const query =
      buildPostQuery({
        where: 'AND u.username = $1',
        userId: req.user?.id,
        userParamRef: '$4',
        limitRef: '$2',
      }) + ` OFFSET $3`;

    const params = req.user
      ? [username, limit, offset, BigInt(req.user.id)]
      : [username, limit, offset];

    const result = await prisma.$queryRawUnsafe(query, ...params);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/me — wrapped in transaction for atomicity
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = BigInt(req.user.id);

    // Re-verify password for non-OAuth accounts before deletion
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { password_hash: true },
    });

    if (user?.password_hash) {
      if (!password)
        return res.status(400).json({ error: 'Password is required to delete account' });
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    }

    // Prisma handles cascade deletes defined in the schema, but we can wrap in transaction
    await prisma.$transaction(async (tx) => {
      await tx.refresh_tokens.deleteMany({ where: { user_id: userId } });
      await tx.users.delete({ where: { id: userId } });
    });

    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/me/password — change password
const updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    await changePassword(req.user.id, current_password, new_password);
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

const exportMyData = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.id);

    const [
      userResult,
      postsResult,
      commentsResult,
      followingResult,
      followersResult,
      storiesResult,
      notificationsResult,
      messagesResult,
      blocksResult,
      mutesResult,
    ] = await Promise.all([
      prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          full_name: true,
          bio: true,
          avatar_url: true,
          date_of_birth: true,
          is_verified: true,
          created_at: true,
        },
      }),
      prisma.posts.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true, content: true, media_urls: true, hashtags: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.comments.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true, post_id: true, content: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.$queryRaw`SELECT u.username, u.full_name, f.created_at AS followed_at FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ${userId}`,
      prisma.$queryRaw`SELECT u.username, u.full_name, f.created_at AS followed_at FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ${userId}`,
      prisma.stories.findMany({
        where: { user_id: userId },
        select: { id: true, media_url: true, created_at: true, expires_at: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.notifications.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          type: true,
          actor_id: true,
          post_id: true,
          comment_id: true,
          read: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.messages.findMany({
        where: { sender_id: userId },
        select: {
          id: true,
          conversation_id: true,
          content: true,
          media_url: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.$queryRaw`SELECT b.blocked_id, u.username, b.created_at FROM user_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ${userId}`,
      prisma.$queryRaw`SELECT m.muted_id, u.username, m.created_at FROM user_mutes m JOIN users u ON u.id = m.muted_id WHERE m.muter_id = ${userId}`,
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      account: userResult,
      posts: postsResult,
      comments: commentsResult,
      following: followingResult,
      followers: followersResult,
      stories: storiesResult,
      notifications: notificationsResult,
      messages_sent: messagesResult,
      blocked_users: blocksResult,
      muted_users: mutesResult,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="thepeoplebook-data-${req.user.id}.json"`
    );
    res.json(exportData);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSuggestedUsers,
  getUserPosts,
  deleteAccount,
  updatePassword,
  exportMyData,
};
