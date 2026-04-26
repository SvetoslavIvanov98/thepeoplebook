const logger = require('../utils/logger');

/**
 * HTTP request logging middleware.
 * Logs method, path, status code, and response time for every request.
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || null,
    });
  });

  next();
};

module.exports = { requestLogger };
