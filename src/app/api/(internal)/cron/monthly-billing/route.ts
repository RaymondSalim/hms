import {after, NextResponse} from "next/server";
import prisma from "@/app/_lib/primsa";
import {generateNextMonthlyBill} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {serverLogger, withAxiom} from "@/app/_lib/axiom/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export const POST = withAxiom(async () => {
    after(() => {
        serverLogger.flush();
    });
    try {
        const activeRollingBookings = await prisma.booking.findMany({
            where: {
                is_rolling: true,
                end_date: null,
            },
            include: {
                bills: true,
                tenants: {
                    select: {
                        name: true,
                    }
                },
                rooms: {
                    select: {
                        room_number: true,
                        roomtypes: {
                            select: {
                                type: true,
                            }
                        }
                    }
                },
                deposit: true,
                addOns: {
                    include: {
                        addOn: {
                            include: {
                                pricing: true
                            }
                        }
                    }
                }
            }
        });

        const today = new Date();
        let newBillsCount = 0;
        const processedBookings: Array<{
            bookingId: number;
            tenantName: string;
            roomName: string;
            roomType: string;
            fee: number;
            status: 'processed' | 'no_bill_needed';
            billId?: number;
            billDescription?: string;
        }> = [];

        for (const booking of activeRollingBookings) {
            const nextBill = await generateNextMonthlyBill(booking, booking.bills, today);

            if (nextBill) {
                const createdBill = await prisma.bill.create({
                    data: nextBill,
                });
                newBillsCount++;

                processedBookings.push({
                    bookingId: booking.id,
                    tenantName: booking.tenants?.name || 'Unknown',
                    roomName: booking.rooms?.room_number || 'Unknown',
                    roomType: booking.rooms?.roomtypes?.type || 'Unknown',
                    fee: Number(booking.fee),
                    status: 'processed',
                    billId: createdBill.id,
                    billDescription: nextBill.description,
                });
            } else {
                processedBookings.push({
                    bookingId: booking.id,
                    tenantName: booking.tenants?.name || 'Unknown',
                    roomName: booking.rooms?.room_number || 'Unknown',
                    roomType: booking.rooms?.roomtypes?.type || 'Unknown',
                    fee: Number(booking.fee),
                    status: 'no_bill_needed',
                });
            }
        }

        return NextResponse.json({
            message: `Successfully processed ${activeRollingBookings.length} bookings and created ${newBillsCount} new bills.`,
            summary: {
                totalBookingsProcessed: activeRollingBookings.length,
                newBillsCreated: newBillsCount,
                processedDate: today.toISOString(),
            },
            processedBookings: processedBookings,
        });

    } catch (error) {
        serverLogger.error("[api/cron/monthly-billing] Cron job failed:", {error});
        return NextResponse.json({
            message: "Cron job failed",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
});
