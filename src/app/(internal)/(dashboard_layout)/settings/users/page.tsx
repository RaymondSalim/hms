import {getAllUsers} from "@/app/_db/user";
import React from "react";
import UsersContent from "@/app/(internal)/(dashboard_layout)/settings/users/content";

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <UsersContent users={users}/>
  );
}
