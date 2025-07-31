"use server";

import {DateRange, getRoomTypeAvailability} from "@/app/_db/availability";

export async function getRoomTypeAvailabilityAction(locationID: number | undefined, dateRange: DateRange) {
    return getRoomTypeAvailability(locationID, dateRange);
} 