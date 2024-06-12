import { useFormStatus } from "react-dom";
import styles from "@/app/(external)/(auth)/login/signinpage.module.css";
import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

export default function LoginButton() {
    let { pending } = useFormStatus();

    return (
        <button disabled={pending} type="submit" className={`${styles.button} ${pending ? styles.loading : ""}`}>{
            pending ? <AiOutlineLoading className={"h-6"} /> : <span>Sign in →</span>
        }</button>
    );
}
