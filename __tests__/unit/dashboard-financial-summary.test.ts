import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {DeepMockProxy, mockDeep, mockReset} from "jest-mock-extended";
import {PrismaClient} from "@prisma/client";

import {getGroupedIncomeExpense, getRecentTransactions} from "@/app/_db/dashboard";
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
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(4);
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
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(4);
  });
});

describe("getGroupedIncomeExpense deposit split", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.transaction.findMany.mockResolvedValue([] as any);
    prismaMock.transaction.aggregate.mockResolvedValue({ _min: { date: null } } as any);
    jest.useFakeTimers().setSystemTime(new Date("2024-07-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("when splitDeposit is true, main income/expense queries exclude Deposit category", async () => {
    await getGroupedIncomeExpense(
      { type: "custom", range: { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-03") } },
      undefined,
      true
    );

    const incomeCalls = prismaMock.transaction.findMany.mock.calls.filter(
      (c) => c[0]?.where?.type === "INCOME" && c[0]?.where?.category
    );
    const expenseCalls = prismaMock.transaction.findMany.mock.calls.filter(
      (c) => c[0]?.where?.type === "EXPENSE" && c[0]?.where?.category
    );
    expect(incomeCalls.length).toBeGreaterThanOrEqual(1);
    expect(expenseCalls.length).toBeGreaterThanOrEqual(1);
    expect(incomeCalls[0][0]?.where?.category).toEqual({ not: "Deposit" });
    expect(expenseCalls[0][0]?.where?.category).toEqual({ not: "Deposit" });
  });

  test("when splitDeposit is true, result includes deposit.income and deposit.expense aligned to labels", async () => {
    const result = await getGroupedIncomeExpense(
      { type: "custom", range: { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-03") } },
      undefined,
      true
    );

    expect(result.deposit).toBeDefined();
    expect(result.deposit!.income).toHaveLength(result.labels.length);
    expect(result.deposit!.expense).toHaveLength(result.labels.length);
    expect(Array.isArray(result.deposit!.income[0])).toBe(true);
    expect(Array.isArray(result.deposit!.expense[0])).toBe(true);
  });

  test("when splitDeposit is false, result still includes deposit arrays", async () => {
    const result = await getGroupedIncomeExpense(
      { type: "custom", range: { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-03") } },
      undefined,
      false
    );

    expect(result.deposit).toBeDefined();
    expect(result.deposit!.income).toHaveLength(result.labels.length);
    expect(result.deposit!.expense).toHaveLength(result.labels.length);
  });
});

describe("getGroupedIncomeExpense locationID", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.transaction.findMany.mockResolvedValue([] as any);
    prismaMock.transaction.aggregate.mockResolvedValue({ _min: { date: null } } as any);
    jest.useFakeTimers().setSystemTime(new Date("2024-07-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("passes location_id to transaction findMany and aggregate when provided", async () => {
    await getGroupedIncomeExpense(
      { type: "custom", range: { startDate: new Date("2024-01-01"), endDate: new Date("2024-01-03") } },
      42,
      false
    );

    const findManyCalls = prismaMock.transaction.findMany.mock.calls;
    findManyCalls.forEach((call) => {
      expect(call[0]?.where?.location_id).toBe(42);
    });
  });
});

describe("getRecentTransactions", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.transaction.findMany.mockResolvedValue([] as any);
  });

  test("when includeDeposit is true, does not filter by category (deposits included)", async () => {
    await getRecentTransactions(undefined, true);

    const call = prismaMock.transaction.findMany.mock.calls[0][0];
    expect(call?.where?.category).toBeUndefined();
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: "desc" },
        take: 10,
      })
    );
  });

  test("when includeDeposit is false, excludes Deposit category", async () => {
    await getRecentTransactions(undefined, false);

    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { not: "Deposit" },
        }),
        orderBy: { date: "desc" },
        take: 10,
      })
    );
  });

  test("passes location_id to findMany when provided", async () => {
    await getRecentTransactions(99, false);

    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ location_id: 99 }),
      })
    );
  });
});

