const xss = require('xss');

/**
 * XSS sanitization options — strip all HTML tags from user input.
 * This is intentionally aggressive: social network text fields should
 * never contain HTML. Links are rendered by the frontend, not via raw HTML.
 */
const xssOptions = {
  whiteList: {}, // No tags allowed
  stripIgnoreTag: true, // Strip all unrecognized tags
  stripIgnoreTagBody: ['script', 'style'], // Remove script/style content entirely
};

/**
 * Sanitize specific body fields against XSS attacks.
 * Usage: router.post('/', sanitizeBody('content', 'bio'), handler)
 */
const sanitizeBody = (...fields) => {
  return (req, _res, next) => {
    if (req.body) {
      for (const field of fields) {
        if (typeof req.body[field] === 'string') {
          req.body[field] = xss(req.body[field], xssOptions);
        }
      }
    }
    next();
  };
};

module.exports = { sanitizeBody };
