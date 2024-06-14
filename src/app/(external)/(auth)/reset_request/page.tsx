import React from "react";
import styles from "./resetpage.module.css";
import ResetForm from "@/app/(external)/(auth)/reset_request/reset-form";

export default async function ResetRequestPage() {
  return (
    <>
      <h2 className={styles.title}>Recover your account</h2>
      <ResetForm/>
    </>
  );
}
