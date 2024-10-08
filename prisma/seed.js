const { PrismaClient } = require('@prisma/client');
const {mock} = require("./mock");

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
})
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Params: ' + e.params)
  console.log('Duration: ' + e.duration + 'ms')
})

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
}

main()
    .then(mock)
    .then(async () => {
      console.log("success, disconnecting client")
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      console.log("error, disconnecting client")
      await prisma.$disconnect();
      process.exit(1);
    });
