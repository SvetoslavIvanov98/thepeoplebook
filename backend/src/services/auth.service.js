const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const AppError = require('../utils/AppError');

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
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), expiresAt]
  );
};

/**
 * Revoke all refresh tokens for a user (used on ban, password change, etc.)
 */
const revokeAllTokens = async (userId) => {
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
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

  const exists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [
    email,
    username,
  ]);
  if (exists.rows.length) {
    throw new AppError('Email or username already taken', 409);
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (username, email, password_hash, full_name, date_of_birth)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, full_name, avatar_url, created_at`,
    [username, email, hash, full_name || null, date_of_birth || null]
  );

  const user = result.rows[0];
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { user, token: signToken(user.id), refreshToken };
};

/**
 * Authenticates a user and returns tokens.
 * Uses explicit column list to avoid leaking sensitive fields.
 */
const loginUser = async (email, password) => {
  const result = await db.query(
    `SELECT id, username, email, full_name, avatar_url, cover_url, bio,
            is_verified, role, is_banned, created_at, password_hash,
            followers_count, following_count
     FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];

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

  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token: signToken(user.id), refreshToken };
};

/**
 * Change a user's password and revoke all existing sessions.
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];

  if (!user || !user.password_hash) {
    throw new AppError('Password change not available for OAuth accounts', 400);
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    hash,
    userId,
  ]);

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
