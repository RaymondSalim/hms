import { handlers } from "@/app/_lib/auth";
import { withAxiom } from "@/app/_lib/axiom/server";

export const GET = withAxiom(handlers.GET);
export const POST = withAxiom(handlers.POST);
