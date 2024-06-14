import {rooms as Room} from "@prisma/client";
import {OmitIDType} from "@/app/_db/db";

export async function getRooms(id?: number, limit?: number, offset?: number) {
    return prisma.rooms.findMany({
        where: {
            id: id
        },
        skip: offset,
        take: limit
    })
}

export async function createRoom(roomData: OmitIDType<Room>) {
    return prisma.rooms.create({
        data: {
            room_number: roomData.room_number,
            room_type_id: roomData.room_type_id,
            status_id: roomData.status_id,
        }
    });
}

export async function updateRoomByID(id: number, roomData: OmitIDType<Room>) {
    return prisma.rooms.update({
        data: roomData,
        where: {
            id: id
        }
    })
}

export async function deleteRoom(id: number) {
    return prisma.rooms.delete({
        where: {
            id: id
        }
    })
}
