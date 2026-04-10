const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const storeRefreshToken = async (userId, token) => {
  const expiresInDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 30;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), expiresAt]
  );
};

const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name } = req.body;

    const exists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email or username already taken' });

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name, avatar_url, created_at`,
      [username, email, hash, full_name || null]
    );
    const user = result.rows[0];
    const refresh_token = signRefresh(user.id);
    await storeRefreshToken(user.id, refresh_token);
    res.cookie('refresh_token', refresh_token, COOKIE_OPTIONS);
    res.status(201).json({ user, token: signToken(user.id) });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const refresh_token = signRefresh(user.id);
    await storeRefreshToken(user.id, refresh_token);
    const { password_hash, ...safeUser } = user;
    res.cookie('refresh_token', refresh_token, COOKIE_OPTIONS);
    res.json({ user: safeUser, token: signToken(user.id) });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refresh_token = req.cookies?.refresh_token;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify token exists in DB (not revoked) and rotate it
    const tokenHash = hashToken(refresh_token);
    const stored = await db.query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id',
      [tokenHash]
    );
    if (!stored.rows[0]) return res.status(401).json({ error: 'Refresh token revoked or expired' });

    const newRefresh = signRefresh(payload.sub);
    await storeRefreshToken(payload.sub, newRefresh);
    res.cookie('refresh_token', newRefresh, COOKIE_OPTIONS);
    res.json({ token: signToken(payload.sub) });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refresh_token = req.cookies?.refresh_token;
    if (refresh_token) {
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(refresh_token)]);
    }
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const googleCallback = async (req, res) => {
  try {
    const token = signToken(req.user.id);
    const refreshTkn = signRefresh(req.user.id);
    await storeRefreshToken(req.user.id, refreshTkn);
    res.cookie('refresh_token', refreshTkn, COOKIE_OPTIONS);
    // Only pass the short-lived access token in the fragment; refresh token is in HttpOnly cookie
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback#token=${token}`);
  } catch (_) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, u.bio, u.is_verified, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, googleCallback, me };
