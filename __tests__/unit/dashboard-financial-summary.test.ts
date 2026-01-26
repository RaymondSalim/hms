import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {DeepMockProxy, mockDeep, mockReset} from "jest-mock-extended";
import {PrismaClient} from "@prisma/client";

import {getGroupedIncomeExpense} from "@/app/_db/dashboard";
import {Period} from "@/app/_enum/financial";
import prisma from "@/app/_lib/primsa";

jest.mock("@/app/_lib/primsa", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("getGroupedIncomeExpense extended periods", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.transaction.findMany.mockResolvedValue([] as any);
    prismaMock.transaction.aggregate.mockResolvedValue({ _min: { date: null } } as any);
    jest.useFakeTimers().setSystemTime(new Date("2024-07-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns per-day labels for short custom range", async () => {
    const result = await getGroupedIncomeExpense({
      type: "custom",
      range: {
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-03T00:00:00.000Z"),
      },
    });

    expect(result.labels).toEqual(["01-01-2024", "02-01-2024", "03-01-2024"]);
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(2);
  });

  test("uses monthly labels for long custom range", async () => {
    const result = await getGroupedIncomeExpense({
      type: "custom",
      range: {
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-06-15T00:00:00.000Z"),
      },
    });

    expect(result.labels).toEqual(["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024"]);
  });

  test("all-time uses earliest transaction date", async () => {
    prismaMock.transaction.aggregate.mockResolvedValue({
      _min: { date: new Date("2023-05-10T00:00:00.000Z") },
    } as any);

    const result = await getGroupedIncomeExpense({ type: "all" });

    expect(prismaMock.transaction.aggregate).toHaveBeenCalled();
    expect(result.labels[0]).toBe("May 2023");
  });

  test("preset periods still work with original signature", async () => {
    const result = await getGroupedIncomeExpense(Period.SEVEN_DAYS, 1);

    expect(result.labels.length).toBeGreaterThanOrEqual(7);
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(2);
  });
});

