const { PrismaClient } = require('@prisma/client');
const mock= require("./mock");

const prisma = new PrismaClient();
function main() {
  console.log("Executing seed.js");
  return prisma.role.upsert({
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

(async () => {
  let hasErr = false;
  try {
    await main();
    console.log("seed.js completed");
    await mock()
  } catch (error) {
    console.log("error occured")
    console.error(error);
    process.exitCode = 1
  } finally {
    await prisma.$disconnect();
    console.log("Seeding completed")
  }
})()
