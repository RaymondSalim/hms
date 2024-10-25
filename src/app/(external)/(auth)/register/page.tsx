import React from "react";
import styles from "./registerpage.module.css";
import RegisterForm from "@/app/(external)/(auth)/register/register-form";
import {getCompanyName} from "@/app/_db/settings";

export default async function RegisterPage() {
  let companyName = await getCompanyName();

  return (
    <>
      <h2 className={styles.title}>Daftar ke {companyName}</h2>
      <RegisterForm/>
    </>
  );
}
