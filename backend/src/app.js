// BigInt JSON serialization support for Prisma
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const path = require('path');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const { requestLogger } = require('./middleware/requestLogger.middleware');

require('./config/passport');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const likeRoutes = require('./routes/like.routes');
const followRoutes = require('./routes/follow.routes');
const notificationRoutes = require('./routes/notification.routes');
const messageRoutes = require('./routes/message.routes');
const storyRoutes = require('./routes/story.routes');
const groupRoutes = require('./routes/group.routes');
const searchRoutes = require('./routes/search.routes');
const mediaRoutes = require('./routes/media.routes');
const statsRoutes = require('./routes/stats.routes');
const blockRoutes = require('./routes/block.routes');
const adminRoutes = require('./routes/admin.routes');
const reportRoutes = require('./routes/report.routes');
const webpushRoutes = require('./routes/webpush.routes');

const app = express();

// Trust first proxy (nginx) so express-rate-limit reads X-Forwarded-For correctly
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return cb(null, true);
      const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
      if (allowed.some((u) => origin.startsWith(u.trim()))) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Request logging — structured logging via Winston
app.use(requestLogger);

// Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', blockRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/webpush', webpushRoutes);

// Serve local uploads directory (dev only — S3 is used in production)
if (!process.env.LINODE_S3_BUCKET) {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  app.use('/uploads', express.static(uploadDir));
}

// Deep health check — verifies DB and Redis connectivity
app.get('/health', async (_req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString() };
  const checks = {};

  // Check database
  try {
    const prisma = require('./config/prisma');
    const start = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    checks.database = { status: 'ok', latency: `${Date.now() - start}ms` };
  } catch (err) {
    checks.database = { status: 'error', message: err.message };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redis = require('./config/redis');
    if (redis.isReady) {
      const start = Date.now();
      await redis.ping();
      checks.redis = { status: 'ok', latency: `${Date.now() - start}ms` };
    } else {
      checks.redis = { status: 'disconnected' };
      health.status = 'degraded';
    }
  } catch (err) {
    checks.redis = { status: 'error', message: err.message };
    health.status = 'degraded';
  }

  health.checks = checks;
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Sentry error handler (must be before any other error middleware and after all controllers)
const Sentry = require('@sentry/node');
Sentry.setupExpressErrorHandler(app);

// Global error handler
app.use((err, _req, res, _next) => {
  if (err.isOperational) {
    logger.error(`Operational Error: ${err.message}`);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error('Unexpected Error:', err);
  const status = err.status || 500;
  // Do not leak internal error details in production
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

module.exports = app;
