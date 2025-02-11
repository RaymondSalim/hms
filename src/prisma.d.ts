import {Prisma} from "@prisma/client";

declare module '@prisma/client' {
    export namespace Prisma {
        function parseJson<T = Record<string, any>>(json: Prisma.JsonValue): T;
    }
}

Prisma.parseJson = <T = string | number | boolean | Record<string, any> | Array<any> | null>(json: Prisma.JsonValue): T => {
    return json as T;
};