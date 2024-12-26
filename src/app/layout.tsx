import {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import React from "react";
import {SessionProvider} from "next-auth/react";
import {auth} from "@/app/_lib/auth";
import {getCompanyInfo} from "@/app/_db/settings";

// eslint-disable-next-line @next/next/no-document-import-in-page
import {Html, NextScript} from "next/document";

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
          <Html lang="en">
          <body className={inter.className}>
          <div className={styles.layout}>
              {children}
          </div>
          </body>
          <NextScript>
                  <>
                      <script
                          defer
                          src="https://static.cloudflareinsights.com/beacon.min.js"
                          data-cf-beacon='{"token": "TOKEN_VALUE", "spa": true}'
                      />
                  </>
          </NextScript>
          </Html>
      </SessionProvider>
    );
}
