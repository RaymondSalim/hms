import {Metadata, ResolvingMetadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import React from "react";
import {SessionProvider} from "next-auth/react";
import {auth} from "@/app/_lib/auth";
import {getCompanyInfo} from "@/app/_db/settings";

const inter = Inter({subsets: ["latin"]});

type Props = {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const companyInfo = await getCompanyInfo();

    return {
        title: companyInfo.companyName,
    }
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
          </html>
      </SessionProvider>
    );
}
