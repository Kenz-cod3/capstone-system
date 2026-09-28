import { useEffect, useMemo, useState } from "react";
import {
    UserCheck,
    UserX,
    Calendar,
    CreditCard,
    AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    currency,
    currencyPlain,
    currencyCompact,
    dateFmt,
    fetchJson,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type DashboardStats,
    type FinancialTrendPoint,
    type DashboardIndexResponse,
    type DocColumn,
} from "../Reports";

interface QuickStats {
    check_ins_today: number;
    check_outs_today: number;
    pending_bookings: number;
    rooms_available: number;
}

export default function DashboardReport({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    settings = DEFAULT_SETTINGS,
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const orientation = settings.orientation;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trend, setTrend] = useState<FinancialTrendPoint[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [occupancy, setOccupancy] = useState(0);
    const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params =
            start && end ? `?start_date=${start}&end_date=${end}` : "";
        fetchJson<DashboardIndexResponse>(`/reports/dashboard${params}`)
            .then((data) => {
                if (cancelled) return;
                setStats(data.stats);
                setTrend(data.financialTrend || []);
                setRecentBookings(data.recentBookings || []);
                setOccupancy(data.occupancy || 0);
                setQuickStats((data as any).quickStats ?? null);
            })
            .catch((err) => console.error("Dashboard API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredTrend = useMemo(() => {
        if (!searchQuery) return trend;
        const q = searchQuery.toLowerCase();
        return trend.filter(
            (t) => t.name.toLowerCase().includes(q) || t.date.includes(q),
        );
    }, [trend, searchQuery]);

    const chunks = useMemo(
        () => paginateRows(filteredTrend, orientation, settings.ending),
        [filteredTrend, orientation, settings.ending],
    );
    const totalPages = Math.max(1, chunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPages);
        }
    }, [isPrintPreview, totalPages, onPagesCountChange]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const occupancyRate = Math.min(occupancy, 100);

    const trendRevenue = filteredTrend.reduce((s, r) => s + r.revenue, 0);
    const trendExpenses = filteredTrend.reduce((s, r) => s + r.expenses, 0);
    const totalRevenue = stats?.revenue ?? trendRevenue;
    const totalExpenses = stats?.expenses ?? trendExpenses;
    const totalProfit = totalRevenue - totalExpenses;

    const checkInsToday = quickStats?.check_ins_today ?? 0;
    const checkOutsToday = quickStats?.check_outs_today ?? 0;
    const pendingBookings = quickStats?.pending_bookings ?? 0;
    const roomsAvailable = quickStats?.rooms_available ?? 0;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const subtitle = `${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`;

    if (isPrintPreview) {
        const summary =
            `As of ${dateRangeText.toLowerCase() === "all dates" ? "all dates" : dateRangeText}, ` +
            `the property has ${stats?.guests ?? 0} registered guest${(stats?.guests ?? 0) === 1 ? "" : "s"} and ` +
            `${stats?.rooms ?? 0} room${(stats?.rooms ?? 0) === 1 ? "" : "s"} with an occupancy rate of ` +
            `${occupancyRate.toFixed(1)}%. Total revenue is ₱${currencyPlain(totalRevenue)} against expenses of ` +
            `₱${currencyPlain(totalExpenses)}, resulting in a net profit of ₱${currencyPlain(totalProfit)}. ` +
            `Today there are ${checkInsToday} check-in${checkInsToday === 1 ? "" : "s"} and ` +
            `${checkOutsToday} check-out${checkOutsToday === 1 ? "" : "s"} recorded, ` +
            `${pendingBookings} pending booking${pendingBookings === 1 ? "" : "s"}, and ${roomsAvailable} room${roomsAvailable === 1 ? "" : "s"} available.`;

        const columns: DocColumn<FinancialTrendPoint>[] = [
            { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
            { key: "date", label: "Period", weight: 4, render: (r) => r.name },
            {
                key: "revenue",
                label: "Revenue",
                weight: 3,
                align: "right",
                render: (r) => `₱${currencyPlain(r.revenue)}`,
            },
            {
                key: "expenses",
                label: "Expenses",
                weight: 3,
                align: "right",
                render: (r) => `₱${currencyPlain(r.expenses)}`,
            },
            {
                key: "profit",
                label: "Profit",
                weight: 3,
                align: "right",
                render: (r) => `₱${currencyPlain(r.profit)}`,
            },
        ];

        let startIdx = 0;
        return (
            <div className="space-y-4 print:space-y-0">
                {chunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === chunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Dashboard Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPages}
                                isLastPage={isLast}
                                summarySentence={summary}
                                containsPersonalInfo={includeGuestNames}
                                settings={settings}
                            >
                                <DocumentTable<FinancialTrendPoint>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showTotal={isLast}
                                    totalLabel="Total Revenue"
                                    totalValue={totalRevenue}
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

    /* ── On-screen ── */
    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader title="Dashboard Report" subtitle={subtitle} />

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Guests
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats?.guests ?? 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Rooms
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats?.rooms ?? 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Occupancy Rate
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {occupancyRate.toFixed(1)}%
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Revenue
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(stats?.revenue)}
                    </div>
                </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                    <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                        Quick Stats
                    </h3>
                    <div className="space-y-2.5 print:space-y-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Check-ins Today
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {checkInsToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Check-outs Today
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {checkOutsToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Pending Bookings
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {pendingBookings}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Rooms Available
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {roomsAvailable}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                    <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                        Revenue Summary
                    </h3>
                    <div className="space-y-2.5 print:space-y-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Total Revenue
                            </span>
                            <span className="font-medium text-[12.5px] text-gray-800 print:text-[10px] tabular-nums">
                                {currency(totalRevenue)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Total Expenses
                            </span>
                            <span className="font-medium text-[12.5px] text-orange-600 print:text-[10px] tabular-nums">
                                {currency(totalExpenses)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Net Profit
                            </span>
                            <span
                                className={`font-medium text-[12.5px] ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} print:text-[10px] tabular-nums`}
                            >
                                {currency(totalProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 print:text-[11px]">
                    Recent Activity
                </h3>
                <p className="text-[12px] text-gray-500 mb-3 print:text-[9px] print:mb-1">
                    Latest updates and events
                </p>
                <div className="space-y-2.5 print:space-y-1">
                    {recentBookings.length === 0 ? (
                        <div className="text-center text-gray-400 py-3 text-[12px] print:text-[10px] print:py-1">
                            No recent activity
                        </div>
                    ) : (
                        recentBookings
                            .slice(0, 4)
                            .map((booking: any, index: number) => {
                                const guest =
                                    booking.walk_in_guest?.full_name ||
                                    `${booking.user?.first_name || ""} ${booking.user?.last_name || ""}`.trim() ||
                                    "Guest";
                                const room =
                                    booking.booked_rooms?.[0]?.room
                                        ?.room_number || "N/A";
                                const status =
                                    booking.booking_status || "pending";
                                const time = new Date(
                                    booking.updated_at,
                                ).toLocaleString("en-PH", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                });
                                let icon = (
                                    <UserCheck className="h-4 w-4 text-gray-600 print:h-3 print:w-3" />
                                );
                                let message = `${guest} checked in - Room ${room}`;
                                if (status === "checked_out") {
                                    icon = (
                                        <UserX className="h-4 w-4 text-red-400 print:h-3 print:w-3" />
                                    );
                                    message = `${guest} checked out - Room ${room}`;
                                } else if (status === "pending") {
                                    icon = (
                                        <Calendar className="h-4 w-4 text-amber-500 print:h-3 print:w-3" />
                                    );
                                    message = `New booking - ${guest} (Room ${room})`;
                                } else if (status === "confirmed") {
                                    icon = (
                                        <CreditCard className="h-4 w-4 text-gray-600 print:h-3 print:w-3" />
                                    );
                                    message = `Payment received - Booking #${booking.booking_reference}`;
                                } else if (status === "cancelled") {
                                    icon = (
                                        <AlertTriangle className="h-4 w-4 text-red-500 print:h-3 print:w-3" />
                                    );
                                    message = `Booking cancelled - ${guest} (Room ${room})`;
                                }
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 text-[12.5px] p-2 rounded-lg hover:bg-gray-50 print:hover:bg-transparent print:text-[10px] print:p-1"
                                    >
                                        {icon}
                                        <span className="text-gray-700">
                                            {message}
                                        </span>
                                        <span className="text-[11px] text-gray-400 ml-auto print:text-[9px]">
                                            {time}
                                        </span>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
}
