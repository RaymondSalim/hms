import axiomClient from '@/app/_lib/axiom/axiom';
import {AxiomJSTransport, ConsoleTransport, Logger} from '@axiomhq/logging';
import {createAxiomRouteHandler, nextJsFormatters} from '@axiomhq/nextjs';

const shouldLogToAxiom =
    process.env.NODE_ENV === 'production' &&
    Boolean(axiomClient) &&
    Boolean(process.env.NEXT_PUBLIC_AXIOM_DATASET);

export const serverLogger = new Logger({
    transports: shouldLogToAxiom
        ? [
              new AxiomJSTransport({
                  // axiomClient can be null in local; guarded by shouldLogToAxiom
                  // @ts-expect-error - guarded above
                  axiom: axiomClient,
                  dataset: process.env.NEXT_PUBLIC_AXIOM_DATASET as string,
              }),
          ]
        : [new ConsoleTransport()],
    formatters: nextJsFormatters,
});

export const withAxiom = createAxiomRouteHandler(serverLogger);
