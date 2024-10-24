import React from "react";
import styles from "./signinpage.module.css";
import LoginForm from "@/app/(external)/(auth)/login/login-form";
import {getCompanyName} from "@/app/_db/settings";

export default async function SignInPage() {
    let companyName = await getCompanyName();

    return (
        <>
            <h2 className={styles.title}>Masuk ke {companyName}</h2>
            <LoginForm/>
        </>
    );
}
