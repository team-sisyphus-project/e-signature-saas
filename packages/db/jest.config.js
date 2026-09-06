/**
 * Unit-test config for @repo/db.
 *
 * Colocated `*.spec.ts` files under `src/` run here. The seed is exercised
 * against an in-memory fake of the Prisma client — no database required.
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
};
