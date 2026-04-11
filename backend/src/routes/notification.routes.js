const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getNotifications, markRead, registerPushToken, removePushToken } = require('../controllers/notification.controller');

router.get('/', authenticate, getNotifications);
router.patch('/read', authenticate, markRead);
router.post('/push-token', authenticate, registerPushToken);
router.delete('/push-token', authenticate, removePushToken);

module.exports = router;
