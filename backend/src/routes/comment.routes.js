const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getComments, addComment, deleteComment } = require('../controllers/comment.controller');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');

router.get('/post/:postId', getComments);
router.post('/post/:postId', authenticate, [body('content').trim().notEmpty().isLength({ max: 1000 }), validate], addComment);
router.delete('/:id', authenticate, deleteComment);

module.exports = router;
