import React from "react";
import styles from "./signinpage.module.css";
import LoginForm from "@/app/(external)/login/login-form";

export default async function SignInPage() {
    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <div className={styles.iconContainer}>
                    <img src="/path-to-your-icon.png" alt="Icon" className={styles.icon} />
                </div>
                <h2 className={styles.title}>Sign in to Barber Avenue.</h2>
                <LoginForm />
            </div>
        </div>
    );
}
