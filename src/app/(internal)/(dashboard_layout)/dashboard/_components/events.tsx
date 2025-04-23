"use client";

import {getUpcomingEvents} from "@/app/_db/dashboard";
import styles from "./styles/events.module.css";
import {useHeader} from "@/app/_context/HeaderContext";
import {useQuery} from "@tanstack/react-query";
import {Chip} from "@material-tailwind/react";

export default function Events() {
  const dashboardContext = useHeader();
  const result = useQuery({
    queryKey: ['dashboard.events', dashboardContext.locationID],
    queryFn: () => getUpcomingEvents(dashboardContext.locationID)
  });

  const dates = generateDateArray();

  return (
    <div className={styles.eventsContainer}>
      <h2>Upcoming Events</h2>
      <div className={styles.weeksContainer}>
        {
          result.isSuccess && dates.map(d => {
            const events = result.data.get(d.valueOf());
            return (
              <div key={d.valueOf()} className={styles.dayContainer}>
                <div className={styles.dateContainer}>
                  <span className={styles.day}>{d.toLocaleString('id', {weekday: 'short'})}</span>
                  <span className={styles.date}>{d.getDate()}</span>
                </div>
                <div className={styles.dayEventContainer}>
                  {
                    events && events.map((value, index, arr) => {
                      if (index == 3) return <span key={"more"}>{`+${arr.length - 3} more...`}</span>;
                      if (index > 3) return;
                      return (
                        <Chip
                          color={value.type.toLowerCase() == "checkin" ? "green" : "red"}
                          key={value.id}
                          value={
                            <div className={styles.chipValue}>
                              <span>{value.rooms?.room_number}</span>
                              <span>{value.type}</span>
                            </div>
                          }
                        />
                      );
                    })
                  }
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

function generateDateArray() {
  let dateArray = [];

  let currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    let newDate = new Date(currentDate);

    dateArray.push(newDate);

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateArray;
}
