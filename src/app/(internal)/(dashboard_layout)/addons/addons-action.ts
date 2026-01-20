"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {AddOn, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {object, string} from "zod";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {AddonSchema} from "@/app/_lib/zod/addon/zod";
import {serverLogger} from "@/app/_lib/axiom/server";
import {after} from "next/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export type AddonIncludePricing = Prisma.AddOnGetPayload<{
    include: {
        pricing: true,
        bookings: {
            include: {
                booking: {
                    include: {
                        tenants: true,
                        rooms: true
                    }
                }
            }
        }
    }
}> & {
    activeBookingsCount: number
};

export async function upsertAddonAction(reqData: OmitIDTypeAndTimestamp<AddOn>) {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = AddonSchema.safeParse(reqData);

    if (!success) {
        return toClient({
            errors: error?.format()
        });
    }

    if (data.parent_addon_id) {
        const parent = await prisma.addOn.findUnique({
            where: {id: data.parent_addon_id},
        });

        if (!parent) {
            return toClient({
                failure: "Invalid Parent ID"
            });
        }
    }

    const {pricing, ...newAddonWithoutPricing} = data;

    try {
        let res;

        if (data?.id) {
            res = prisma.$transaction(async (trx) => {
                let pricingIDs = data.pricing.flatMap(p => p.id ? p.id : []);
                if (pricingIDs) {
                    await trx.addOnPricing.deleteMany({
                        where: {
                            id: {
                                in: pricingIDs
                            }
                        }
                    });
                }


                for (const p of data.pricing) {
                    let {id: _, ...pricingData} = p;
                    await trx.addOnPricing.upsert({
                        where: {id: p.id ?? "non-id"},
                        update: {
                            ...pricingData,
                            addon_id: data.id
                        },
                        // @ts-expect-error weird id error
                        create: {
                            ...pricingData,
                            addon_id: data.id
                        }
                    });
                }

                return trx.addOn.update({
                    data: {
                        ...newAddonWithoutPricing,
                        id: undefined,
                    },
                    where: {
                        id: data.id
                    },
                    include: {
                        pricing: true
                    }
                });
            });
        } else {
            res = prisma.addOn.create({
                data: {
                    ...newAddonWithoutPricing,
                    id: undefined,
                    pricing: {
                        createMany: {
                            data: data?.pricing.map(p => ({...p, id: undefined}))
                        }
                    }
                },
                include: {
                    pricing: true,
                }
            });
        }

        return toClient({
            success: res
        });
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[upsertAddonAction][PrismaKnownError]", {error});
            if (error.code == "P2002") {
                return toClient({failure: "Addon is taken"});
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[upsertAddonAction][PrismaUnknownError]", {error});
        } else {
            serverLogger.error("[upsertAddonAction]", {error});
        }

        return toClient({failure: "Request unsuccessful"});
    }
}

export async function deleteAddOnAction(id: string) {
    after(() => {
        serverLogger.flush();
    });
    const parsedData = object({id: string().uuid()}).safeParse({
        id: id,
    });

    if (!parsedData.success) {
        return toClient({
            errors: parsedData.error.format()
        });
    }

    try {
        let res = await prisma.addOn.delete({
            where: {
                id: parsedData.data.id,
            }
        });

        return toClient({
            success: res,
        });
    } catch (error) {
        serverLogger.error("[deleteAddOnAction]", {error});
        return toClient({
            failure: "Error deleting addon",
        });
    }

}

export async function getAddonsByLocation(id?: number) {
    const addons = await prisma.addOn.findMany({
        where: {
            location_id: id
        },
        include: {
            pricing: true,
            bookings: {
                where: {
                    // Only count active bookings (within their date range)
                    start_date: {
                        lte: new Date()
                    },
                    OR: [
                        {
                            end_date: {
                                gte: new Date()
                            }
                        },
                        {
                            end_date: null
                        }
                    ]
                },
                include: {
                    booking: {
                        include: {
                            tenants: true,
                            rooms: true
                        }
                    }
                }
            },

        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return toClient(addons.map(addon => ({
        ...addon,
        pricing: addon.pricing.sort((p1, p2) => p1.interval_start - p2.interval_start),
        activeBookingsCount: addon.bookings.length
    })));
}
