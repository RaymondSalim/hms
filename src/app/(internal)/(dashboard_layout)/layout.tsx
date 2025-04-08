import {HeaderProvider} from "@/app/_context/HeaderContext";
import Sidebar from "@/app/_components/sidebar/Sidebar";
import styles from "./styles/layout.module.css";
import React from "react";
import {redirect} from "next/navigation";
import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";
import {auth} from "@/app/_lib/auth";
import {getCompanyInfo} from "@/app/_db/settings";
import Header from "@/app/_components/header/header";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  let appSetup = await prisma.setting.findFirst({
    where: {
      setting_key: SettingsKey.APP_SETUP
    }
  });

  if (appSetup == null || appSetup.setting_value == "false") {
    redirect("/first-time-setup");
  }

  const companyInfo = await getCompanyInfo();

  return (
    <HeaderProvider>
      <div className={styles.layout}>
        <Sidebar session={session} companyInfo={companyInfo}/>
        <main className={styles.main}>
          <div className={styles.content}>
            <Header/>
            {children}
          </div>
        </main>
      </div>
    </HeaderProvider>
  );
}
