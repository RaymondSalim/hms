import styles from "@/app/(internal)/(dashboard_layout)/styles/layout.module.css";
import React from "react";

export default async function Layout({children}: {children?: React.ReactNode}) {
    return (
            <main className={styles.content}>
                {children}
            </main>
    );
}
