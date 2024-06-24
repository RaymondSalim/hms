import {PrismaClient} from '@prisma/client';

declare global {
  var prisma: PrismaClient;
}

let prismaClient: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prismaClient = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: [
        {
          emit: "event",
          level: "query",
        },
      ],
    });
  }
  prismaClient = global.prisma;

  // // @ts-ignore
  // prisma.$on("query", async (e) => {
  //   // @ts-ignore
  //   console.log(`${e.query} ${e.params}`);
  // });
}

export default prismaClient;
