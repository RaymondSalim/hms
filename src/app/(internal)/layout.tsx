import Sidebar from "@/app/_components/sidebar/Sidebar";
import styles from "@/app/(internal)/styles/layout.module.css";
import React from "react";
import {HeaderProvider} from "@/app/_context/HeaderContext";
import Header from "@/app/_components/header/header";
import QueryClientProviderWrapper from "@/app/(internal)/_providers/queryClientProvider";
import {auth} from "@/app/_lib/auth";
import {redirect} from "next/navigation";
import ToastProvider from "@/app/_components/toast";

export default async function Layout({children}: { children?: React.ReactNode }) {
    const session = await auth();

    if (!session) redirect("/login");

    return (
        <ToastProvider>
            <QueryClientProviderWrapper>
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
            </QueryClientProviderWrapper>
        </ToastProvider>
    );
}
