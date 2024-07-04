"use client";

import React, {PropsWithChildren, useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {Breadcrumbs} from "@material-tailwind/react";
import LocationPicker from "@/app/_components/header/locationPicker";
import styles from "./header.module.css";
import {IoHome} from "react-icons/io5";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function Header({children}: PropsWithChildren) {
  const headerContext = useContext(HeaderContext);
  const pathName = usePathname();

  useEffect(() => {
    headerContext.setShowLocationPicker(true);
    headerContext.setShow(true);
  }, [pathName]);

  return (
    <div className={"p-8 pb-0"}>
      <div className={styles.breadcrumbsLocationContainer}>
        <Breadcrumbs className={styles.breadcrumbs}>
          <Link href={"/"} className={"opacity-60"}>
            <IoHome/>
          </Link>
          {headerContext.paths.map((value, index, array) => value)}
        </Breadcrumbs>
        {
          headerContext.showLocationPicker &&
          /*@ts-ignore*/
            <LocationPicker setLocationID={headerContext.setLocationID} locationID={headerContext.locationID}/>
        }
      </div>
      <div className={styles.headerTitleContainer}>
        <span className={styles.header}>{headerContext.title}</span>
      </div>
    </div>
  );
}
