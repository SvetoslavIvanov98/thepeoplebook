const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { follow, getFollowers, getFollowing } = require('../controllers/follow.controller');

router.post('/:userId/toggle', authenticate, follow);
router.get('/:userId/followers', authenticate, getFollowers);
router.get('/:userId/following', authenticate, getFollowing);

module.exports = router;
