import React from "react";
import {getGuests} from "@/app/_db/guest";
import GuestsContent from "@/app/(internal)/residents/guests/content";

export default async function UsersPage() {
  const guests = await getGuests();

  return (
    <GuestsContent guests={guests}/>
  );
}
