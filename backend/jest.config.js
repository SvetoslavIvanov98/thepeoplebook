module.exports = {
  clearMocks: true,
  restoreMocks: true,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
    },
  ],
};
