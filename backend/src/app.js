const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const path = require('path');

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

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

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

// Passport
app.use(passport.initialize());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  // Do not leak internal error details in production
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

module.exports = app;
