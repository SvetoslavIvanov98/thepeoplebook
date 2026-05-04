const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { emailQueue } = require('../queues/email.queue');

const MIN_AGE_YEARS = 16;

/**
 * Safe columns to return to the client — prevents leaking sensitive fields.
 */
const SAFE_USER_COLUMNS = `id, username, email, full_name, avatar_url, cover_url, bio, is_verified, role, is_banned, created_at,
                           followers_count, following_count`;

/**
 * Signs a short-lived access token.
 */
const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

/**
 * Signs a long-lived refresh token.
 */
const signRefresh = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

/**
 * Hashes a token for secure database storage.
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Stores a refresh token hash in the database.
 */
const storeRefreshToken = async (userId, token) => {
  const expiresInDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 30;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await prisma.refresh_tokens.create({
    data: {
      user_id: BigInt(userId),
      token_hash: hashToken(token),
      expires_at: expiresAt,
    },
  });
};

/**
 * Revoke all refresh tokens for a user (used on ban, password change, etc.)
 */
const revokeAllTokens = async (userId) => {
  await prisma.refresh_tokens.deleteMany({
    where: { user_id: BigInt(userId) },
  });
};

/**
 * Registers a new user.
 */
const registerUser = async (userData) => {
  const { username, email, password, full_name, date_of_birth } = userData;

  if (!date_of_birth) {
    throw new AppError('Date of birth is required.', 400);
  }

  const dob = new Date(date_of_birth);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);

  if (isNaN(dob.getTime()) || dob > cutoff) {
    throw new AppError(
      `You must be at least ${MIN_AGE_YEARS} years old to register (GDPR Art. 8).`,
      400
    );
  }

  const exists = await prisma.users.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });
  if (exists) {
    throw new AppError('Email or username already taken', 409);
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.users.create({
    data: {
      username,
      email,
      password_hash: hash,
      full_name: full_name || null,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      full_name: true,
      avatar_url: true,
      created_at: true,
    },
  });

  const refreshToken = signRefresh(user.id.toString());
  await storeRefreshToken(user.id.toString(), refreshToken);

  // Queue welcome email — non-blocking, retried automatically by BullMQ on failure
  await emailQueue.add(
    'welcome',
    { to: user.email, name: user.full_name || user.username },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );

  return { user, token: signToken(user.id.toString()), refreshToken };
};

/**
 * Authenticates a user and returns tokens.
 * Uses explicit column list to avoid leaking sensitive fields.
 */
const loginUser = async (email, password) => {
  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      full_name: true,
      avatar_url: true,
      cover_url: true,
      bio: true,
      is_verified: true,
      role: true,
      is_banned: true,
      created_at: true,
      password_hash: true,
      followers_count: true,
      following_count: true,
    },
  });

  if (!user || !user.password_hash) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.is_banned) {
    throw new AppError('Your account has been suspended', 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  const refreshToken = signRefresh(user.id.toString());
  await storeRefreshToken(user.id.toString(), refreshToken);

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token: signToken(user.id.toString()), refreshToken };
};

/**
 * Change a user's password and revoke all existing sessions.
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.users.findUnique({
    where: { id: BigInt(userId) },
    select: { password_hash: true },
  });

  if (!user || !user.password_hash) {
    throw new AppError('Password change not available for OAuth accounts', 400);
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.users.update({
    where: { id: BigInt(userId) },
    data: {
      password_hash: hash,
      updated_at: new Date(),
    },
  });

  // Revoke all existing sessions for security
  await revokeAllTokens(userId);
};

module.exports = {
  SAFE_USER_COLUMNS,
  registerUser,
  loginUser,
  changePassword,
  signToken,
  signRefresh,
  hashToken,
  storeRefreshToken,
  revokeAllTokens,
};
