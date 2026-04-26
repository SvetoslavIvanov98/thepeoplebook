const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
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

    const stored = await prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!stored || stored.expires_at < new Date()) {
      if (stored) {
        await prisma.refresh_tokens.delete({ where: { token_hash: tokenHash } });
      }
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    await prisma.refresh_tokens.delete({ where: { token_hash: tokenHash } });

    const userIdStr = stored.user_id.toString();
    const newRefresh = authService.signRefresh(userIdStr);
    await authService.storeRefreshToken(userIdStr, newRefresh);
    res.cookie('refresh_token', newRefresh, COOKIE_OPTIONS);
    res.json({ token: authService.signToken(userIdStr) });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await prisma.refresh_tokens.deleteMany({
        where: { token_hash: authService.hashToken(refreshToken) },
      });
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
    const user = await prisma.users.findUnique({
      where: { id: BigInt(req.user.id) },
      select: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        avatar_url: true,
        bio: true,
        is_verified: true,
        role: true,
        is_banned: true,
        created_at: true,
        followers_count: true,
        following_count: true,
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, googleCallback, me };
