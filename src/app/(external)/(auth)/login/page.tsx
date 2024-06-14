import React from "react";
import styles from "./signinpage.module.css";
import LoginForm from "@/app/(external)/(auth)/login/login-form";

export default async function SignInPage() {
  return (
    <>
      <h2 className={styles.title}>Sign in to Your Company.</h2>
      <LoginForm/>
    </>
  );
}
