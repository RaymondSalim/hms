import React from "react";
import styles from "./layout.module.css";
import {getCompanyInfo} from "@/app/_db/settings";

export default async function AuthLayout({children}: { children?: React.ReactNode }) {
    const companyInfo = await getCompanyInfo();

    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <div className={styles.iconContainer}>
                    <img className={styles.icon} src={companyInfo.companyImage ?? ""}
                         alt={companyInfo.companyName ?? ""}/>
                </div>
                {children}
            </div>
        </div>
    );
}
