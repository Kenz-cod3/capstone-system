/**
 * Orders Transaction Report — Orange theme (matches AdminMenu)
 *
 * Lists all POS payments with:
 *   - Payment reference (gcash_reference)
 *   - Method (cash / qrph)
 *   - Status (pending / paid)
 *   - Amount
 *   - Date
 *
 * Export format: XLSX — ginagamit ang shared utility sa
 * `src/utils/restaurantExport.ts` para hindi mag-duplicate ng code.
 *
 * May SERVER-SIDE PAGINATION na (per_page + current_page).
 * May FOOTER para sa pagination (Show Total + Page Size + Prev/Next).
 */

import React, { useMemo, useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { DatePicker, Pagination } from "antd";
import dayjs, { Dayjs } from "dayjs";
import api from "@/services/api";
import { exportTransactionsReport } from "./utils/restaurantExport";
import {
    Search,
    Wallet,
    QrCode,
    Loader2,
    CheckCircle2,
    Clock3,
    PhilippinePeso,
    TrendingUp,
    Hash,
    X,
    Download,
} from "lucide-react";

const { RangePicker } = DatePicker;

// ---------------------------------------------------------------------------
// Design tokens — ORANGE THEME
// ---------------------------------------------------------------------------
const ORANGE = "#f97316";
const ORANGE_HOVER = "#ea580c";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type StatusMeta = {
    label: string;
    text: string;
    bg: string;
};

type MethodMeta = {
    label: string;
    icon: React.ReactNode;
    color: string;
};

const STATUS_META: Record<PaymentStatus, StatusMeta> = {
    pending: {
        label: "Pending",
        text: "#8a5a0f",
        bg: "#fbf1de",
    },
    paid: {
        label: "Paid",
        text: "#155c42",
        bg: "#e4f3ec",
    },
    failed: {
        label: "Failed",
        text: "#8a3226",
        bg: "#fbe9e6",
    },
    refunded: {
        label: "Refunded",
        text: "#5e3c66",
        bg: "#f1e9f4",
    },
};

const METHOD_META: Record<string, MethodMeta> = {
    cash: {
        label: "Cash",
        icon: <Wallet className="w-3.5 h-3.5" />,
        color: "#1f7a5c",
    },
    qrph: {
        label: "QRPH",
        icon: <QrCode className="w-3.5 h-3.5" />,
        color: "#3b6ea5",
    },
    gcash: {
        label: "GCash",
        icon: <QrCode className="w-3.5 h-3.5" />,
        color: "#2a4f78",
    },
};

const DEFAULT_METHOD: MethodMeta = {
    label: "Unknown",
    icon: <Wallet className="w-3.5 h-3.5" />,
    color: "#8a8f83",
};

const DEFAULT_STATUS: StatusMeta = {
    label: "Unknown",
    text: "#5c6258",
    bg: "#f5f6f2",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OrdersTransactionReport() {
    const [searchInput, setSearchInput] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        null,
        null,
    ]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
        "all",
    );

    // -----------------------------------------------------------------------
    // Fetch payments — server-side pagination
    // -----------------------------------------------------------------------
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["order-payments", currentPage, pageSize, statusFilter],
        queryFn: async () => {
            const params: Record<string, any> = {
                page: currentPage,
                per_page: pageSize,
            };

            if (statusFilter !== "all") {
                params.payment_status = statusFilter;
            }

            const res = await api.get("/order-payments", { params });
            return res.data;
        },
        placeholderData: keepPreviousData,
        refetchInterval: 10000,
        refetchIntervalInBackground: false,
    });

    // Paginated data galing sa server
    const payments: any[] = data?.data ?? [];
    const totalFromServer: number = data?.total ?? 0;
    const lastPage: number = data?.last_page ?? 1;

    // -----------------------------------------------------------------------
    // Client-side filtering (search + date range) — sa current page lang
    // -----------------------------------------------------------------------
    const filtered = useMemo(() => {
        return payments
            .filter((p: any) => {
                const [start, end] = dateRange;
                if (!start || !end) return true;
                const d = dayjs(p.payment_date);
                return (
                    d.isAfter(
                        start.startOf("day").subtract(1, "millisecond"),
                    ) && d.isBefore(end.endOf("day").add(1, "millisecond"))
                );
            })
            .filter((p: any) => {
                if (!searchInput.trim()) return true;
                const needle = searchInput.toLowerCase();
                const haystack = [
                    p.gcash_reference ?? "",
                    String(p.order_id ?? ""),
                    p.order?.order_number ?? "",
                    p.payment_method ?? "",
                    p.order?.cashier?.first_name ?? "",
                    p.order?.cashier?.last_name ?? "",
                ]
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(needle);
            });
    }, [payments, dateRange, searchInput]);

    // -----------------------------------------------------------------------
    // Stats — base sa current page
    // -----------------------------------------------------------------------
    const stats = useMemo(() => {
        const paid = payments.filter((p: any) => p.payment_status === "paid");
        const pending = payments.filter(
            (p: any) => p.payment_status === "pending",
        );

        return {
            totalPaid: paid.reduce(
                (sum: number, p: any) => sum + Number(p.amount ?? 0),
                0,
            ),
            totalPending: pending.reduce(
                (sum: number, p: any) => sum + Number(p.amount ?? 0),
                0,
            ),
            countPaid: paid.length,
            countPending: pending.length,
        };
    }, [payments]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(amount);

    const formatDateTime = (date: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const hasActiveFilters = Boolean(
        dateRange[0] || dateRange[1] || searchInput || statusFilter !== "all",
    );

    // -----------------------------------------------------------------------
    // EXPORT TO XLSX — gumagamit ng shared utility
    // -----------------------------------------------------------------------
    const handleExport = async () => {
        try {
            const params: Record<string, any> = {
                per_page: 10000,
            };

            if (statusFilter !== "all") {
                params.payment_status = statusFilter;
            }

            const res = await api.get("/order-payments", { params });
            const allPayments: any[] = res.data?.data ?? [];

            // Apply date range + search filter
            const exportData = allPayments
                .filter((p: any) => {
                    const [start, end] = dateRange;
                    if (!start || !end) return true;
                    const d = dayjs(p.payment_date);
                    return (
                        d.isAfter(
                            start.startOf("day").subtract(1, "millisecond"),
                        ) && d.isBefore(end.endOf("day").add(1, "millisecond"))
                    );
                })
                .filter((p: any) => {
                    if (!searchInput.trim()) return true;
                    const needle = searchInput.toLowerCase();
                    const haystack = [
                        p.gcash_reference ?? "",
                        String(p.order_id ?? ""),
                        p.order?.order_number ?? "",
                        p.payment_method ?? "",
                        p.order?.cashier?.first_name ?? "",
                        p.order?.cashier?.last_name ?? "",
                    ]
                        .join(" ")
                        .toLowerCase();
                    return haystack.includes(needle);
                });

            exportTransactionsReport(exportData, { statusFilter });
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export. Please try again.");
        }
    };

    // Reset page kapag nagbago ang status filter
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter]);

    // -----------------------------------------------------------------------
    // Compute start/end item number para sa footer
    // -----------------------------------------------------------------------
    const startItem =
        totalFromServer === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalFromServer);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-orange-500 uppercase mb-1 font-['IBM_Plex_Mono']">
                            Restaurant reports
                        </p>
                        <h1 className="font-['Space_Grotesk'] text-[28px] font-semibold text-gray-900 tracking-tight m-0">
                            Orders Transaction Report
                        </h1>
                        <p className="text-[13px] text-gray-500 mt-1">
                            Every payment that came through the POS, with
                            references
                        </p>
                    </div>

                    {/* Total collected — ORANGE card */}
                    <div
                        className="relative rounded-lg px-6 py-4 min-w-[240px] shadow-md"
                        style={{ backgroundColor: ORANGE }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-3.5 w-3.5 text-white/80" />
                            <span className="text-[10px] font-semibold tracking-[0.16em] text-white/90 uppercase font-['IBM_Plex_Mono']">
                                Total collected
                            </span>
                        </div>
                        <p className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-white tabular-nums">
                            {formatCurrency(stats.totalPaid)}
                        </p>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {[
                        {
                            label: "Paid",
                            value: formatCurrency(stats.totalPaid),
                            sub: `${stats.countPaid} transactions`,
                            icon: <TrendingUp className="w-4 h-4" />,
                        },
                        {
                            label: "Pending",
                            value: formatCurrency(stats.totalPending),
                            sub: `${stats.countPending} transactions`,
                            icon: <Clock3 className="w-4 h-4" />,
                        },
                        {
                            label: "Total records",
                            value: String(totalFromServer),
                            sub: "All time",
                            icon: <Hash className="w-4 h-4" />,
                        },
                        {
                            label: "Average",
                            value: formatCurrency(
                                payments.length > 0
                                    ? payments.reduce(
                                          (s: number, p: any) =>
                                              s + Number(p.amount ?? 0),
                                          0,
                                      ) / payments.length
                                    : 0,
                            ),
                            sub: "Per transaction (page)",
                            icon: <PhilippinePeso className="w-4 h-4" />,
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide font-['IBM_Plex_Mono']">
                                    {s.label}
                                </p>
                                <span className="text-gray-400">{s.icon}</span>
                            </div>
                            <p className="font-['Space_Grotesk'] text-xl font-semibold text-gray-900 tabular-nums">
                                {s.value}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {s.sub}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Tabs — status filter (ORANGE active) */}
                <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 mb-5 shadow-sm">
                    {(
                        [
                            {
                                key: "all",
                                label: "All",
                                icon: <Hash className="h-4 w-4" />,
                            },
                            {
                                key: "paid",
                                label: "Paid",
                                icon: <CheckCircle2 className="h-4 w-4" />,
                            },
                            {
                                key: "pending",
                                label: "Pending",
                                icon: <Clock3 className="h-4 w-4" />,
                            },
                        ] as const
                    ).map((tab) => {
                        const active = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    setCurrentPage(1);
                                }}
                                style={
                                    active
                                        ? { backgroundColor: ORANGE }
                                        : undefined
                                }
                                className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
                                    active
                                        ? "text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar — Search + Date + Export */}
                <div className="bg-white rounded-lg border border-gray-100 p-3 mb-5 flex flex-col sm:flex-row gap-3 shadow-sm">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by reference, order #, or cashier..."
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-gray-50"
                        />
                    </div>

                    {/* Date Range */}
                    <RangePicker
                        value={dateRange}
                        onChange={(vals) => {
                            setDateRange(
                                (vals as [Dayjs | null, Dayjs | null]) || [
                                    null,
                                    null,
                                ],
                            );
                            setCurrentPage(1);
                        }}
                        allowEmpty={[true, true]}
                        className="!rounded-md !border-gray-200 !py-2"
                    />

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setSearchInput("");
                                setDateRange([null, null]);
                                setStatusFilter("all");
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear
                        </button>
                    )}

                    {/* EXPORT BUTTON */}
                    <button
                        onClick={handleExport}
                        disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: ORANGE }}
                        onMouseEnter={(e) => {
                            if (filtered.length > 0)
                                e.currentTarget.style.backgroundColor =
                                    ORANGE_HOVER;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = ORANGE;
                        }}
                        title="Export to Excel (XLSX)"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export to Excel
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2
                                className="h-10 w-10 animate-spin"
                                style={{ color: ORANGE }}
                            />
                            <p className="mt-4 text-gray-400 text-sm">
                                Loading transactions...
                            </p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Wallet className="h-14 w-14 text-gray-300" />
                            <p className="mt-4 text-lg font-semibold text-gray-500 font-['Space_Grotesk']">
                                No transactions found
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                                Payments will appear here once orders are paid
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        {[
                                            "Reference",
                                            "Order",
                                            "Cashier",
                                            "Method",
                                            "Status",
                                            "Date",
                                            "Amount",
                                        ].map((h, i) => (
                                            <th
                                                key={h}
                                                className={`px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-['IBM_Plex_Mono'] ${
                                                    i === 6
                                                        ? "text-right"
                                                        : "text-left"
                                                }`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((p: any) => {
                                        const meta: StatusMeta =
                                            STATUS_META[
                                                p.payment_status as PaymentStatus
                                            ] ?? DEFAULT_STATUS;

                                        const methodMeta: MethodMeta =
                                            METHOD_META[p.payment_method] ??
                                            DEFAULT_METHOD;

                                        return (
                                            <tr
                                                key={p.id}
                                                className="border-b border-gray-50 hover:bg-orange-50/40 transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1 max-w-[280px]">
                                                        {p.gcash_reference ? (
                                                            <span className="font-['IBM_Plex_Mono'] text-[11px] text-gray-900 truncate">
                                                                {
                                                                    p.gcash_reference
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="font-['IBM_Plex_Mono'] text-[11px] text-gray-400 italic">
                                                                no reference
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="font-['IBM_Plex_Mono'] font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md text-xs">
                                                        #
                                                        {p.order
                                                            ?.order_number ??
                                                            p.order_id}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-gray-600">
                                                        {p.order?.cashier
                                                            ?.first_name
                                                            ? `${p.order.cashier.first_name} ${p.order.cashier.last_name ?? ""}`.trim()
                                                            : "-"}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                                                        style={{
                                                            color: methodMeta.color,
                                                        }}
                                                    >
                                                        {methodMeta.icon}
                                                        {methodMeta.label}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span
                                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold"
                                                        style={{
                                                            backgroundColor:
                                                                meta.bg,
                                                            color: meta.text,
                                                        }}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-xs text-gray-400 font-['IBM_Plex_Mono']">
                                                    {formatDateTime(
                                                        p.payment_date,
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-right font-['IBM_Plex_Mono'] font-semibold text-sm text-emerald-700 tabular-nums">
                                                    {formatCurrency(
                                                        Number(p.amount),
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ============================================================== */}
                    {/* FOOTER — PAGINATION (Show Total + Page Size + Prev/Next)      */}
                    {/* ============================================================== */}
                    {!isLoading && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                            {/* Left: Show total info */}
                            <div className="flex items-center gap-2 text-[12px] text-gray-500 font-['IBM_Plex_Mono']">
                                <span>
                                    Showing{" "}
                                    <span className="font-semibold text-gray-700">
                                        {startItem}–{endItem}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-gray-700">
                                        {totalFromServer}
                                    </span>{" "}
                                    transactions
                                </span>
                                {isFetching && !isLoading && (
                                    <span className="flex items-center gap-1 text-orange-500">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        refreshing…
                                    </span>
                                )}
                            </div>

                            {/* Right: Ant Design Pagination */}
                            <Pagination
                                current={currentPage}
                                total={totalFromServer}
                                pageSize={pageSize}
                                onChange={(page, size) => {
                                    setCurrentPage(page);
                                    if (size && size !== pageSize) {
                                        setPageSize(size);
                                        setCurrentPage(1);
                                    }
                                }}
                                showSizeChanger
                                pageSizeOptions={[10, 15, 25, 50, 100]}
                                className="!m-0"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
