/**
 * Shared SQL fragments for posts with repost support.
 * Eliminates the duplicated 30-line SELECT across getFeed, getPost, getByHashtag, getUserPosts.
 */

const POST_SELECT_COLUMNS = `
  p.id, p.content, p.media_urls, p.hashtags, p.created_at, p.edited_at, p.repost_id,
  u.id AS user_id, u.username, u.full_name, u.avatar_url, u.is_verified,
  COALESCE(op.likes_count, p.likes_count) AS likes_count,
  COALESCE(op.comments_count, p.comments_count) AS comments_count,
  COALESCE(op.reposts_count, p.reposts_count) AS reposts_count,
  op.id AS orig_id, op.content AS orig_content, op.media_urls AS orig_media_urls,
  op.created_at AS orig_created_at, op.edited_at AS orig_edited_at,
  ou.id AS orig_user_id, ou.username AS orig_username, ou.full_name AS orig_full_name,
  ou.avatar_url AS orig_avatar_url, ou.is_verified AS orig_is_verified`;

/**
 * Build the liked_by_me and has_reposted expressions based on whether a user is authenticated.
 * @param {number|null} userId
 * @param {string} userParamRef - The $N placeholder that references the user ID
 * @returns {{ likedExpr: string, repostedExpr: string }}
 */
const interactionExprs = (userId, userParamRef) => {
  if (!userId) {
    return { likedExpr: 'FALSE', repostedExpr: 'FALSE' };
  }
  return {
    likedExpr: `EXISTS(SELECT 1 FROM likes WHERE post_id = COALESCE(p.repost_id, p.id) AND user_id = ${userParamRef})`,
    repostedExpr: `EXISTS(SELECT 1 FROM posts WHERE user_id = ${userParamRef} AND repost_id = COALESCE(p.repost_id, p.id) AND deleted_at IS NULL)`,
  };
};

const POST_JOIN_CLAUSES = `
  JOIN users u ON u.id = p.user_id
  LEFT JOIN posts op ON op.id = p.repost_id AND op.deleted_at IS NULL
  LEFT JOIN users ou ON ou.id = op.user_id`;

/** Validates that a string is a safe PostgreSQL positional parameter placeholder like $1, $3. */
const PARAM_REF_RE = /^\$\d+$/;

/** Whitelist of safe ORDER BY expressions. */
const ALLOWED_ORDER_BY = new Set(['p.created_at DESC', 'p.created_at ASC']);

/**
 * Build a full post SELECT query with user-specific interaction fields.
 * @param {object} opts
 * @param {string} opts.where - Additional WHERE clauses (must start with AND if any)
 * @param {number|null} opts.userId - Current user ID or null
 * @param {string} opts.userParamRef - Param placeholder for user ID (e.g. '$3') — must match /^\$\d+$/
 * @param {string} [opts.orderBy] - ORDER BY clause — must be an allowed value
 * @param {string} [opts.limitRef] - Param placeholder for LIMIT — must match /^\$\d+$/
 * @param {string} [opts.extraJoins] - Additional JOIN clauses
 * @returns {string}
 */
const buildPostQuery = ({
  where = '',
  userId = null,
  userParamRef = '$1',
  orderBy = 'p.created_at DESC',
  limitRef = '',
  extraJoins = '',
}) => {
  // ── Security: validate interpolated values before injecting into raw SQL ──
  if (!PARAM_REF_RE.test(userParamRef)) {
    throw new Error(`Invalid userParamRef: "${userParamRef}"`);
  }
  if (limitRef && !PARAM_REF_RE.test(limitRef)) {
    throw new Error(`Invalid limitRef: "${limitRef}"`);
  }
  if (!ALLOWED_ORDER_BY.has(orderBy)) {
    throw new Error(`Invalid orderBy: "${orderBy}"`);
  }

  const { likedExpr, repostedExpr } = interactionExprs(userId, userParamRef);
  return `SELECT ${POST_SELECT_COLUMNS},
              ${likedExpr} AS liked_by_me,
              ${repostedExpr} AS has_reposted
       FROM posts p
       ${POST_JOIN_CLAUSES}
       ${extraJoins}
       WHERE p.deleted_at IS NULL ${where}
       ORDER BY ${orderBy}
       ${limitRef ? `LIMIT ${limitRef}` : ''}`;
};

module.exports = { POST_SELECT_COLUMNS, POST_JOIN_CLAUSES, interactionExprs, buildPostQuery };
