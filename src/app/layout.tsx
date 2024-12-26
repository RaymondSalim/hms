import {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import React from "react";
import {SessionProvider} from "next-auth/react";
import {auth} from "@/app/_lib/auth";
import {getCompanyInfo} from "@/app/_db/settings";
import Script from "next/script";

const inter = Inter({subsets: ["latin"]});

export async function generateMetadata(): Promise<Metadata> {
    const companyInfo = await getCompanyInfo();

    return {
        title: companyInfo.companyName,
    };
}

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            <html lang="en">
            <body className={inter.className}>
            <div className={styles.layout}>
                {children}
            </div>
            </body>
            <Script
                src="https://static.cloudflareinsights.com/beacon.min.js"
                data-cf-beacon='{"token": "TOKEN_VALUE", "spa": true}'
            />
            </html>
        </SessionProvider>
    );
}
