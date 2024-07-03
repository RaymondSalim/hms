"use client";

import React, {createContext, ReactNode, useState} from "react";

export interface HeaderContextProps {
  locationID?: number,
  title?: string,
  show: boolean,
  showLocationPicker: boolean,
  paths: ReactNode[]

  setLocationID: (locationID: number) => void,
  setTitle: (title: string) => void,
  setShow: (show: boolean) => void,
  setShowLocationPicker: (show: boolean) => void,
  setPaths: (setPaths: ReactNode[]) => void,
}

export const HeaderContext = createContext<HeaderContextProps>({
  locationID: 1,
  title: "",
  show: true,
  showLocationPicker: true,
  paths: [],

  setLocationID: locationID => {
  },
  setTitle: (title: string) => {
  },
  setShow: (show: boolean) => {
  },
  setShowLocationPicker: (show: boolean) => {
  },
  setPaths: (setPaths: ReactNode[]) => {
  }
});

export const HeaderProvider: React.FC<{ children: React.ReactNode, props?: Partial<HeaderContextProps> }> = ({
                                                                                                               children,
                                                                                                               props
                                                                                                             }) => {
  const [locationID, setLocationID] = useState(1);
  const [title, setTitle] = useState("");
  const [show, setShow] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(true);
  const [paths, setPaths] = useState<ReactNode[]>([]);

  return (
    <HeaderContext.Provider
      value={{
        locationID: props?.locationID ?? locationID,
        setLocationID: props?.setLocationID ?? setLocationID,
        title: props?.title ?? title,
        setTitle: props?.setTitle ?? setTitle,
        show: props?.show ?? show,
        setShow: props?.setShow ?? setShow,
        showLocationPicker: props?.showLocationPicker ?? showLocationPicker,
        setShowLocationPicker: props?.setShowLocationPicker ?? setShowLocationPicker,
        paths: props?.paths ?? paths,
        setPaths: props?.setPaths ?? setPaths
      }}>
      {children}
    </HeaderContext.Provider>
  );
};

export default HeaderProvider;
