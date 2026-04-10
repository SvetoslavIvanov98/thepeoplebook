const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { createGroup, getGroup, joinLeaveGroup, getGroupPosts } = require('../controllers/group.controller');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');

router.post('/', authenticate, upload.single('cover'), [body('name').trim().notEmpty().isLength({ max: 80 }), validate], createGroup);
router.get('/:id', getGroup);
router.post('/:id/membership', authenticate, joinLeaveGroup);
router.get('/:id/posts', getGroupPosts);

module.exports = router;
