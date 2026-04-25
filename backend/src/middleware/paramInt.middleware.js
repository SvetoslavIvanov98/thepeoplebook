const { param } = require('express-validator');

/**
 * Validates that a route parameter is a positive integer.
 * Usage: router.get('/:id', paramInt('id'), ...)
 */
const paramInt = (name) =>
  param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`).toInt();

module.exports = { paramInt };
