import {describe, expect, test, jest, beforeEach} from "@jest/globals";
import {__setMockHeaders} from "next/headers";

jest.mock('next/server', () => ({
    after: (cb: () => void) => { cb(); },
}));

jest.mock('@/app/_lib/axiom/server', () => ({
    serverLogger: {
        flush: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

import {withAction, withRequestId, getRequestId} from "@/app/_lib/actions";
import {requestIdStorage, getRequestId as getRequestIdDirect} from "@/app/_lib/request-context";
import {addRequestId} from "@/app/_lib/axiom/formatter";

describe("request-id tracing", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        __setMockHeaders(new Map());
    });

    describe("getRequestId", () => {
        test("returns undefined when called outside ALS context", () => {
            expect(getRequestIdDirect()).toBeUndefined();
        });

        test("returns the request ID when called inside ALS context", () => {
            const id = "test-request-id-123";
            requestIdStorage.run(id, () => {
                expect(getRequestIdDirect()).toBe(id);
            });
        });
    });

    describe("withAction", () => {
        test("uses x-request-id from headers when available", async () => {
            __setMockHeaders(new Map([['x-request-id', 'header-id-abc']]));

            let capturedId: string | undefined;
            const action = withAction(async () => {
                capturedId = getRequestId();
                return {success: "ok"};
            });

            await action();
            expect(capturedId).toBe("header-id-abc");
        });

        test("generates a UUID when x-request-id header is absent", async () => {
            __setMockHeaders(new Map());

            let capturedId: string | undefined;
            const action = withAction(async () => {
                capturedId = getRequestId();
                return {success: "ok"};
            });

            await action();
            expect(capturedId).toBeDefined();
            expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        test("attaches requestId to failure responses", async () => {
            __setMockHeaders(new Map([['x-request-id', 'fail-id-123']]));

            const action = withAction(async () => ({failure: "something went wrong"}));
            const result = await action();

            expect(result.failure).toBe("something went wrong");
            expect(result.requestId).toBe("fail-id-123");
        });

        test("attaches requestId to error responses", async () => {
            __setMockHeaders(new Map([['x-request-id', 'error-id-456']]));

            const action = withAction(async () => ({errors: {_errors: ["bad input"]}} as any));
            const result = await action();

            expect(result.errors).toBeDefined();
            expect(result.requestId).toBe("error-id-456");
        });

        test("does not attach requestId to success responses", async () => {
            __setMockHeaders(new Map([['x-request-id', 'success-id-789']]));

            const action = withAction(async () => ({success: "data"}));
            const result = await action();

            expect(result.success).toBe("data");
            expect(result.requestId).toBeUndefined();
        });

        test("passes arguments through to the wrapped function", async () => {
            const action = withAction(async (a: number, b: string) => {
                return {success: `${a}-${b}`};
            });

            const result = await action(42, "hello");
            expect(result.success).toBe("42-hello");
        });
    });

    describe("withRequestId", () => {
        test("uses x-request-id from headers when available", async () => {
            __setMockHeaders(new Map([['x-request-id', 'req-id-xyz']]));

            let capturedId: string | undefined;
            const fn = withRequestId(async () => {
                capturedId = getRequestId();
                return "result";
            });

            await fn();
            expect(capturedId).toBe("req-id-xyz");
        });

        test("generates a UUID when x-request-id header is absent", async () => {
            __setMockHeaders(new Map());

            let capturedId: string | undefined;
            const fn = withRequestId(async () => {
                capturedId = getRequestId();
                return "result";
            });

            await fn();
            expect(capturedId).toBeDefined();
            expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        test("returns the original function result unchanged", async () => {
            __setMockHeaders(new Map([['x-request-id', 'some-id']]));

            const fn = withRequestId(async (x: number) => x * 2);
            const result = await fn(21);
            expect(result).toBe(42);
        });

        test("passes arguments through to the wrapped function", async () => {
            const fn = withRequestId(async (a: string, b: number) => `${a}:${b}`);
            const result = await fn("test", 99);
            expect(result).toBe("test:99");
        });
    });

    describe("addRequestId formatter", () => {
        test("adds requestId field when inside ALS context", () => {
            const record = {level: "info" as const, message: "test", fields: {existing: "field"}};

            const result = requestIdStorage.run("fmt-id-123", () => {
                return addRequestId(record);
            });

            expect(result.fields).toEqual({
                existing: "field",
                requestId: "fmt-id-123",
            });
        });

        test("returns record unchanged when outside ALS context", () => {
            const record = {level: "info" as const, message: "test", fields: {existing: "field"}};

            const result = addRequestId(record);

            expect(result).toBe(record);
            expect(result.fields).toEqual({existing: "field"});
        });

        test("preserves existing fields when adding requestId", () => {
            const record = {
                level: "error" as const,
                message: "failure",
                fields: {host: "localhost", code: 500},
            };

            const result = requestIdStorage.run("preserve-test", () => {
                return addRequestId(record);
            });

            expect(result.fields).toEqual({
                host: "localhost",
                code: 500,
                requestId: "preserve-test",
            });
        });
    });
});
