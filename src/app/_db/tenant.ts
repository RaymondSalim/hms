"use server";

import prisma from "@/app/_lib/primsa";
import {Prisma, Tenant} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import TransactionClient = Prisma.TransactionClient;

export type TenantWithRooms = Prisma.TenantGetPayload<{
    include: {
        bookings: {
            include: {
                rooms: true
            }
        }
    }
}>;

export async function getTenants(id?: string, locationID?: number, limit?: number, offset?: number) {
    return prisma.tenant.findMany({
        where: {
            id: id,
            OR: [
                {
                    bookings: {
                        some: {
                            rooms: {
                                location_id: locationID
                            }
                        }
                    }
                },
                {
                    bookings: {
                        none: {}
                    }
                }
            ],
        },
        skip: offset,
        take: limit,
    });
}

export async function getTenantsWithRooms(id?: string, locationID?: number, limit?: number, offset?: number) {
    return prisma.tenant.findMany({
        where: {
            id: id,
            OR: [
                {
                    bookings: {
                        some: {
                            rooms: {
                                location_id: locationID
                            }
                        }
                    }
                },
                {
                    bookings: {
                        none: {}
                    }
                }
            ],
        },
        skip: offset,
        take: limit,
        include: {
            bookings: {
                include: {
                    rooms: true
                },
            },
            second_resident: true,
        }
    });
}

export async function getTenantsWithRoomNumber(locationID?: number) {
    return prisma.tenant.findMany({
        select: {
            id: true,
            name: true,
            bookings: {
                select: {
                    rooms: {
                        select: {
                            room_number: true
                        },
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 1
            }
        },
        where: {
            bookings: {
                every: {
                    rooms: {
                        location_id: locationID,
                    }
                }
            }
        }
    });
}

export async function createTenant(tenantData: OmitIDTypeAndTimestamp<Tenant>, tx?: TransactionClient) {
    let prismaClient = tx ?? prisma;

    const hasSecondTenant = false;
    let secondTenantID;
    if (tenantData.second_resident_id != null) {
        secondTenantID = tenantData.second_resident_id;
    }

    return prismaClient.tenant.create({
        data: hasSecondTenant ? {
            ...tenantData,
            second_resident_id: undefined,
            second_resident: {
                connect: {
                    id: secondTenantID
                }
            }
        } : tenantData,
        include: {
            bookings: {
                include: {
                    rooms: true
                }
            },
            second_resident: true
        }
    });
}

export async function updateTenantByID(id: string, tenantData: OmitIDTypeAndTimestamp<Tenant>, tx?: TransactionClient) {
    let prismaClient = tx ?? prisma;

    const hasSecondTenant = false;
    let secondTenantID;
    if (tenantData.second_resident_id != null) {
        secondTenantID = tenantData.second_resident_id;
    }

    return prismaClient.tenant.update({
        data: hasSecondTenant ? {
            id: undefined,
            ...tenantData,
            second_resident_id: undefined,
            second_resident: {
                connect: {
                    id: secondTenantID
                }
            }
        } : {
            id: undefined,
            ...tenantData,
            second_resident_id: undefined,
        },
        where: {id},
        include: {
            bookings: {
                include: {
                    rooms: true
                }
            },
            second_resident: true
        }
    });
}

export async function deleteTenant(id: string) {
    return prisma.tenant.delete({
        where: {id},
        include: {
            bookings: {
                include: {
                    rooms: true
                }
            }
        }
    });
}
