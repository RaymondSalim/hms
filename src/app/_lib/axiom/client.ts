'use client';

import {ConsoleTransport, Logger, ProxyTransport} from '@axiomhq/logging';
import {createUseLogger, createWebVitalsComponent} from '@axiomhq/react';
import {nextJsFormatters} from "@axiomhq/nextjs";

const shouldLogToAxiom = process.env.NODE_ENV === 'production';

export const clientLogger = new Logger({
    transports: shouldLogToAxiom
        ? [new ProxyTransport({ url: '/api/axiom', autoFlush: true })]
        : [new ConsoleTransport()],
    formatters: nextJsFormatters,
});

const useLogger = createUseLogger(clientLogger);
const WebVitals = createWebVitalsComponent(clientLogger);

export { useLogger, WebVitals };
