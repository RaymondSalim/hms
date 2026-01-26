import {Prisma, PrismaClient} from '@prisma/client';
import QueryEvent = Prisma.QueryEvent;

const prismaClientSingleton = () => {
    const shouldLog = !(["production", "test"].includes(process.env.NODE_ENV));
    let prisma = new PrismaClient({
        log: shouldLog ? [
            {
                emit: 'event',
                level: 'query',
            },
            'info', 'warn', 'error'
        ] : undefined,
    });

    if (shouldLog) {
        // @ts-expect-error due to conditional block for logging (L5)
        prisma.$on('query', (e: QueryEvent) => {
            console.groupCollapsed('Query: ' + e.query);
            console.log('Params: ' + e.params);
            console.log('Duration: ' + e.duration + 'ms');
            console.groupEnd();
        });
    }

    return prisma;
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
