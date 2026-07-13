import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Drawer, Divider, Select } from "antd";
import api from "@/services/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function TransactionsPage() {
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [summary, setSummary] = useState({
        total_records: 0,
        total_revenue: 0,
    });
    const [pageSize, setPageSize] = useState(10);
    const [isChangingPage, setIsChangingPage] = useState(false);

    // Abort controller ref
    const abortRef = useRef<AbortController | null>(null);

    // ─── Fetch transactions ───────────────────────────────────────────────────
    const fetchTransactions = useCallback(
        async (page: number, size: number, signal?: AbortSignal) => {
            const config: any = {
                params: { page, per_page: size },
            };
            if (signal) {
                config.signal = signal;
            }
            const res = await api.get("/transactions", config);
            return Array.isArray(res.data) ? res.data : res.data.data || [];
        },
        [],
    );

    const fetchSummary = useCallback(async (signal?: AbortSignal) => {
        const config: any = {};
        if (signal) {
            config.signal = signal;
        }
        const res = await api.get("/transactions/summary", config);
        return {
            total_records: res.data.total_records ?? 0,
            total_revenue: Number(res.data.total_revenue ?? 0),
        };
    }, []);

    // ─── Load data ────────────────────────────────────────────────────────────
    const loadData = useCallback(
        async (page: number, size: number, showLoading = true) => {
            // Cancel previous request
            abortRef.current?.abort();

            const controller = new AbortController();
            abortRef.current = controller;

            if (showLoading) {
                setLoading(true);
            } else {
                setIsChangingPage(true);
            }

            try {
                const [summaryData, transactions] = await Promise.all([
                    fetchSummary(controller.signal),
                    fetchTransactions(page, size, controller.signal),
                ]);

                setSummary(summaryData);
                setData(transactions);

                const total = Math.ceil(summaryData.total_records / size);

                setTotalPages(Math.max(total, 1));
                setCurrentPage(page);
            } catch (err: any) {
                if (
                    err?.name === "CanceledError" ||
                    err?.name === "AbortError"
                ) {
                    return;
                }

                console.error("Fetch failed:", err);

                setData([]);
                setSummary({
                    total_records: 0,
                    total_revenue: 0,
                });
            } finally {
                setLoading(false);
                setIsChangingPage(false);
            }
        },
        [fetchSummary, fetchTransactions],
    );

    // ─── Initial load ────────────────────────────────────────────────────────
    useEffect(() => {
        loadData(1, pageSize);

        return () => {
            abortRef.current?.abort();
        };
    }, [pageSize, loadData]);

    // ─── Page changes ────────────────────────────────────────────────────────
    const handlePageChange = useCallback(
        (page: number) => {
            if (page === currentPage || page < 1 || page > totalPages) return;
            // Set the page immediately so it highlights
            setCurrentPage(page);
            loadData(page, pageSize, false);
        },
        [currentPage, totalPages, pageSize, loadData],
    );

    // ─── Page size change ────────────────────────────────────────────────────
    const handlePageSizeChange = useCallback(
        (value: number) => {
            setPageSize(value);
            setCurrentPage(1);
            loadData(1, value);
        },
        [loadData],
    );

    // ─── Export ───────────────────────────────────────────────────────────────
    const fetchAllForExport = useCallback(async (): Promise<any[]> => {
        const total = summary.total_records;
        const res = await api.get("/transactions", {
            params: { per_page: Math.max(total, 1) },
        });
        return Array.isArray(res.data) ? res.data : res.data.data || [];
    }, [summary.total_records]);

    const exportToExcel = useCallback(async (rows: any[]) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Transactions");

        const headers = [
            "Booking Ref",
            "Guest",
            "Booking Type",
            "Rooms",
            "Total Rooms",
            "Amount",
            "Payment",
            "Date",
        ];

        const colCount = headers.length;
        const lastColLetter = String.fromCharCode(64 + colCount);

        worksheet.columns = headers.map(() => ({ width: 20 }));

        worksheet.mergeCells(`A1:${lastColLetter}1`);

        const titleCell = worksheet.getCell("A1");
        titleCell.value = "HOTEL TRANSACTIONS REPORT";
        titleCell.font = {
            size: 14,
            bold: true,
        };
        titleCell.alignment = {
            horizontal: "center",
            vertical: "middle",
        };

        worksheet.getRow(1).height = 25;

        const headerRow = worksheet.getRow(2);
        headerRow.values = headers;

        headerRow.eachCell((cell, colNumber) => {
            const border: any = {
                top: { style: "medium" },
                bottom: { style: "medium" },
            };

            if (colNumber === 1) border.left = { style: "medium" };

            if (colNumber === colCount) border.right = { style: "medium" };

            cell.border = border;
            cell.font = { bold: true };
            cell.alignment = { horizontal: "center" };

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFEFEFEF" },
            };
        });

        rows.forEach((item, index) => {
            const rowIndex = index + 3;
            const row = worksheet.getRow(rowIndex);

            const dateStr = item.date
                ? new Date(item.date).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                  })
                : "";

            row.getCell(1).value = item.booking_reference;
            row.getCell(2).value = item.guest;
            row.getCell(3).value = item.booking_type;
            row.getCell(4).value = item.rooms;
            row.getCell(5).value = item.total_rooms;
            row.getCell(6).value = Number(item.amount || 0);
            row.getCell(7).value = item.payment_method?.toUpperCase() ?? "N/A";
            row.getCell(8).value = dateStr;

            row.eachCell((cell, colNumber) => {
                const border: any = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                };

                if (colNumber === 1) border.left = { style: "medium" };

                if (colNumber === colCount) border.right = { style: "medium" };

                cell.border = border;

                if (colNumber === 6) {
                    cell.numFmt = "₱#,##0.00";
                }

                cell.alignment = {
                    vertical: "middle",
                    horizontal:
                        colNumber === 6
                            ? "right"
                            : colNumber === 5
                              ? "center"
                              : "left",
                };
            });
        });

        if (rows.length > 0) {
            const lastRow = worksheet.getRow(rows.length + 2);

            lastRow.eachCell((cell, colNumber) => {
                const border: any = {
                    top: { style: "thin" },
                    bottom: { style: "medium" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                };

                if (colNumber === 1) border.left = { style: "medium" };

                if (colNumber === colCount) border.right = { style: "medium" };

                cell.border = border;
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();

        saveAs(
            new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            "Hotel_Transactions_Report.xlsx",
        );
    }, []);

    const handleExport = useCallback(async () => {
        try {
            setExporting(true);

            const allRows = await fetchAllForExport();

            await exportToExcel(allRows);
        } catch (err) {
            console.error("Export failed:", err);
        } finally {
            setExporting(false);
        }
    }, [fetchAllForExport, exportToExcel]);

    const pageAmount = useMemo(() => {
        return data.reduce(
            (sum: number, row: any) => sum + Number(row.amount || 0),
            0,
        );
    }, [data]);

    const getRangeText = useCallback(() => {
        if (data.length === 0 && !loading) {
            return "No transactions found";
        }

        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, summary.total_records);

        return `Showing ${start}–${end} of ${summary.total_records} transactions`;
    }, [data.length, loading, currentPage, pageSize, summary.total_records]);

    // ─── UI ───────────────────────────────────────────────────────────────────
    const colHeaders = [
        "Booking Ref",
        "Guest",
        "Booking Type",
        "Rooms",
        "Total Rooms",
        "Amount Recieved",
        "Date",
    ];
    const pageSizeOptions = [
        { value: 10, label: "10" },
        { value: 20, label: "20" },
        { value: 50, label: "50" },
        { value: 100, label: "100" },
    ];

    // Determine if we should show skeleton rows
    const showSkeleton = loading || isChangingPage;

    return (
        <div className="p-8 min-h-screen font-[DM_Sans,sans-serif] select-none">
            {/* Page Header */}
            <div className="mb-8">
                <h1
                    className="text-3xl font-bold text-[#1a1a18] tracking-tight mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                >
                    Transactions
                </h1>
                <p className="text-sm text-[#8a8878]">
                    View and export all booking transaction records
                </p>
            </div>

            {/* Summary Cards - Only 2 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    {
                        label: "Total Records",
                        value: summary.total_records,
                        className: "text-[#1a1a18]",
                    },
                    {
                        label: "Total Revenue",
                        value: `₱${summary.total_revenue.toLocaleString()}`,
                        className: "text-[#3eb489]",
                    },
                ].map(({ label, value, className }) => (
                    <div
                        key={label}
                        className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">
                            {label}
                        </p>
                        <p className={`text-2xl font-bold ${className}`}>
                            {value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="px-7 py-5 border-b border-[#eeece6] flex items-center justify-between flex-wrap gap-3">
                    <h2
                        className="text-base font-semibold text-[#1a1a18]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Transaction History
                    </h2>
                    <div className="flex items-center gap-3">
                        {/* Page Size Dropdown */}
                        <Select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            options={pageSizeOptions}
                            className="w-24"
                            size="middle"
                            disabled={loading}
                        />
                        <div className="w-px h-6 bg-[#e0ddd6]" />
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="h-9 px-4 rounded-lg bg-[#3eb489] text-white text-xs font-semibold transition-all hover:bg-[#31a07a] shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {exporting ? "Exporting…" : "Export Excel"}
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {!showSkeleton && data.length === 0 ? (
                        <div className="py-16 text-center text-[#8a8878] text-sm">
                            No transactions found
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f8f7f4] border-b border-[#e8e6df]">
                                    {colHeaders.map((col) => (
                                        <th
                                            key={col}
                                            className={`px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] whitespace-nowrap ${
                                                [
                                                    "Booking Type",
                                                    "Room",
                                                    "Rooms",
                                                ].includes(col)
                                                    ? "text-center"
                                                    : "text-left"
                                            }`}
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {showSkeleton
                                    ? Array.from({ length: pageSize }).map(
                                          (_, i) => (
                                              <tr
                                                  key={`sk-${i}`}
                                                  className="border-b border-[#f2f0eb]"
                                              >
                                                  {Array.from({
                                                      length: 7,
                                                  }).map((_, j) => (
                                                      <td
                                                          key={j}
                                                          className={`px-4 py-3.5 ${
                                                              [2, 3].includes(j)
                                                                  ? "text-center"
                                                                  : ""
                                                          }`}
                                                      >
                                                          <div
                                                              className={`h-5 rounded ${
                                                                  [
                                                                      2, 3,
                                                                  ].includes(j)
                                                                      ? "mx-auto"
                                                                      : ""
                                                              }`}
                                                              style={{
                                                                  background:
                                                                      "linear-gradient(90deg,#f2f0eb 25%,#e8e6df 50%,#f2f0eb 75%)",
                                                                  backgroundSize:
                                                                      "200% 100%",
                                                                  animation: `shimmer 1.4s ${i * 0.08}s infinite`,
                                                                  width:
                                                                      j === 0
                                                                          ? "75%" // Booking Ref
                                                                          : j ===
                                                                              1
                                                                            ? "90%" // Guest
                                                                            : j ===
                                                                                2
                                                                              ? "96px" // Booking Type
                                                                              : j ===
                                                                                  3
                                                                                ? "120px" // Room
                                                                                : j ===
                                                                                    4
                                                                                  ? "60%" // Amount
                                                                                  : "80%", // Date
                                                              }}
                                                          />
                                                      </td>
                                                  ))}
                                              </tr>
                                          ),
                                      )
                                    : data.map((row: any, idx: number) => (
                                          <tr
                                              key={row.key || idx}
                                              onClick={() => {
                                                  console.log(row);
                                                  setSelected(row);
                                                  setOpen(true);
                                              }}
                                              className="border-b border-[#f2f0eb] last:border-0 hover:bg-[#f9f8f5] cursor-pointer transition-colors table-row-animate"
                                              style={{
                                                  animationDelay: `${idx * 50}ms`,
                                              }}
                                          >
                                              <td className="px-4 py-3.5 whitespace-nowrap">
                                                  <span className="font-mono text-xs bg-[#f2f0eb] text-[#4a4a42] px-2 py-1 rounded-md font-semibold">
                                                      {row.booking_reference}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5">
                                                  <span className="font-semibold text-[#1a1a18] text-[13px]">
                                                      {row.guest || "—"}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5 text-center">
                                                  <span
                                                      className={`inline-flex w-24 justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                                                          row.booking_type ===
                                                          "Online"
                                                              ? "bg-blue-100 text-blue-700"
                                                              : "bg-green-100 text-green-700"
                                                      }`}
                                                  >
                                                      {row.booking_type}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5 text-center">
                                                  <span
                                                      className="font-semibold text-[#1a1a18]"
                                                      style={{
                                                          fontFamily:
                                                              "'Playfair Display', serif",
                                                      }}
                                                  >
                                                      {row.rooms}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5 text-center">
                                                  <span className="font-semibold text-[#1a1a18]">
                                                      {row.total_rooms}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5 text-center">
                                                  <span className="font-bold text-[#16a34a] text-[15px]">
                                                      ₱
                                                      {Number(
                                                          row.amount || 0,
                                                      ).toLocaleString()}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5 whitespace-nowrap text-[#6b6960] text-xs">
                                                  {row.date
                                                      ? new Date(
                                                            row.date,
                                                        ).toLocaleString(
                                                            "en-PH",
                                                            {
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric",
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                                hour12: true,
                                                            },
                                                        )
                                                      : "—"}
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer / Pagination */}
                <div className="px-7 py-4 border-t border-[#f2f0eb] flex items-center justify-between flex-wrap gap-3">
                    <span className="text-xs text-[#8a8878]">
                        {getRangeText()}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#3eb489] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#3eb489] hover:enabled:bg-[#3eb489] hover:enabled:text-white"
                        >
                            ‹
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === totalPages ||
                                    Math.abs(p - currentPage) <= 1,
                            )
                            .reduce((acc: (number | string)[], p, idx, arr) => {
                                if (
                                    idx > 0 &&
                                    typeof arr[idx - 1] === "number" &&
                                    (p as number) - (arr[idx - 1] as number) > 1
                                )
                                    acc.push("...");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === "..." ? (
                                    <span
                                        key={`ellipsis-${i}`}
                                        className="h-8 w-8 flex items-center justify-center text-[#8a8878] text-xs"
                                    >
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() =>
                                            handlePageChange(p as number)
                                        }
                                        className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all border ${
                                            currentPage === p
                                                ? "bg-[#3eb489] border-[#3eb489] text-white shadow-sm"
                                                : "border-[#e0ddd6] text-[#6b6960] hover:border-[#3eb489] hover:text-[#3eb489]"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ),
                            )}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={
                                currentPage === totalPages ||
                                totalPages === 0 ||
                                loading
                            }
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#3eb489] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#3eb489] hover:enabled:bg-[#3eb489] hover:enabled:text-white"
                        >
                            ›
                        </button>
                    </div>

                    <span className="text-xs font-bold text-[#1a1a18]">
                        Page Total:{" "}
                        <span className="text-[#3eb489]">
                            ₱{pageAmount.toLocaleString()}
                        </span>
                    </span>
                </div>
            </div>

            {/* Detail Drawer */}
            <Drawer
                title={
                    <span
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 700,
                            fontSize: 16,
                        }}
                    >
                        Transaction Details
                    </span>
                }
                open={open}
                onClose={() => setOpen(false)}
                width={340}
                styles={{
                    body: {
                        padding: "20px 24px",
                        fontFamily: "'DM Sans', sans-serif",
                    },
                    header: {
                        borderBottom: "1px solid #eeece6",
                        padding: "18px 24px",
                    },
                }}
            >
                {selected && (
                    <div className="text-sm select-none">
                        <div className="mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">
                                Booking Reference
                            </p>
                            <span className="font-mono text-xs bg-[#f2f0eb] text-[#4a4a42] px-2.5 py-1.5 rounded-md font-semibold">
                                {selected.booking_reference}
                            </span>
                        </div>

                        <div className="mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">
                                Guest
                            </p>
                            <p className="font-semibold text-[#1a1a18]">
                                {selected.guest || "—"}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">
                                    Booking Type
                                </p>

                                <span
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                                        selected.booking_type === "Online"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-green-100 text-green-700"
                                    }`}
                                >
                                    {selected.booking_type}
                                </span>
                            </div>
                        </div>

                        <Divider
                            style={{ margin: "16px 0", borderColor: "#eeece6" }}
                        />

                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">
                            Stay Information
                        </p>

                        <div className="space-y-3 mb-5">
                            {selected.stays?.map((stay: any, index: number) => {
                                const refunded = stay.status === "refunded";
                                const cancelled = stay.status === "cancelled";

                                return (
                                    <div
                                        key={index}
                                        className="relative overflow-hidden border border-[#e8e6df] rounded-xl p-4 bg-[#faf9f6]"
                                    >
                                        {(refunded || cancelled) && (
                                            <div
                                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                                style={{ zIndex: 20 }}
                                            >
                                                <div
                                                    style={{
                                                        width: 180,
                                                        height: 180,
                                                        borderRadius: "50%",
                                                        border: refunded
                                                            ? "6px double #cf1322"
                                                            : "6px double #595959",
                                                        boxShadow: refunded
                                                            ? "0 0 0 3px rgba(207,19,34,.15)"
                                                            : "0 0 0 3px rgba(89,89,89,.15)",

                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent:
                                                            "center",
                                                        alignItems: "center",

                                                        color: refunded
                                                            ? "#cf1322"
                                                            : "#595959",

                                                        opacity: 0.22,

                                                        transform:
                                                            "rotate(-18deg)",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            letterSpacing: 4,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        LYNN ENNIA'S
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: 28,
                                                            fontWeight: 900,
                                                            letterSpacing: 4,
                                                            lineHeight: 1.15,
                                                        }}
                                                    >
                                                        {refunded
                                                            ? "REFUNDED"
                                                            : "CANCELLED"}
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            letterSpacing: 3,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        TRAVELERS INN
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Card Content */}
                                        <div className="relative z-10">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <p
                                                    className={`font-bold ${
                                                        refunded
                                                            ? "line-through text-red-500"
                                                            : "text-[#1a1a18]"
                                                    }`}
                                                    style={{
                                                        fontFamily:
                                                            "'Playfair Display', serif",
                                                    }}
                                                >
                                                    Room {stay.room_number}
                                                </p>

                                                <span
                                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                                                        stay.stay_type ===
                                                        "short_stay"
                                                            ? "bg-yellow-100 text-yellow-700"
                                                            : "bg-blue-100 text-blue-700"
                                                    }`}
                                                >
                                                    {stay.stay_type ===
                                                    "short_stay"
                                                        ? "Short Stay"
                                                        : "Overnight"}
                                                </span>
                                            </div>

                                            {/* Dates */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-[#8a8878]">
                                                        Check In
                                                    </p>

                                                    <p className="font-semibold text-[#1a1a18]">
                                                        {stay.check_in_date
                                                            ? new Date(
                                                                  stay.check_in_date,
                                                              ).toLocaleDateString(
                                                                  "en-PH",
                                                              )
                                                            : "—"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-[#8a8878]">
                                                        Check Out
                                                    </p>

                                                    <p className="font-semibold text-[#1a1a18]">
                                                        {stay.check_out_date
                                                            ? new Date(
                                                                  stay.check_out_date,
                                                              ).toLocaleDateString(
                                                                  "en-PH",
                                                              )
                                                            : "—"}
                                                    </p>
                                                </div>
                                            </div>

                                            <Divider
                                                style={{ margin: "12px 0" }}
                                            />

                                            {/* Amount */}
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-[#8a8878]">
                                                    Room Amount
                                                </span>

                                                <span className="font-bold text-[#1e7a45] text-[15px]">
                                                    ₱
                                                    {Number(
                                                        stay.subtotal || 0,
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Divider
                            style={{ margin: "16px 0", borderColor: "#eeece6" }}
                        />

                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">
                            Payment Information
                        </p>

                        <div className="space-y-3 mb-5">
                            <div className="flex justify-between">
                                <span className="text-xs text-[#8a8878]">
                                    Method
                                </span>

                                <span
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold ${
                                        selected.payment_method === "cash"
                                            ? "bg-gray-100 text-gray-700"
                                            : selected.payment_method ===
                                                "gcash"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-purple-100 text-purple-700"
                                    }`}
                                >
                                    {selected.payment_method?.toUpperCase() ??
                                        "N/A"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-xs text-[#8a8878]">
                                    Reference
                                </span>

                                <span className="font-mono text-xs">
                                    {selected.payment_reference || "N/A"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-xs text-[#8a8878]">
                                    Paid Amount
                                </span>

                                <span className="font-bold text-[#1e7a45]">
                                    ₱
                                    {Number(
                                        selected.paid_amount || 0,
                                    ).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">
                            Rooms
                        </p>

                        <div className="bg-[#f8f7f4] rounded-xl p-4 border border-[#e8e6df]">
                            <div className="flex justify-between mb-3">
                                <span className="text-xs text-[#8a8878]">
                                    Total Rooms
                                </span>

                                <span className="font-semibold">
                                    {selected.total_rooms}
                                </span>
                            </div>

                            <Divider style={{ margin: "10px 0" }} />

                            <div>
                                <span className="text-xs text-[#8a8878]">
                                    Room Numbers
                                </span>

                                <p
                                    className="font-bold text-lg text-[#1a1a18] mt-1"
                                    style={{
                                        fontFamily: "'Playfair Display', serif",
                                    }}
                                >
                                    {selected.rooms}
                                </p>
                            </div>
                        </div>

                        <Divider
                            style={{ margin: "18px 0", borderColor: "#eeece6" }}
                        />

                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">
                            Payment Summary
                        </p>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Total Booking</span>

                                <span>
                                    ₱
                                    {Number(
                                        selected.total_price || 0,
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span>Amount Paid</span>

                                <span className="text-[#1e7a45]">
                                    ₱
                                    {Number(
                                        selected.paid_amount || 0,
                                    ).toLocaleString()}
                                </span>
                            </div>
                            {Number(selected.refunded_amount || 0) > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-red-600 font-medium">
                                            Refunded
                                        </span>

                                        <span className="font-bold text-red-600">
                                            -₱
                                            {Number(
                                                selected.refunded_amount,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </>
                            )}

                            {Number(selected.cancelled_amount || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 font-medium">
                                        Cancelled
                                    </span>

                                    <span className="font-bold text-gray-600">
                                        -₱
                                        {Number(
                                            selected.cancelled_amount,
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            <Divider style={{ margin: "8px 0" }} />
                            <div className="flex justify-between items-center">
                                <span className="font-bold">
                                    Amount Received
                                </span>

                                <span className="font-bold text-lg text-[#1e7a45]">
                                    ₱
                                    {Math.max(
                                        0,
                                        Number(selected.paid_amount || 0) -
                                            Number(
                                                selected.refunded_amount || 0,
                                            ) -
                                            Number(
                                                selected.cancelled_amount || 0,
                                            ),
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs text-[#8a8878]">
                                <span>Date</span>

                                <span>
                                    {selected.date
                                        ? new Date(
                                              selected.date,
                                          ).toLocaleString("en-PH")
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            <style>{`
                @keyframes shimmer {
                    0%   { background-position:  200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .table-row-animate {
                    animation: slideIn 0.3s ease-out forwards;
                    opacity: 0;
                }
                .select-none {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
            `}</style>
        </div>
    );
}

// // ─── Extracted room card ──────────────────────────────────────────────────────
// function RoomCard({ room: r }: { room: any }) {
//     return (
//         <div className="bg-[#f8f7f4] rounded-xl p-3 border border-[#e8e6df] select-none">
//             <div className="flex items-center justify-between mb-2">
//                 <span
//                     className="font-bold text-[#1a1a18]"
//                     style={{ fontFamily: "'Playfair Display', serif" }}
//                 >
//                     Room {r.room}
//                 </span>
//             </div>
//             <div className="mt-3 space-y-2">
//                 <div className="flex justify-between">
//                     <span className="text-xs text-[#8a8878]">Room Type</span>

//                     <span>{r.room_type}</span>
//                 </div>

//                 <div className="flex justify-between">
//                     <span className="text-xs text-[#8a8878]">Base Price</span>

//                     <span>₱{Number(r.base_price).toLocaleString()}</span>
//                 </div>

//                 <div className="flex justify-between">
//                     <span className="text-xs text-[#8a8878]">Stay Type</span>

//                     <span
//                         className={`text-[10px] px-2 py-0.5 rounded-md ${
//                             r.type?.includes("Short")
//                                 ? "bg-yellow-100 text-yellow-700"
//                                 : "bg-blue-100 text-blue-700"
//                         }`}
//                     >
//                         {r.type}
//                     </span>
//                 </div>

//                 <Divider style={{ margin: "8px 0" }} />

//                 <div className="flex justify-between font-bold text-[#1e7a45]">
//                     <span>Subtotal</span>

//                     <span>₱{Number(r.amount).toLocaleString()}</span>
//                 </div>
//             </div>
//         </div>
//     );
// }
