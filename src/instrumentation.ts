import {createOnRequestError} from "@axiomhq/nextjs";
import {serverLogger} from "@/app/_lib/axiom/server";

export const onRequestError = createOnRequestError(serverLogger);

export async function register() {
    serverLogger.info("starting nextjs app");
}
