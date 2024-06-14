import { useFormStatus } from "react-dom";
import styles from "./authButton.module.css";
import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

export interface AuthFormButtonProps {
    text: string
}

export default function AuthFormButton({text}: AuthFormButtonProps) {
    let { pending } = useFormStatus();

    return (
        <button disabled={pending} type="submit" className={`${styles.button} ${pending ? styles.loading : ""}`}>{
            pending ? <AiOutlineLoading className={"h-6"} /> : <span>{text}</span>
        }</button>
    );
}
