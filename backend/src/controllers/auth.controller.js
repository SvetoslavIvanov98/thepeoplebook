const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authService = require('../services/auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

const register = async (req, res, next) => {
  try {
    const { user, token, refreshToken } = await authService.registerUser(req.body);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token, refreshToken } = await authService.loginUser(email, password);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenHash = authService.hashToken(refreshToken);
    const stored = await db.query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id',
      [tokenHash]
    );
    if (!stored.rows[0]) return res.status(401).json({ error: 'Refresh token revoked or expired' });

    const newRefresh = authService.signRefresh(payload.sub);
    await authService.storeRefreshToken(payload.sub, newRefresh);
    res.cookie('refresh_token', newRefresh, COOKIE_OPTIONS);
    res.json({ token: authService.signToken(payload.sub) });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [
        authService.hashToken(refreshToken),
      ]);
    }
    res.clearCookie('refresh_token', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const googleCallback = async (req, res) => {
  try {
    const token = authService.signToken(req.user.id);
    const refreshToken = authService.signRefresh(req.user.id);
    await authService.storeRefreshToken(req.user.id, refreshToken);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback#token=${token}`);
  } catch (_) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, u.bio, u.is_verified, u.role, u.is_banned, u.created_at,
              u.followers_count,
              u.following_count
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, googleCallback, me };
