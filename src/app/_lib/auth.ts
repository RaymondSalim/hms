import Credentials from "@auth/core/providers/credentials";
import {findUserByEmail} from "@/app/_db/user";
import {PrismaAdapter} from "@auth/prisma-adapter";
import prismaClient from "@/app/_lib/primsa";
import prisma from "@/app/_lib/primsa";
import NextAuth, {CredentialsSignin} from "next-auth";
import {Provider} from "@auth/core/providers";
import {signInSchema} from "@/app/_lib/zod/auth/zod";
import {ZodError} from "zod";
import bcrypt from "bcrypt";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

class InvalidCredentialsError extends CredentialsSignin {
    code!: "Nama pengguna atau kata sandi tidak valid";
}

const providers: Provider[] = [
    Credentials({
        id: 'credentials',
        credentials: {
            email: {
                label: "Alamat Email", type: "text"
            },
            password: {
                label: "Kata Sandi", type: "password"
            },
        },
        authorize: async (credentials) => {
            after(() => {
                serverLogger.flush();
            });
            try {
                let user = null;

                const {email, password} = await signInSchema.parseAsync(credentials);

                // logic to verify if user exists
                user = await findUserByEmail(email as string);

                if (!user) throw new InvalidCredentialsError();

                const match = await bcrypt.compare(password, user.password);
                if (!match) throw new InvalidCredentialsError();

                // @ts-ignore
                delete user.password;
                return user;
            } catch (error: any) {
                if (error instanceof InvalidCredentialsError || error instanceof ZodError) {
                    // TODO! Does this mean we are not returning wrong password?
                } else {
                    serverLogger.error("[auth][authorize]", {error});
                }
                throw error;
            }
        },
    })
];

export const {handlers, signIn, signOut, auth} = NextAuth({
    debug: true,
    adapter: PrismaAdapter(prismaClient),
    secret: process.env.AUTH_SECRET,
    providers: providers,
    session: {
        strategy: "jwt",
        maxAge: 60 * 15
    },
    pages: {
        signIn: "/login"
    },
    callbacks: {
        async signIn({user, account, profile, email, credentials}) {
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
        async redirect({url, baseUrl}) {
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
            after(() => {
                serverLogger.flush();
            });
            if (user) {
                token.user = user;
            }

            try {
                const dbUser = await prisma.siteUser.findUnique({
                    // @ts-expect-error id field unknown
                    where: {id: token.user?.id},
                    select: {id: true},
                });

                if (!dbUser) {
                    throw new Error("User no longer exists or is inactive");
                }

                return token;
            } catch (error) {
                serverLogger.error("[auth][jwt] JWT Validation Error:", {error});
                return null;
            }
        },
        async session({session, token}) {
            if (!token.user) {
                throw new Error("[session]callback: Invalid User");
            }

            session.user = token.user; // Pass user info to the session
            return session;
        },
    }
});
