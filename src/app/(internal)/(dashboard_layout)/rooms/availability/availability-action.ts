"use server";

import {DateRange, getRoomTypeAvailability} from "@/app/_db/availability";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export async function getRoomTypeAvailabilityAction(locationID: number | undefined, dateRange: DateRange) {
    return getRoomTypeAvailability(locationID, dateRange).then(toClient);
} 