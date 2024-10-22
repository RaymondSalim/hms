"use server";

import {Prisma, RoomType} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

export type RoomsWithTypeAndLocation = Prisma.RoomGetPayload<{
    include: {
        locations: true,
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

export type RoomTypeDurationWithDuration = Prisma.RoomTypeDurationGetPayload<{
    include: {
        durations: true
    }
}>

const roomTypeIncludeCountObj = {
    include: {
        _count: {
            select: {
                rooms: true
            }
        }
    }
};
const roomTypeIncludeRoomCount = Prisma.validator<Prisma.RoomTypeDefaultArgs>()(roomTypeIncludeCountObj);

export type RoomTypeWithRoomCount = Prisma.RoomTypeGetPayload<typeof roomTypeIncludeRoomCount>

export async function getRooms(id?: number, locationID?: number, limit?: number, offset?: number) {
    return prisma.room.findMany({
        where: {
            id: id,
            location_id: locationID
        },
        include: {
            locations: true,
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
    }).then(rooms => rooms.map(r => {
        if (r.roomtypes?.roomtypedurations) {
            r.roomtypes.roomtypedurations = r.roomtypes.roomtypedurations.filter(rtd => rtd.location_id == r.location_id);
        }

        return r;
    }));
}

export async function createRoom(roomData: OmitIDTypeAndTimestamp<RoomsWithTypeAndLocation>) {
    const trxs = [];

    roomData.roomtypes?.roomtypedurations.forEach(rtd => {
        rtd.duration_id = rtd.durations.id;
        // @ts-ignore
        delete rtd.durations;
        trxs.push(
          prisma.roomTypeDuration.upsert({
              where: {
                  room_type_id_duration_id_location_id: {
                      room_type_id: rtd.room_type_id,
                      duration_id: rtd.duration_id,
                      location_id: rtd.location_id
                  },
                  id: rtd.id
              },
              // @ts-ignore
              create: {
                  ...rtd,
                  id: undefined,
              },
              // @ts-ignore
              update: {
                  ...rtd,
                  room_type_id: undefined,
                  duration_id: undefined,
                  id: undefined
              }
          })
        );
    });

    trxs.push(
      prisma.room.create({
          data: {
              room_number: roomData.room_number,
              room_type_id: roomData.roomtypes?.id,
              status_id: roomData.roomstatuses?.id,
              location_id: roomData.location_id,
          },
          include: {
              locations: true,
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
      })
    );


    return prisma.$transaction(trxs);
}

export async function updateRoomByID(id: number, roomData: OmitIDTypeAndTimestamp<RoomsWithTypeAndLocation>) {
    const trxs = [];

    roomData.roomtypes?.roomtypedurations.forEach(rtd => {
        rtd.duration_id = rtd.durations.id;
        // @ts-ignore
        delete rtd.durations;
        trxs.push(
          prisma.roomTypeDuration.upsert({
              where: {
                  room_type_id_duration_id_location_id: {
                      room_type_id: rtd.room_type_id,
                      duration_id: rtd.duration_id,
                      location_id: rtd.location_id
                  },
                  id: rtd.id
              },
              // @ts-ignore
              create: {
                  ...rtd,
                  id: undefined,
              },
              // @ts-ignore
              update: {
                  ...rtd,
                  room_type_id: undefined,
                  duration_id: undefined,
                  id: undefined
              }
          })
        );
    });

    trxs.push(
      prisma.room.update({
          where: {
              id: id
          },
          data: {
              room_number: roomData.room_number,
              room_type_id: roomData.roomtypes?.id,
              status_id: roomData.roomstatuses?.id,
              location_id: roomData.location_id
          },
          include: {
              locations: true,
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
      })
    );

    return prisma.$transaction(trxs);
}

export async function deleteRoom(id: number) {
    return prisma.room.delete({
        where: {
            id: id
        },
        include: {
            locations: true,
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

export async function getRoomTypes(locationID?: number): Promise<RoomTypeWithRoomCount[]> {
    return prisma.roomType.findMany({
        where: {
          rooms: {
              some: {
                  location_id: locationID
              }
          }
        },
        include: {
            _count: {
                select: {
                    rooms: true
                }
            }
        }
    });
}

export async function getRoomTypeDurationsByRoomTypeIDAndLocationID(room_type_id?: number | null, location_id?: number | null) {
    return prisma.roomTypeDuration.findMany({
        where: {
            room_type_id: (location_id && room_type_id) ?? -9999999,
            location_id: (room_type_id && location_id) ?? -9999999
        },
        include: {
            durations: true
        }
    });
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
