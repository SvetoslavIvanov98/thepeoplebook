const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { getFeed, createPost, getPost, deletePost, repost, getByHashtag } = require('../controllers/post.controller');

router.get('/feed', authenticate, getFeed);
router.get('/hashtag/:tag', optionalAuth, getByHashtag);
router.post('/', authenticate, upload.array('media', 4), [
  body('content').optional().trim().isLength({ max: 5000 }),
  body('hashtags').optional().isString(),
  validate,
], createPost);
router.get('/:id', optionalAuth, getPost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/repost', authenticate, repost);

module.exports = router;
