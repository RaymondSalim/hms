import styles from "./styles/overview.module.css";
import {getOverviewData} from "@/app/_db/dashboard";
import {Suspense} from "react";
import {AiOutlineLoading} from "react-icons/ai";

export interface OverviewProps {
  locationID?: number
}

export default async function Overview({locationID}: OverviewProps) {
  const overviewData = await getOverviewData(locationID);

  return (
    <div className={styles.overviewContainer}>
      <h2>Overview</h2>
      <div className={styles.overviewContent}>
        <div className={styles.contentItem}>
          <div className={styles.itemText}>
            <span className={styles.itemTextHead}>This Week&apos;s</span>
            <span className={styles.itemTextTopic}>Check-in</span>
          </div>
          <Suspense fallback={<span className={styles.itemValue}><AiOutlineLoading className="animate-spin"/></span>}>
            <span className={styles.itemValue}>{overviewData.check_in}</span>
          </Suspense>
        </div>
        <div className={styles.contentItem}>
          <div className={styles.itemText}>
            <span className={styles.itemTextHead}>This Week&apos;s</span>
            <span className={styles.itemTextTopic}>Check-out</span>
          </div>
          <Suspense fallback={<span className={styles.itemValue}><AiOutlineLoading className="animate-spin"/></span>}>
            <span className={styles.itemValue}>{overviewData.check_out}</span>
          </Suspense>
        </div>
        <div className={styles.contentItem}>
          <div className={styles.itemText}>
            <span className={styles.itemTextHead}>Total</span>
            <span className={styles.itemTextTopic}>Available Room</span>
          </div>
          <Suspense fallback={<span className={styles.itemValue}><AiOutlineLoading className="animate-spin"/></span>}>
            <span className={styles.itemValue}>{overviewData.available}</span>
          </Suspense>
        </div>
        <div className={styles.contentItem}>
          <div className={styles.itemText}>
            <span className={styles.itemTextHead}>Total</span>
            <span className={styles.itemTextTopic}>Occupied Room</span>
          </div>
          <Suspense fallback={<span className={styles.itemValue}><AiOutlineLoading className="animate-spin"/></span>}>
            <span className={styles.itemValue}>{overviewData.occupied}</span>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
