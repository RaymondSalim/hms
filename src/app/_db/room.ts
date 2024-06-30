import {Room} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

export async function getRooms(id?: number, limit?: number, offset?: number) {
    return prisma.room.findMany({
        where: {
            id: id
        },
        skip: offset,
        take: limit
    });
}

export async function createRoom(roomData: OmitIDTypeAndTimestamp<Room>) {
    return prisma.room.create({
        data: {
            room_number: roomData.room_number,
            room_type_id: roomData.room_type_id,
            status_id: roomData.status_id,
            location_id: roomData.location_id,
        }
    });
}

export async function updateRoomByID(id: number, roomData: OmitIDTypeAndTimestamp<Room>) {
    return prisma.room.update({
        data: {
            room_number: roomData.room_number,
            room_type_id: roomData.room_type_id,
            status_id: roomData.status_id,
            location_id: roomData.location_id,
        },
        where: {
            id: id
        }
    });
}

export async function deleteRoom(id: number) {
    return prisma.room.delete({
        where: {
            id: id
        }
    });
}

export async function getRoomById(id: number) {
    return prisma.room.findUnique({
        where: { id },
    });
}

export async function getAllRooms(limit?: number, offset?: number) {
    return prisma.room.findMany({
        skip: offset,
        take: limit
    });
}

export async function getRoomsByLocationId(location_id: number) {
    return prisma.room.findMany({
        where: {
            location_id: location_id
        },
    });
}
