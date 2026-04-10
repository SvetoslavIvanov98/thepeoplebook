const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { getProfile, updateProfile, getSuggestedUsers, getUserPosts, deleteAccount } = require('../controllers/user.controller');

router.get('/suggested', authenticate, getSuggestedUsers);
router.get('/:username', optionalAuth, getProfile);
router.get('/:username/posts', optionalAuth, getUserPosts);
router.patch('/me', authenticate, upload.single('avatar'), updateProfile);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
