"use client";

import React, {createContext, useState} from "react";

export interface DashboardContextProps {
  locationID?: number,

  setLocationID: (locationID: number) => void,
}

export const DashboardContext = createContext<DashboardContextProps>({
  locationID: 1,
  setLocationID: locationID => {
  }
});

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const [locationID, setLocationID] = useState(1);

  return (
    <DashboardContext.Provider
      value={{locationID, setLocationID}}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardProvider;
