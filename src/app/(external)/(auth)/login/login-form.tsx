"use client";

import React, {useCallback, useEffect, useState} from "react";
import styles from "./signinpage.module.css";
import {useFormState} from "react-dom";
import {loginUser, LoginUserType} from "@/app/(external)/(auth)/login/login-action";
import AuthFormButton from "@/app/(external)/(auth)/_components/auth-form-button";
import {useSession} from "next-auth/react";
import {redirect, useSearchParams} from "next/navigation";
import {delay} from "@/app/_lib/util";
import Link from "next/link";

const initialState: LoginUserType = {};

export default function LoginForm() {
  const searchParams = useSearchParams();

  const [state, formAction ] = useFormState(loginUser, initialState);
  const { status } = useSession();

  const [shouldRedirect, setIsShouldRedirect] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState("/dashboard");

  const redirectToCallbackOrDashboard = useCallback(() => delay(1000).then(() => {
    if (searchParams.get("callbackUrl")) {
      setRedirectTarget(searchParams.get("callbackUrl")!);
    }
    setIsShouldRedirect(true);
  }), [searchParams]);

  if (shouldRedirect) redirect(redirectTarget);

  useEffect(() => {
    if (state.success || status == "authenticated") redirectToCallbackOrDashboard();
  }, [state.success, status]);

  return (
    <form action={formAction}>
      <div className={styles.inputGroup}>
        <label htmlFor="email" className={styles.label}>Email address</label>
        <input type="email" name="email" className={styles.input} placeholder="jamie@example.com" required />
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="password" className={styles.label}>Password</label>
        <div className={styles.passwordContainer}>
          <input type="password" name="password" className={styles.input} placeholder="********" required />
          <Link href="/reset_request" className={styles.forgotLink}>Forgot?</Link>
        </div>
      </div>
      <div className={styles.inputGroup}>
        <span className={`${styles.extraText} ${state.failure && styles.error} ${state.success && styles.success}`}>{state.failure ?? state.success}</span>
      </div>
      <div className={styles.buttonContainer}>
        <AuthFormButton text={"Sign in →"} />
      </div>
      <div className={styles.registerGroup}>
        <span className={styles.registerCta}>Don&apos;t have an account? <Link href={"/register"}>Sign Up</Link></span>
      </div>
    </form>
  );
}
