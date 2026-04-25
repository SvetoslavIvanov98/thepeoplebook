/**
 * Sanitize a string for safe use in a SQL LIKE pattern.
 * Escapes the special characters %, _, and \ that have meaning in LIKE clauses.
 * This prevents users from injecting wildcard patterns into search queries.
 *
 * Example: sanitizeLike("100%_off\\") => "100\\%\\_off\\\\"
 */
const sanitizeLike = (str) => {
  return str.replace(/[\\%_]/g, '\\$&');
};

module.exports = { sanitizeLike };
