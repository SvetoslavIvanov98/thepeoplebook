const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { paramInt } = require('../middleware/paramInt.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');
const {
  createReport,
  getMyReports,
  getMyDecisions,
  appealDecision,
} = require('../controllers/report.controller');

router.use(authenticate);

router.post(
  '/',
  sanitizeBody('description'),
  [
    body('reason').isIn(['illegal_content', 'harassment', 'spam', 'misinformation', 'other']),
    body('description').optional().trim().isLength({ max: 1000 }),
    validate,
  ],
  createReport
);
router.get('/mine', getMyReports);
router.get('/decisions', getMyDecisions);
router.post(
  '/decisions/:id/appeal',
  paramInt('id'),
  sanitizeBody('note'),
  [body('note').optional().trim().isLength({ max: 1000 }), validate],
  appealDecision
);

module.exports = router;
