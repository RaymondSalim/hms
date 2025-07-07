import {prismaMock} from './singleton_prisma';
import {updateDepositStatus} from '@/app/_db/deposit';
import {Prisma} from '@prisma/client';
import {beforeEach, describe, expect, it} from "@jest/globals";

describe('Deposit Logic', () => {
  beforeEach(() => {
    // Clear mocks
  });

  it('creates a deposit with HELD status', async () => {
    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.create.mockResolvedValue({
      id: 1,
      booking_id: 1,
      amount: new Prisma.Decimal(1000),
      status: 'HELD',
      refunded_at: null,
      applied_at: null,
      refunded_amount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const deposit = await prismaMock.deposit.create({
      data: { booking_id: 1, amount: new Prisma.Decimal(1000), status: 'HELD' }
    });
    expect(deposit.status).toBe('HELD');
    expect(deposit.amount.toString()).toBe('1000');
  });

  it('applies a deposit and updates status correctly', async () => {
    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.findUnique.mockResolvedValue({
      id: 2,
      booking_id: 2,
      amount: new Prisma.Decimal(500),
      status: 'HELD',
      refunded_at: null,
      applied_at: null,
      refunded_amount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      booking: {
        id: 2,
        rooms: {
          id: 1,
          location_id: 1,
          name: 'Room 1',
          room_type_id: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    });

    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.update.mockResolvedValue({
      id: 2,
      booking_id: 2,
      amount: new Prisma.Decimal(500),
      status: 'APPLIED',
      refunded_at: null,
      applied_at: new Date(),
      refunded_amount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await updateDepositStatus({ depositId: 2, newStatus: 'APPLIED' });

    expect(prismaMock.deposit.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 2 },
      data: expect.objectContaining({
        status: 'APPLIED',
        applied_at: expect.any(Date)
      })
    }));
  });

  it('partially refunds a deposit and updates status correctly', async () => {
    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.findUnique.mockResolvedValue({
      id: 3,
      booking_id: 3,
      amount: new Prisma.Decimal(800),
      status: 'HELD',
      refunded_at: null,
      applied_at: null,
      refunded_amount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      booking: {
        id: 3,
        rooms: {
          id: 1,
          location_id: 1,
          name: 'Room 1',
          room_type_id: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    });

    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.update.mockResolvedValue({
      id: 3,
      booking_id: 3,
      amount: new Prisma.Decimal(800),
      status: 'PARTIALLY_REFUNDED',
      refunded_at: new Date(),
      applied_at: null,
      refunded_amount: new Prisma.Decimal(300),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await updateDepositStatus({ depositId: 3, newStatus: 'PARTIALLY_REFUNDED', refundedAmount: new Prisma.Decimal(300) });

    expect(prismaMock.deposit.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 3 },
      data: expect.objectContaining({
        status: 'PARTIALLY_REFUNDED',
        refunded_amount: new Prisma.Decimal(300),
        refunded_at: expect.any(Date)
      })
    }));
  });

  it('fully refunds a deposit and updates status correctly', async () => {
    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.findUnique.mockResolvedValue({
      id: 4,
      booking_id: 4,
      amount: new Prisma.Decimal(900),
      status: 'HELD',
      refunded_at: null,
      applied_at: null,
      refunded_amount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      booking: {
        id: 4,
        rooms: {
          id: 1,
          location_id: 1,
          name: 'Room 1',
          room_type_id: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    });

    // @ts-expect-error mockResolvedValue undefined
    prismaMock.deposit.update.mockResolvedValue({
      id: 4,
      booking_id: 4,
      amount: new Prisma.Decimal(900),
      status: 'REFUNDED',
      refunded_at: new Date(),
      applied_at: null,
      refunded_amount: new Prisma.Decimal(900),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await updateDepositStatus({ depositId: 4, newStatus: 'REFUNDED', refundedAmount: new Prisma.Decimal(900) });

    expect(prismaMock.deposit.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 4 },
      data: expect.objectContaining({
        status: 'REFUNDED',
        refunded_amount: new Prisma.Decimal(900),
        refunded_at: expect.any(Date)
      })
    }));
  });
});
