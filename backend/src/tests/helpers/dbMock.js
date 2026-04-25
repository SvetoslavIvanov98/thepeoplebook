/**
 * Helper to mock pg Pool query results.
 * Usage:
 * const { mockQuery } = require('../helpers/dbMock');
 * const db = require('../../config/db');
 *
 * jest.mock('../../config/db', () => ({
 *   query: jest.fn(),
 *   pool: { end: jest.fn() }
 * }));
 *
 * mockQuery(db.query, { rows: [{ id: 1 }] });
 */

const mockQuery = (mockFn, result) => {
  mockFn.mockResolvedValueOnce(result);
};

const mockQueryError = (mockFn, error) => {
  mockFn.mockRejectedValueOnce(error);
};

module.exports = { mockQuery, mockQueryError };
