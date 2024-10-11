import {PrismaClient} from '@prisma/client';
import {DeepMockProxy, mockDeep, mockReset} from 'jest-mock-extended';

import prisma from '../src/app/_lib/primsa';
import {beforeEach, describe, test} from "@jest/globals";

// @ts-expect-error
jest.mock('../src/app/_lib/primsa', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

describe("", () => {
  test("", () => {});
});

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock: DeepMockProxy<PrismaClient> = prisma as unknown as DeepMockProxy<PrismaClient>;
