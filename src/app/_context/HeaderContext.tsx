"use client";

import React, {createContext, Dispatch, useContext, useState} from "react";

interface HeaderContextType {
    title: string;
    setTitle: (title: string) => void;
    paths: React.ReactNode[];
    setPaths: (paths: React.ReactNode[]) => void;
    show: boolean;
    setShow: (show: boolean) => void;
    showLocationPicker: boolean;
    setShowLocationPicker: (show: boolean) => void;
    locationID: number | undefined;
    setLocationID: (id: number | undefined) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: Dispatch<React.SetStateAction<boolean>>;
}

const HeaderContext = createContext<HeaderContextType>({
    title: "",
    setTitle: () => {},
    paths: [],
    setPaths: () => {},
    show: true,
    setShow: () => {},
    showLocationPicker: false,
    setShowLocationPicker: () => {},
    locationID: undefined,
    setLocationID: () => {},
    isSidebarOpen: false,
    setIsSidebarOpen: () => {},
});

export function HeaderProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitle] = useState("");
    const [paths, setPaths] = useState<React.ReactNode[]>([]);
    const [show, setShow] = useState(true);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [locationID, setLocationID] = useState<number | undefined>();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <HeaderContext.Provider
            value={{
                title,
                setTitle,
                paths,
                setPaths,
                show,
                setShow,
                showLocationPicker,
                setShowLocationPicker,
                locationID,
                setLocationID,
                isSidebarOpen: isSidebarOpen,
                setIsSidebarOpen: setIsSidebarOpen,
            }}
        >
            {children}
        </HeaderContext.Provider>
    );
}

export function useHeader() {
    return useContext(HeaderContext);
}

export default HeaderProvider;
