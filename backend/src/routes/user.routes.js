const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { cache } = require('../middleware/cache.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');
const {
  getProfile,
  updateProfile,
  getSuggestedUsers,
  getUserPosts,
  deleteAccount,
  exportMyData,
} = require('../controllers/user.controller');

router.get('/suggested', authenticate, cache(300), getSuggestedUsers);
router.get('/me/export', authenticate, exportMyData);
router.get('/:username', optionalAuth, cache(60), getProfile);
router.get('/:username/posts', optionalAuth, cache(30), getUserPosts);
router.patch(
  '/me',
  authenticate,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  sanitizeBody('full_name', 'bio'),
  [
    body('full_name').optional().trim().isLength({ max: 60 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  updateProfile
);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
