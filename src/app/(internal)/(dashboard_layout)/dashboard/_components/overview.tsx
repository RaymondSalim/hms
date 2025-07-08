"use client";

import styles from "./styles/overview.module.css";
import {getOverviewData} from "@/app/_db/dashboard";
import {AiOutlineLoading} from "react-icons/ai";
import {useHeader} from "@/app/_context/HeaderContext";
import {useQuery} from "@tanstack/react-query";
import {Popover, PopoverContent, PopoverHandler} from "@material-tailwind/react";
import React, {useState} from "react";

export default function Overview() {
  const dashboardContext = useHeader();
  const {data, isLoading, isSuccess} = useQuery({
    queryKey: ['dashboard.overview', dashboardContext.locationID],
    queryFn: () => getOverviewData(dashboardContext.locationID)
  });

  // Popover open state: 'check_in', 'check_out', 'available', or null
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const handlePopoverEnter = (key: string) => setOpenPopover(key);
  const handlePopoverLeave = () => setOpenPopover(null);

  const renderPopoverContent = (type: 'check_in' | 'check_out') => {
    if (!data) return <span>No data</span>;
    let items: any[] = [];
    if (type === 'check_in') items = data.check_in;
    if (type === 'check_out') items = data.check_out;
    if (!items.length) return <span className="text-gray-400">No records found</span>;
    return (
      <div className="min-w-[320px] max-h-72 overflow-y-auto p-2">
        {items.map((item, idx) => {
          const roomNumber = item.rooms?.room_number || (item.rooms && item.rooms[0]?.room_number) || '-';
          return (
            <div key={item.id} className="flex items-center gap-2 border-b last:border-b-0 py-1 text-sm">
              <span><b>ID:</b> {item.id}</span>
              <span><b>Room:</b> {roomNumber}</span>
              <span><b>Start:</b> {item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}</span>
              <a href={`/bookings?id=${item.id}`} className="text-blue-600 underline ml-auto" target="_blank" rel="noopener noreferrer">View</a>
            </div>
          );
        })}
      </div>
    );
  };

  const items = [
    {
      head: "Minggu Ini",
      topic: "Check-in",
      data: data?.check_in.length,
      popover: (
        <Popover
          open={openPopover === 'check_in'}
          handler={() => setOpenPopover(openPopover === 'check_in' ? null : 'check_in')}
          placement="bottom"
        >
          <PopoverHandler>
            <span
              className={styles.itemValue + " cursor-pointer"}
              onMouseEnter={() => handlePopoverEnter('check_in')}
              onMouseLeave={handlePopoverLeave}
            >
              {data?.check_in.length}
            </span>
          </PopoverHandler>
          <PopoverContent
            className="z-[99999]"
            onMouseEnter={() => handlePopoverEnter('check_in')}
            onMouseLeave={handlePopoverLeave}
          >
            {renderPopoverContent('check_in')}
          </PopoverContent>
        </Popover>
      )
    },
    {
      head: "Minggu Ini",
      topic: "Check-out",
      data: data?.check_out.length,
      popover: (
        <Popover
          open={openPopover === 'check_out'}
          handler={() => setOpenPopover(openPopover === 'check_out' ? null : 'check_out')}
          placement="bottom"
        >
          <PopoverHandler>
            <span
              className={styles.itemValue + " cursor-pointer"}
              onMouseEnter={() => handlePopoverEnter('check_out')}
              onMouseLeave={handlePopoverLeave}
            >
              {data?.check_out.length}
            </span>
          </PopoverHandler>
          <PopoverContent
            className="z-[99999]"
            onMouseEnter={() => handlePopoverEnter('check_out')}
            onMouseLeave={handlePopoverLeave}
          >
            {renderPopoverContent('check_out')}
          </PopoverContent>
        </Popover>
      )
    },
    {
      head: "Total",
      topic: "Kamar Tersedia",
      data: data?.available,
      popover: null
    },
    {
      head: "Total",
      topic: "Kamar Dihuni",
      data: data?.occupied,
      popover: null
    },
  ];

  return (
    <div className={styles.overviewContainer}>
      <div className={styles.overviewHeaderContainer}>
        <h2>Ringaksan</h2>
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
                  ) : i.popover !== null ? i.popover : <span className={styles.itemValue}>{i.data}</span>
                }
              </div>
            ))
          }
        </div>
      }
    </div>
  );
}
