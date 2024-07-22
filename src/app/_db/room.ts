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
    });
}

export async function createRoom(roomData: OmitIDTypeAndTimestamp<RoomsWithTypeAndLocation>) {
    const trxs = [];

    roomData.roomtypes?.roomtypedurations.map(rtd => {
        rtd.duration_id = rtd.durations.id;
        // @ts-ignore
        delete rtd.durations;
        return rtd;
    });

    trxs.push(
      prisma.roomTypeDuration.createMany({
          data: roomData.roomtypes?.roomtypedurations ?? []
      })
    );
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
        trxs.push(
          prisma.roomTypeDuration.upsert({
              where: {
                  id: rtd.id ?? 0
              },
              // @ts-ignore
              update: {
                  ...rtd,
                  duration_id: rtd.durations.id,
                  durations: undefined,
                  // durations: {
                  //     connect: {
                  //         id: rtd.durations.id,
                  //     }
                  // },
                  id: undefined
              },
              // @ts-ignore
              create: {
                  ...rtd,
                  duration_id: rtd.durations.id,
                  durations: undefined,
                  // durations: {
                  //     connect: {
                  //         id: rtd.durations.id,
                  //     }
                  // },
                  id: undefined,
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
              roomtypes: {
                  connect: {
                      id: roomData.roomtypes?.id ?? undefined,
                  }
              },
              roomstatuses: {
                  connect: {
                      id: roomData.roomstatuses?.id ?? undefined
                  }
              },
              locations: {
                  connect: {
                      id: roomData.location_id ?? undefined
                  }
              }
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
