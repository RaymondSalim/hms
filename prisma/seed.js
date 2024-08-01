const { PrismaClient } = require('@prisma/client');
const {mock} = require("./mock");

const prisma = new PrismaClient();
async function main() {
  console.log("Executing seed.js");
  prisma.role.upsert({
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
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
