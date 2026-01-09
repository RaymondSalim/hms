import {format} from "date-fns";
import {NextRequest, NextResponse} from "next/server";
import {auth} from "@/app/_lib/auth";
import {
    buildTransactionExportFilename,
    buildTransactionExportRows,
    generateTransactionExcel,
    generateTransactionPdf,
    getTransactionsForExport
} from "@/app/(internal)/(dashboard_layout)/financials/export/transaction-export";
import {getLocationById} from "@/app/_db/location";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({message: "Tidak diizinkan."}, {status: 401});
    }

    const searchParams = request.nextUrl.searchParams;
    const formatParam = (searchParams.get("format") ?? "excel").toLowerCase();

    if (formatParam !== "pdf" && formatParam !== "excel") {
        return NextResponse.json({message: "Format tidak didukung."}, {status: 400});
    }

    const parseDate = (value: string | null, label: string) => {
        if (!value) return undefined;
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) {
            throw new Error(`Tanggal ${label} tidak valid.`);
        }
        return parsed;
    };

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    try {
        startDate = parseDate(searchParams.get("startDate"), "mulai");
        endDate = parseDate(searchParams.get("endDate"), "akhir");
    } catch (error: any) {
        return NextResponse.json({message: error?.message ?? "Input tanggal tidak valid."}, {status: 400});
    }

    if (startDate && !endDate) {
        endDate = startDate;
    }

    if (startDate) {
        startDate = new Date(startDate.setHours(0, 0, 0, 0));
    }
    if (endDate) {
        endDate = new Date(endDate.setHours(23, 59, 59, 999));
    }

    const locationIdRaw = searchParams.get("locationId");
    if (!locationIdRaw) {
        return NextResponse.json({message: "Lokasi wajib dipilih."}, {status: 400});
    }

    const locationId = Number(locationIdRaw);
    if (Number.isNaN(locationId)) {
        return NextResponse.json({message: "Lokasi tidak valid."}, {status: 400});
    }

    const location = await getLocationById(locationId);
    if (!location) {
        return NextResponse.json({message: "Lokasi tidak ditemukan."}, {status: 404});
    }

    const transactions = await getTransactionsForExport({startDate, endDate, locationId});
    const rows = await buildTransactionExportRows(transactions);

    const periodLabel = startDate
        ? `${format(startDate, "dd MMM yyyy")} - ${format(endDate ?? startDate, "dd MMM yyyy")}`
        : "Semua Waktu";

    const meta = {
        periodLabel,
        generatedAt: new Date(),
        locationLabel: location.name,
    };

    const filename = await buildTransactionExportFilename({
        format: formatParam as "pdf" | "excel",
        startDate,
        endDate
    });

    const buffer = formatParam === "pdf"
        ? await generateTransactionPdf(rows, meta)
        : await generateTransactionExcel(rows, meta);

    const contentType = formatParam === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-cache",
        }
    });
}

