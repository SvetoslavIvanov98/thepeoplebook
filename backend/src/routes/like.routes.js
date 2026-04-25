const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { validate } = require('../middleware/validate.middleware');
const { toggle, toggleComment } = require('../controllers/like.controller');

router.post('/post/:postId', authenticate, paramInt('postId'), validate, toggle);
router.post('/comment/:commentId', authenticate, paramInt('commentId'), validate, toggleComment);

module.exports = router;
