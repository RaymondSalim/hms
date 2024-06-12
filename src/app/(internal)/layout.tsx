import Sidebar from "@/app/_components/sidebar/Sidebar";
import styles from "@/app/(internal)/styles/layout.module.css";
import React from "react";

export default function Layout({children}: {children?: React.ReactNode}) {
    return (
        <>
            <nav>
                <Sidebar/>
            </nav>
            <main className={styles.content}>
                {children}
            </main>
        </>
    );
}
