import {beforeEach, describe, expect, it} from '@jest/globals';
import prisma from '@/app/_lib/primsa';
import {
  checkInOutAction,
  scheduleEndOfStayAction,
  upsertBookingAction
} from '@/app/(internal)/(dashboard_layout)/bookings/booking-action';
import {getLastDateOfBooking} from '@/app/_lib/util/booking';
import {cleanupDatabase, seedAddonFixtures, seedBaseFixtures} from './helpers';
import {endOfMonth, getDaysInMonth, startOfMonth} from 'date-fns';
import {BillType} from "@prisma/client";
import {CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";

const utcDate = (year: number, monthIndex: number, day: number) => (
  new Date(Date.UTC(year, monthIndex, day, 0, 0, 0))
);

const toUtcDateOnly = (value: Date | null | undefined) => {
  if (!value) return null;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

describe('upsertBookingAction integration', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('creates a fixed-term booking with bills and deposit', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    const result = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      second_resident_fee: 0,
      deposit: { amount: 500000 },
      is_rolling: false,
    } as any);

    expect(result).toHaveProperty('success');

    const booking = await prisma.booking.findFirst({
      where: { tenant_id: base.tenantId },
      include: { bills: { include: { bill_item: true } }, deposit: true },
    });

    expect(booking).toBeTruthy();
    const expectedEndDate = getLastDateOfBooking(startDate, { id: base.durationId, month_count: 3 } as any);
    expect(toUtcDateOnly(booking?.end_date)).toEqual(toUtcDateOnly(expectedEndDate));
    expect(booking?.deposit?.amount.toString()).toBe('500000');

    const bills = (booking?.bills ?? []).sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
    expect(bills).toHaveLength(3);

    for (let i = 0; i < bills.length; i += 1) {
      const billStartDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
      const billEndDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i + 1, 0));
      expect(toUtcDateOnly(bills[i].due_date)).toBe(toUtcDateOnly(billEndDate));

      const rentItem = bills[i].bill_item.find((item) => (
        item.type === 'GENERATED' && item.amount.toString() === '1000000'
      ));
      expect(rentItem).toBeDefined();

      const depositItems = bills[i].bill_item.filter((item) => {
        const related = item.related_id as { deposit_id?: number } | null;
        return Boolean(related?.deposit_id);
      });
      if (i === 0) {
        expect(depositItems).toHaveLength(1);
        expect(depositItems[0].amount.toString()).toBe('500000');
        expect(depositItems[0].type).toEqual(BillType.GENERATED);
      } else {
        expect(depositItems).toHaveLength(0);
      }
    }
  });

  it('creates a rolling booking with addons and deposit item', async () => {
    const base = await seedBaseFixtures();
    const addon = await seedAddonFixtures(base.locationId);
    const startDate = utcDate(2025, 0, 5);

    const result = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1200000,
      deposit: { amount: 300000 },
      is_rolling: true,
      addOns: [
        {
          addon_id: addon.addOnId,
          start_date: startDate,
          end_date: null,
          is_rolling: true,
        },
      ],
    } as any);

    expect(result).toHaveProperty('success');

    const booking = await prisma.booking.findFirst({
      where: { tenant_id: base.tenantId },
      include: { addOns: true, bills: { include: { bill_item: true } }, deposit: true },
    });

    expect(booking?.is_rolling).toBe(true);
    expect(booking?.end_date).toBeNull();
    expect(booking?.addOns.length).toBe(1);
    expect(booking?.deposit?.amount.toString()).toBe('300000');

    const earliestBill = (booking?.bills ?? []).sort((a, b) => a.due_date.getTime() - b.due_date.getTime())[0];
    const firstBillEndDate = endOfMonth(startDate);
    const daysInMonth = getDaysInMonth(startDate);
    const proratedDays = daysInMonth - startDate.getDate() + 1;
    const expectedProratedAmount = ((proratedDays / daysInMonth) * 1200000).toFixed(2);
    const rentItem = earliestBill?.bill_item.find((item) => (
      item.type === 'GENERATED' && item.amount.toString() === expectedProratedAmount
    ));
    expect(rentItem).toBeDefined();

    const addonItem = earliestBill?.bill_item.find((item) => (
      item.type === 'GENERATED' && item.amount.toString() === '300000'
    ));
    expect(addonItem).toBeDefined();

    const depositItem = earliestBill?.bill_item.find((item) => {
      const related = item.related_id as { deposit_id?: number } | null;
      return Boolean(related?.deposit_id);
    });
    expect(depositItem?.amount.toString()).toBe('300000');
    expect(depositItem?.type).toEqual(BillType.GENERATED);
  });

  it('updates a fixed-term booking and regenerates bills', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    const createResult = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      deposit: { amount: 500000 },
      is_rolling: false,
    } as any);

    const bookingId = (createResult as any).success.id;
    const updateResult = await upsertBookingAction({
      id: bookingId,
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1500000,
      deposit: { amount: 600000 },
      is_rolling: false,
    } as any);

    expect(updateResult).toHaveProperty('success');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bills: { include: { bill_item: true } }, deposit: true },
    });

    expect(booking?.deposit?.amount.toString()).toBe('600000');

    const bills = (booking?.bills ?? []).sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
    expect(bills).toHaveLength(3);

    for (let i = 0; i < bills.length; i += 1) {
      const billStartDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
      const billEndDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i + 1, 0));
      const rentItem = bills[i].bill_item.find((item) => (
        item.type === 'GENERATED' && item.amount.toString() === '1500000'
      ));
      expect(rentItem).toBeDefined();
    }

    const firstDepositItem = bills[0].bill_item.find((item) => {
      const related = item.related_id as { deposit_id?: number } | null;
      return Boolean(related?.deposit_id);
    });
    expect(firstDepositItem?.amount.toString()).toBe('600000');
    expect(firstDepositItem?.type).toEqual(BillType.GENERATED);
  });

  it('updates a rolling booking fee and deposit', async () => {
    const base = await seedBaseFixtures();
    const addon = await seedAddonFixtures(base.locationId);
    const startDate = utcDate(2025, 0, 1);

    const createResult = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1100000,
      deposit: { amount: 200000 },
      is_rolling: true,
      addOns: [
        {
          addon_id: addon.addOnId,
          start_date: startDate,
          end_date: null,
          is_rolling: true,
        },
      ],
    } as any);

    const bookingId = (createResult as any).success.id;
    const updateResult = await upsertBookingAction({
      id: bookingId,
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1300000,
      deposit: { amount: 250000 },
      is_rolling: true,
      addOns: [
        {
          addon_id: addon.addOnId,
          start_date: startDate,
          end_date: null,
          is_rolling: true,
        },
      ],
    } as any);

    expect(updateResult).toHaveProperty('success');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bills: { include: { bill_item: true } }, deposit: true, addOns: true },
    });
    // deposit updates are restricted for rolling booking
    expect(booking?.deposit?.amount.toString()).toBe('200000');
    expect(booking?.addOns.length).toBe(1);

    const bills = (booking?.bills ?? []).sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
    const earliestBill = bills[0];
    const depositItem = earliestBill?.bill_item.find((item) => {
      const related = item.related_id as { deposit_id?: number } | null;
      return Boolean(related?.deposit_id);
    });
    expect(depositItem?.amount.toString()).toBe('200000');
    expect(depositItem?.type).toEqual(BillType.GENERATED);

    const nowUtc = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    ));
    const currentMonthStart = startOfMonth(nowUtc);
    const currentMonthEnd = endOfMonth(currentMonthStart);
    const currentMonthBill = bills.find(
      (bill) => toUtcDateOnly(bill.due_date) === toUtcDateOnly(currentMonthEnd)
    );
    expect(currentMonthBill).toBeTruthy();

    const currentRentItem = currentMonthBill?.bill_item.find((item) => (
      item.type === 'GENERATED' && item.amount.eq(1300000)
    ));
    expect(currentRentItem).toBeDefined();
  });

  it('menjadwalkan akhir inap booking rolling mengubah end_date dan status rolling', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);
    const endDate = utcDate(2025, 1, 10);

    const createResult = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: true,
    } as any);

    const bookingId = (createResult as any).success.id;
    const scheduleResult = await scheduleEndOfStayAction({
      bookingId,
      endDate,
    });

    expect(scheduleResult.success).toBe(true);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    expect(booking?.is_rolling).toBe(false);
    expect(toUtcDateOnly(booking?.end_date)).toBe(toUtcDateOnly(endDate));
  });

  it('checkout booking rolling menetapkan end_date dan menonaktifkan rolling', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);
    const endDate = utcDate(2025, 1, 20);

    const createResult = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: true,
    } as any);

    const bookingId = (createResult as any).success.id;
    const checkOutResult = await checkInOutAction({
      booking_id: bookingId,
      action: CheckInOutType.CHECK_OUT,
      eventDate: endDate,
    });

    expect(checkOutResult.success).toBeDefined();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    expect(booking?.is_rolling).toBe(false);
    expect(toUtcDateOnly(booking?.end_date)).toBe(toUtcDateOnly(endDate));
  });

  it('creates a mid-month fixed-term booking with prorated first bill', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 15);

    await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: false,
    } as any);

    const booking = await prisma.booking.findFirst({
      where: { tenant_id: base.tenantId },
      include: { bills: { include: { bill_item: true } } },
    });

    const bills = (booking?.bills ?? []).sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
    expect(bills).toHaveLength(4);

    const daysInMonth = getDaysInMonth(startDate);
    const proratedDays = daysInMonth - startDate.getUTCDate() + 1;
    const expectedProratedAmount = Math.round(1000000 / daysInMonth * proratedDays).toString();

    const firstMonthItem = bills[0].bill_item.find((item) => (
      item.type === 'GENERATED' && item.amount.toString() === expectedProratedAmount
    ));
    expect(firstMonthItem).toBeDefined();

    const fullMonthItem = bills[1].bill_item.find((item) => (
      item.type === 'GENERATED' && item.amount.toString() === '1000000'
    ));
    expect(fullMonthItem).toBeDefined();
  });

  it('includes second resident fee items for fixed-term booking', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      second_resident_fee: 200000,
      is_rolling: false,
    } as any);

    const booking = await prisma.booking.findFirst({
      where: { tenant_id: base.tenantId },
      include: { bills: { include: { bill_item: true } } },
    });

    const firstBill = (booking?.bills ?? []).sort((a, b) => a.due_date.getTime() - b.due_date.getTime())[0];
    const secondResidentItem = firstBill?.bill_item.find((item) => (
      item.type === 'GENERATED' && item.amount.toString() === '200000'
    ));
    expect(secondResidentItem).toBeDefined();
  });

  it('removes deposit when updating fixed-term booking without deposit', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    const createResult = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      deposit: { amount: 500000 },
      is_rolling: false,
    } as any);

    const bookingId = (createResult as any).success.id;
    await upsertBookingAction({
      id: bookingId,
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: false,
    } as any);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { deposit: true, bills: { include: { bill_item: true } } },
    });

    expect(booking?.deposit).toBeNull();
    const depositItems = booking?.bills.flatMap((bill) => bill.bill_item).filter((item) => {
      const related = item.related_id as { deposit_id?: number } | null;
      return Boolean(related?.deposit_id);
    }) ?? [];
    expect(depositItems).toHaveLength(0);
  });

  it('removes rolling add-ons and stops billing them after update', async () => {
    const base = await seedBaseFixtures();
    const addon = await seedAddonFixtures(base.locationId);
    const startDate = utcDate(2025, 0, 1);

    const createResult = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1100000,
      is_rolling: true,
      addOns: [
        {
          addon_id: addon.addOnId,
          start_date: startDate,
          end_date: null,
          is_rolling: true,
        },
      ],
    } as any);

    const bookingId = (createResult as any).success.id;
    await upsertBookingAction({
      id: bookingId,
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1100000,
      is_rolling: true,
      addOns: [],
    } as any);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { addOns: true, bills: { include: { bill_item: true } } },
    });
    expect(booking?.addOns).toHaveLength(0);

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(currentMonthStart);
    const currentMonthBill = (booking?.bills ?? []).find(
      (bill) => toUtcDateOnly(bill.due_date) === toUtcDateOnly(currentMonthEnd)
    );
    const addonItems = currentMonthBill?.bill_item.filter((item) => (
      item.type === 'GENERATED' && item.amount.toString() === '300000'
    )) ?? [];
    expect(addonItems).toHaveLength(0);
  });

  it('accepts fee input as string and persists as number', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: "1500000",
      is_rolling: false,
    } as any);

    const booking = await prisma.booking.findFirst({
      where: { tenant_id: base.tenantId },
      include: { bills: { include: { bill_item: true } } },
    });

    const rentItem = booking?.bills.flatMap((bill) => bill.bill_item).find((item) => (
      item.type === 'GENERATED' && item.amount.toString() === '1500000'
    ));
    expect(rentItem).toBeDefined();
  });

  it('rejects overlapping fixed-term bookings', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: false,
    } as any);

    const result = await upsertBookingAction({
      room_id: base.roomId,
      start_date: utcDate(2025, 1, 1),
      duration_id: base.durationId,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: false,
    } as any);

    expect((result as any).failure).toContain('Pemesanan tumpang tindih');
  });

  it('rejects overlapping rolling bookings', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: true,
    } as any);

    const result = await upsertBookingAction({
      room_id: base.roomId,
      start_date: utcDate(2025, 1, 1),
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: true,
    } as any);

    expect((result as any).failure).toContain('Kamar sudah terisi');
  });

  it('returns validation errors for missing duration on non-rolling booking', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    const result = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: null,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: false,
    } as any);

    expect((result as any).errors?.duration_id?._errors?.[0]).toContain('Duration ID');
  });

  it('returns failure when duration is invalid', async () => {
    const base = await seedBaseFixtures();
    const startDate = utcDate(2025, 0, 1);

    const result = await upsertBookingAction({
      room_id: base.roomId,
      start_date: startDate,
      duration_id: 999999,
      status_id: base.bookingStatusId,
      tenant_id: base.tenantId,
      fee: 1000000,
      is_rolling: false,
    } as any);

    expect((result as any).failure).toBe('Invalid Duration ID');
  });
});
