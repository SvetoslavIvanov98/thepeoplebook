const prisma = require('../config/prisma');
const { emitNotification } = require('../services/notification.service');
const { sanitizeLike } = require('../utils/sanitize');

const createGroup = async (req, res, next) => {
  try {
    const { name, description, privacy = 'public' } = req.body;
    if (!['public', 'private'].includes(privacy))
      return res.status(400).json({ error: 'privacy must be public or private' });
    const cover_url = req.file ? req.file.location : null;

    // Use transaction: create group + add owner as admin atomically
    const group = await prisma.$transaction(async (tx) => {
      const g = await tx.groups.create({
        data: {
          name,
          description: description || null,
          cover_url,
          owner_id: BigInt(req.user.id),
          privacy,
        },
      });
      await tx.group_members.create({
        data: {
          group_id: g.id,
          user_id: BigInt(req.user.id),
          role: 'admin',
        },
      });
      return g;
    });

    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, privacy } = req.body;

    const admin = await prisma.group_members.findFirst({
      where: { group_id: BigInt(id), user_id: BigInt(req.user.id), role: 'admin' },
    });
    if (!admin) return res.status(403).json({ error: 'Not a group admin' });

    if (privacy && !['public', 'private'].includes(privacy))
      return res.status(400).json({ error: 'privacy must be public or private' });

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (privacy !== undefined) data.privacy = privacy;
    if (req.file) data.cover_url = req.file.location;

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const result = await prisma.groups.update({
      where: { id: BigInt(id) },
      data,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const group = await prisma.groups.findFirst({
      where: { id: BigInt(req.params.id), owner_id: BigInt(req.user.id) },
    });
    if (!group) return res.status(403).json({ error: 'Not the group owner' });

    await prisma.groups.delete({ where: { id: group.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getGroup = async (req, res, next) => {
  try {
    const groupId = BigInt(req.params.id);
    const userId = req.user?.id ? BigInt(req.user.id) : null;

    const group = await prisma.groups.findUnique({
      where: { id: groupId },
      include: {
        users: {
          select: { username: true, avatar_url: true },
        },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    let is_member = false;
    let my_role = null;
    let join_requested = false;

    if (userId) {
      const membership = await prisma.group_members.findFirst({
        where: { group_id: groupId, user_id: userId },
      });
      is_member = !!membership;
      my_role = membership?.role || null;

      if (!is_member) {
        const request = await prisma.group_join_requests.findFirst({
          where: { group_id: groupId, user_id: userId, status: 'pending' },
        });
        join_requested = !!request;
      }
    }

    res.json({
      ...group,
      owner_username: group.users.username,
      owner_avatar: group.users.avatar_url,
      is_member,
      my_role,
      join_requested,
    });
  } catch (err) {
    next(err);
  }
};

const listGroups = async (req, res, next) => {
  try {
    const userId = req.user?.id ? BigInt(req.user.id) : null;
    const q = (req.query.q || '').trim();

    // Build public groups query
    const publicWhere = { privacy: 'public' };
    if (q) {
      publicWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const publicGroups = await prisma.groups.findMany({
      where: publicWhere,
      orderBy: [{ members_count: 'desc' }, { created_at: 'desc' }],
      take: 50,
      include: {
        users: { select: { username: true } },
      },
    });

    // Check membership for each public group if logged in
    let publicResult = publicGroups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      cover_url: g.cover_url,
      privacy: g.privacy,
      created_at: g.created_at,
      owner_username: g.users.username,
      members_count: g.members_count,
      is_member: false,
    }));

    if (userId) {
      const membershipIds = await prisma.group_members.findMany({
        where: {
          user_id: userId,
          group_id: { in: publicGroups.map((g) => g.id) },
        },
        select: { group_id: true },
      });
      const memberSet = new Set(membershipIds.map((m) => m.group_id.toString()));
      publicResult = publicResult.map((g) => ({
        ...g,
        is_member: memberSet.has(g.id.toString()),
      }));
    }

    let mine = [];
    if (userId) {
      const myMemberships = await prisma.group_members.findMany({
        where: { user_id: userId },
        orderBy: { joined_at: 'desc' },
        include: {
          groups: {
            include: { users: { select: { username: true } } },
          },
        },
      });
      mine = myMemberships.map((gm) => ({
        id: gm.groups.id,
        name: gm.groups.name,
        description: gm.groups.description,
        cover_url: gm.groups.cover_url,
        privacy: gm.groups.privacy,
        created_at: gm.groups.created_at,
        owner_username: gm.groups.users.username,
        members_count: gm.groups.members_count,
        is_member: true,
        my_role: gm.role,
      }));
    }

    res.json({ public: publicResult, mine });
  } catch (err) {
    next(err);
  }
};

const joinLeaveGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const groupId = BigInt(id);
    const userId = BigInt(req.user.id);

    const existing = await prisma.group_members.findFirst({
      where: { group_id: groupId, user_id: userId },
    });

    if (existing) {
      const group = await prisma.groups.findUnique({
        where: { id: groupId },
        select: { owner_id: true },
      });
      if (group?.owner_id === userId)
        return res.status(400).json({ error: 'Owner cannot leave group' });
      await prisma.group_members.delete({ where: { id: existing.id } });
      return res.json({ member: false, requested: false });
    }

    const group = await prisma.groups.findUnique({
      where: { id: groupId },
      select: { privacy: true },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.privacy === 'private') {
      await prisma.group_join_requests.upsert({
        where: { group_id_user_id: { group_id: groupId, user_id: userId } },
        update: { status: 'pending' },
        create: { group_id: groupId, user_id: userId, status: 'pending' },
      });
      return res.json({ member: false, requested: true });
    }

    await prisma.group_members.create({
      data: { group_id: groupId, user_id: userId, role: 'member' },
    });
    res.json({ member: true, requested: false });
  } catch (err) {
    next(err);
  }
};

const listJoinRequests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const groupId = BigInt(id);

    const admin = await prisma.group_members.findFirst({
      where: { group_id: groupId, user_id: BigInt(req.user.id), role: 'admin' },
    });
    if (!admin) return res.status(403).json({ error: 'Not a group admin' });

    const requests = await prisma.group_join_requests.findMany({
      where: { group_id: groupId, status: 'pending' },
      orderBy: { created_at: 'asc' },
      include: {
        users: {
          select: { id: true, username: true, full_name: true, avatar_url: true },
        },
      },
    });

    const result = requests.map((jr) => ({
      id: jr.id,
      user_id: jr.user_id,
      status: jr.status,
      created_at: jr.created_at,
      username: jr.users.username,
      full_name: jr.users.full_name,
      avatar_url: jr.users.avatar_url,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const respondToJoinRequest = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const { action } = req.body;
    const groupId = BigInt(id);

    if (!['approve', 'deny'].includes(action))
      return res.status(400).json({ error: 'action must be approve or deny' });

    const admin = await prisma.group_members.findFirst({
      where: { group_id: groupId, user_id: BigInt(req.user.id), role: 'admin' },
    });
    if (!admin) return res.status(403).json({ error: 'Not a group admin' });

    const reqRow = await prisma.group_join_requests.findFirst({
      where: { id: BigInt(requestId), group_id: groupId, status: 'pending' },
    });
    if (!reqRow) return res.status(404).json({ error: 'Request not found' });

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    await prisma.group_join_requests.update({
      where: { id: reqRow.id },
      data: { status: newStatus },
    });

    if (action === 'approve') {
      await prisma.group_members.upsert({
        where: { group_id_user_id: { group_id: groupId, user_id: reqRow.user_id } },
        update: {},
        create: { group_id: groupId, user_id: reqRow.user_id, role: 'member' },
      });
    }
    res.json({ success: true, status: newStatus });
  } catch (err) {
    next(err);
  }
};

const getGroupPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id ? BigInt(req.user.id) : null;
    const groupId = BigInt(id);

    const group = await prisma.groups.findUnique({
      where: { id: groupId },
      select: { privacy: true },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.privacy === 'private') {
      if (!userId) return res.status(403).json({ error: 'Private group' });
      const member = await prisma.group_members.findFirst({
        where: { group_id: groupId, user_id: userId },
      });
      if (!member) return res.status(403).json({ error: 'Members only' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const posts = await prisma.posts.findMany({
      where: { group_id: groupId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        users: {
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

    // Check if current user liked each post
    let likedPostIds = new Set();
    if (userId) {
      const likes = await prisma.likes.findMany({
        where: { post_id: { in: posts.map((p) => p.id) }, user_id: userId },
        select: { post_id: true },
      });
      likedPostIds = new Set(likes.map((l) => l.post_id.toString()));
    }

    const result = posts.map((p) => ({
      ...p,
      username: p.users.username,
      full_name: p.users.full_name,
      avatar_url: p.users.avatar_url,
      is_verified: p.users.is_verified,
      liked_by_me: likedPostIds.has(p.id.toString()),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Invite friends to a group ───────────────────────────────────────────────

async function inviteToGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { user_ids } = req.body; // array of user IDs to invite
    const groupId = BigInt(id);

    if (!Array.isArray(user_ids) || user_ids.length === 0)
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    if (user_ids.length > 20)
      return res.status(400).json({ error: 'Cannot invite more than 20 users at once' });

    // Validate all user_ids are integers
    if (!user_ids.every((uid) => Number.isInteger(uid) && uid > 0)) {
      return res.status(400).json({ error: 'All user_ids must be positive integers' });
    }

    // Inviter must be a member
    const member = await prisma.group_members.findFirst({
      where: { group_id: groupId, user_id: BigInt(req.user.id) },
    });
    if (!member) return res.status(403).json({ error: 'You must be a member to invite others' });

    const group = await prisma.groups.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Batch check: find which user_ids are already members
    const existingMembers = await prisma.group_members.findMany({
      where: { group_id: groupId, user_id: { in: user_ids.map((uid) => BigInt(uid)) } },
      select: { user_id: true },
    });
    const memberSet = new Set(existingMembers.map((r) => Number(r.user_id)));

    const results = [];
    const toInvite = user_ids.filter((uid) => !memberSet.has(uid));

    // Mark already-members
    for (const uid of user_ids) {
      if (memberSet.has(uid)) {
        results.push({ user_id: uid, status: 'already_member' });
      }
    }

    // Batch invite the rest
    for (const uid of toInvite) {
      await prisma.group_invites.upsert({
        where: { group_id_invitee_id: { group_id: groupId, invitee_id: BigInt(uid) } },
        update: { status: 'pending', inviter_id: BigInt(req.user.id) },
        create: {
          group_id: groupId,
          inviter_id: BigInt(req.user.id),
          invitee_id: BigInt(uid),
          status: 'pending',
        },
      });

      // Send in-app notification
      await emitNotification(uid, {
        type: 'group_invite',
        actor_id: req.user.id,
        group_id: parseInt(id),
      });

      results.push({ user_id: uid, status: 'invited' });
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
}

async function respondToInvite(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const groupId = BigInt(id);
    const userId = BigInt(req.user.id);

    if (!['accept', 'decline'].includes(action))
      return res.status(400).json({ error: 'action must be accept or decline' });

    const invite = await prisma.group_invites.findFirst({
      where: { group_id: groupId, invitee_id: userId, status: 'pending' },
    });
    if (!invite) return res.status(404).json({ error: 'No pending invite found' });

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await prisma.group_invites.update({
      where: { id: invite.id },
      data: { status: newStatus },
    });

    if (action === 'accept') {
      await prisma.group_members.upsert({
        where: { group_id_user_id: { group_id: groupId, user_id: userId } },
        update: {},
        create: { group_id: groupId, user_id: userId, role: 'member' },
      });
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  listGroups,
  joinLeaveGroup,
  listJoinRequests,
  respondToJoinRequest,
  getGroupPosts,
  inviteToGroup,
  respondToInvite,
};
