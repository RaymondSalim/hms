import {getToken} from "@auth/core/jwt";
import prisma from "@/app/_lib/primsa";
import {generateNextMonthlyBill} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {withAxiom} from "@/app/_lib/axiom/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export const GET = withAxiom(async (request: Request) => {
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET as string
    });
    if (!token) {
        return Response.json({status: 401, message: "Not Authorized"});
    }

    const reqUrl = request.url;
    const { searchParams } = new URL(reqUrl);

    // Allow specifying a custom date for testing
    let targetDate = new Date();
    if (searchParams.has("target_date")) {
        targetDate = new Date(searchParams.get("target_date")!);
    }

    try {
        // Get active rolling bookings (same logic as the actual cron)
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
                }
            }
        });

        const simulationResults: Array<{
            bookingId: number;
            tenantName: string;
            roomName: string;
            roomType: string;
            fee: number;
            status: 'would_create_bill' | 'no_bill_needed' | 'error';
            billDescription?: string;
            reason?: string;
            existingBillsCount: number;
            latestBillDueDate?: string;
            nextBillStartDate?: string;
        }> = [];

        for (const booking of activeRollingBookings) {
            try {
                const nextBill = await generateNextMonthlyBill(booking, booking.bills, targetDate);

                if (nextBill) {
                    simulationResults.push({
                        bookingId: booking.id,
                        tenantName: booking.tenants?.name || 'Unknown',
                        roomName: booking.rooms?.room_number || 'Unknown',
                        roomType: booking.rooms?.roomtypes?.type || 'Unknown',
                        fee: Number(booking.fee),
                        status: 'would_create_bill',
                        billDescription: nextBill.description,
                        existingBillsCount: booking.bills.length,
                        latestBillDueDate: booking.bills.length > 0 
                            ? new Date(Math.max(...booking.bills.map(b => b.due_date.getTime()))).toISOString()
                            : undefined,
                        nextBillStartDate: nextBill.due_date ? new Date(nextBill.due_date.getFullYear(), nextBill.due_date.getMonth(), 1).toISOString() : undefined,
                    });
                } else {
                    // Determine why no bill was generated
                    let reason = 'Unknown';
                    if (booking.end_date && targetDate > booking.end_date) {
                        reason = 'Booking has ended';
                    } else if (booking.bills.length === 0) {
                        reason = 'No existing bills found';
                    } else {
                        const latestBill = booking.bills.sort((a, b) => b.due_date.getTime() - a.due_date.getTime())[0];
                        const nextBillStartDate = new Date(latestBill.due_date.getFullYear(), latestBill.due_date.getMonth() + 1, 1);
                        
                        if (nextBillStartDate.getMonth() !== targetDate.getMonth() || nextBillStartDate.getFullYear() !== targetDate.getFullYear()) {
                            reason = `Next bill date (${nextBillStartDate.toISOString().split('T')[0]}) is not in target month (${targetDate.getMonth() + 1}/${targetDate.getFullYear()})`;
                        } else {
                            reason = 'Bill already exists for this month';
                        }
                    }

                    simulationResults.push({
                        bookingId: booking.id,
                        tenantName: booking.tenants?.name || 'Unknown',
                        roomName: booking.rooms?.room_number || 'Unknown',
                        roomType: booking.rooms?.roomtypes?.type || 'Unknown',
                        fee: Number(booking.fee),
                        status: 'no_bill_needed',
                        reason,
                        existingBillsCount: booking.bills.length,
                        latestBillDueDate: booking.bills.length > 0 
                            ? new Date(Math.max(...booking.bills.map(b => b.due_date.getTime()))).toISOString()
                            : undefined,
                    });
                }
            } catch (error) {
                simulationResults.push({
                    bookingId: booking.id,
                    tenantName: booking.tenants?.name || 'Unknown',
                    roomName: booking.rooms?.room_number || 'Unknown',
                    roomType: booking.rooms?.roomtypes?.type || 'Unknown',
                    fee: Number(booking.fee),
                    status: 'error',
                    reason: error instanceof Error ? error.message : 'Unknown error',
                    existingBillsCount: booking.bills.length,
                });
            }
        }

        const summary = {
            targetDate: targetDate.toISOString(),
            totalBookingsProcessed: activeRollingBookings.length,
            wouldCreateBills: simulationResults.filter(r => r.status === 'would_create_bill').length,
            noBillNeeded: simulationResults.filter(r => r.status === 'no_bill_needed').length,
            errors: simulationResults.filter(r => r.status === 'error').length,
        };

        return Response.json({
            success: true,
            summary,
            simulationResults,
            message: `Simulation completed for ${targetDate.toISOString().split('T')[0]}. Would create ${summary.wouldCreateBills} new bills.`
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Simulation failed"
        }, { status: 500 });
    }
});
