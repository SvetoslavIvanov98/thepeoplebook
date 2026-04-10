const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { createStory, getFeedStories, deleteStory } = require('../controllers/story.controller');

router.get('/feed', authenticate, getFeedStories);
router.post('/', authenticate, upload.single('media'), createStory);
router.delete('/:id', authenticate, deleteStory);

module.exports = router;
