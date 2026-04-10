const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { getConversations, getOrCreateConversation, getMessages, sendMessage } = require('../controllers/message.controller');

router.get('/', authenticate, getConversations);
router.post('/with/:userId', authenticate, getOrCreateConversation);
router.get('/:conversationId', authenticate, getMessages);
router.post('/:conversationId', authenticate, upload.single('media'), [
  body('content').optional().trim().isLength({ max: 2000 }),
  validate,
], sendMessage);

module.exports = router;
