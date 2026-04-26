const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getComments,
  addComment,
  editComment,
  deleteComment,
} = require('../controllers/comment.controller');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');

router.get('/post/:postId', paramInt('postId'), validate, getComments);
router.post(
  '/post/:postId',
  authenticate,
  paramInt('postId'),
  sanitizeBody('content'),
  [body('content').trim().notEmpty().isLength({ max: 1000 }), validate],
  addComment
);
router.patch(
  '/:id',
  authenticate,
  paramInt('id'),
  sanitizeBody('content'),
  [body('content').trim().notEmpty().isLength({ max: 1000 }), validate],
  editComment
);
router.delete('/:id', authenticate, paramInt('id'), validate, deleteComment);

module.exports = router;
