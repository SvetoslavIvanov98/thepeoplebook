const router = require('express').Router();
const { query } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { search } = require('../controllers/search.controller');

router.get('/', [query('q').optional().trim().isLength({ max: 100 }), validate], search);

module.exports = router;
