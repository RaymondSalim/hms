import {createOnRequestError} from "@axiomhq/nextjs";
import {serverLogger} from "@/app/_lib/axiom/server";

export const onRequestError = createOnRequestError(serverLogger);
