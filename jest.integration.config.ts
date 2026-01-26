/**
 * Jest config for integration tests (real DB).
 */
import type {Config} from 'jest';
import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: './',
});

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://hms_test:hms_test@localhost:55432/hms_test?schema=public';
}

const config: Config = {
  clearMocks: true,
  collectCoverage: false,
  maxWorkers: 1,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/integration/jest.setup.ts',
  ],
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.ts'
  ],
};

export default createJestConfig(config);
