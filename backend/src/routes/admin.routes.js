const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const {
  getStats, getUsers, setUserRole, setBan,
  getPosts, deletePost, getGroups, deleteGroup,
  getReports, resolveReport, getAppeals, resolveAppeal,
} = require('../controllers/admin.controller');

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id/role', setUserRole);
router.patch('/users/:id/ban', setBan);

router.get('/posts', getPosts);
router.delete('/posts/:id', deletePost);

router.get('/groups', getGroups);
router.delete('/groups/:id', deleteGroup);

router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);

router.get('/appeals', getAppeals);
router.post('/appeals/:id/resolve', resolveAppeal);

module.exports = router;
