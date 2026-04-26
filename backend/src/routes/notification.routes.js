const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  getNotifications,
  markRead,
  markOneRead,
  registerPushToken,
  removePushToken,
} = require('../controllers/notification.controller');

router.get('/', authenticate, getNotifications);
router.patch('/read', authenticate, markRead);
router.patch('/:id/read', authenticate, paramInt('id'), validate, markOneRead);
router.post('/push-token', authenticate, registerPushToken);
router.delete('/push-token', authenticate, removePushToken);

module.exports = router;
