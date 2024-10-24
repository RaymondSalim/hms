"use client";

import {Button, Input} from "@material-tailwind/react";
import styles from "./searchBarAndCreate.module.css";
import {FaPlus} from "react-icons/fa6";

export default function SearchBarAndCreate() {
  return (
    <div className={styles.searchBarAndCreate}>
      <Input label={"Search"} placeholder={"Search by address or name"}/>
      <Button color={"blue"} className={styles.btn}>
        <FaPlus/>
        <span>Buat</span>
      </Button>
    </div>
  );
}
