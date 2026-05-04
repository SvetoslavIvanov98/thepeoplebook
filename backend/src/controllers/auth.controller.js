const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const redis = require('../config/redis');
const authService = require('../services/auth.service');

// H-2: sameSite 'strict' prevents the refresh token cookie from being sent
// on any cross-site request (including form-based CSRF attacks).
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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

// C-2: Instead of putting the access token in the URL fragment (browser history exposure),
// we generate a random one-time code stored in Redis for 60 seconds, redirect the browser
// to /auth/callback?code=<code>, and let the frontend exchange it via POST /api/auth/exchange.
const googleCallback = async (req, res) => {
  try {
    const code = crypto.randomBytes(32).toString('hex');
    const userId = req.user.id.toString();

    // Store the code → userId mapping for 60 seconds
    if (redis.isReady) {
      await redis.setEx(`oauth_code:${code}`, 60, userId);
    } else {
      // Fallback if Redis is unavailable: sign tokens and redirect using a very short-lived
      // access token in a query param (not ideal but better than being completely broken).
      const token = authService.signToken(userId);
      const refreshToken = authService.signRefresh(userId);
      await authService.storeRefreshToken(userId, refreshToken);
      res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?code=${code}`);
  } catch (_) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
  }
};

// POST /api/auth/exchange  { code: '<one-time code>' }
// Exchanges the ephemeral OAuth code for real tokens. The code is consumed on first use.
const exchangeCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !/^[0-9a-f]{64}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    if (!redis.isReady) {
      return res.status(503).json({ error: 'Auth service temporarily unavailable' });
    }

    const redisKey = `oauth_code:${code}`;
    const userId = await redis.get(redisKey);
    if (!userId) {
      return res.status(401).json({ error: 'Code expired or already used' });
    }

    // Consume the code immediately (one-time use)
    await redis.del(redisKey);

    const token = authService.signToken(userId);
    const refreshToken = authService.signRefresh(userId);
    await authService.storeRefreshToken(userId, refreshToken);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
    res.json({ token });
  } catch (err) {
    next(err);
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

module.exports = { register, login, refresh, logout, googleCallback, exchangeCode, me };
