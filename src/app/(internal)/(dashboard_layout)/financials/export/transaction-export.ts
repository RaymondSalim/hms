"use server";

import {Prisma, Transaction, TransactionType} from "@prisma/client";
import {format} from "date-fns";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import prisma from "@/app/_lib/primsa";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import TextOptions = PDFKit.Mixins.TextOptions;

type TransactionWithLocation = Transaction & {
    locations: {
        name: string
    } | null
}

export type TransactionExportRow = {
    tanggal: Date;
    jenis: TransactionType;
    kategori: string | null;
    deskripsi: string;
    jumlah: number;
    bookingId?: number;
}

export type TransactionExportFilters = {
    startDate?: Date;
    endDate?: Date;
    locationId: number;
};

export type TransactionExportMeta = {
    periodLabel: string;
    generatedAt?: Date;
    locationLabel: string;
};

// Keep total width within printable area (~515pt on A4 with 40pt margins)
const DEFAULT_COLUMN_WIDTHS = [70, 60, 90, 190, 75, 50]; // sum = 535 (slightly narrower text)

function parseBookingId(related: Prisma.JsonValue | null): number | undefined {
    if (!related || typeof related !== "object") return undefined;
    if ("booking_id" in related && typeof related.booking_id === "number") {
        return related.booking_id;
    }
    return undefined;
}

export async function getTransactionsForExport(
    filters: TransactionExportFilters,
    prismaClient = prisma
): Promise<TransactionWithLocation[]> {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
    }

    where.location_id = filters.locationId;

    return prismaClient.transaction.findMany({
        where,
        orderBy: {
            date: "desc"
        },
        include: {
            locations: true,
        }
    });
}

export async function buildTransactionExportRows(transactions: TransactionWithLocation[]): Promise<TransactionExportRow[]> {
    return transactions.map((tx) => ({
        tanggal: tx.date,
        jenis: tx.type,
        kategori: tx.category ?? null,
        deskripsi: tx.description,
        jumlah: new Prisma.Decimal(tx.amount).toNumber(),
        bookingId: parseBookingId(tx.related_id),
    }));
}

export async function buildTransactionExportFilename(params: {
    format: "pdf" | "excel",
    startDate?: Date,
    endDate?: Date
}) {
    const {format, startDate, endDate} = params;
    const formatter = (d: Date) => formatDateForFilename(d);

    const rangeLabel = startDate
        ? `${formatter(startDate)}_${formatter(endDate ?? startDate)}`
        : "semua-waktu";

    return `transaksi-keuangan_${rangeLabel}.${format === "pdf" ? "pdf" : "xlsx"}`;
}

function formatDateForFilename(d: Date) {
    return format(d, "yyyyMMdd");
}

export async function generateTransactionExcel(
    rows: TransactionExportRow[],
    meta: TransactionExportMeta
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transaksi");

    sheet.addRow(["Laporan Transaksi Keuangan"]);
    sheet.addRow([`Periode: ${meta.periodLabel}`]);
    sheet.addRow([`Lokasi: ${meta.locationLabel}`]);
    sheet.addRow([`Dibuat: ${formatToDateTime(meta.generatedAt ?? new Date(), true, false)}`]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(["Tanggal", "Tipe", "Kategori", "Deskripsi", "Jumlah", "Booking ID"]);
    headerRow.font = {bold: true};

    rows.forEach((row) => {
        sheet.addRow([
            row.tanggal,
            row.jenis,
            row.kategori ?? "-",
            row.deskripsi,
            row.jumlah,
            row.bookingId ?? "-",
        ]);
    });

    const columns = [
        {key: "tanggal", width: 15, numFmt: "dd mmm yyyy"},
        {key: "jenis", width: 10},
        {key: "kategori", width: 18},
        {key: "deskripsi", width: 45},
        {key: "jumlah", width: 15, numFmt: '"Rp" #,##0'},
        {key: "booking", width: 12},
    ];

    columns.forEach((c, idx) => {
        const col = sheet.getColumn(idx + 1);
        if (c.width) col.width = c.width;
        if (c.numFmt) col.numFmt = c.numFmt;
    });

    sheet.views = [{state: "frozen", ySplit: 6}];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

export async function generateTransactionPdf(
    rows: TransactionExportRow[],
    meta: TransactionExportMeta
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({margin: 40, size: "A4"});
        const buffers: Buffer[] = [];

        doc.on("data", (data: Buffer) => buffers.push(data));
        doc.on("error", reject);
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        doc.fontSize(16).text("Laporan Transaksi Keuangan");
        doc.moveDown(0.2);
        doc.fontSize(10);
        doc.text(`Periode: ${meta.periodLabel}`);
        doc.text(`Lokasi: ${meta.locationLabel}`);
        doc.text(`Dibuat: ${formatToDateTime(meta.generatedAt ?? new Date(), true, false)}`);
        doc.moveDown();

        const startX = doc.x;
        let currentY = doc.y;

        const headers = ["Tanggal", "Tipe", "Kategori", "Deskripsi", "Jumlah", "Booking ID"];
        const totalWidth = DEFAULT_COLUMN_WIDTHS.reduce((sum, v) => sum + v, 0);

        const drawRow = (values: (string | number | undefined)[], isHeader = false) => {
            const fontName = isHeader ? "Helvetica-Bold" : "Helvetica";
            const fontSize = isHeader ? 10 : 9;
            doc.font(fontName).fontSize(fontSize);

            let x = startX;
            let rowHeight = 0;

            // Pre-calc row height for pagination check
            values.forEach((value, idx) => {
                const text = value === undefined || value === null || value === "" ? "-" : String(value);
                const opts: TextOptions = {width: DEFAULT_COLUMN_WIDTHS[idx], align: "left"};
                const height = doc.heightOfString(text, opts);
                rowHeight = Math.max(rowHeight, height);
            });

            const lineHeight = 6;
            const pageBottom = doc.page.height - doc.page.margins.bottom;
            const nextY = currentY + rowHeight + lineHeight + 4;

            if (nextY > pageBottom) {
                doc.addPage();
                currentY = doc.y;
                if (!isHeader) {
                    drawRow(headers, true);
                }
                // Reset font after header redraw
                doc.font(fontName).fontSize(fontSize);
            }

            // Draw after ensuring page space
            values.forEach((value, idx) => {
                const text = value === undefined || value === null || value === "" ? "-" : String(value);
                const opts: TextOptions = {width: DEFAULT_COLUMN_WIDTHS[idx], align: "left"};
                doc.text(text, x, currentY, opts);
                x += DEFAULT_COLUMN_WIDTHS[idx];
            });

            currentY += rowHeight + lineHeight;
            doc
                .moveTo(startX, currentY)
                .lineTo(startX + totalWidth, currentY)
                .strokeColor("#e5e7eb")
                .stroke();
            currentY += 4;
        };

        drawRow(headers, true);

        rows.forEach((row) => {
            const values = [
                formatToDateTime(row.tanggal, false, false),
                row.jenis,
                row.kategori ?? "-",
                row.deskripsi,
                formatToIDR(row.jumlah),
                row.bookingId ?? "-",
            ];
            drawRow(values, false);
        });

        doc.end();
    });
}

