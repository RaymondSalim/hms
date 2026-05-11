import {ZodFormattedError} from "zod";
import {headers} from "next/headers";
import {after} from "next/server";
import {requestIdStorage, getRequestId} from "@/app/_lib/request-context";
import {serverLogger} from "@/app/_lib/axiom/server";

export type GenericActionsType<T> = {
  success?: T | null,
  failure?: string,
  errors?: ZodFormattedError<any>,
  requestId?: string,
}

/**
 * Wraps a server action that returns GenericActionsType.
 * - Sets up request ID context (AsyncLocalStorage) for automatic log enrichment
 * - Schedules serverLogger.flush() via after()
 * - Attaches requestId to failure/error responses automatically
 */
export function withAction<TArgs extends unknown[], T>(
    fn: (...args: TArgs) => Promise<GenericActionsType<T>>
): (...args: TArgs) => Promise<GenericActionsType<T>> {
    return async (...args: TArgs): Promise<GenericActionsType<T>> => {
        const headersList = await headers();
        const requestId = headersList.get('x-request-id') || crypto.randomUUID();

        return requestIdStorage.run(requestId, async () => {
            after(() => serverLogger.flush());

            const result = await fn(...args);

            if (result.failure || result.errors) {
                return {...result, requestId};
            }

            return result;
        });
    };
}

/**
 * Wraps a server action that returns arbitrary data (not GenericActionsType).
 * - Sets up request ID context (AsyncLocalStorage) for automatic log enrichment
 * - Schedules serverLogger.flush() via after()
 */
export function withRequestId<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
        const headersList = await headers();
        const requestId = headersList.get('x-request-id') || crypto.randomUUID();

        return requestIdStorage.run(requestId, async () => {
            after(() => serverLogger.flush());
            return fn(...args);
        });
    };
}

export {getRequestId};
