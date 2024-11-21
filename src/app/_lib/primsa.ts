import {Prisma, PrismaClient} from '@prisma/client';
import QueryEvent = Prisma.QueryEvent;

const prismaClientSingleton = () => {
    let prisma = new PrismaClient({
        log: process.env.NODE_ENV != "production" ? [
            {
                emit: 'event',
                level: 'query',
            },
            'info', 'warn', 'error'
        ] : undefined,
    });

    if (process.env.NODE_ENV != "production") {
        // @ts-expect-error due to conditional block for logging (L5)
        prisma.$on('query', (e: QueryEvent) => {
            console.groupCollapsed('Query: ' + e.query);
            console.log('Params: ' + e.params);
            console.log('Duration: ' + e.duration + 'ms');
            console.groupEnd();
        });
    }

    // ["Booking", ["start_date", "end_date"]],
    //                     ["CheckInOutLog", ["event_date"]],
    //                     ["Expense", ["event_date"]],
    //                     ["Bill", ["due_date"]],
    //                     ["Payment", ["payment_date"]],
    //                     ["Report", ["generated_at"]],

    return prisma;
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
