import Credentials from "@auth/core/providers/credentials";
import {findUserByEmail} from "@/app/_db/user";
import {PrismaAdapter} from "@auth/prisma-adapter";
import prismaClient from "@/app/_lib/primsa";
import NextAuth, {CredentialsSignin} from "next-auth";
import {Provider} from "@auth/core/providers";
import {signInSchema} from "@/app/_lib/zod/auth/zod";
import {ZodError} from "zod";
import bcrypt from "bcrypt";

class InvalidCredentialsError extends CredentialsSignin {
  code!: "Invalid username or password";
}

const providers: Provider[] = [
  Credentials({
    id: 'credentials',
    credentials: {
      email: {
        label: "Email", type: "text"
      },
      password: {
        label: "Password", type: "password"
      },
    },
    authorize: async (credentials) => {
      try {
        let user = null;

        const { email, password } = await signInSchema.parseAsync(credentials);

        // logic to verify if user exists
        user = await findUserByEmail(email as string);

        if (!user) throw new InvalidCredentialsError();

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new InvalidCredentialsError();

        // @ts-ignore
        delete user.password;
        return user;
      } catch (error: any) {
        if (error instanceof InvalidCredentialsError || error instanceof ZodError) {} else {
          console.error(error);
        }
        throw error;
      }
    },
  })
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  adapter: PrismaAdapter(prismaClient),
  providers: providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      const isAllowedToSignIn = true;
      if (isAllowedToSignIn) {
        return true;
      } else {
        // Return false to display a default error message
        return false;
        // Or you can return a URL to redirect to:
        // return '/unauthorized'
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      let urlObj = new URL(url);
      // Allows callback URLs on the same origin
      if (urlObj.origin === baseUrl) {
        urlObj.searchParams.delete("callbackUrl");

        return urlObj.toString();
      }
      return baseUrl;
    },
    async jwt({token, user}) {
      if (user) {
        token.user = user;
      }

      return token;
    },
    async session({session, token}) {
      // @ts-ignore
      session.user.id = token.user.id;
      return session;
    },
  }
});
