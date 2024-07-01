"use client";

import React, {createContext, useState} from "react";

export interface HeaderContextProps {
  locationID?: number,
  setLocationID: (locationID: number) => void,
}

export const HeaderContext = createContext<HeaderContextProps>({
  locationID: 1,
  setLocationID: locationID => {
  }
});

export const HeaderProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const [locationID, setLocationID] = useState(1);

  return (
    <HeaderContext.Provider
      value={{locationID, setLocationID}}>
      {children}
    </HeaderContext.Provider>
  );
};

export default HeaderProvider;
