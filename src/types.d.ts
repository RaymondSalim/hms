import "next-auth";
import { User as BaseUser } from "@auth/core";
import { User as UserModel } from "@/app/_db/user";
import type {CommonProviderOptions} from "@auth/core/src/providers";
import type {Awaitable} from "@auth/core/src/types";
import {DefaultSession} from "next-auth";
import {User} from "@prisma/client";

declare module "next-auth" {


}

declare module "@auth/core/providers/credentials" {
  export interface CredentialsConfig<
    CredentialsInputs extends Record<string, string> = Record<
      string,
      string
    >,
  > extends CommonProviderOptions {
    type: "credentials"
    credentials: CredentialsInputs
    authorize: (
      credentials: Partial<Record<keyof CredentialsInputs, string>>,
      request: Request
    ) => Awaitable<User | null>
  }
}

declare module "@auth/core/types" {
  export type CustomUser = BaseUser & UserModel;

  export interface Session extends DefaultSession {
    user?: CustomUser
  }
}
