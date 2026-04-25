const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');
const {
  getStats,
  getUsers,
  setUserRole,
  setBan,
  getPosts,
  deletePost,
  getGroups,
  deleteGroup,
  getReports,
  resolveReport,
  getAppeals,
  resolveAppeal,
} = require('../controllers/admin.controller');

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch(
  '/users/:id/role',
  paramInt('id'),
  [body('role').isIn(['admin', 'user']), validate],
  setUserRole
);
router.patch('/users/:id/ban', paramInt('id'), [body('banned').isBoolean(), validate], setBan);

router.get('/posts', getPosts);
router.delete('/posts/:id', paramInt('id'), validate, deletePost);

router.get('/groups', getGroups);
router.delete('/groups/:id', paramInt('id'), validate, deleteGroup);

router.get('/reports', getReports);
router.post(
  '/reports/:id/resolve',
  paramInt('id'),
  sanitizeBody('reason'),
  [
    body('action_type')
      .optional()
      .isIn(['content_removed', 'account_suspended', 'warning', 'no_action']),
    body('reason').optional().trim().isLength({ max: 2000 }),
    validate,
  ],
  resolveReport
);

router.get('/appeals', getAppeals);
router.post(
  '/appeals/:id/resolve',
  paramInt('id'),
  [body('outcome').isIn(['upheld', 'overturned']), validate],
  resolveAppeal
);

module.exports = router;
