"use client";

import React, {useEffect} from "react";
import {Breadcrumbs} from "@material-tailwind/react";
import LocationPicker from "@/app/_components/header/locationPicker";
import styles from "./header.module.css";
import {IoHome} from "react-icons/io5";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {FaBars} from "react-icons/fa";
import {useHeader} from "@/app/_context/HeaderContext";
import {getCompanyInfo} from "@/app/_db/settings";

export interface HeaderProps {
    companyInfo: Awaited<ReturnType<typeof getCompanyInfo>>
}

export default function Header({companyInfo}: HeaderProps) {
    const {
        title,
        paths,
        setIsSidebarOpen,
        setShow,
        showLocationPicker,
        setShowLocationPicker,
        locationID,
        setLocationID
    } = useHeader();
    const pathName = usePathname();

    useEffect(() => {
        setShowLocationPicker(true);
        setShow(true);
    }, [pathName]);

    return (
        <>
            <header className="bg-white shadow-sm sticky md:static top-0 z-50">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center min-h-16">
                        {/* Mobile header */}
                        <div className="w-full flex items-center md:hidden relative">
                            <button
                                onClick={() => setIsSidebarOpen(a => !a)}
                                className="mr-auto inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                <span className="sr-only">Open main menu</span>
                                <FaBars className="block h-6 w-6" aria-hidden="true"/>
                            </button>
                            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <img src={companyInfo?.companyImage ?? ""} alt={companyInfo?.companyName ?? ""}
                                     className="h-8 w-auto"/>
                            </div>
                            {showLocationPicker && (
                                <div className={styles.locationPickerContainer}>
                                  <LocationPicker
                                      type={"compact"}
                                      setLocationID={setLocationID}
                                      locationID={locationID}
                                  />
                                </div>
                            )}
                        </div>

                        {/* Desktop header */}
                        <div className="w-full hidden md:block p-4 md:p-6 lg:p-8 ">
                            <div className={styles.breadcrumbsLocationContainer}>
                                <Breadcrumbs className={styles.breadcrumbs}>
                                    <Link href={"/"} className={styles.homeLink}>
                                        <IoHome className={styles.homeIcon}/>
                                    </Link>
                                    {paths.map((value, index, array) => value)}
                                </Breadcrumbs>
                                {showLocationPicker && (
                                    <div className={styles.locationPickerContainer}>
                                        <LocationPicker
                                            type={"full"}
                                            setLocationID={setLocationID}
                                            locationID={locationID}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>
                    {title}
                </h1>
            </div>
        </>
    );
}
