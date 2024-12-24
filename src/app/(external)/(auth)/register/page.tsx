import React from "react";
import styles from "./registerpage.module.css";
import RegisterForm from "@/app/(external)/(auth)/register/register-form";
import {getCompanyName, getRegistrationEnabled} from "@/app/_db/settings";

export default async function RegisterPage() {
    let companyName = await getCompanyName();
    let registrationEnabled = await getRegistrationEnabled();

    if (!registrationEnabled) {
        return (
            <>
                <h2 className={styles.title}>Daftar ke {companyName}</h2>
                <p className={"text-gray-700 font-medium"}>Registrasi dimatikan. Mohon hubungi administrator.</p>
            </>
        );
    }

    return (
        <>
            <h2 className={styles.title}>Daftar ke {companyName}</h2>
            <RegisterForm/>
        </>
    );
}
