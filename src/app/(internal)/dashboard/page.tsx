import styles from "./dashboard.module.css";
import Overview from "@/app/(internal)/dashboard/_components/overview";
import {DashboardContextProps} from "@/app/_context/DashboardContext";

export default function DashboardPage(props?: DashboardContextProps) {


  return (
    <>
      <div className={styles.dashboardContainer}>
        <div className={styles.headerContainer}>
          <h1 className={styles.header}>Dashboard</h1>
        </div>
        <div className={styles.content}>
          <Overview locationID={props?.locationID}/>
        </div>
      </div>
    </>
  );
}
