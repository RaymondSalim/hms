import prisma from '@/app/_lib/primsa';

export type BaseFixtures = {
  locationId: number;
  roomStatusId: number;
  roomTypeId: number;
  roomId: number;
  bookingStatusId: number;
  durationId: number;
  tenantId: string;
};

export async function cleanupDatabase() {
  await prisma.paymentBill.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.bookingAddOn.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.checkInOutLog.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.guestStay.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.addOnPricing.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.roomTypeDuration.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomStatus.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.bookingStatus.deleteMany();
  await prisma.duration.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.location.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.paymentStatus.deleteMany();
}

export async function seedBaseFixtures(): Promise<BaseFixtures> {
  const location = await prisma.location.create({
    data: {
      name: 'Lokasi Test',
      address: 'Alamat Test',
    },
  });

  const roomStatus = await prisma.roomStatus.create({
    data: {
      status: 'Tersedia',
    },
  });

  const roomType = await prisma.roomType.create({
    data: {
      type: 'Single Test',
      description: 'Kamar uji',
    },
  });

  const room = await prisma.room.create({
    data: {
      room_number: '101',
      location_id: location.id,
      status_id: roomStatus.id,
      room_type_id: roomType.id,
    },
  });

  const bookingStatus = await prisma.bookingStatus.create({
    data: {
      status: 'Aktif',
    },
  });

  const duration = await prisma.duration.create({
    data: {
      duration: '3 Bulan',
      month_count: 3,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Tenant Test',
      id_number: 'ID-TEST-001',
      email: 'tenant@test.local',
      phone: '0800000000',
    },
  });

  return {
    locationId: location.id,
    roomStatusId: roomStatus.id,
    roomTypeId: roomType.id,
    roomId: room.id,
    bookingStatusId: bookingStatus.id,
    durationId: duration.id,
    tenantId: tenant.id,
  };
}

export async function seedAddonFixtures(locationId: number) {
  const addOn = await prisma.addOn.create({
    data: {
      name: 'Internet Test',
      description: 'Addon uji',
      requires_input: false,
      location_id: locationId,
    },
  });

  await prisma.addOnPricing.createMany({
    data: [
      {
        addon_id: addOn.id,
        interval_start: 0,
        interval_end: 0,
        is_full_payment: true,
        price: 300000,
      },
      {
        addon_id: addOn.id,
        interval_start: 1,
        interval_end: null,
        is_full_payment: false,
        price: 100000,
      },
    ],
  });

  return { addOnId: addOn.id };
}
