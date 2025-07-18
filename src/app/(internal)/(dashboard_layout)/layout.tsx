import {HeaderProvider} from "@/app/_context/HeaderContext";
import Sidebar from "@/app/_components/sidebar/Sidebar";
import styles from "./styles/layout.module.css";
import React from "react";
import {redirect} from "next/navigation";
import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";
import {auth} from "@/app/_lib/auth";
import Header from "@/app/_components/header/header";
import {getCompanyInfo} from "@/app/_db/settings";
import ChangelogProvider from "@/app/_components/ChangelogProvider";

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
      <ChangelogProvider>
        <div className={styles.layout}>
          <Sidebar companyInfo={companyInfo} session={session} />
          <main className={styles.main}>
            <Header companyInfo={companyInfo}/>
            <div className={styles.content}>{children}</div>
          </main>
        </div>
      </ChangelogProvider>
    </HeaderProvider>
  );
}
