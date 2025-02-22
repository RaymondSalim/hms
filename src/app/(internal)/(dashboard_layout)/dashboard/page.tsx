"use server";

import styles from "./dashboard.module.css";
import Overview from "@/app/(internal)/(dashboard_layout)/dashboard/_components/overview";
import Events from "@/app/(internal)/(dashboard_layout)/dashboard/_components/events";
import Payments from "@/app/(internal)/(dashboard_layout)/dashboard/_components/payments";
import Bills from "./_components/bills";
import FinancialGraph from "@/app/(internal)/(dashboard_layout)/dashboard/_components/financial-graph";

export default async function DashboardPage() {
  return (
    <>
      <div className={styles.dashboardContainer}>
        <div className={styles.overviewContent}>
          <Overview/>
        </div>
        <div className={styles.content}>
          <div>
            <Events/>
            <Payments/>
          </div>
          <div>
            <FinancialGraph/>
            <Bills/>
          </div>
        </div>
      </div>
    </>
  );
}
