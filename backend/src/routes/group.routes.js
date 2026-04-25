const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');
const {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  listGroups,
  joinLeaveGroup,
  listJoinRequests,
  respondToJoinRequest,
  getGroupPosts,
  inviteToGroup,
  respondToInvite,
} = require('../controllers/group.controller');

const nameRule = body('name').trim().notEmpty().isLength({ max: 80 });
const privacyRule = body('privacy').optional().isIn(['public', 'private']);

router.get('/', optionalAuth, listGroups);
router.post(
  '/',
  authenticate,
  upload.single('cover'),
  sanitizeBody('name', 'description'),
  [nameRule, privacyRule, validate],
  createGroup
);
router.get('/:id', paramInt('id'), validate, optionalAuth, getGroup);
router.put(
  '/:id',
  authenticate,
  paramInt('id'),
  upload.single('cover'),
  sanitizeBody('name', 'description'),
  [nameRule.optional(), privacyRule, validate],
  updateGroup
);
router.delete('/:id', authenticate, paramInt('id'), validate, deleteGroup);
router.post('/:id/membership', authenticate, paramInt('id'), validate, joinLeaveGroup);
router.get('/:id/requests', authenticate, paramInt('id'), validate, listJoinRequests);
router.post(
  '/:id/requests/:requestId',
  authenticate,
  paramInt('id'),
  paramInt('requestId'),
  [body('action').isIn(['approve', 'deny']), validate],
  respondToJoinRequest
);
router.get('/:id/posts', paramInt('id'), validate, optionalAuth, getGroupPosts);
router.post(
  '/:id/invite',
  authenticate,
  paramInt('id'),
  [body('user_ids').isArray({ min: 1, max: 20 }), validate],
  inviteToGroup
);
router.post(
  '/:id/invite/respond',
  authenticate,
  paramInt('id'),
  [body('action').isIn(['accept', 'decline']), validate],
  respondToInvite
);

module.exports = router;
