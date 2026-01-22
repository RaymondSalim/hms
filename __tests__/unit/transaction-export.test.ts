import ExcelJS from "exceljs";
import {Prisma, TransactionType} from "@prisma/client";
import {
    buildTransactionExportFilename,
    buildTransactionExportRows,
    generateTransactionExcel,
    generateTransactionPdf,
    getTransactionsForExport
} from "@/app/(internal)/(dashboard_layout)/financials/export/transaction-export";
import {prismaMock} from "./singleton_prisma";

describe("Transaction export helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("applies date range and location filters", async () => {
        const startDate = new Date("2025-01-01T00:00:00Z");
        const endDate = new Date("2025-01-31T23:59:59Z");

        (prismaMock.transaction.findMany as jest.Mock).mockResolvedValue([]);

        await getTransactionsForExport({startDate, endDate, locationId: 3}, prismaMock as any);

        expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                location_id: 3
            },
            orderBy: {
                date: "desc"
            },
            include: {
                locations: true,
            }
        });
    });

    it("maps transactions to export rows and extracts booking id", async () => {
        const rows = await buildTransactionExportRows([{
            id: 1,
            date: new Date("2025-02-02T00:00:00Z"),
            amount: new Prisma.Decimal(250000),
            description: "Sewa Februari",
            category: "Biaya Sewa",
            location_id: 5,
            type: TransactionType.INCOME,
            related_id: {booking_id: 88},
            createdAt: new Date(),
            updatedAt: new Date(),
            locations: {name: "Jakarta"},
        } as any]);

        expect(rows[0]).toMatchObject({
            bookingId: 88,
            jenis: TransactionType.INCOME,
        });
    });

    it("builds filename based on range and format", async () => {
        const start = new Date("2025-03-01");
        const end = new Date("2025-03-31");
        const filename = await buildTransactionExportFilename({format: "excel", startDate: start, endDate: end});
        expect(filename).toContain("20250301_20250331");
        expect(filename.endsWith(".xlsx")).toBe(true);
    });

    it("creates excel workbook with header and data rows", async () => {
        const rows = [{
            tanggal: new Date("2025-01-05"),
            jenis: TransactionType.EXPENSE,
            kategori: "Operasional",
            deskripsi: "Perbaikan AC",
            jumlah: 125000,
            bookingId: undefined
        }];

        const buffer = await generateTransactionExcel(rows, {periodLabel: "Semua Waktu", locationLabel: "Bandung"});
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.getWorksheet("Transaksi");

        expect(sheet?.getRow(6).values).toEqual(expect.arrayContaining(["Tanggal", "Tipe", "Kategori", "Deskripsi", "Jumlah", "Booking ID"]));
        expect(sheet?.getRow(7).getCell(4).value).toBe("Perbaikan AC");
    });

    it("returns a valid pdf buffer", async () => {
        const rows = [{
            tanggal: new Date("2025-01-10"),
            jenis: TransactionType.INCOME,
            kategori: "Sewa",
            deskripsi: "Pembayaran sewa",
            jumlah: 300000,
            bookingId: 101
        }];

        const buffer = await generateTransactionPdf(rows, {periodLabel: "Semua Waktu", locationLabel: "Surabaya"});

        expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
        expect(buffer.length).toBeGreaterThan(100);
    });
});

