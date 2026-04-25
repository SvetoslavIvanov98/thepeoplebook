const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
} = require('../controllers/message.controller');

router.get('/', authenticate, getConversations);
router.post('/with/:userId', authenticate, paramInt('userId'), validate, getOrCreateConversation);
router.get('/:conversationId', authenticate, paramInt('conversationId'), validate, getMessages);
router.post(
  '/:conversationId',
  authenticate,
  paramInt('conversationId'),
  upload.single('media'),
  sanitizeBody('content'),
  [body('content').optional().trim().isLength({ max: 2000 }), validate],
  sendMessage
);

module.exports = router;
