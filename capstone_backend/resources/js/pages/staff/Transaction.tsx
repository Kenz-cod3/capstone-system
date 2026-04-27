import { useEffect, useState } from "react";
import { Table, Typography, Button, Drawer, Divider } from "antd";
import api from "@/services/api";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const { Text } = Typography;

export default function TransactionsPage() {
    const [data, setData] = useState<any[]>([]);
    const [grouped, setGrouped] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get("/bookings/all");

            const raw = res.data.data || res.data;

            const bookings = Array.isArray(raw)
                ? raw.filter((b: any) => b.booking_status !== "cancelled")
                : [];

            const flat = bookings.flatMap((b: any) =>
                (b.rooms || []).map((room: any) => ({
                    key: `${b.id}-${room.id}`,
                    booking_reference: b.booking_reference,

                    guest:
                        b.booking_type === "online"
                            ? `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`
                            : b.walk_in_guest?.guest_name,

                    room: room.room_number,
                    room_type: room.room_type?.type_name || "N/A",
                    base_price: Number(room.room_type?.base_price) || 0,// 🔥 NEW

                    type:
                        (room.pivot?.stay_type || b.stay_type) === "short_stay"
                            ? "Short Stay"
                            : "Overnight",

                    amount: Number(room.pivot?.subtotal) || 0,

                    booking_status: b.booking_status,
                    room_status: room.status,

                    date: b.check_in_time || b.created_at,
                }))
            );

            setData(flat);
        } catch (err) {
            console.error(err);
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

    // 🔥 EXPORT WITH DESIGN
    const exportToExcel = async (data: any[]) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Transactions");

        // =========================
        // 🔥 COLUMN WIDTH
        // =========================
        worksheet.columns = [
            { width: 20 },
            { width: 20 },
            { width: 10 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 25 },
        ];

        // =========================
        // 🔥 TITLE
        // =========================
        worksheet.mergeCells("A1:H1");

        const titleCell = worksheet.getCell("A1");
        titleCell.value = "HOTEL TRANSACTIONS REPORT";

        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 25;

        // 🔥 TITLE BORDER (NO BOTTOM)
        for (let col = 1; col <= 8; col++) {
            const cell = worksheet.getCell(1, col);

            const border: any = {
                top: { style: "medium" },
            };

            if (col === 1) border.left = { style: "medium" };
            if (col === 8) border.right = { style: "medium" };

            cell.border = border;
        }

        // =========================
        // 🔥 HEADER
        // =========================
        const headerRow = worksheet.getRow(2);

        headerRow.values = [
            "Booking Ref",
            "Guest",
            "Room",
            "Room Type",
            "Stay Type",
            "Base Price",
            "Amount",
            "Date",
        ];

        headerRow.eachCell((cell, colNumber) => {
            const border: any = {
                top: { style: "medium" },
                bottom: { style: "medium" },
            };

            if (colNumber === 1) border.left = { style: "medium" };
            if (colNumber === 8) border.right = { style: "medium" };

            cell.border = border;

            cell.font = { bold: true };
            cell.alignment = { horizontal: "center" };

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFEFEFEF" },
            };
        });

        // =========================
        // 🔥 DATA
        // =========================
        data.forEach((item, index) => {
            const rowIndex = 3 + index;
            const row = worksheet.getRow(rowIndex);

            row.values = [
                item.booking_reference,
                item.guest,
                item.room,
                item.room_type,
                item.type,
                item.base_price,
                item.amount,
                item.date || " ",
            ];

            row.eachCell((cell, colNumber) => {
                const border: any = {
                    top: { style: "thin" },     // 🔥 ADD
                    bottom: { style: "thin" },
                    left: { style: "thin" },    // 🔥 ADD
                    right: { style: "thin" },   // 🔥 ADD
                };

                // 🔥 stronger outer border
                if (colNumber === 1) border.left = { style: "medium" };
                if (colNumber === 8) border.right = { style: "medium" };

                cell.border = border;

                // 💰 currency format
                if (colNumber === 6 || colNumber === 7) {
                    cell.numFmt = "₱#,##0";
                }
            });
        });

        // =========================
        // 🔥 COMPUTE LAST ROW FIRST
        // =========================
        const lastRowNumber = 3 + data.length - 1;

        // =========================
        // 🔥 LAST ROW (BOTTOM BORDER)
        // =========================
        const lastRow = worksheet.getRow(lastRowNumber);

        lastRow.eachCell((cell, colNumber) => {
            const border: any = {
                top: { style: "thin" },     // 🔥 ADD
                bottom: { style: "medium" },
                left: { style: "thin" },    // 🔥 ADD
                right: { style: "thin" },   // 🔥 ADD
            };

            // 🔥 outer border stronger
            if (colNumber === 1) border.left = { style: "medium" };
            if (colNumber === 8) border.right = { style: "medium" };

            cell.border = border;
        });

        // ✅ DITO MO ILALAGAY
        const lastCell = lastRow.getCell(8);
        if (!lastCell.value) lastCell.value = " ";

        // =========================
        // 🔥 FIX RIGHT BORDER (NO GAPS)
        // =========================
        // =========================
        // 🔥 FIX RIGHT BORDER (ULTIMATE - NO GAPS)
        // =========================
        worksheet.eachRow((row) => {
            for (let col = 1; col <= 8; col++) {
                const cell = row.getCell(col);

                // ensure cell exists
                if (!cell.value && !cell.border) continue;

                const border: any = cell.border || {};

                // 🔥 force right border on column H
                if (col === 8) {
                    border.right = { style: "medium" };
                }

                // 🔥 force left border on column A
                if (col === 1) {
                    border.left = { style: "medium" };
                }

                cell.border = border;
            }
        });

        // =========================
        // 🔥 EXPORT
        // =========================
        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        saveAs(blob, "Hotel_Transactions_Report.xlsx");
    };

    const columns = [
        { title: "Booking Ref", dataIndex: "booking_reference" },
        { title: "Guest", dataIndex: "guest" },
        { title: "Room", dataIndex: "room" },
        { title: "Room Type", dataIndex: "room_type" },
        {
            title: "Base Price",
            dataIndex: "base_price",
            render: (val: number) => (
                <Text>₱{val.toLocaleString()}</Text>
            ),
        },
        { title: "Stay Type", dataIndex: "type" },
        {
            title: "Amount",
            dataIndex: "amount",
            align: "right" as const,
            render: (val: number) => (
                <Text>₱{val.toLocaleString()}</Text>
            ),
        },
        {
            title: "Date",
            dataIndex: "date",
            render: (d: string) =>
                new Date(d).toLocaleString(),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2>Transactions</h2>

            <div style={{ marginBottom: 16, display: "flex", gap: 10 }}>
                <Button onClick={() => setGrouped(!grouped)}>
                    {grouped ? "Show Per Room" : "Group by Booking"}
                </Button>

                <Button onClick={() => exportToExcel(data)}>
                    Export to Excel
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={grouped ? groupData(data) : data}
                pagination={{ pageSize: 10 }}
                bordered
                onRow={(record) => ({
                    onClick: () => {
                        setSelected(record);
                        setOpen(true);
                    },
                })}
            />

            <Drawer
                title="Transaction Details"
                open={open}
                onClose={() => setOpen(false)}
                width={400}
            >
                {selected && (
                    <div>
                        <p><strong>Booking:</strong> {selected.booking_reference}</p>
                        <p><strong>Guest:</strong> {selected.guest}</p>

                        <Divider />

                        <p><strong>Rooms:</strong></p>

                        {selected.roomDetails ? (
                            selected.roomDetails.map((r: any, i: number) => (
                                <div key={i} style={{ marginBottom: 10 }}>
                                    Room {r.room} ({r.room_type})
                                    <div>Base: ₱{r.base_price.toLocaleString()}</div>
                                    <div>{r.type}</div>
                                    <span style={{
                                        color: r.status === "occupied" ? "green" : "gray"
                                    }}>
                                        {r.status === "occupied" ? "Active" : "Completed"}
                                    </span>
                                    <div>₱{r.amount.toLocaleString()}</div>
                                </div>
                            ))
                        ) : (
                            <div>
                                Room {selected.room} ({selected.room_type})
                                <div>Base: ₱{selected.base_price.toLocaleString()}</div>
                                <div>{selected.type}</div>
                                <span style={{
                                    color: selected.room_status === "occupied" ? "green" : "gray"
                                }}>
                                    {selected.room_status === "occupied" ? "Active" : "Completed"}
                                </span>
                                <div>₱{selected.amount.toLocaleString()}</div>
                            </div>
                        )}

                        <Divider />

                        <p><strong>Total:</strong> ₱{selected.amount?.toLocaleString()}</p>
                        <p><strong>Date:</strong> {new Date(selected.date).toLocaleString()}</p>
                    </div>
                )}
            </Drawer>
        </div>
    );
}