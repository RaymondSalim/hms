"use client";

import {Button, Input} from "@material-tailwind/react";
import styles from "./searchBarAndCreate.module.css";
import {FaPlus} from "react-icons/fa6";

export default function SearchBarAndCreate() {
    return (
        <div className={styles.searchBarAndCreate}>
            {/*@ts-expect-error weird react 19 types error*/}
            <Input className={"!min-w-0"} label={"Search"} placeholder={"Search by address or name"}/>
            {/*@ts-expect-error weird react 19 types error*/}
            <Button color={"blue"} className={styles.btn}>
                <FaPlus/>
                <span>Buat</span>
            </Button>
        </div>
    );
}
