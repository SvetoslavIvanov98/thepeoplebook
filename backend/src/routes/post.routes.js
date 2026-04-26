const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');
const {
  getFeed,
  createPost,
  getPost,
  editPost,
  deletePost,
  repost,
  getByHashtag,
} = require('../controllers/post.controller');

router.get('/feed', authenticate, getFeed);
router.get('/hashtag/:tag', optionalAuth, getByHashtag);
router.post(
  '/',
  authenticate,
  upload.array('media', 4),
  sanitizeBody('content'),
  [
    body('content').optional().trim().isLength({ max: 5000 }),
    body('hashtags').optional().isString(),
    validate,
  ],
  createPost
);
router.get('/:id', paramInt('id'), validate, optionalAuth, getPost);
router.patch(
  '/:id',
  authenticate,
  paramInt('id'),
  sanitizeBody('content'),
  [body('content').optional().trim().isLength({ max: 5000 }), validate],
  editPost
);
router.delete('/:id', authenticate, paramInt('id'), validate, deletePost);
router.post('/:id/repost', authenticate, paramInt('id'), validate, repost);

module.exports = router;
