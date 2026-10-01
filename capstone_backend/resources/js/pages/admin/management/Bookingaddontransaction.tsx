import { useEffect, useState, useCallback, useRef } from "react";
import { Drawer, Divider, Select, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import api from "@/services/api";

interface AddOnTransactionRow {
    id: number;
    booking_id: number | null;
    booking_reference: string;
    guest: string;
    booking_type: string; // "Online" | "Walk-in"
    room_number: string;
    room_type: string;
    room_status: string;
    add_on_name: string;
    price: number;
    quantity: number;
    subtotal: number;
    date: string | null;
}

interface Summary {
    total_records: number;
    total_quantity: number;
    total_revenue: number;
}

const MINT_GREEN = "#3eb489";

const pageSizeOptions = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
];

const colHeaders = [
    "Booking Ref",
    "Guest",
    "Room",
    "Add-on",
    "Price",
    "Qty",
    "Subtotal",
    "Date",
];

const formatDateTime = (value?: string | null) =>
    value
        ? new Date(value).toLocaleString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
          })
        : "—";

const peso = (n: number | string | undefined) =>
    `₱${Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const statusStyle = (status: string) => {
    switch (status) {
        case "checked_in":
            return "bg-blue-100 text-blue-700";
        case "checked_out":
            return "bg-gray-100 text-gray-700";
        case "refunded":
            return "bg-purple-100 text-purple-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        default:
            return "bg-green-100 text-green-700";
    }
};

export default function BookingAddOnTransaction() {
    const [data, setData] = useState<AddOnTransactionRow[]>([]);
    const [summary, setSummary] = useState<Summary>({
        total_records: 0,
        total_quantity: 0,
        total_revenue: 0,
    });
    const [selected, setSelected] = useState<AddOnTransactionRow | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [searchText, setSearchText] = useState("");

    const abortRef = useRef<AbortController | null>(null);

    // ─── Debounce the search box ─────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => setSearchText(searchInput.trim()), 500);
        return () => clearTimeout(t);
    }, [searchInput]);

    // ─── Load data ───────────────────────────────────────────────────────────
    const loadData = useCallback(
        async (page: number, size: number, search: string) => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setLoading(true);

            try {
                const res = await api.get("/booking-add-ons/transactions", {
                    params: {
                        page,
                        per_page: size,
                        search: search || undefined,
                    },
                    signal: controller.signal,
                });

                const rows: AddOnTransactionRow[] = res.data.data ?? [];
                const sum: Summary = {
                    total_records: res.data.summary?.total_records ?? 0,
                    total_quantity: res.data.summary?.total_quantity ?? 0,
                    total_revenue: Number(
                        res.data.summary?.total_revenue ?? 0,
                    ),
                };

                setData(rows);
                setSummary(sum);
                setTotalPages(Math.max(res.data.last_page ?? 1, 1));
                setCurrentPage(page);
                setLoading(false);
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
                    total_quantity: 0,
                    total_revenue: 0,
                });
                setLoading(false);
            }
        },
        [],
    );

    // Reload whenever page size or search changes (back to page 1)
    useEffect(() => {
        loadData(1, pageSize, searchText);
        return () => abortRef.current?.abort();
    }, [pageSize, searchText, loadData]);

    const handlePageChange = (page: number) => {
        if (page === currentPage || page < 1 || page > totalPages) return;
        loadData(page, pageSize, searchText);
    };

    const pageAmount = data.reduce((sum, r) => sum + Number(r.subtotal || 0), 0);

    const rangeText = () => {
        if (!loading && data.length === 0) return "No add-on transactions found";
        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, summary.total_records);
        return `Showing ${start}–${end} of ${summary.total_records} add-on transactions`;
    };

    // ─── UI ──────────────────────────────────────────────────────────────────
    return (
        <div className="p-8 min-h-screen font-[DM_Sans,sans-serif] select-none">
            {/* Page Header */}
            <div className="mb-8">
                <h1
                    className="text-3xl font-bold text-[#1a1a18] tracking-tight mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                >
                    Add-on Transactions
                </h1>
                <p className="text-sm text-[#8a8878]">
                    Record of all add-ons charged to booked rooms
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    {
                        label: "Total Records",
                        value: summary.total_records.toLocaleString(),
                        className: "text-[#1a1a18]",
                    },
                    {
                        label: "Items Sold",
                        value: summary.total_quantity.toLocaleString(),
                        className: "text-[#1a1a18]",
                    },
                    {
                        label: "Add-on Revenue",
                        value: peso(summary.total_revenue),
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
                <div className="px-7 py-5 border-b border-[#eeece6] flex items-center justify-between flex-wrap gap-3">
                    <h2
                        className="text-base font-semibold text-[#1a1a18]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Add-on History
                    </h2>
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Search ref, room, or add-on..."
                            allowClear
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            prefix={
                                <SearchOutlined
                                    style={{ color: "#94a3b8", fontSize: 14 }}
                                />
                            }
                            style={{ width: 260 }}
                        />
                        <div className="w-px h-6 bg-[#e0ddd6]" />
                        <Select
                            value={pageSize}
                            onChange={(v) => setPageSize(v)}
                            options={pageSizeOptions}
                            className="w-24"
                            size="middle"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {!loading && data.length === 0 ? (
                        <div className="py-16 text-center text-[#8a8878] text-sm">
                            No add-on transactions found
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f8f7f4] border-b border-[#e8e6df]">
                                    {colHeaders.map((col) => (
                                        <th
                                            key={col}
                                            className={`px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] whitespace-nowrap ${
                                                ["Room", "Qty"].includes(col)
                                                    ? "text-center"
                                                    : col === "Price" ||
                                                        col === "Subtotal"
                                                      ? "text-right"
                                                      : "text-left"
                                            }`}
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: pageSize }).map(
                                          (_, i) => (
                                              <tr
                                                  key={`sk-${i}`}
                                                  className="border-b border-[#f2f0eb]"
                                              >
                                                  {colHeaders.map((_, j) => (
                                                      <td
                                                          key={j}
                                                          className="px-4 py-3.5"
                                                      >
                                                          <div
                                                              className="h-5 rounded"
                                                              style={{
                                                                  background:
                                                                      "linear-gradient(90deg,#f2f0eb 25%,#e8e6df 50%,#f2f0eb 75%)",
                                                                  backgroundSize:
                                                                      "200% 100%",
                                                                  animation: `shimmer 1.4s ${i * 0.08}s infinite`,
                                                                  width: "80%",
                                                              }}
                                                          />
                                                      </td>
                                                  ))}
                                              </tr>
                                          ),
                                      )
                                    : data.map((row) => (
                                          <tr
                                              key={row.id}
                                              onClick={() => {
                                                  setSelected(row);
                                                  setOpen(true);
                                              }}
                                              className="border-b border-[#f2f0eb] last:border-0 hover:bg-[#f9f8f5] cursor-pointer transition-colors"
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
                                                  <p className="text-[10px] text-[#8a8878]">
                                                      {row.booking_type}
                                                  </p>
                                              </td>

                                              <td className="px-4 py-3.5 text-center">
                                                  <span
                                                      className="font-semibold text-[#1a1a18]"
                                                      style={{
                                                          fontFamily:
                                                              "'Playfair Display', serif",
                                                      }}
                                                  >
                                                      {row.room_number}
                                                  </span>
                                                  <p className="text-[10px] text-[#8a8878]">
                                                      {row.room_type}
                                                  </p>
                                              </td>

                                              <td className="px-4 py-3.5 font-semibold text-[#1a1a18] text-[13px]">
                                                  {row.add_on_name}
                                              </td>

                                              <td className="px-4 py-3.5 text-right text-[#6b6960]">
                                                  {peso(row.price)}
                                              </td>

                                              <td className="px-4 py-3.5 text-center font-semibold text-[#1a1a18]">
                                                  × {row.quantity}
                                              </td>

                                              <td className="px-4 py-3.5 text-right">
                                                  <span className="font-bold text-[#16a34a] text-[15px]">
                                                      {peso(row.subtotal)}
                                                  </span>
                                              </td>

                                              <td className="px-4 py-3.5 whitespace-nowrap text-[#6b6960] text-xs">
                                                  {formatDateTime(row.date)}
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
                        {rangeText()}
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
                            disabled={currentPage === totalPages || loading}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#3eb489] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#3eb489] hover:enabled:bg-[#3eb489] hover:enabled:text-white"
                        >
                            ›
                        </button>
                    </div>

                    <span className="text-xs font-bold text-[#1a1a18]">
                        Page Total:{" "}
                        <span style={{ color: MINT_GREEN }}>
                            {peso(pageAmount)}
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
                        Add-on Details
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
                            <p className="text-xs text-[#8a8878]">
                                {selected.booking_type}
                            </p>
                        </div>

                        <Divider
                            style={{ margin: "16px 0", borderColor: "#eeece6" }}
                        />

                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">
                            Room
                        </p>

                        <div className="bg-[#f8f7f4] rounded-xl p-4 border border-[#e8e6df] mb-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p
                                        className="font-bold text-[#1a1a18]"
                                        style={{
                                            fontFamily:
                                                "'Playfair Display', serif",
                                        }}
                                    >
                                        Room {selected.room_number}
                                    </p>
                                    <p className="text-sm text-[#8a8878] mt-1">
                                        {selected.room_type}
                                    </p>
                                </div>
                                <span
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${statusStyle(
                                        selected.room_status,
                                    )}`}
                                >
                                    {selected.room_status
                                        ?.replace(/_/g, " ")
                                        .toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-3">
                            Add-on
                        </p>

                        <div className="space-y-3 mb-5">
                            <div className="flex justify-between">
                                <span className="text-xs text-[#8a8878]">
                                    Item
                                </span>
                                <span className="font-semibold">
                                    {selected.add_on_name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-[#8a8878]">
                                    Price
                                </span>
                                <span>{peso(selected.price)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-[#8a8878]">
                                    Quantity
                                </span>
                                <span>× {selected.quantity}</span>
                            </div>
                        </div>

                        <Divider style={{ margin: "8px 0" }} />

                        <div className="flex justify-between items-center mt-3">
                            <span className="font-bold">Subtotal</span>
                            <span className="font-bold text-lg text-[#1e7a45]">
                                {peso(selected.subtotal)}
                            </span>
                        </div>

                        <div className="flex justify-between text-xs text-[#8a8878] mt-3">
                            <span>Date</span>
                            <span>{formatDateTime(selected.date)}</span>
                        </div>
                    </div>
                )}
            </Drawer>

            <style>{`
                @keyframes shimmer {
                    0%   { background-position:  200% 0; }
                    100% { background-position: -200% 0; }
                }
                .select-none {
                    user-select: none;
                    -webkit-user-select: none;
                }
            `}</style>
        </div>
    );
}