module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  setupFiles: ['<rootDir>/src/tests/setup.js'],
};
