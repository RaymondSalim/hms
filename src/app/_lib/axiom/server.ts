import axiomClient from '@/app/_lib/axiom/axiom';
import {AxiomJSTransport, ConsoleTransport, Logger} from '@axiomhq/logging';
import {createAxiomRouteHandler, nextJsFormatters} from '@axiomhq/nextjs';
import {addStaticFields} from "@/app/_lib/axiom/formatter";

const shouldLogToAxiom =
    process.env.NODE_ENV === 'production' &&
    Boolean(axiomClient) &&
    Boolean(process.env.AXIOM_DATASET);

export const serverLogger = new Logger({
    transports: shouldLogToAxiom
        ? [
              new AxiomJSTransport({
                  // axiomClient can be null in local; guarded by shouldLogToAxiom
                  // @ts-expect-error - guarded above
                  axiom: axiomClient,
                  dataset: process.env.AXIOM_DATASET as string,
              }),
          ]
        : [new ConsoleTransport({
            prettyPrint: true,
        })],
    formatters: [...nextJsFormatters, addStaticFields],
});

export const withAxiom = createAxiomRouteHandler(serverLogger);
