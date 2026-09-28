import { useEffect, useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    currency,
    currencyPlain,
    dateFmt,
    timeFmt,
    guestName,
    sentenceCase,
    fetchJson,
    Pagination,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type BookingLite,
    type ReportSummary,
    type DocColumn,
} from "../Reports";

export default function BookingReports({
    start,
    end,
    searchQuery,
    onSearchChange,
    isPrintPreview,
    currentPreviewPage = 1,
    onPagesCountChange,
    includeGuestNames,
    settings = DEFAULT_SETTINGS,
}: ReportProps) {
    const orientation = settings.orientation;
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("all");
    const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery ?? "");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery ?? ""), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [start, end, debouncedSearch, statusFilter, bookingTypeFilter]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (bookingTypeFilter !== "all")
            params.set("booking_type", bookingTypeFilter);

        if (isPrintPreview) {
            params.set("page", "1");
            params.set("per_page", "1000");
        } else {
            params.set("page", String(currentPage));
            params.set("per_page", String(perPage));
        }

        fetchJson<ReportSummary>(`/reports?${params.toString()}`)
            .then((data) => !cancelled && setSummary(data))
            .catch((err) => {
                console.error("Booking API error:", err);
                if (!cancelled) setSummary(null);
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [
        start,
        end,
        debouncedSearch,
        statusFilter,
        bookingTypeFilter,
        currentPage,
        perPage,
        isPrintPreview,
    ]);

    const bookings = summary?.bookings?.data ?? [];
    const totalBookings =
        summary?.summary?.total_bookings ?? summary?.total_bookings ?? 0;
    const checkedIn = summary?.summary?.checked_in ?? summary?.checked_in ?? 0;
    const checkedOut = summary?.summary?.checked_out ?? 0;
    const pending = summary?.summary?.pending ?? 0;
    const cancelled = summary?.summary?.cancelled ?? 0;
    const refunded = summary?.summary?.refunded ?? 0;

    /**
     * ── Summary-derived stats ──
     * Prefer server-computed totals (`summary.summary.*`) so figures reflect the
     * whole filtered range, not just the current page. Falls back to a
     * client-side calc from the loaded page if the API hasn't shipped the
     * fields yet, so the UI still works.
     */
    const totalRevenue =
        summary?.summary?.total_revenue ?? // ✅ backend canonical value muna
        summary?.total_revenue ??
        bookings.reduce((s, b) => s + Number(b.total_price ?? 0), 0); // fallback lang

    const walkInCount =
        summary?.summary?.walk_in_count ?? // ✅ backend value muna
        bookings.filter((b) => b.booking_type === "walk_in").length;

    const onlineCount =
        summary?.summary?.online_count ?? // ✅ backend value muna
        bookings.filter((b) => b.booking_type === "online").length;

    const bookingChunks = useMemo(
        () => paginateRows(bookings, orientation, settings.ending),
        [bookings, orientation, settings.ending],
    );
    const previewTotalPages = Math.max(1, bookingChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(previewTotalPages);
        }
    }, [isPrintPreview, previewTotalPages, onPagesCountChange]);

    if (loading && !summary) return <Skeleton className="h-64 w-full" />;

    const lastPage = summary?.bookings?.last_page ?? 1;
    const total = summary?.bookings?.total ?? 0;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const subtitle = `${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`;

    const columns: DocColumn<BookingLite>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "ref",
            label: "Reference",
            weight: 4,
            nowrap: true,
            render: (b) => b.booking_reference ?? b.id,
        },
        {
            key: "type",
            label: "Type",
            weight: 2,
            nowrap: true,
            render: (b) => sentenceCase(b.booking_type ?? "—"),
        },
        {
            key: "guest",
            label: "Guest",
            weight: 4,
            confidential: true,
            render: (b) => guestName(b),
        },
        {
            key: "rooms",
            label: "Room(s)",
            weight: 2,
            nowrap: true,
            render: (b) =>
                b.room_numbers ??
                b.rooms
                    ?.map((r) => r.room_number)
                    .filter(Boolean)
                    .join(", ") ??
                b.room_number ??
                "—",
        },
        {
            key: "status",
            label: "Status",
            weight: 3,
            nowrap: true,
            render: (b) =>
                sentenceCase(
                    b.aggregate_status ?? b.booking_status ?? "pending",
                ),
        },
        {
            key: "total",
            label: "Total",
            weight: 3,
            align: "right",
            nowrap: true,
            render: (b) => `₱${currencyPlain(b.total_price)}`,
        },
        {
            key: "in",
            label: "Check In",
            weight: 3,
            nowrap: true,
            render: (b) => {
                const v =
                    b.earliest_check_in ??
                    b.rooms?.[0]?.check_in_time ??
                    b.bookedRooms?.[0]?.check_in_time ??
                    b.rooms?.[0]?.check_in_date ??
                    b.bookedRooms?.[0]?.check_in_date;
                return b.earliest_check_in ||
                    b.rooms?.[0]?.check_in_time ||
                    b.bookedRooms?.[0]?.check_in_time
                    ? timeFmt(v)
                    : dateFmt(v);
            },
        },
        {
            key: "out",
            label: "Check Out",
            weight: 3,
            nowrap: true,
            render: (b) => {
                const v =
                    b.latest_check_out ??
                    b.rooms?.[0]?.check_out_time ??
                    b.bookedRooms?.[0]?.check_out_time ??
                    b.rooms?.[0]?.check_out_date ??
                    b.bookedRooms?.[0]?.check_out_date;
                return b.latest_check_out ||
                    b.rooms?.[0]?.check_out_time ||
                    b.bookedRooms?.[0]?.check_out_time
                    ? timeFmt(v)
                    : dateFmt(v);
            },
        },
    ];

    const totalAmountAll = bookings.reduce(
        (sum, b) => sum + Number(b.total_price ?? 0),
        0,
    );

    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;
    const summarySentence =
        `This report lists ${total} booking${total === 1 ? "" : "s"} for ${periodLower}: ` +
        `${checkedIn} checked in, ${checkedOut} checked out, ${pending} pending, ` +
        `${cancelled} cancelled, and ${refunded} refunded. ` +
        `Total revenue is ₱${currencyPlain(totalRevenue)}.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div
                className="space-y-4 print:space-y-0"
                data-loading={loading ? "true" : "false"}
            >
                {bookingChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === bookingChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Booking Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={previewTotalPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                settings={settings}
                            >
                                <DocumentTable<BookingLite>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    emptyText="No bookings on this page."
                                    showTotal={isLast}
                                    totalLabel="Total Amount"
                                    totalValue={totalAmountAll}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    /* ── Status chip config: order + color kept subtle/minimal ── */
    const statusItems: { label: string; value: number }[] = [
        { label: "Checked In", value: checkedIn },
        { label: "Checked Out", value: checkedOut },
        { label: "Pending", value: pending },
        { label: "Cancelled", value: cancelled },
        { label: "Refunded", value: refunded },
    ];

    /* ── On-screen ── */
    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader title="Booking Reports" subtitle={subtitle} />

            {/* ── Stats strip: one minimal bar, divided into segments ── */}
            <div
                className={cnStrip(
                    "bg-white border border-gray-200 rounded-lg shadow-sm",
                    "print:shadow-none print:border-gray-300 print:rounded-none",
                )}
            >
                <div className="flex flex-col lg:flex-row divide-y divide-gray-100 lg:divide-y-0 lg:divide-x print:flex-row print:divide-y-0 print:divide-x">
                    {/* Total Bookings */}
                    <div className="flex-1 min-w-0 px-5 py-4 print:px-3 print:py-2">
                        <div className="text-[10.5px] font-medium uppercase tracking-wider text-gray-400 print:text-[8px]">
                            Total Bookings
                        </div>
                        <div className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums print:text-[15px] print:mt-0.5">
                            {totalBookings}
                        </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="flex-1 min-w-0 px-5 py-4 print:px-3 print:py-2">
                        <div className="text-[10.5px] font-medium uppercase tracking-wider text-gray-400 print:text-[8px]">
                            Total Revenue
                        </div>
                        <div className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums print:text-[15px] print:mt-0.5">
                            {currency(totalRevenue)}
                        </div>
                    </div>

                    {/* Walk-in / Online */}
                    <div className="flex-1 min-w-0 px-5 py-4 print:px-3 print:py-2">
                        <div className="text-[10.5px] font-medium uppercase tracking-wider text-gray-400 print:text-[8px]">
                            Booking Type
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-4 print:mt-0.5 print:gap-3">
                            <div>
                                <span className="text-2xl font-semibold text-gray-900 tabular-nums print:text-[15px]">
                                    {walkInCount}
                                </span>
                                <span className="ml-1.5 text-[11px] text-gray-400 print:text-[8px]">
                                    Walk-in
                                </span>
                            </div>
                            <div className="h-5 w-px bg-gray-200 print:hidden" />
                            <div>
                                <span className="text-2xl font-semibold text-gray-900 tabular-nums print:text-[15px]">
                                    {onlineCount}
                                </span>
                                <span className="ml-1.5 text-[11px] text-gray-400 print:text-[8px]">
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status breakdown */}
                    <div className="flex-[1.4] min-w-0 px-5 py-4 print:px-3 print:py-2">
                        <div className="text-[10.5px] font-medium uppercase tracking-wider text-gray-400 print:text-[8px]">
                            Status
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 print:mt-1 print:gap-x-3">
                            {statusItems.map((s) => (
                                <div
                                    key={s.label}
                                    className="flex items-baseline gap-1.5"
                                >
                                    <span className="text-[13px] font-semibold text-gray-900 tabular-nums print:text-[10px]">
                                        {s.value}
                                    </span>
                                    <span className="text-[11px] text-gray-400 print:text-[8px]">
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:mb-1">
                    <div>
                        <h3 className="text-[14px] font-semibold text-gray-800 print:text-[11px]">
                            Booking List
                        </h3>
                        <p className="text-[12px] text-gray-500 print:text-[9px]">
                            {total} booking(s) found
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 no-print">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search bookings..."
                                value={searchQuery}
                                onChange={(e) =>
                                    onSearchChange?.(e.target.value)
                                }
                                className="reports-search-input h-9 w-[200px] pl-8 text-[12px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 border border-gray-200 rounded px-2 text-[12px] focus:outline-none focus:border-gray-400 bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="checked_out">Checked Out</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <select
                            value={bookingTypeFilter}
                            onChange={(e) =>
                                setBookingTypeFilter(e.target.value)
                            }
                            className="h-9 border border-gray-200 rounded px-2 text-[12px] focus:outline-none focus:border-gray-400 bg-white"
                        >
                            <option value="all">All Types</option>
                            <option value="online">Online</option>
                            <option value="walk_in">Walk-in</option>
                        </select>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Reference
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Type
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Guest
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Room(s)
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Status
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Total
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Check In
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Check Out
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((b) => (
                                    <tr key={b.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-200 font-medium font-mono text-gray-900">
                                            {b.booking_reference ?? b.id}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(
                                                b.booking_type ?? "—",
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {guestName(b)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {b.room_numbers ??
                                                b.rooms
                                                    ?.map((r) => r.room_number)
                                                    .filter(Boolean)
                                                    .join(", ") ??
                                                b.room_number ??
                                                "—"}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            <span className="inline-flex items-center rounded border border-gray-300 px-1.5 py-0.5 text-[12px]">
                                                {sentenceCase(
                                                    b.aggregate_status ??
                                                        b.booking_status ??
                                                        "pending",
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-right font-medium tabular-nums text-gray-900">
                                            {currency(b.total_price)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {b.earliest_check_in ||
                                            b.rooms?.[0]?.check_in_time ||
                                            b.bookedRooms?.[0]?.check_in_time
                                                ? timeFmt(
                                                      b.earliest_check_in ??
                                                          b.rooms?.[0]
                                                              ?.check_in_time ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_in_time,
                                                  )
                                                : dateFmt(
                                                      b.rooms?.[0]
                                                          ?.check_in_date ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_in_date,
                                                  )}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {b.latest_check_out ||
                                            b.rooms?.[0]?.check_out_time ||
                                            b.bookedRooms?.[0]?.check_out_time
                                                ? timeFmt(
                                                      b.latest_check_out ??
                                                          b.rooms?.[0]
                                                              ?.check_out_time ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_out_time,
                                                  )
                                                : dateFmt(
                                                      b.rooms?.[0]
                                                          ?.check_out_date ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_out_date,
                                                  )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {lastPage > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        total={total}
                        perPage={perPage}
                        onPageChange={(p) => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/** Tiny helper so the stats strip's className list stays readable above. */
function cnStrip(...cls: string[]) {
    return cls.filter(Boolean).join(" ");
}
