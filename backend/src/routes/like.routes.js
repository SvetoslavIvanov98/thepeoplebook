const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { toggle, toggleComment } = require('../controllers/like.controller');

router.post('/post/:postId', authenticate, toggle);
router.post('/comment/:commentId', authenticate, toggleComment);

module.exports = router;
