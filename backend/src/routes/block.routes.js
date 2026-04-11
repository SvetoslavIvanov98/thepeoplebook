const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { toggleBlock, toggleMute, getBlockedUsers, getMutedUsers } = require('../controllers/block.controller');

router.post('/block/:userId', authenticate, toggleBlock);
router.post('/mute/:userId', authenticate, toggleMute);
router.get('/blocked', authenticate, getBlockedUsers);
router.get('/muted', authenticate, getMutedUsers);

module.exports = router;
