const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { validate } = require('../middleware/validate.middleware');
const { follow, getFollowers, getFollowing } = require('../controllers/follow.controller');

router.post('/:userId/toggle', authenticate, paramInt('userId'), validate, follow);
router.get('/:userId/followers', authenticate, paramInt('userId'), validate, getFollowers);
router.get('/:userId/following', authenticate, paramInt('userId'), validate, getFollowing);

module.exports = router;
