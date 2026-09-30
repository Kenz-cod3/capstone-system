import { useEffect, useRef, useState } from "react";
import api from "@/services/api";

type Period = "shift" | "today" | "week" | "month" | "all";

interface MethodTotal {
    count: number;
    total: number;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface RecentPayment {
    id: number;
    receipt_number: string | null;
    booking_reference: string | null;
    amount: number;
    payment_method: string;
    payment_date: string;
}

interface Summary {
    period: Period;
    bookings_handled: number;
    total_collected: number;
    payments_count: number;
    cash: MethodTotal;
    online: MethodTotal & {
        gcash: MethodTotal;
        bank: MethodTotal;
        qrph: MethodTotal;
    };
    refunds: MethodTotal;
    recent: RecentPayment[];
    pagination: Pagination;
}

const PERIODS: { value: Period; label: string }[] = [
    { value: "shift", label: "Current Shift" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all", label: "All Time" },
];

const METHOD_LABELS: Record<string, string> = {
    cash: "Cash",
    gcash: "GCash",
    bank: "Bank",
    qrph: "QR Ph",
};

const money = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const moneyCompact = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;

export default function HandledSummary() {
    const [period, setPeriod] = useState<Period>("today");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track the latest request so stale responses can be ignored.
    const requestTokenRef = useRef(0);

    // ─── Fetch on period/page change ────────────────────────────────────────
    useEffect(() => {
        const token = ++requestTokenRef.current;

        // ⚠️ IMPORTANT: Clear stale data immediately so the user never sees
        // the previous period's numbers mixing with the new period's loader.
        // This is what was causing the values to "add up" during navigation.
        setData(null);
        setError(null);
        setLoading(true);

        const load = async () => {
            try {
                const res = await api.get("/staff/handled-summary", {
                    params: { period, page, per_page: 10 },
                });

                // Drop the response if a newer request already started.
                if (token !== requestTokenRef.current) return;

                setData(res.data);
            } catch (err: any) {
                if (token !== requestTokenRef.current) return;

                console.error(err);
                setError(
                    err.response?.data?.message ||
                        "Failed to load your summary.",
                );
            } finally {
                if (token === requestTokenRef.current) {
                    setLoading(false);
                }
            }
        };

        load();
    }, [period, page]);

    // ─── Handlers ───────────────────────────────────────────────────────────
    const handlePeriodChange = (p: Period) => {
        // Guard: only act if something actually changes.
        if (p === period && page === 1) return;

        // Reset page first, then period. React batches these into one render,
        // so the effect fires once with both new values.
        setPage(1);
        setPeriod(p);
    };

    const handlePageChange = (nextPage: number) => {
        if (!data) return;
        if (nextPage === page) return;
        if (nextPage < 1 || nextPage > data.pagination.last_page) return;
        setPage(nextPage);
    };

    return (
        <div className="p-8 min-h-screen font-[DM_Sans,sans-serif] select-none">
            {/* ─── Page Header ──────────────────────────────────────────── */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1
                        className="text-3xl font-bold text-[#1a1a18] tracking-tight mb-1"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Handled Summary
                    </h1>
                    <p className="text-sm text-[#8a8878]">
                        Bookings and payments you received.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => handlePeriodChange(p.value)}
                            className={`h-9 rounded-lg px-3.5 text-xs font-semibold transition-all select-none ${
                                period === p.value
                                    ? "bg-[#3eb489] text-white shadow-sm"
                                    : "bg-white text-[#6b6960] border border-[#e0ddd6] hover:border-[#3eb489] hover:text-[#3eb489]"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* ─── Loading Skeleton (shown during any fetch) ────────────── */}
            {loading ? (
                <LoadingSkeleton />
            ) : data ? (
                <>
                    {/* ─── Unified Stat Card ─────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#f2f0eb]">
                            <StatCell
                                label="Bookings Handled"
                                value={String(data.bookings_handled)}
                                note={`${data.payments_count} payment${
                                    data.payments_count === 1 ? "" : "s"
                                } received`}
                            />
                            <StatCell
                                label="Cash Payments"
                                value={moneyCompact(data.cash.total)}
                                note={`${data.cash.count} transaction${
                                    data.cash.count === 1 ? "" : "s"
                                }`}
                            />
                            <StatCell
                                label="Online Payments"
                                value={moneyCompact(data.online.total)}
                                note={`${data.online.count} transaction${
                                    data.online.count === 1 ? "" : "s"
                                }`}
                            />
                            <StatCell
                                label="Refunds Processed"
                                value={moneyCompact(data.refunds.total)}
                                note={`${data.refunds.count} refund${
                                    data.refunds.count === 1 ? "" : "s"
                                }`}
                                valueClass="text-red-600"
                            />
                            <StatCell
                                label="Total Collected"
                                value={moneyCompact(data.total_collected)}
                                note="Cash + online, before refunds"
                                valueClass="text-[#3eb489]"
                            />
                        </div>
                    </div>

                    {/* ─── Payment Breakdown ─────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden mb-6">
                        <div className="px-5 py-4 border-b border-[#eeece6]">
                            <h2
                                className="text-base font-semibold text-[#1a1a18]"
                                style={{
                                    fontFamily: "'Playfair Display', serif",
                                }}
                            >
                                Payment Breakdown
                            </h2>
                        </div>

                        <div className="divide-y divide-[#f2f0eb]">
                            <BreakdownRow label="Cash" item={data.cash} />
                            <BreakdownRow
                                label="GCash"
                                item={data.online.gcash}
                            />
                            <BreakdownRow
                                label="Bank"
                                item={data.online.bank}
                            />
                            <BreakdownRow
                                label="QR Ph"
                                item={data.online.qrph}
                            />
                        </div>
                    </div>

                    {/* ─── Recent Payments Table ─────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">
                        <div className="px-7 py-5 border-b border-[#eeece6] flex items-center justify-between flex-wrap gap-3">
                            <h2
                                className="text-base font-semibold text-[#1a1a18]"
                                style={{
                                    fontFamily: "'Playfair Display', serif",
                                }}
                            >
                                Recent Payments
                            </h2>
                            <span className="text-xs text-[#8a8878]">
                                {data.pagination.total} total
                            </span>
                        </div>

                        {data.recent.length === 0 ? (
                            <div className="py-16 text-center text-[#8a8878] text-sm">
                                No payments received for this period.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[#f8f7f4] border-b border-[#e8e6df]">
                                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] text-left whitespace-nowrap">
                                                Receipt
                                            </th>
                                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] text-left whitespace-nowrap">
                                                Booking
                                            </th>
                                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] text-center whitespace-nowrap">
                                                Method
                                            </th>
                                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] text-left whitespace-nowrap">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8878] text-right whitespace-nowrap">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent.map((p, idx) => (
                                            <tr
                                                key={p.id}
                                                className="border-b border-[#f2f0eb] last:border-0 hover:bg-[#f9f8f5] transition-colors table-row-animate"
                                                style={{
                                                    animationDelay: `${idx * 40}ms`,
                                                }}
                                            >
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="font-mono text-xs bg-[#f2f0eb] text-[#4a4a42] px-2 py-1 rounded-md font-semibold">
                                                        {p.receipt_number ??
                                                            "—"}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="font-semibold text-[#1a1a18] text-[13px]">
                                                        {p.booking_reference ??
                                                            "—"}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                                                            p.payment_method ===
                                                            "cash"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-blue-100 text-blue-700"
                                                        }`}
                                                    >
                                                        {METHOD_LABELS[
                                                            p
                                                                .payment_method
                                                        ] ??
                                                            p.payment_method}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3.5 whitespace-nowrap text-[#6b6960] text-xs">
                                                    {new Date(
                                                        p.payment_date,
                                                    ).toLocaleString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                        hour12: true,
                                                    })}
                                                </td>

                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <span className="font-bold text-[#16a34a] text-[15px] tabular-nums">
                                                        {money(p.amount)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {data.pagination.total > 0 && (
                            <div className="px-7 py-4 border-t border-[#f2f0eb] flex items-center justify-between flex-wrap gap-3">
                                <span className="text-xs text-[#8a8878]">
                                    Showing {data.pagination.from ?? 0}–
                                    {data.pagination.to ?? 0} of{" "}
                                    {data.pagination.total}
                                </span>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handlePageChange(page - 1)
                                        }
                                        disabled={page <= 1}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#3eb489] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#3eb489] hover:enabled:bg-[#3eb489] hover:enabled:text-white"
                                    >
                                        ‹
                                    </button>

                                    <span className="px-3 text-xs text-[#6b6960]">
                                        Page {data.pagination.current_page} of{" "}
                                        {data.pagination.last_page}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handlePageChange(page + 1)
                                        }
                                        disabled={
                                            page >=
                                            data.pagination.last_page
                                        }
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#3eb489] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-[#3eb489] hover:enabled:bg-[#3eb489] hover:enabled:text-white"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : null}

            <style>{`
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
                @keyframes shimmer {
                    0%   { background-position:  200% 0; }
                    100% { background-position: -200% 0; }
                }
                .skeleton {
                    background: linear-gradient(
                        90deg,
                        #f2f0eb 25%,
                        #e8e6df 50%,
                        #f2f0eb 75%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.4s infinite;
                }
            `}</style>
        </div>
    );
}

/* ─── Stat Cell ────────────────────────────────────────────────────── */
function StatCell({
    label,
    value,
    note,
    valueClass = "text-[#1a1a18]",
}: {
    label: string;
    value: string;
    note: string;
    valueClass?: string;
}) {
    return (
        <div className="px-4 py-1 first:pl-0 last:pr-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-1">
                {label}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>
                {value}
            </p>
            <p className="mt-1 text-xs text-[#8a8878]">{note}</p>
        </div>
    );
}

/* ─── Breakdown Row ────────────────────────────────────────────────── */
function BreakdownRow({
    label,
    item,
}: {
    label: string;
    item: MethodTotal;
}) {
    return (
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 hover:bg-[#f9f8f5] transition-colors">
            <span className="text-sm font-medium text-[#1a1a18]">
                {label}
            </span>

            <span className="text-xs text-[#8a8878] whitespace-nowrap">
                {item.count} transaction{item.count === 1 ? "" : "s"}
            </span>

            <span className="w-28 text-right font-bold tabular-nums text-[#16a34a] text-[14px]">
                {money(item.total)}
            </span>
        </div>
    );
}

/* ─── Loading Skeleton ─────────────────────────────────────────────── */
function LoadingSkeleton() {
    return (
        <>
            {/* Stat skeleton */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#f2f0eb]">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="px-4 py-1 first:pl-0 last:pr-0"
                        >
                            <div className="skeleton h-3 w-24 rounded mb-2" />
                            <div className="skeleton h-7 w-20 rounded mb-2" />
                            <div className="skeleton h-3 w-28 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Breakdown skeleton */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-[#eeece6]">
                    <div className="skeleton h-4 w-40 rounded" />
                </div>
                <div className="divide-y divide-[#f2f0eb]">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-5 py-4"
                        >
                            <div className="skeleton h-4 w-20 rounded" />
                            <div className="skeleton h-3 w-24 rounded" />
                            <div className="skeleton h-4 w-20 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Table skeleton */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-[#eeece6]">
                    <div className="skeleton h-4 w-40 rounded" />
                </div>
                <div className="divide-y divide-[#f2f0eb]">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-5 gap-4 px-4 py-4"
                        >
                            <div className="skeleton h-4 w-24 rounded" />
                            <div className="skeleton h-4 w-28 rounded" />
                            <div className="skeleton h-5 w-16 rounded-md mx-auto" />
                            <div className="skeleton h-4 w-32 rounded" />
                            <div className="skeleton h-4 w-20 rounded ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}