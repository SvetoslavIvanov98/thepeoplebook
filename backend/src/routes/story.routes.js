const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const upload = require('../middleware/upload.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createStory,
  getFeedStories,
  deleteStory,
  cleanupExpiredStories,
} = require('../controllers/story.controller');

router.get('/feed', authenticate, getFeedStories);
router.post('/', authenticate, upload.single('media'), createStory);
router.delete('/:id', authenticate, paramInt('id'), validate, deleteStory);

// Admin-only: trigger manual cleanup of expired stories
router.post('/cleanup', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const count = await cleanupExpiredStories();
    res.json({ success: true, cleaned: count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
