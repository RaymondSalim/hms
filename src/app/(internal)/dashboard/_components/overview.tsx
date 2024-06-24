"use client";

import styles from "./styles/overview.module.css";
import {getOverviewData} from "@/app/_db/dashboard";
import {useContext} from "react";
import {AiOutlineLoading} from "react-icons/ai";
import {DashboardContext} from "@/app/_context/DashboardContext";
import {useQuery} from "@tanstack/react-query";

export default function Overview() {
  const dashboardContext = useContext(DashboardContext);
  const {data, isLoading, isSuccess} = useQuery({
    queryKey: ['dashboard.overview', dashboardContext.locationID],
    queryFn: () => getOverviewData(dashboardContext.locationID)
  });

  const items = [
    {
      head: "This Week's",
      topic: "Check-in",
      data: data?.check_in
    },
    {
      head: "This Week's",
      topic: "Check-out",
      data: data?.check_out
    },
    {
      head: "Total",
      topic: "Available Room",
      data: data?.available
    },
    {
      head: "Total",
      topic: "Occupied Room",
      data: data?.occupied
    },
  ];

  return (
    <div className={styles.overviewContainer}>
      <div className={styles.overviewHeaderContainer}>
        <h2>Overview</h2>
        {isSuccess &&
            <div className={styles.overviewDate}>{`${data?.date_range.start} - ${data?.date_range.end}`}</div>}
      </div>
      {
        <div className={styles.overviewContent}>
          {
            items.map(i => (
              <div key={i.topic} className={styles.contentItem}>
                <div className={styles.itemText}>
                  <span className={styles.itemTextHead}>{i.head}</span>
                  <span className={styles.itemTextTopic}>{i.topic}</span>
                </div>
                {
                  isLoading ? (
                    <span className={styles.itemValue}><AiOutlineLoading className="animate-spin"/></span>
                  ) : <span className={styles.itemValue}>{i.data}</span>
                }
              </div>
            ))
          }
        </div>
      }
    </div>
  );
}
