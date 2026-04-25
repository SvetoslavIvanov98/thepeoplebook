const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { cache } = require('../middleware/cache.middleware');
const upload = require('../middleware/upload.middleware');
const {
  getProfile,
  updateProfile,
  getSuggestedUsers,
  getUserPosts,
  deleteAccount,
  exportMyData,
} = require('../controllers/user.controller');

router.get('/suggested', authenticate, cache(300), getSuggestedUsers); // Cache suggested users for 5 mins
router.get('/me/export', authenticate, exportMyData);
router.get('/:username', optionalAuth, cache(60), getProfile); // Cache profiles for 1 min
router.get('/:username/posts', optionalAuth, cache(30), getUserPosts); // Cache posts for 30 secs
router.patch(
  '/me',
  authenticate,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  updateProfile
);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
