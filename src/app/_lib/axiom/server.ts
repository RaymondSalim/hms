import axiomClient from '@/app/_lib/axiom/axiom';
import {AxiomJSTransport, ConsoleTransport, Logger} from '@axiomhq/logging';
import {createAxiomRouteHandler, nextJsFormatters} from '@axiomhq/nextjs';
import {addRequestId, addStaticFields} from "@/app/_lib/axiom/formatter";
import {requestIdStorage} from "@/app/_lib/request-context";
import type {NextRequest} from "next/server";

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
    formatters: [...nextJsFormatters, addStaticFields, addRequestId],
});

const _withAxiom = createAxiomRouteHandler(serverLogger);

/**
 * Wraps a route handler with both Axiom logging and request ID context (ALS).
 * Use this instead of raw withAxiom for API routes.
 */
export function withAxiom(handler: (req: any, ...args: any[]) => Promise<Response>) {
    return _withAxiom((req: NextRequest | Request, ...args: any[]) => {
        const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
        return requestIdStorage.run(requestId, () => handler(req, ...args));
    });
}
