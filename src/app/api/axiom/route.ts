import {serverLogger} from "@/app/_lib/axiom/server";
import {createProxyRouteHandler} from "@axiomhq/nextjs";

export const POST = createProxyRouteHandler(serverLogger);
