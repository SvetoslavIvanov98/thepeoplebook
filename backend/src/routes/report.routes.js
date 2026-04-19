const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { createReport, getMyReports, getMyDecisions, appealDecision } = require('../controllers/report.controller');

router.use(authenticate);

router.post('/', createReport);
router.get('/mine', getMyReports);
router.get('/decisions', getMyDecisions);
router.post('/decisions/:id/appeal', appealDecision);

module.exports = router;
