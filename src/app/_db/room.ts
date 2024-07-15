"use server";

import {Prisma, Room, RoomType} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

export type RoomsWithType = Prisma.RoomGetPayload<{
    include: {
        roomtypes: {
            include: {
                roomtypedurations: {
                    include: {
                        durations: true
                    }
                }
            }
        },
        roomstatuses: true
    }
}>

export async function getRooms(id?: number, locationID?: number, limit?: number, offset?: number) {
    return prisma.room.findMany({
        where: {
            id: id,
            location_id: locationID
        },
        include: {
            roomtypes: {
                include: {
                    roomtypedurations: {
                        include: {
                            durations: true
                        }
                    }
                }
            },
            roomstatuses: true
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
        },
        include: {
            roomtypes: {
                include: {
                    roomtypedurations: {
                        include: {
                            durations: true
                        }
                    }
                }
            },
            roomstatuses: true
        },
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
        },
        include: {
            roomtypes: {
                include: {
                    roomtypedurations: {
                        include: {
                            durations: true
                        }
                    }
                }
            },
            roomstatuses: true
        },
    });
}

export async function deleteRoom(id: number) {
    return prisma.room.delete({
        where: {
            id: id
        },
        include: {
            roomtypes: {
                include: {
                    roomtypedurations: {
                        include: {
                            durations: true
                        }
                    }
                }
            },
            roomstatuses: true
        },
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

export async function getRoomTypes() {
    return prisma.roomType.findMany();
}

export async function getRoomStatuses() {
    return prisma.roomStatus.findMany();
}

export async function createRoomType(data: OmitIDTypeAndTimestamp<RoomType>) {
    return prisma.roomType.create({
        data: data
    });
}

export async function updateRoomTypeByID(id: number, data: OmitIDTypeAndTimestamp<RoomType>) {
    return prisma.roomType.update({
        where: {
            id: id
        },
        data: {
            ...data,
            id: undefined
        }
    });
}


export async function deleteRoomType(id: number) {
    return prisma.roomType.delete({
        where: {
            id
        }
    });
}
