"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useState
} from "react";
import styles from "./registerpage.module.css";
import { useFormState } from "react-dom";
import AuthFormButton from "@/app/(external)/(auth)/_components/auth-form-button";
import {redirect} from "next/navigation";
import { delay } from "@/app/_lib/util";
import {registerUser, ResetUserType} from "@/app/(external)/(auth)/register/register-action";
import {registerSchema} from "@/app/_lib/zod";
import {AnimatePresence, motion} from "framer-motion";
import {typeToFlattenedError} from "zod";
import Link from "next/link";

const initialState: ResetUserType = {};

export default function RegisterForm() {
  const [state, formAction ] = useFormState(registerUser, initialState);
  const [error, setError] = useState<typeToFlattenedError<typeof registerSchema.shape> | undefined>(undefined);

  const redirectToLoginPage = useCallback(() => delay(1000).then(() => {
    redirect("/login");
  }), []);

  useEffect(() => {
    if (state.success) redirectToLoginPage();
  }, [state.success]);

  const validateForm = (e: FormEvent<HTMLFormElement>) => {
    const { error: parseError } = registerSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setError(parseError?.flatten());
    if (parseError) e.preventDefault();
    return !error;
  };

  const fields = [
    {
      name: "name",
      type: "text",
      label: "Name",
      placeholder: "Jamie",
      error: error?.fieldErrors.name
    },
    {
      name: "email",
      type: "email",
      label: "Email Address",
      placeholder: "jamie@email.com",
      error: error?.fieldErrors.email
    },
    {
      name: "password",
      type: "password",
      label: "Password",
      placeholder: "********",
      error: error?.fieldErrors.password
    }
  ];

  return (
    <AnimatePresence>
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
          <AuthFormButton text={"Sign Up →"}/>
        </div>
        <div className={styles.registerGroup}>
          <span className={styles.registerCta}>Have an account? <Link href={"/login"}>Sign In</Link></span>
        </div>
      </form>
    </AnimatePresence>
  );
}
