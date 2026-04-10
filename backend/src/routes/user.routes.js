const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { getProfile, updateProfile, getSuggestedUsers, getUserPosts, deleteAccount, exportMyData } = require('../controllers/user.controller');

router.get('/suggested', authenticate, getSuggestedUsers);
router.get('/me/export', authenticate, exportMyData);
router.get('/:username', optionalAuth, getProfile);
router.get('/:username/posts', optionalAuth, getUserPosts);
router.patch('/me', authenticate, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), updateProfile);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
