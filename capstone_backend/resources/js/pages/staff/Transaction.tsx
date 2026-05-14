import { useEffect, useState } from "react";
import { Drawer, Divider } from "antd";
import api from "@/services/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function TransactionsPage() {
    const [data, setData] = useState<any[]>([]);
    const [grouped, setGrouped] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get("/bookings/all");
            const raw = res.data.data || res.data;
            const bookings = Array.isArray(raw)
                ? raw.filter((b: any) => b.booking_status !== "cancelled")
                : [];

            const flat = bookings.flatMap((b: any) =>
                (b.rooms || []).map((room: any) => ({
                    key: `${b.id}-${room.id}`,
                    booking_reference: b.booking_reference,
                    guest: b.booking_type === "online"
                        ? `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`
                        : b.walk_in_guest?.full_name,
                    room: room.room_number,
                    room_type: room.room_type?.type_name || "N/A",
                    base_price: Number(room.room_type?.base_price) || 0,
                    type: (room.pivot?.stay_type || b.stay_type) === "short_stay" ? "Short Stay" : "Overnight",
                    amount: Number(room.pivot?.subtotal) || 0,
                    booking_status: b.booking_status,
                    room_status: room.status,
                    date: b.check_in_time || b.created_at,
                }))
            );
            setData(flat);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const groupData = (data: any[]) => {
        const groupedMap: any = {};
        data.forEach((item) => {
            const ref = item.booking_reference;
            if (!groupedMap[ref]) {
                groupedMap[ref] = {
                    key: ref,
                    booking_reference: ref,
                    guest: item.guest,
                    rooms: [],
                    amount: 0,
                    types: new Set(),
                    date: item.date,
                    roomDetails: [],
                };
            }
            groupedMap[ref].rooms.push(item.room);
            groupedMap[ref].amount += item.amount;
            groupedMap[ref].types.add(item.type);
            groupedMap[ref].roomDetails.push({
                room: item.room,
                room_type: item.room_type,
                base_price: item.base_price,
                type: item.type,
                status: item.room_status,
                amount: item.amount,
            });
        });
        return Object.values(groupedMap).map((g: any) => ({
            ...g,
            room: g.rooms.join(", "),
            type: Array.from(g.types).join(" / "),
        }));
    };

    const exportToExcel = async (data: any[]) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Transactions");
        worksheet.columns = [
            { width: 20 }, { width: 20 }, { width: 10 }, { width: 15 },
            { width: 15 }, { width: 15 }, { width: 15 }, { width: 25 },
        ];
        worksheet.mergeCells("A1:H1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "HOTEL TRANSACTIONS REPORT";
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 25;
        for (let col = 1; col <= 8; col++) {
            const cell = worksheet.getCell(1, col);
            const border: any = { top: { style: "medium" } };
            if (col === 1) border.left = { style: "medium" };
            if (col === 8) border.right = { style: "medium" };
            cell.border = border;
        }
        const headerRow = worksheet.getRow(2);
        headerRow.values = ["Booking Ref", "Guest", "Room", "Room Type", "Stay Type", "Base Price", "Amount", "Date"];
        headerRow.eachCell((cell, colNumber) => {
            const border: any = { top: { style: "medium" }, bottom: { style: "medium" } };
            if (colNumber === 1) border.left = { style: "medium" };
            if (colNumber === 8) border.right = { style: "medium" };
            cell.border = border;
            cell.font = { bold: true };
            cell.alignment = { horizontal: "center" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
        });
        data.forEach((item, index) => {
            const rowIndex = 3 + index;
            const row = worksheet.getRow(rowIndex);
            row.values = [item.booking_reference, item.guest, item.room, item.room_type, item.type, item.base_price, item.amount, item.date || " "];
            row.eachCell((cell, colNumber) => {
                const border: any = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
                if (colNumber === 1) border.left = { style: "medium" };
                if (colNumber === 8) border.right = { style: "medium" };
                cell.border = border;
                if (colNumber === 6 || colNumber === 7) cell.numFmt = "₱#,##0";
            });
        });
        const lastRowNumber = 3 + data.length - 1;
        const lastRow = worksheet.getRow(lastRowNumber);
        lastRow.eachCell((cell, colNumber) => {
            const border: any = { top: { style: "thin" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
            if (colNumber === 1) border.left = { style: "medium" };
            if (colNumber === 8) border.right = { style: "medium" };
            cell.border = border;
        });
        const lastCell = lastRow.getCell(8);
        if (!lastCell.value) lastCell.value = " ";
        worksheet.eachRow((row) => {
            for (let col = 1; col <= 8; col++) {
                const cell = row.getCell(col);
                if (!cell.value && !cell.border) continue;
                const border: any = cell.border || {};
                if (col === 8) border.right = { style: "medium" };
                if (col === 1) border.left = { style: "medium" };
                cell.border = border;
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Hotel_Transactions_Report.xlsx");
    };

    const displayData = grouped ? groupData(data) : data;

    const totalAmount = displayData.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

    const totalPages = Math.ceil(displayData.length / PAGE_SIZE);
    const paginatedData = displayData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="p-8 min-h-screen font-[DM_Sans,sans-serif]">

            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1a1a18] tracking-tight mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}>
                    Transactions
                </h1>
                <p className="text-sm text-[#8a8878]">View and export all booking transaction records</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-[#1a1a18]">{displayData.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-[#3eb489]">₱{totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">View Mode</p>
                    <p className="text-2xl font-bold text-[#1a1a18]">{grouped ? "By Booking" : "Per Room"}</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">

                {/* Card Header */}
                <div className="px-7 py-5 border-b border-[#eeece6] flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-base font-semibold text-[#1a1a18]"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Transaction History
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setGrouped(!grouped); setCurrentPage(1); }}
                            className="h-9 px-4 rounded-lg border border-[#e0ddd6] bg-transparent text-[#1a1a18] text-xs font-semibold transition-all hover:border-[#1a1a18] hover:bg-[#1a1a18] hover:text-white"
                        >
                            {grouped ? "Show Per Room" : "Group by Booking"}
                        </button>
                        <button
                            onClick={() => exportToExcel(data)}
                            className="h-9 px-4 rounded-lg bg-[#3eb489] text-white text-xs font-semibold transition-all hover:bg-[#31a07a] shadow-sm hover:shadow-md"
                        >
                            Export Excel
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 flex flex-col gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-11 rounded-lg"
                                    style={{
                                        background: "linear-gradient(90deg, #f2f0eb 25%, #e8e6df 50%, #f2f0eb 75%)",
                                        backgroundSize: "200% 100%",
                                        animation: `shimmer 1.4s ${i * 0.08}s infinite`,
                                        opacity: 1 - i * 0.12,
                                    }}
                                />
                            ))}
                            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
                        </div>
                    ) : displayData.length === 0 ? (
                        <div className="py-16 text-center text-[#8a8878] text-sm">
                            <p className="text-4xl mb-3">📄</p>
                            No transactions found
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f8f7f4] border-b border-[#e8e6df]">
                                    {(grouped
                                        ? ["Booking Ref", "Guest", "Rooms", "Stay Type", "Total Amount", "Date"]
                                        : ["Booking Ref", "Guest", "Room", "Room Type", "Base Price", "Stay Type", "Amount", "Date"]
                                    ).map((col) => (
                                        <th
                                            key={col}
                                            className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] whitespace-nowrap"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((row: any, idx: number) => (
                                    <tr
                                        key={row.key}
                                        onClick={() => { setSelected(row); setOpen(true); }}
                                        className="border-b border-[#f2f0eb] last:border-0 hover:bg-[#f9f8f5] cursor-pointer transition-colors"
                                    >
                                        {/* Booking Ref */}
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="font-mono text-xs bg-[#f2f0eb] text-[#4a4a42] px-2 py-1 rounded-md font-semibold">
                                                {row.booking_reference}
                                            </span>
                                        </td>

                                        {/* Guest */}
                                        <td className="px-4 py-3.5">
                                            <span className="font-semibold text-[#1a1a18] text-[13px]">{row.guest || "—"}</span>
                                        </td>

                                        {/* Room */}
                                        <td className="px-4 py-3.5">
                                            <span className="font-bold text-[#1a1a18]"
                                                style={{ fontFamily: "'Playfair Display', serif" }}>
                                                {row.room}
                                            </span>
                                        </td>

                                        {/* Room Type (per-room only) */}
                                        {!grouped && (
                                            <td className="px-4 py-3.5 text-[#6b6960] text-[13px]">{row.room_type}</td>
                                        )}

                                        {/* Base Price (per-room only) */}
                                        {!grouped && (
                                            <td className="px-4 py-3.5 text-[#6b6960] text-[13px]">
                                                ₱{row.base_price?.toLocaleString()}
                                            </td>
                                        )}

                                        {/* Stay Type */}
                                        <td className="px-4 py-3.5">
                                            <span className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md ${
                                                row.type?.includes("Short")
                                                    ? "bg-[#fef8e1] text-[#9a6e00]"
                                                    : "bg-[#e8f0ff] text-[#3b5bdb]"
                                            }`}>
                                                {row.type}
                                            </span>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-3.5 text-left">
                                            <span className="font-bold text-[#1e7a45] text-[13.5px]">
                                                ₱{row.amount?.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3.5 whitespace-nowrap text-[#6b6960] text-xs">
                                            {row.date
                                                ? new Date(row.date).toLocaleString("en-PH", {
                                                    month: "short", day: "numeric", year: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer with Pagination */}
                {!loading && displayData.length > 0 && (
                    <div className="px-7 py-4 border-t border-[#f2f0eb] flex items-center justify-between flex-wrap gap-3">
                        <span className="text-xs text-[#8a8878]">
                            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, displayData.length)}–{Math.min(currentPage * PAGE_SIZE, displayData.length)} of {displayData.length} transactions
                        </span>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-1">
                            {/* Prev */}
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#6b6960] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#1a1a18] hover:enabled:text-[#1a1a18]"
                            >
                                ‹
                            </button>

                            {/* Page numbers */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce((acc: (number | string)[], p, idx, arr) => {
                                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '...'
                                        ? <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-[#8a8878] text-xs">…</span>
                                        : <button
                                            key={p}
                                            onClick={() => setCurrentPage(p as number)}
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all border ${
                                                currentPage === p
                                                    ? 'bg-[#3eb489] border-[#3eb489] text-white shadow-sm'
                                                    : 'border-[#e0ddd6] text-[#6b6960] hover:border-[#1a1a18] hover:text-[#1a1a18]'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                )
                            }

                            {/* Next */}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#6b6960] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#1a1a18] hover:enabled:text-[#1a1a18]"
                            >
                                ›
                            </button>
                        </div>

                        <span className="text-xs font-bold text-[#1a1a18]">
                            Total: <span className="text-[#3eb489]">₱{totalAmount.toLocaleString()}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Drawer */}
            <Drawer
                title={
                    <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>
                        Transaction Details
                    </span>
                }
                open={open}
                onClose={() => setOpen(false)}
                width={340}
                styles={{
                    body: { padding: "20px 24px", fontFamily: "'DM Sans', sans-serif" },
                    header: { borderBottom: "1px solid #eeece6", padding: "18px 24px" },
                }}
            >
                {selected && (
                    <div className="text-sm">
                        {/* Booking ref */}
                        <div className="mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">Booking Reference</p>
                            <span className="font-mono text-xs bg-[#f2f0eb] text-[#4a4a42] px-2.5 py-1.5 rounded-md font-semibold">
                                {selected.booking_reference}
                            </span>
                        </div>

                        {/* Guest */}
                        <div className="mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">Guest</p>
                            <p className="font-semibold text-[#1a1a18]">{selected.guest || "—"}</p>
                        </div>

                        <Divider style={{ margin: "16px 0", borderColor: "#eeece6" }} />

                        {/* Rooms */}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">Rooms</p>

                        {selected.roomDetails ? (
                            <div className="flex flex-col gap-3">
                                {selected.roomDetails.map((r: any, i: number) => (
                                    <div key={i} className="bg-[#f8f7f4] rounded-xl p-3 border border-[#e8e6df]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-[#1a1a18]"
                                                style={{ fontFamily: "'Playfair Display', serif" }}>
                                                Room {r.room}
                                            </span>
                                            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                                                r.status === "occupied"
                                                    ? "bg-[#e8f5ee] text-[#1e7a45]"
                                                    : "bg-[#f2f0eb] text-[#6b6960]"
                                            }`}>
                                                {r.status === "occupied" ? "Active" : "Completed"}
                                            </span>
                                        </div>
                                        <p className="text-[#6b6960] text-xs mb-1">{r.room_type}</p>
                                        <div className="flex justify-between text-xs text-[#6b6960]">
                                            <span>Base: ₱{r.base_price?.toLocaleString()}</span>
                                            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                                                r.type?.includes("Short")
                                                    ? "bg-[#fef8e1] text-[#9a6e00]"
                                                    : "bg-[#e8f0ff] text-[#3b5bdb]"
                                            }`}>{r.type}</span>
                                        </div>
                                        <p className="text-right font-bold text-[#1e7a45] mt-2">₱{r.amount?.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#f8f7f4] rounded-xl p-3 border border-[#e8e6df]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-[#1a1a18]"
                                        style={{ fontFamily: "'Playfair Display', serif" }}>
                                        Room {selected.room}
                                    </span>
                                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                                        selected.room_status === "occupied"
                                            ? "bg-[#e8f5ee] text-[#1e7a45]"
                                            : "bg-[#f2f0eb] text-[#6b6960]"
                                    }`}>
                                        {selected.room_status === "occupied" ? "Active" : "Completed"}
                                    </span>
                                </div>
                                <p className="text-[#6b6960] text-xs mb-1">{selected.room_type}</p>
                                <div className="flex justify-between text-xs text-[#6b6960]">
                                    <span>Base: ₱{selected.base_price?.toLocaleString()}</span>
                                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                                        selected.type?.includes("Short")
                                            ? "bg-[#fef8e1] text-[#9a6e00]"
                                            : "bg-[#e8f0ff] text-[#3b5bdb]"
                                    }`}>{selected.type}</span>
                                </div>
                                <p className="text-right font-bold text-[#1e7a45] mt-2">₱{selected.amount?.toLocaleString()}</p>
                            </div>
                        )}

                        <Divider style={{ margin: "16px 0", borderColor: "#eeece6" }} />

                        {/* Totals */}
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878]">Total</p>
                            <p className="font-bold text-[#1e7a45] text-base">₱{selected.amount?.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878]">Date</p>
                            <p className="text-xs text-[#6b6960]">
                                {new Date(selected.date).toLocaleString("en-PH", {
                                    month: "short", day: "numeric", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}