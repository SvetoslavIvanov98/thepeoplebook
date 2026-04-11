const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
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
router.post('/', authenticate, upload.single('cover'), [nameRule, privacyRule, validate], createGroup);
router.get('/:id', optionalAuth, getGroup);
router.put('/:id', authenticate, upload.single('cover'), [nameRule.optional(), privacyRule, validate], updateGroup);
router.delete('/:id', authenticate, deleteGroup);
router.post('/:id/membership', authenticate, joinLeaveGroup);
router.get('/:id/requests', authenticate, listJoinRequests);
router.post('/:id/requests/:requestId', authenticate, [body('action').isIn(['approve', 'deny']), validate], respondToJoinRequest);
router.get('/:id/posts', optionalAuth, getGroupPosts);
router.post('/:id/invite', authenticate, [body('user_ids').isArray({ min: 1, max: 20 }), validate], inviteToGroup);
router.post('/:id/invite/respond', authenticate, [body('action').isIn(['accept', 'decline']), validate], respondToInvite);

module.exports = router;
