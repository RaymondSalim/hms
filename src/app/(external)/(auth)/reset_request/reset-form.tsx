"use client";

import React, {FormEvent, useState} from "react";
import styles from "./resetpage.module.css";
import {useFormState} from "react-dom";
import AuthFormButton from "@/app/(external)/(auth)/_components/auth-form-button";
import {ResetUserType} from "@/app/(external)/(auth)/register/register-action";
import {resetSchema} from "@/app/_lib/zod/auth/zod";
import {AnimatePresence, motion} from "framer-motion";
import {typeToFlattenedError} from "zod";
import Link from "next/link";
import {resetPassword} from "@/app/(external)/(auth)/reset_request/reset-action";
import {useRouter} from "next/navigation";

const initialState: ResetUserType = {};

export default function ResetForm() {
  const [state, formAction ] = useFormState(resetPassword, initialState);
  const [error, setError] = useState<typeToFlattenedError<typeof resetSchema.shape> | undefined>(undefined);
  const router = useRouter();

  const validateForm = (e: FormEvent<HTMLFormElement>) => {
    const { error: parseError } = resetSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setError(parseError?.flatten());
    if (parseError) e.preventDefault();
    return !error;
  };

  const handleBack = () => router.push("/login");

  const fields = [
    {
      name: "email",
      type: "email",
      label: "Email Address",
      placeholder: "jamie@email.com",
      error: error?.fieldErrors.email
    },
  ];

  return (
    <AnimatePresence>
      {
        state.success ?
          (
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.5}}
              className={styles.successText}
            >
              <span>If an account exists with the provided email, you'll receive an email with a password reset link shortly. Please check your inbox and follow the instructions.</span>
              <div className={styles.buttonContainer}>
                <button onClick={handleBack} type="button" className={styles.button}>Back</button>
              </div>
            </motion.div>
          )
          :
          (
            <form onSubmit={validateForm} action={formAction}>
              {
                fields.map(f => (
                  <div key={f.name} className={styles.inputGroup}>
                    <label htmlFor={f.name} className={styles.label}>{f.label}</label>
                    <input type={f.type} name={f.name}
                           className={`${styles.input} ${f.error && styles.error}`} placeholder={f.placeholder}
                           required/>
                    <motion.span
                      initial={{opacity: 0}} animate={f.error ? {opacity: 1} : undefined}
                      className={styles.errorDesc}
                    >
                      {f.error?.[0]}
                    </motion.span>
                  </div>
                ))
              }
              <div className={styles.inputGroup}>
        <span
          className={`${styles.extraText} ${state.failure && styles.error} ${state.success && styles.success}`}>{state.failure ?? state.success}</span>
              </div>
              <div className={styles.buttonContainer}>
                <AuthFormButton text={"Submit"}/>
              </div>
              <div className={styles.registerGroup}>
                <span className={styles.registerCta}>Have an account? <Link href={"/login"}>Sign In</Link></span>
              </div>
            </form>
          )
      }
    </AnimatePresence>
  );
}
