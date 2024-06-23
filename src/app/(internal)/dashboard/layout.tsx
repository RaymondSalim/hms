"use client";

import React, {ReactNode, useState} from "react";
import {DashboardContext} from "@/app/_context/DashboardContext";

export default function Layout({children}: { children: ReactNode }) {
  const [locationID, setLocationID] = useState(1);

  return (
    <DashboardContext.Provider
      value={{locationID, setLocationID}}>
      {children}
    </DashboardContext.Provider>
  );
}
