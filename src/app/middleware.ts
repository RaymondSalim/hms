import {transformMiddlewareRequest} from "@axiomhq/nextjs";
import type {NextFetchEvent, NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
    serverLogger.info(...transformMiddlewareRequest(request));

    event.waitUntil(serverLogger.flush());
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
