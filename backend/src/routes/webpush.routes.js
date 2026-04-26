const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { subscribe, getPublicKey } = require('../controllers/webpush.controller');

router.post('/subscribe', authenticate, subscribe);
router.get('/vapidPublicKey', getPublicKey);

module.exports = router;
