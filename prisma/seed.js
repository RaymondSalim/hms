const { PrismaClient } = require('@prisma/client');
const {mock} = require("./mock");
const {SettingsKey} = require("../src/app/_enum/setting");

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
});

async function main() {
  console.log("Executing seed.js");
  await prisma.role.upsert({
    where: {
      id: 1
    },
    update: {
      name: "Admin",
      description: "Administrator",
    },
    create: {
      id: 1,
      name: "Admin",
      description: "Administrator",
    }
  });
  await prisma.roomStatus.upsert({
    where: {
      id: 1
    },
    update: {
      status: "Dikonfirmasi"
    },
    create: {
      status: "Dikonfirmasi",
    }
  });
  await prisma.bookingStatus.upsert({
    where: {
      id: 1
    },
    update: {
      status: "Dikonfirmasi"
    },
    create: {
      status: "Dikonfirmasi",
    }
  });
  await prisma.paymentStatus.upsert({
    where: {
      id: 1
    },
    update: {
      status: "Dikonfirmasi"
    },
    create: {
      status: "Dikonfirmasi",
    }
  });
  await prisma.setting.upsert({
    where: {
      setting_key: SettingsKey.REGISTRATION_ENABLED
    },
    update: {
      setting_value: "false"
    },
    create: {
      setting_value: "false"
    }
  });
}

main()
    // .then(mock)
    .then(async () => {
      console.log("success, disconnecting client");
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      console.log("error, disconnecting client");
      await prisma.$disconnect();
      process.exit(1);
    });
