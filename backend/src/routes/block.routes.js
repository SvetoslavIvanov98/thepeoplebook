const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  toggleBlock,
  toggleMute,
  getBlockedUsers,
  getMutedUsers,
} = require('../controllers/block.controller');

router.post('/block/:userId', authenticate, paramInt('userId'), validate, toggleBlock);
router.post('/mute/:userId', authenticate, paramInt('userId'), validate, toggleMute);
router.get('/blocked', authenticate, getBlockedUsers);
router.get('/muted', authenticate, getMutedUsers);

module.exports = router;
