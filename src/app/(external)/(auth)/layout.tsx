import React from "react";
import styles from "./layout.module.css";
import Image from "next/image";

export default async function AuthLayout({children}: {children?: React.ReactNode}) {
  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <div className={styles.iconContainer}>
          <Image src="/logo.png" alt="Icon" className={styles.icon} height={64} width={128}/>
        </div>
        {children}
      </div>
    </div>
  );
}
