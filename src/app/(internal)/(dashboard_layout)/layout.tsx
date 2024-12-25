import Sidebar from "@/app/_components/sidebar/Sidebar";
import styles from "@/app/(internal)/(dashboard_layout)/styles/layout.module.css";
import React from "react";
import {HeaderProvider} from "@/app/_context/HeaderContext";
import Header from "@/app/_components/header/header";
import {auth} from "@/app/_lib/auth/auth";
import {redirect} from "next/navigation";
import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";

export default async function Layout({children}: { children?: React.ReactNode }) {
    const session = await auth();

    if (!session) redirect("/login");

    let appSetup = await prisma.setting.findFirst({
        where: {
            setting_key: SettingsKey.APP_SETUP
        }
    });

    if (appSetup == null || appSetup.setting_value == "false") {
        redirect("/first-time-setup",);
    }

    return (
        <HeaderProvider>
            <>
                <nav>
                    <Sidebar session={session}/>
                </nav>
                <main className={styles.content}>
                    <Header/>
                    {children}
                </main>
            </>
        </HeaderProvider>
    );
}
