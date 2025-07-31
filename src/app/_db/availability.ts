"use server";

import prisma from "@/app/_lib/primsa";

// Type definitions to match the UI components' expectations
export interface RoomTypeWithRoomCount {
    id: number;
    type: string;
    description: string | null;
    _count: {
        rooms: number;
    };
}

export interface RoomTypeWithRoomCountAndAvailability extends RoomTypeWithRoomCount {
    roomLeft: number;
}

export type DateRange = { from: Date; to?: Date };

/**
 * Calculates room availability for each room type for a given location and date range.
 * This function is designed to be efficient by performing the heavy lifting on the database server.
 * @param locationID The ID of the location to check.
 * @param dateRange The date range for which to check availability.
 * @returns An array of room types with their total room counts and the number of rooms left.
 */
export async function getRoomTypeAvailability(
    locationID: number | undefined,
    dateRange: DateRange
): Promise<RoomTypeWithRoomCountAndAvailability[]> {
    const { from, to } = dateRange;
    const rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = to ? new Date(to) : new Date(from);
    rangeEnd.setHours(23, 59, 59, 999);

    // 1. Get all room types and their total room counts for the location.
    const roomTypesWithCounts: RoomTypeWithRoomCount[] = await prisma.roomType.findMany({
        where: {
            rooms: {
                some: {
                    location_id: locationID,
                },
            },
        },
        include: {
            _count: {
                select: {
                    rooms: {
                        where: { location_id: locationID },
                    },
                },
            },
        },
    });

    // 2. Get all bookings that overlap with the selected date range.
    const overlappingBookings = await prisma.booking.findMany({
        where: {
            rooms: { location_id: locationID },
            OR: [
                { // Standard booking or rolling with an end date
                    start_date: { lt: rangeEnd },
                    end_date: { gt: rangeStart },
                },
                { // Active rolling booking without an end date
                    is_rolling: true,
                    end_date: null,
                    start_date: { lt: rangeEnd }
                }
            ]
        },
        select: {
            rooms: {
                select: {
                    room_type_id: true
                }
            }
        }
    });

    // 3. Count the number of occupied rooms for each room type in memory.
    const occupiedCountsMap = new Map<number, number>();
    for (const booking of overlappingBookings) {
        if (booking.rooms?.room_type_id) {
            const roomTypeId = booking.rooms.room_type_id;
            occupiedCountsMap.set(roomTypeId, (occupiedCountsMap.get(roomTypeId) || 0) + 1);
        }
    }

    // 4. Combine the total room counts with the occupied counts to get the final availability.
    return roomTypesWithCounts.map(rt => {
        const roomsBooked = occupiedCountsMap.get(rt.id) || 0;
        return {
            ...rt,
            roomLeft: rt._count.rooms - roomsBooked,
        };
    });
} 