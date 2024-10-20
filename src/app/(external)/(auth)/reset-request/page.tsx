import React from "react";
import styles from "./resetpage.module.css";
import ResetForm from "@/app/(external)/(auth)/reset-request/reset-form";

export default async function ResetRequestPage() {
  return (
    <>
      <h2 className={styles.title}>Recover your account</h2>
      <ResetForm/>
    </>
  );
}
