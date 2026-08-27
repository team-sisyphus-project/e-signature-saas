/**
 * Unit-test config for @repo/i18n-report.
 *
 * The suite transpiles TypeScript from `apps/web` and `apps/api` as well as this
 * package's own `src/`, because the collector imports both catalogs directly.
 * `transformIgnorePatterns` therefore has to keep matching those out-of-rootDir
 * files — only `node_modules` is skipped.
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
