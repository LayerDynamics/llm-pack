// jest.config.cjs

module.exports = {
  roots: ['<rootDir>/tests'],
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
};
