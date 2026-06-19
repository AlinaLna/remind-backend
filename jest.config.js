module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '<rootDir>/src/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true
};
