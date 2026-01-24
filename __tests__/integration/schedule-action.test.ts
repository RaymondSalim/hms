import {afterAll, beforeEach, describe, expect, it} from '@jest/globals';
import prisma from '@/app/_lib/primsa';
import {cleanupDatabase, seedBaseFixtures} from './helpers';
import {upsertEventAction} from '@/app/(internal)/(dashboard_layout)/schedule/create/event-action';
import {
  deleteCalendarEvent,
  getCalendarEvents
} from '@/app/(internal)/(dashboard_layout)/schedule/calendar/calendar-action';
import {CalenderEventTypes, CheckInOutType} from '@/app/(internal)/(dashboard_layout)/bookings/enum';

const utcDate = (
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
) => new Date(Date.UTC(year, monthIndex, day, hour, minute, 0));

describe('integrasi aksi jadwal', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('membuat event normal', async () => {
    const start = utcDate(2025, 0, 10, 9, 0);
    const end = utcDate(2025, 0, 10, 10, 0);

    const result = await upsertEventAction({
      title: 'Meeting Tim',
      start,
      end,
      allDay: false,
      recurring: false,
      backgroundColor: '#000000',
    } as any);

    expect(result).toHaveProperty('success');

    const event = await prisma.event.findFirst({ where: { title: 'Meeting Tim' } });
    expect(event?.allDay).toBe(false);
    expect(event?.start.toISOString()).toBe(start.toISOString());
    expect(event?.end?.toISOString()).toBe(end.toISOString());
  });

  it('membuat event all day tanpa akhir', async () => {
    const start = utcDate(2025, 0, 12);

    const result = await upsertEventAction({
      title: 'Hari Libur',
      start,
      end: null,
      allDay: true,
      recurring: false,
    } as any);

    expect(result).toHaveProperty('success');

    const event = await prisma.event.findFirst({ where: { title: 'Hari Libur' } });
    expect(event?.allDay).toBe(true);
    expect(event?.end).toBeNull();
  });

  it('membuat event berulang dengan groupId otomatis', async () => {
    const start = utcDate(2025, 0, 1, 8, 0);

    const result = await upsertEventAction({
      title: 'Rapat Mingguan',
      start,
      allDay: false,
      recurring: true,
      extendedProps: {
        recurrence: {
          daysOfWeek: [1, 3],
          startRecur: '2025-01-01',
          endRecur: '2025-02-01',
          duration: '01:00',
        },
      },
    } as any);

    expect(result).toHaveProperty('success');

    const event = await prisma.event.findFirst({ where: { title: 'Rapat Mingguan' } });
    const extendedProps = event?.extendedProps as any;
    expect(extendedProps?.recurrence?.groupId).toMatch(/^recurring_/);
  });

  it('memperbarui event yang ada', async () => {
    const start = utcDate(2025, 0, 15, 14, 0);
    const end = utcDate(2025, 0, 15, 15, 0);

    const createResult = await upsertEventAction({
      title: 'Sesi Lama',
      start,
      end,
      allDay: false,
      recurring: false,
    } as any);

    const createdId = (createResult as any).success?.id as number;
    expect(createdId).toBeTruthy();

    const updateResult = await upsertEventAction({
      id: createdId,
      title: 'Sesi Baru',
      start,
      end,
      allDay: false,
      recurring: false,
    } as any);

    expect(updateResult).toHaveProperty('success');

    const updated = await prisma.event.findUnique({ where: { id: createdId } });
    expect(updated?.title).toBe('Sesi Baru');
  });

  it('mengembalikan error saat payload tidak valid', async () => {
    const result = await upsertEventAction({} as any);
    const formatted = (result as any).errors;
    expect(formatted).toBeTruthy();
    expect((formatted?.title?._errors ?? []).length).toBeGreaterThan(0);
  });

  it('mengambil event kalender termasuk booking, all day, dan berulang', async () => {
    const base = await seedBaseFixtures();
    const bookingStart = utcDate(2025, 0, 5);
    const bookingEnd = utcDate(2025, 0, 10);

    const booking = await prisma.booking.create({
      data: {
        room_id: base.roomId,
        start_date: bookingStart,
        end_date: bookingEnd,
        status_id: base.bookingStatusId,
        tenant_id: base.tenantId,
        fee: 1000000,
      },
    });

    const inRangeEvent = await prisma.event.create({
      data: {
        title: 'Acara Normal',
        start: utcDate(2025, 0, 8, 9, 0),
        end: utcDate(2025, 0, 8, 10, 0),
        allDay: false,
        recurring: false,
      },
    });

    const allDayEvent = await prisma.event.create({
      data: {
        title: 'Event Seharian',
        start: utcDate(2025, 0, 9),
        end: null,
        allDay: true,
        recurring: false,
      },
    });

    const recurringEvent = await prisma.event.create({
      data: {
        title: 'Event Berulang',
        start: utcDate(2024, 11, 15, 7, 0),
        end: null,
        allDay: false,
        recurring: true,
        extendedProps: {
          recurrence: {
            daysOfWeek: [2, 4],
            startRecur: '2024-12-15',
            endRecur: '2025-02-15',
            duration: '02:00',
          },
        },
      },
    });

    const outOfRangeEvent = await prisma.event.create({
      data: {
        title: 'Di Luar Rentang',
        start: utcDate(2025, 2, 1),
        end: utcDate(2025, 2, 2),
        allDay: false,
        recurring: false,
      },
    });

    const events = await getCalendarEvents(base.locationId, {
      startDate: utcDate(2025, 0, 1),
      endDate: utcDate(2025, 0, 31),
    });

    const ids = events.map((event) => event.id);
    expect(ids).toContain(`${booking.id}_in`);
    expect(ids).toContain(`${booking.id}_out`);
    expect(ids).toContain(inRangeEvent.id.toString());
    expect(ids).toContain(allDayEvent.id.toString());
    expect(ids).toContain(recurringEvent.id.toString());
    expect(ids).not.toContain(outOfRangeEvent.id.toString());

    const checkInEvent = events.find((event) => event.id === `${booking.id}_in`);
    expect(checkInEvent?.type?.main).toBe(CalenderEventTypes.BOOKING);
    expect(checkInEvent?.type?.sub).toBe(CheckInOutType.CHECK_IN);
    expect(checkInEvent?.allDay).toBe(true);

    const recurringResult = events.find((event) => event.id === recurringEvent.id.toString()) as any;
    expect(recurringResult?.daysOfWeek).toEqual([2, 4]);
    expect(recurringResult?.startRecur).toBe('2024-12-15');
    expect(recurringResult?.endRecur).toBe('2025-02-15');
    expect(recurringResult?.groupId).toBe(`recurring_${recurringEvent.id}`);
  });

  it('menghapus event kalender dan menangani id tidak ditemukan', async () => {
    const event = await prisma.event.create({
      data: {
        title: 'Event Hapus',
        start: utcDate(2025, 0, 20, 10, 0),
        end: utcDate(2025, 0, 20, 11, 0),
        allDay: false,
        recurring: false,
      },
    });

    const deleteResult = await deleteCalendarEvent(event.id);
    expect(deleteResult).toEqual({ success: true });

    const remaining = await prisma.event.findUnique({ where: { id: event.id } });
    expect(remaining).toBeNull();

    const missingDelete = await deleteCalendarEvent(999999);
    expect(missingDelete).toHaveProperty('failure');
  });
});
