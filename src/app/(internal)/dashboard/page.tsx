import styles from "./dashboard.module.css";
import Overview from "@/app/(internal)/dashboard/_components/overview";
import Events from "@/app/(internal)/dashboard/_components/events";
import IncomeExpense from "@/app/(internal)/dashboard/_components/income-expense";
import Payments from "@/app/(internal)/dashboard/_components/payments";

export default async function DashboardPage() {
  return (
    <>
      <div className={styles.dashboardContainer}>
        <div className={styles.headerContainer}>
          <h1 className={styles.header}>Dashboard</h1>
        </div>
        <div className={styles.overviewContent}>
          <Overview/>
        </div>
        <div className={styles.content}>
          <div>
            <Events/>
            <Payments/>
          </div>
          <div>
            <IncomeExpense/>
          </div>
        </div>
      </div>
    </>
  );
}
