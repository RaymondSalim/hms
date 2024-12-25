import Credentials from "next-auth/providers/credentials";
import {Provider} from "next-auth/providers";
import {findUserByEmail} from "@/app/_db/user";
import {PrismaAdapter} from "@auth/prisma-adapter";
import prismaClient from "@/app/_lib/primsa";
import prisma from "@/app/_lib/primsa";
import NextAuth from "next-auth";
import {signInSchema} from "@/app/_lib/zod/auth/zod";
import {ZodError} from "zod";
import bcrypt from "bcrypt";
import {randomBytes} from "crypto";

class InvalidCredentialsError extends Error {
    constructor() {
        super("Nama pengguna atau kata sandi tidak valid");
        this.name = "InvalidCredentialsError";
    }
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
            try {
                const {email, password} = signInSchema.parse(credentials);
                const user = await findUserByEmail(email);

                if (!user) throw new InvalidCredentialsError();

                const match = await bcrypt.compare(password, user.password);
                if (!match) throw new InvalidCredentialsError();

                // Return user without password
                const {password: _, ...userWithoutPassword} = user;
                return userWithoutPassword;
            } catch (error: any) {
                if (error instanceof ZodError || error instanceof InvalidCredentialsError) {
                    throw new Error("Invalid email or password");
                }
                console.error("Authorize error:", error);
                throw new Error("Internal server error");
            }
        },
    }),
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
        async signIn({user}) {
            return !!user;
        },
        async redirect({url, baseUrl}) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;

            const urlObj = new URL(url);
            if (urlObj.origin === baseUrl) {
                urlObj.searchParams.delete("callbackUrl");

                return urlObj.toString();
            }
            return baseUrl;
        },
        async jwt({token, user, trigger, session, ...everythingElse}) {
            if (user && user.id) {
                return {
                    ...token,
                    userId: user.id,
                    refreshToken: await generateRefreshToken(user.id)
                };
            } else if (token.exp && Date.now() < token.exp * 1000) {
                return token;
            } else {
                if (!token.refreshToken) throw new TypeError("Missing refresh_token");

                try {
                    const dbToken = await verifyRefreshToken(session.refreshToken);
                    token.refreshToken = await rotateRefreshToken(dbToken);
                } catch (error) {
                    console.error("Invalid refresh token during update:", error);
                    token.error = "RefreshTokenError";
                    throw new Error("Invalid refresh token");
                }
            }
            return token;
        },
        async session({session, token}) {
            if (token.userId) {
                session.user = {
                    // @ts-ignore
                    id: token.userId,
                };
                // @ts-ignore
                session.refreshToken = token.refreshToken;
            }
            return session;
        },
    },
    events: {
        async signOut(msg) {
            // @ts-expect-error token
            if (msg?.token?.refreshToken) {
                // @ts-expect-error token
                await blacklistRefreshToken(token.refreshToken);
            }
        },
    },
});

export async function generateRefreshToken(userId: string) {
    const token = randomBytes(40).toString("hex");
    await prisma.refreshToken.create({
        data: {token, userId},
    });
    return token;
}

export async function blacklistRefreshToken(token: string) {
    await prisma.refreshToken.updateMany({
        where: {token},
        data: {blacklisted: true},
    });
}

export async function verifyRefreshToken(token: string) {
    const dbToken = await prisma.refreshToken.findUnique({
        where: {token},
        include: {user: true},
    });

    if (!dbToken || dbToken.blacklisted) {
        throw new Error("Invalid refresh token");
    }

    return dbToken;
}

export async function rotateRefreshToken(dbToken: { token: string; userId: string }) {
    const newToken = randomBytes(40).toString("hex");

    return prisma.$transaction(async (trx) => {
        // Blacklist the old token
        await trx.refreshToken.update({
            where: {token: dbToken.token},
            data: {blacklisted: true},
        });

        // Generate a new token
        return trx.refreshToken.create({
            data: {token: newToken, userId: dbToken.userId},
        });
    });
}