import {transformMiddlewareRequest} from "@axiomhq/nextjs";
import type {NextFetchEvent, NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
    const requestId = crypto.randomUUID();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);

    serverLogger.info(...transformMiddlewareRequest(request));

    event.waitUntil(serverLogger.flush());

    const response = NextResponse.next({
        request: {headers: requestHeaders},
    });
    response.headers.set('x-request-id', requestId);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
