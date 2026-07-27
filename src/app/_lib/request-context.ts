import {AsyncLocalStorage} from 'node:async_hooks';

export const requestIdStorage = new AsyncLocalStorage<string>();

/**
 * Returns the request ID for the current request context, or undefined if called outside one.
 */
export function getRequestId(): string | undefined {
    return requestIdStorage.getStore();
}
