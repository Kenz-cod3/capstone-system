import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Printer,
    CalendarRange,
    Search,
    ChevronRight,
    Users,
    Hotel,
    CreditCard,
    AlertTriangle,
    LayoutDashboard,
    Calendar,
    Star,
    MessageSquare,
    DollarSign,
    Bed,
    Wrench,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    Download,
    Filter,
    X,
    Menu,
    UserCheck,
    UserX,
    Eye,
} from "lucide-react";

// ✅ Import axios instance
import api from "@/services/api";

// Import logo for print
import logo from "../../../../images/logo.png";

// Separator component
function Separator({ className = "" }: { className?: string }) {
    return <hr className={`border-t border-gray-200 ${className}`} />;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface BookedRoomLite {
    id: number;
    status: string;
    check_in_date: string | null;
    check_out_date: string | null;
    subtotal?: number;
    room?: { id: number; room_number: string } | null;
}

interface BookingLite {
    id: number;
    booking_reference?: string;
    created_at: string;
    total_price?: number;
    booking_status?: string;
    booking_type?: "walk_in" | "online";
    room_number?: string;
    user?: { first_name?: string; last_name?: string } | null;
    walk_in_guest?: { first_name?: string; last_name?: string } | null;
    bookedRooms?: BookedRoomLite[];
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface ReportSummary {
    total_revenue: number;
    total_bookings: number;
    checked_in: number;
    bookings: Paginated<BookingLite>;
    recent_bookings: BookingLite[];
}

interface TransactionRow {
    id: number;
    booking_reference: string;
    booking_type: string;
    guest: string;
    rooms: string;
    total_rooms: number;
    total_price: number;
    amount: number;
    payment_method: string | null;
    payment_date: string | null;
    payment_reference: string | null;
    payment_status: string | null;
    paid_amount: number | null;
    check_in_date: string | null;
    check_out_date: string | null;
    date: string;
    refunded_amount: number;
    cancelled_amount: number;
}

interface TransactionSummary {
    total_records: number;
    total_revenue: number;
}

interface IncidentRow {
    id: number;
    report_type: "damaged" | "lost" | "found";
    status: "pending" | "repairing" | "resolved";
    note: string;
    reported_at: string;
    resolved_at: string | null;
    room?: { room_number: string } | null;
    cleaner?: { first_name?: string; last_name?: string } | null;
    resolvedBy?: { first_name?: string; last_name?: string } | null;
    booking?: {
        user?: { first_name?: string; last_name?: string } | null;
        walkInGuest?: { first_name?: string; last_name?: string } | null;
    } | null;
}

interface DashboardStats {
    guests: number;
    rooms: number;
    bookings: number;
    revenue: number;
    expenses: number;
    profit: number;
    revenue_change: number;
    expenses_change: number;
    profit_change: number;
}

interface FinancialTrendPoint {
    name: string;
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
}

interface DashboardIndexResponse {
    stats: DashboardStats;
    financialTrend: FinancialTrendPoint[];
    occupancy: number;
    recentBookings?: any[];
    occupancyMetrics?: {
        current: number;
        status: string;
        alert: string | null;
    };
    roomStatus?: Array<{
        name: string;
        value: number;
        color: string;
    }>;
}

interface GuestReport {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    total_stays: number;
    total_spent: number;
    last_visit: string;
}

interface ReviewReport {
    id: number;
    guest_name: string;
    room_number: string;
    rating: number;
    review: string;
    created_at: string;
    response?: string;
}

interface InquiryReport {
    id: number;
    guest_name: string;
    email: string;
    subject: string;
    message: string;
    status: "pending" | "in_progress" | "resolved";
    priority: "low" | "medium" | "high" | "urgent";
    created_at: string;
    responded_at?: string;
}

type TabKey =
    | "dashboard"
    | "bookings"
    | "guests"
    | "revenue"
    | "transactions"
    | "occupancy"
    | "housekeeping"
    | "maintenance"
    | "incidents"
    | "reviews"
    | "inquiries";

interface ReportProps {
    start: string;
    end: string;
    searchQuery?: string;
    filterType?: string;
    onSearchChange?: (value: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const currency = (value: number | null | undefined) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(value ?? 0));

const dateFmt = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const dateTimeFmt = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const guestName = (b: BookingLite) => {
    if (b.booking_type === "online" || b.user) {
        return (
            `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`.trim() ||
            "—"
        );
    }
    return (
        `${b.walk_in_guest?.first_name ?? ""} ${b.walk_in_guest?.last_name ?? ""}`.trim() ||
        "—"
    );
};

const statusVariant = (
    status: string | undefined,
): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case "checked_in":
        case "resolved":
        case "confirmed":
        case "completed":
            return "default";
        case "checked_out":
            return "secondary";
        case "cancelled":
        case "refunded":
        case "damaged":
        case "urgent":
            return "destructive";
        default:
            return "outline";
    }
};

// ✅ Using axios instance with authentication
async function apiGet<T>(url: string): Promise<T> {
    const response = await api.get<T>(url);
    return response.data;
}

async function fetchJson<T>(url: string): Promise<T> {
    return apiGet<T>(url);
}

/* -------------------------------------------------------------------------- */
/*  Report Sidebar Items                                                      */
/* -------------------------------------------------------------------------- */

interface ReportMenuItem {
    id: TabKey;
    label: string;
    icon: React.ReactNode;
    group: string;
}

const reportMenuItems: ReportMenuItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        group: "Main",
    },
    {
        id: "bookings",
        label: "Booking Reports",
        icon: <Calendar className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "guests",
        label: "Guest Reports",
        icon: <Users className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "occupancy",
        label: "Occupancy Reports",
        icon: <Hotel className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "revenue",
        label: "Revenue Reports",
        icon: <DollarSign className="h-4 w-4" />,
        group: "Financial",
    },
    {
        id: "transactions",
        label: "Transaction Reports",
        icon: <CreditCard className="h-4 w-4" />,
        group: "Financial",
    },
    {
        id: "housekeeping",
        label: "Housekeeping",
        icon: <Bed className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "maintenance",
        label: "Maintenance",
        icon: <Wrench className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "incidents",
        label: "Incident Reports",
        icon: <AlertTriangle className="h-4 w-4" />,
        group: "Safety",
    },
    {
        id: "reviews",
        label: "Guest Reviews",
        icon: <Star className="h-4 w-4" />,
        group: "Guest Experience",
    },
    {
        id: "inquiries",
        label: "Inquiries",
        icon: <MessageSquare className="h-4 w-4" />,
        group: "Guest Experience",
    },
];

/* -------------------------------------------------------------------------- */
/*  Helper Components                                                         */
/* -------------------------------------------------------------------------- */

function DateRangeFilter({
    start,
    end,
    onChange,
}: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-end gap-3 print:hidden">
            <div className="grid gap-1.5">
                <Label
                    htmlFor="start_date"
                    className="text-[8.5px] text-gray-500 font-medium"
                >
                    From
                </Label>
                <Input
                    id="start_date"
                    type="date"
                    value={start}
                    onChange={(e) => onChange(e.target.value, end)}
                    className="h-9 w-[160px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none text-[9.5px] shadow-sm"
                />
            </div>
            <div className="grid gap-1.5">
                <Label
                    htmlFor="end_date"
                    className="text-[8.5px] text-gray-500 font-medium"
                >
                    To
                </Label>
                <Input
                    id="end_date"
                    type="date"
                    value={end}
                    onChange={(e) => onChange(start, e.target.value)}
                    className="h-9 w-[160px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none text-[9.5px] shadow-sm"
                />
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Tab                                                             */
/* -------------------------------------------------------------------------- */

function DashboardReport({ start, end, searchQuery }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trend, setTrend] = useState<FinancialTrendPoint[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [occupancy, setOccupancy] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = start && end ? `?from=${start}&to=${end}` : "";

        fetchJson<DashboardIndexResponse>(`/dashboard${params}`)
            .then((data) => {
                if (cancelled) return;
                setStats(data.stats);
                setTrend(data.financialTrend || []);
                setRecentBookings(data.recentBookings || []);
                setOccupancy(data.occupancy || 0);
            })
            .catch((error) => {
                console.error("Dashboard API error:", error);
                if (!cancelled) {
                    setStats(null);
                    setTrend([]);
                    setRecentBookings([]);
                    setOccupancy(0);
                }
            })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredTrend = useMemo(() => {
        if (!searchQuery) return trend;
        const query = searchQuery.toLowerCase();
        return trend.filter(
            (t) =>
                t.name.toLowerCase().includes(query) || t.date.includes(query),
        );
    }, [trend, searchQuery]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const occupancyRate =
        stats && stats.rooms > 0
            ? Math.min((stats.bookings / stats.rooms) * 100, 100)
            : Math.min(occupancy, 100);

    const totalRevenue = filteredTrend.reduce((sum, r) => sum + r.revenue, 0);
    const totalExpenses = filteredTrend.reduce((sum, r) => sum + r.expenses, 0);
    const totalProfit = filteredTrend.reduce((sum, r) => sum + r.profit, 0);

    const today = new Date().toISOString().split("T")[0];
    const checkInsToday = recentBookings.filter((b: any) => {
        const checkIn = b.check_in_date
            ? new Date(b.check_in_date).toISOString().split("T")[0]
            : "";
        return checkIn === today && b.booking_status === "checked_in";
    }).length;

    const checkOutsToday = recentBookings.filter((b: any) => {
        const checkOut = b.check_out_date
            ? new Date(b.check_out_date).toISOString().split("T")[0]
            : "";
        return checkOut === today && b.booking_status === "checked_out";
    }).length;

    const pendingBookings = recentBookings.filter(
        (b: any) => b.booking_status === "pending",
    ).length;

    const roomsAvailable = stats
        ? Math.max(0, stats.rooms - stats.bookings)
        : 0;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";

    return (
        <div className="space-y-4 print:space-y-2">
            {/* Print Header with Logo */}
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Dashboard Report</h1>
                        <div className="subtitle">
                            {dateRangeText} · Generated{" "}
                            {new Date().toLocaleString("en-PH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 Cards in a row - A4 optimized */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="flex items-center gap-2 text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        <Users className="h-3.5 w-3.5 print:h-3 print:w-3" />
                        Total Guests
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {stats?.guests ?? 0}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="flex items-center gap-2 text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        <Hotel className="h-3.5 w-3.5 print:h-3 print:w-3" />
                        Total Rooms
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {stats?.rooms ?? 0}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="flex items-center gap-2 text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        <Calendar className="h-3.5 w-3.5 print:h-3 print:w-3" />
                        Occupancy Rate
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {occupancyRate.toFixed(1)}%
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="flex items-center gap-2 text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        <DollarSign className="h-3.5 w-3.5 print:h-3 print:w-3" />
                        Total Revenue
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {currency(stats?.revenue)}
                    </div>
                </div>
            </div>

            {/* Quick Stats and Revenue Summary - side by side */}
            <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                    <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                        Quick Stats
                    </h3>
                    <div className="space-y-2 print:space-y-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1 print:pb-0.5">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Check-ins Today
                            </span>
                            <span className="bg-gray-600 text-white text-[8.5px] px-2 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[7px] print:px-1.5">
                                {checkInsToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1 print:pb-0.5">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Check-outs Today
                            </span>
                            <span className="bg-gray-600 text-white text-[8.5px] px-2 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[7px] print:px-1.5">
                                {checkOutsToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1 print:pb-0.5">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Pending Bookings
                            </span>
                            <span className="bg-amber-500 text-white text-[8.5px] px-2 py-0.5 rounded-full print:bg-amber-500 print:text-white print:text-[7px] print:px-1.5">
                                {pendingBookings}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Rooms Available
                            </span>
                            <span className="bg-gray-600 text-white text-[8.5px] px-2 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[7px] print:px-1.5">
                                {roomsAvailable}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                    <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                        Revenue Summary
                    </h3>
                    <div className="space-y-2 print:space-y-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1 print:pb-0.5">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Total Revenue
                            </span>
                            <span className="font-medium text-[9.5px] text-gray-800 print:text-[8.5px]">
                                {currency(totalRevenue)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1 print:pb-0.5">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Total Expenses
                            </span>
                            <span className="font-medium text-[9.5px] text-orange-600 print:text-[8.5px]">
                                {currency(totalExpenses)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                Net Profit
                            </span>
                            <span
                                className={`font-medium text-[9.5px] ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} print:text-[8.5px]`}
                            >
                                {currency(totalProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 print:text-[9px]">
                    Recent Activity
                </h3>
                <p className="text-[8.5px] text-gray-500 mb-2 print:text-[7.5px] print:mb-1">
                    Latest updates and events
                </p>
                <div className="space-y-2 print:space-y-1">
                    {recentBookings.length === 0 ? (
                        <div className="text-center text-gray-400 py-2 text-[8.5px] print:text-[7.5px] print:py-1">
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
                                    minute: "numeric",
                                    hour12: true,
                                });

                                let icon = (
                                    <UserCheck className="h-3.5 w-3.5 text-gray-600 print:h-3 print:w-3" />
                                );
                                let message = `${guest} checked in - Room ${room}`;

                                if (status === "checked_out") {
                                    icon = (
                                        <UserX className="h-3.5 w-3.5 text-red-400 print:h-3 print:w-3" />
                                    );
                                    message = `${guest} checked out - Room ${room}`;
                                } else if (status === "pending") {
                                    icon = (
                                        <Calendar className="h-3.5 w-3.5 text-amber-500 print:h-3 print:w-3" />
                                    );
                                    message = `New booking - ${guest} (Room ${room})`;
                                } else if (status === "confirmed") {
                                    icon = (
                                        <CreditCard className="h-3.5 w-3.5 text-gray-600 print:h-3 print:w-3" />
                                    );
                                    message = `Payment received - Booking #${booking.booking_reference}`;
                                } else if (status === "cancelled") {
                                    icon = (
                                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 print:h-3 print:w-3" />
                                    );
                                    message = `Booking cancelled - ${guest} (Room ${room})`;
                                }

                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 text-[9.5px] p-1.5 rounded-lg hover:bg-gray-50 print:hover:bg-transparent print:text-[8.5px] print:p-1"
                                    >
                                        {icon}
                                        <span className="text-gray-700">
                                            {message}
                                        </span>
                                        <span className="text-[8.5px] text-gray-400 ml-auto print:text-[7.5px]">
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

/* -------------------------------------------------------------------------- */
/*  Booking Reports Tab                                                       */
/* -------------------------------------------------------------------------- */

function BookingReports({
    start,
    end,
    searchQuery,
    onSearchChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<ReportSummary | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        params.set("per_page", "50");

        fetchJson<ReportSummary>(`/reports?${params.toString()}`)
            .then((data) => !cancelled && setSummary(data))
            .catch((error) => {
                console.error("Booking API error:", error);
                if (!cancelled) setSummary(null);
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const bookings = summary?.bookings?.data ?? [];

    const filteredBookings = useMemo(() => {
        if (!searchQuery) return bookings;
        const query = searchQuery.toLowerCase();
        return bookings.filter(
            (b) =>
                (b.booking_reference &&
                    b.booking_reference.toLowerCase().includes(query)) ||
                guestName(b).toLowerCase().includes(query) ||
                (b.room_number &&
                    b.room_number.toLowerCase().includes(query)) ||
                (b.booking_type &&
                    b.booking_type.toLowerCase().includes(query)),
        );
    }, [bookings, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    const totalBookings = summary?.total_bookings ?? 0;
    const checkedIn = summary?.checked_in ?? 0;
    const checkedOut = bookings.filter(
        (b) => b.booking_status === "checked_out",
    ).length;
    const cancelled = bookings.filter(
        (b) => b.booking_status === "cancelled",
    ).length;
    const pending = bookings.filter(
        (b) => b.booking_status === "pending" || !b.booking_status,
    ).length;

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Booking Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Bookings
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {totalBookings}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Checked In
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {checkedIn}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Checked Out
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {checkedOut}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Pending
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {pending}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Cancelled
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {cancelled}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <div className="flex items-center justify-between mb-2 print:mb-1">
                    <div>
                        <h3 className="text-[10.5px] font-semibold text-gray-800 print:text-[9px]">
                            Booking List
                        </h3>
                        <p className="text-[8.5px] text-gray-500 print:text-[7.5px]">
                            {filteredBookings.length} booking(s) found
                        </p>
                    </div>
                    <div className="flex items-center gap-2 no-print">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search bookings..."
                                value={searchQuery}
                                onChange={(e) =>
                                    onSearchChange?.(e.target.value)
                                }
                                className="h-8 w-[180px] pl-8 text-[8.5px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:ring-0 focus:outline-none text-[8.5px] h-8 shadow-sm"
                        >
                            <Download className="h-3 w-3" />
                            Export
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Reference
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Type
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Guest
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Room
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Status
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Total
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Check In
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Check Out
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.slice(0, 10).map((b) => (
                                    <tr
                                        key={b.id}
                                        className="hover:bg-gray-50 print:hover:bg-transparent"
                                    >
                                        <td className="p-2 border border-gray-200 font-medium print:p-1 print:text-[8px]">
                                            {b.booking_reference ?? b.id}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span className="inline-block px-2 py-0.5 text-[8.5px] bg-gray-100 text-gray-600 rounded print:bg-gray-100 print:text-gray-600 print:text-[7px] print:px-1.5">
                                                {b.booking_type ?? "—"}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {guestName(b)}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {b.room_number ?? "—"}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span
                                                className={`inline-block px-2 py-0.5 text-[8.5px] text-white rounded print:text-[7px] print:px-1.5 ${
                                                    b.booking_status ===
                                                        "checked_in" ||
                                                    b.booking_status ===
                                                        "confirmed"
                                                        ? "bg-green-600"
                                                        : b.booking_status ===
                                                            "cancelled"
                                                          ? "bg-red-600"
                                                          : b.booking_status ===
                                                              "pending"
                                                            ? "bg-amber-500"
                                                            : "bg-gray-600"
                                                }`}
                                            >
                                                {b.booking_status ?? "pending"}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right font-medium print:p-1 print:text-[8px]">
                                            {currency(b.total_price)}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-[8.5px] text-gray-500 print:p-1 print:text-[7px]">
                                            {dateFmt(
                                                b.bookedRooms?.[0]
                                                    ?.check_in_date,
                                            )}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-[8.5px] text-gray-500 print:p-1 print:text-[7px]">
                                            {dateFmt(
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
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Guest Reports Tab                                                         */
/* -------------------------------------------------------------------------- */

function GuestReports({ start, end, searchQuery }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [guests, setGuests] = useState<GuestReport[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        new: 0,
        returning: 0,
        satisfaction: 0,
    });

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        params.set("per_page", "50");

        fetchJson<{ data: GuestReport[] }>(
            `/reports/guests?${params.toString()}`,
        )
            .then((data) => {
                if (!cancelled) {
                    setGuests(data.data);
                    const total = data.data.length;
                    const newGuests = data.data.filter(
                        (g) => g.total_stays === 1,
                    ).length;
                    const returning = data.data.filter(
                        (g) => g.total_stays > 1,
                    ).length;
                    setStats({
                        total,
                        new: newGuests,
                        returning,
                        satisfaction: 4.8,
                    });
                }
            })
            .catch((error) => {
                console.error("Guest API error:", error);
                if (!cancelled) {
                    setGuests([]);
                    setStats({
                        total: 0,
                        new: 0,
                        returning: 0,
                        satisfaction: 0,
                    });
                }
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end, searchQuery]);

    const filteredGuests = useMemo(() => {
        if (!searchQuery) return guests;
        const query = searchQuery.toLowerCase();
        return guests.filter(
            (g) =>
                `${g.first_name} ${g.last_name}`
                    .toLowerCase()
                    .includes(query) ||
                g.email.toLowerCase().includes(query) ||
                g.phone.includes(query),
        );
    }, [guests, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Guest Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Guests
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {stats.total}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        New Guests (30 days)
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {stats.new}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Returning Guests
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {stats.returning}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Guest Satisfaction
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {stats.satisfaction} ★
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Guest Demographics
                </h3>
                <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 print:bg-gray-50 print:border print:border-gray-200 print:p-2">
                        <h4 className="text-[9.5px] font-medium text-gray-800 mb-2 print:text-[8.5px] print:mb-1">
                            Guest Type
                        </h4>
                        <div className="space-y-1.5 print:space-y-1">
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Business</span>
                                <span className="font-medium text-gray-800">
                                    45%
                                </span>
                            </div>
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Leisure</span>
                                <span className="font-medium text-gray-800">
                                    35%
                                </span>
                            </div>
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Family</span>
                                <span className="font-medium text-gray-800">
                                    15%
                                </span>
                            </div>
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Group</span>
                                <span className="font-medium text-gray-800">
                                    5%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 print:bg-gray-50 print:border print:border-gray-200 print:p-2">
                        <h4 className="text-[9.5px] font-medium text-gray-800 mb-2 print:text-[8.5px] print:mb-1">
                            Origin
                        </h4>
                        <div className="space-y-1.5 print:space-y-1">
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Local</span>
                                <span className="font-medium text-gray-800">
                                    60%
                                </span>
                            </div>
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">
                                    International
                                </span>
                                <span className="font-medium text-gray-800">
                                    40%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 print:bg-gray-50 print:border print:border-gray-200 print:p-2">
                        <h4 className="text-[9.5px] font-medium text-gray-800 mb-2 print:text-[8.5px] print:mb-1">
                            Average Stay
                        </h4>
                        <div className="space-y-1.5 print:space-y-1">
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Weekdays</span>
                                <span className="font-medium text-gray-800">
                                    2.5 days
                                </span>
                            </div>
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Weekends</span>
                                <span className="font-medium text-gray-800">
                                    3.2 days
                                </span>
                            </div>
                            <div className="flex justify-between text-[8.5px] print:text-[7.5px]">
                                <span className="text-gray-600">Holidays</span>
                                <span className="font-medium text-gray-800">
                                    4.8 days
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Top Guests
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Guest Name
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Email
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Phone
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Total Stays
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Total Spent
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGuests.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No guest data found.
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.slice(0, 10).map((g) => (
                                    <tr
                                        key={g.id}
                                        className="hover:bg-gray-50 print:hover:bg-transparent"
                                    >
                                        <td className="p-2 border border-gray-200 font-medium print:p-1 print:text-[8px]">
                                            {g.first_name} {g.last_name}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {g.email}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {g.phone}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right print:p-1 print:text-[8px]">
                                            {g.total_stays}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right font-medium print:p-1 print:text-[8px]">
                                            {currency(g.total_spent)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Revenue Reports Tab                                                       */
/* -------------------------------------------------------------------------- */

function RevenueReports({ start, end, searchQuery }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trend, setTrend] = useState<FinancialTrendPoint[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = start && end ? `?from=${start}&to=${end}` : "";
        Promise.all([
            fetchJson<DashboardIndexResponse>("/dashboard"),
            params
                ? fetchJson<{ financialRangeTrend: FinancialTrendPoint[] }>(
                      `/dashboard/financial-range${params}`,
                  )
                : Promise.resolve(null),
        ])
            .then(([dash, range]) => {
                if (cancelled) return;
                setStats(dash.stats);
                setTrend(
                    range
                        ? range.financialRangeTrend
                        : dash.financialTrend || [],
                );
            })
            .catch((error) => {
                console.error("Revenue API error:", error);
                if (!cancelled) {
                    setStats(null);
                    setTrend([]);
                }
            })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredTrend = useMemo(() => {
        if (!searchQuery) return trend;
        const query = searchQuery.toLowerCase();
        return trend.filter(
            (t) =>
                t.name.toLowerCase().includes(query) || t.date.includes(query),
        );
    }, [trend, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    const totalRevenue = filteredTrend.reduce((sum, r) => sum + r.revenue, 0);
    const totalExpenses = filteredTrend.reduce((sum, r) => sum + r.expenses, 0);
    const totalProfit = filteredTrend.reduce((sum, r) => sum + r.profit, 0);
    const avgDailyRate =
        filteredTrend.length > 0 ? totalRevenue / filteredTrend.length : 0;

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Revenue Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Revenue
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {currency(totalRevenue)}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Expenses
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {currency(totalExpenses)}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Net Profit
                    </div>
                    <div
                        className={`text-2xl font-semibold mt-1 print:text-[16px] ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                        {currency(totalProfit)}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Average Daily Rate
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {currency(avgDailyRate)}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Revenue Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Date
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Revenue
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Expenses
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Profit
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Margin
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTrend.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No revenue data found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTrend.slice(0, 15).map((row) => {
                                    const margin =
                                        row.revenue > 0
                                            ? (row.profit / row.revenue) * 100
                                            : 0;
                                    return (
                                        <tr
                                            key={row.date}
                                            className="hover:bg-gray-50 print:hover:bg-transparent"
                                        >
                                            <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                                {row.name}
                                            </td>
                                            <td className="p-2 border border-gray-200 text-right text-emerald-600 print:p-1 print:text-[8px]">
                                                {currency(row.revenue)}
                                            </td>
                                            <td className="p-2 border border-gray-200 text-right text-orange-600 print:p-1 print:text-[8px]">
                                                {currency(row.expenses)}
                                            </td>
                                            <td
                                                className={`p-2 border border-gray-200 text-right font-medium print:p-1 print:text-[8px] ${row.profit >= 0 ? "text-blue-600" : "text-red-600"}`}
                                            >
                                                {currency(row.profit)}
                                            </td>
                                            <td
                                                className={`p-2 border border-gray-200 text-right print:p-1 print:text-[8px] ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                            >
                                                {margin.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Transaction Reports Tab                                                   */
/* -------------------------------------------------------------------------- */

function TransactionReports({
    start,
    end,
    searchQuery,
    onSearchChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<TransactionRow[]>([]);
    const [summary, setSummary] = useState<TransactionSummary | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        params.set("per_page", "50");

        Promise.all([
            fetchJson<Paginated<TransactionRow>>(
                `/reports/transactions?${params.toString()}`,
            ),
            fetchJson<TransactionSummary>("/reports/transactions/summary"),
        ])
            .then(([list, sum]) => {
                if (cancelled) return;
                setRows(list.data);
                setSummary(sum);
            })
            .catch((error) => {
                console.error("Transaction API error:", error);
                if (!cancelled) {
                    setRows([]);
                    setSummary(null);
                }
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const query = searchQuery.toLowerCase();
        return rows.filter(
            (r) =>
                r.booking_reference.toLowerCase().includes(query) ||
                r.guest.toLowerCase().includes(query) ||
                (r.payment_method &&
                    r.payment_method.toLowerCase().includes(query)) ||
                r.booking_type.toLowerCase().includes(query),
        );
    }, [rows, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Transaction Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 print:grid-cols-2 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Transactions
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {summary?.total_records ?? 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Revenue
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {currency(summary?.total_revenue)}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <div className="flex items-center justify-between mb-2 print:mb-1">
                    <div>
                        <h3 className="text-[10.5px] font-semibold text-gray-800 print:text-[9px]">
                            Transaction List
                        </h3>
                        <p className="text-[8.5px] text-gray-500 print:text-[7.5px]">
                            {filteredRows.length} transaction(s) found
                        </p>
                    </div>
                    <div className="flex items-center gap-2 no-print">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) =>
                                    onSearchChange?.(e.target.value)
                                }
                                className="h-8 w-[180px] pl-8 text-[8.5px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:ring-0 focus:outline-none text-[8.5px] h-8 shadow-sm"
                        >
                            <Download className="h-3 w-3" />
                            Export
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Reference
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Type
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Guest
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Method
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Amount
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-right border border-gray-200 print:text-[7px] print:p-1">
                                    Refunded
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.slice(0, 10).map((r) => (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-gray-50 print:hover:bg-transparent"
                                    >
                                        <td className="p-2 border border-gray-200 font-medium print:p-1 print:text-[8px]">
                                            {r.booking_reference}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span className="inline-block px-2 py-0.5 text-[8.5px] bg-gray-100 text-gray-600 rounded print:bg-gray-100 print:text-gray-600 print:text-[7px] print:px-1.5">
                                                {r.booking_type}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {r.guest}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {r.payment_method ?? "—"}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right print:p-1 print:text-[8px]">
                                            {currency(
                                                r.payment_status === "paid"
                                                    ? r.amount
                                                    : 0,
                                            )}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right print:p-1 print:text-[8px]">
                                            {r.refunded_amount > 0
                                                ? currency(r.refunded_amount)
                                                : "—"}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-[8.5px] text-gray-500 print:p-1 print:text-[7px]">
                                            {dateFmt(r.date)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Incident Reports Tab                                                      */
/* -------------------------------------------------------------------------- */

function IncidentReports({ start, end, searchQuery }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<IncidentRow[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        params.set("per_page", "50");

        fetchJson<Paginated<IncidentRow>>(
            `/reports/incidents?${params.toString()}`,
        )
            .then((data) => {
                if (cancelled) return;
                setRows(data.data);
            })
            .catch((error) => {
                console.error("Incident API error:", error);
                if (!cancelled) setRows([]);
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const query = searchQuery.toLowerCase();
        return rows.filter(
            (r) =>
                (r.room?.room_number &&
                    r.room.room_number.toLowerCase().includes(query)) ||
                r.report_type.toLowerCase().includes(query) ||
                r.status.toLowerCase().includes(query) ||
                r.note.toLowerCase().includes(query),
        );
    }, [rows, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    const byType = useMemo(
        () => ({
            damaged: filteredRows.filter((r) => r.report_type === "damaged")
                .length,
            lost: filteredRows.filter((r) => r.report_type === "lost").length,
            found: filteredRows.filter((r) => r.report_type === "found").length,
        }),
        [filteredRows],
    );

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Incident Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-3 print:grid-cols-3 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Damaged
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {byType.damaged}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Lost
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {byType.lost}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Found
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {byType.found}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Incident List
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Room
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Type
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Status
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Note
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Reported by
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Reported
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No incidents found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.slice(0, 10).map((r) => (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-gray-50 print:hover:bg-transparent"
                                    >
                                        <td className="p-2 border border-gray-200 font-medium print:p-1 print:text-[8px]">
                                            {r.room?.room_number ?? "—"}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span
                                                className={`inline-block px-2 py-0.5 text-[8.5px] text-white rounded print:text-[7px] print:px-1.5 ${
                                                    r.report_type === "damaged"
                                                        ? "bg-red-600"
                                                        : r.report_type ===
                                                            "lost"
                                                          ? "bg-amber-500"
                                                          : "bg-blue-500"
                                                }`}
                                            >
                                                {r.report_type}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span
                                                className={`inline-block px-2 py-0.5 text-[8.5px] text-white rounded print:text-[7px] print:px-1.5 ${
                                                    r.status === "resolved"
                                                        ? "bg-green-600"
                                                        : r.status ===
                                                            "repairing"
                                                          ? "bg-amber-500"
                                                          : "bg-gray-600"
                                                }`}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 max-w-[200px] truncate print:p-1 print:text-[8px]">
                                            {r.note}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {r.cleaner
                                                ? `${r.cleaner.first_name ?? ""} ${r.cleaner.last_name ?? ""}`.trim()
                                                : "—"}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-[8.5px] text-gray-500 print:p-1 print:text-[7px]">
                                            {dateFmt(r.reported_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Guest Reviews Tab                                                         */
/* -------------------------------------------------------------------------- */

function GuestReviews({ start, end, searchQuery }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<ReviewReport[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);

        fetchJson<{ data: ReviewReport[] }>(`/reviews?${params.toString()}`)
            .then((data) => {
                if (!cancelled) setReviews(data.data);
            })
            .catch((error) => {
                console.error("Reviews API error:", error);
                if (!cancelled) setReviews([]);
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end, searchQuery]);

    const filteredReviews = useMemo(() => {
        if (!searchQuery) return reviews;
        const query = searchQuery.toLowerCase();
        return reviews.filter(
            (r) =>
                r.guest_name.toLowerCase().includes(query) ||
                r.room_number.toLowerCase().includes(query) ||
                r.review.toLowerCase().includes(query),
        );
    }, [reviews, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    const avgRating =
        filteredReviews.length > 0
            ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) /
              filteredReviews.length
            : 0;
    const fiveStar = filteredReviews.filter((r) => r.rating === 5).length;

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Guest Reviews</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Average Rating
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {avgRating.toFixed(1)} ★
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Reviews
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {filteredReviews.length}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        5-Star Reviews
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {fiveStar}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Response Rate
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        92%
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Recent Reviews
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Guest
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Room
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Rating
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Review
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReviews.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No reviews found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReviews.slice(0, 10).map((r) => (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-gray-50 print:hover:bg-transparent"
                                    >
                                        <td className="p-2 border border-gray-200 font-medium print:p-1 print:text-[8px]">
                                            {r.guest_name}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {r.room_number}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span className="inline-block px-2 py-0.5 text-[8.5px] text-white bg-gray-600 rounded print:text-[7px] print:px-1.5">
                                                {r.rating} ★
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 max-w-[300px] truncate print:p-1 print:text-[8px]">
                                            {r.review}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-[8.5px] text-gray-500 print:p-1 print:text-[7px]">
                                            {dateFmt(r.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Inquiries Tab                                                             */
/* -------------------------------------------------------------------------- */

function InquiriesReports({ start, end, searchQuery }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [inquiries, setInquiries] = useState<InquiryReport[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setTimeout(() => {
            if (!cancelled) {
                setInquiries([
                    {
                        id: 1,
                        guest_name: "Sarah Lee",
                        email: "sarah@email.com",
                        subject: "Late check-in request",
                        message:
                            "I will be arriving after midnight. Is that okay?",
                        status: "in_progress",
                        priority: "medium",
                        created_at: "2026-08-26T18:30:00",
                    },
                    {
                        id: 2,
                        guest_name: "David Park",
                        email: "david@email.com",
                        subject: "Room upgrade inquiry",
                        message:
                            "Is there a possibility to upgrade to a suite?",
                        status: "resolved",
                        priority: "low",
                        created_at: "2026-08-25T14:20:00",
                        responded_at: "2026-08-26T09:00:00",
                    },
                    {
                        id: 3,
                        guest_name: "Lisa Chen",
                        email: "lisa@email.com",
                        subject: "Special dietary request",
                        message:
                            "I have food allergies. Need gluten-free options.",
                        status: "pending",
                        priority: "high",
                        created_at: "2026-08-24T10:15:00",
                    },
                ]);
                setLoading(false);
            }
        }, 1000);
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredInquiries = useMemo(() => {
        if (!searchQuery) return inquiries;
        const query = searchQuery.toLowerCase();
        return inquiries.filter(
            (i) =>
                i.guest_name.toLowerCase().includes(query) ||
                i.subject.toLowerCase().includes(query) ||
                i.message.toLowerCase().includes(query) ||
                i.email.toLowerCase().includes(query),
        );
    }, [inquiries, searchQuery]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />;
    }

    const pending = filteredInquiries.filter(
        (i) => i.status === "pending",
    ).length;
    const inProgress = filteredInquiries.filter(
        (i) => i.status === "in_progress",
    ).length;
    const resolved = filteredInquiries.filter(
        (i) => i.status === "resolved",
    ).length;

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Inquiries & Messages</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Inquiries
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {filteredInquiries.length}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Pending
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {pending}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Resolved
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {resolved}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Avg Response Time
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        2.5 hrs
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Inquiry List
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9.5px] print:text-[8px]">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Guest
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Subject
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Status
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Priority
                                </th>
                                <th className="text-[8.5px] text-gray-600 font-medium p-2 text-left border border-gray-200 print:text-[7px] print:p-1">
                                    Received
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInquiries.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 print:py-2 print:text-[7px]"
                                    >
                                        No inquiries found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInquiries.map((i) => (
                                    <tr
                                        key={i.id}
                                        className="hover:bg-gray-50 print:hover:bg-transparent"
                                    >
                                        <td className="p-2 border border-gray-200 font-medium print:p-1 print:text-[8px]">
                                            {i.guest_name}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1 print:text-[8px]">
                                            {i.subject}
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span
                                                className={`inline-block px-2 py-0.5 text-[8.5px] text-white rounded print:text-[7px] print:px-1.5 ${
                                                    i.status === "resolved"
                                                        ? "bg-green-600"
                                                        : i.status ===
                                                            "in_progress"
                                                          ? "bg-blue-500"
                                                          : "bg-amber-500"
                                                }`}
                                            >
                                                {i.status}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 print:p-1">
                                            <span
                                                className={`inline-block px-2 py-0.5 text-[8.5px] text-white rounded print:text-[7px] print:px-1.5 ${
                                                    i.priority === "urgent"
                                                        ? "bg-red-600"
                                                        : i.priority === "high"
                                                          ? "bg-orange-500"
                                                          : i.priority ===
                                                              "medium"
                                                            ? "bg-amber-500"
                                                            : "bg-gray-600"
                                                }`}
                                            >
                                                {i.priority}
                                            </span>
                                        </td>
                                        <td className="p-2 border border-gray-200 text-[8.5px] text-gray-500 print:p-1 print:text-[7px]">
                                            {dateFmt(i.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Occupancy Reports Tab                                                     */
/* -------------------------------------------------------------------------- */

function OccupancyReports({ start, end }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);

        fetchJson(`/reports/occupancy?${params.toString()}`)
            .then((data) => {
                if (!cancelled) {
                    setData(data);
                }
            })
            .catch((error) => {
                console.error("Occupancy API error:", error);
                if (!cancelled) {
                    setData({
                        total_rooms: 0,
                        occupied_rooms: 0,
                        available_rooms: 0,
                        reserved_rooms: 0,
                        dirty_rooms: 0,
                        cleaning_rooms: 0,
                        maintenance_rooms: 0,
                        occupancy_rate: 0,
                        room_status: [],
                    });
                }
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const occupancyData = data || {
        total_rooms: 0,
        occupied_rooms: 0,
        available_rooms: 0,
        reserved_rooms: 0,
        dirty_rooms: 0,
        cleaning_rooms: 0,
        maintenance_rooms: 0,
        occupancy_rate: 0,
        room_status: [],
    };

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Occupancy Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Rooms
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {occupancyData.total_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Occupied
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {occupancyData.occupied_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Available
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {occupancyData.available_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Occupancy Rate
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {occupancyData.occupancy_rate || 0}%
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[10.5px] font-semibold text-gray-800 mb-2 print:text-[9px] print:mb-1">
                    Room Status
                </h3>
                <div className="grid gap-2 md:grid-cols-3 print:grid-cols-3">
                    {occupancyData.room_status &&
                    occupancyData.room_status.length > 0 ? (
                        occupancyData.room_status.map((status: any) => (
                            <div
                                key={status.name}
                                className="flex justify-between items-center border-b border-gray-100 pb-1 print:pb-0.5"
                            >
                                <span className="text-[9.5px] text-gray-600 print:text-[8.5px]">
                                    {status.name}
                                </span>
                                <span
                                    className="inline-block px-2 py-0.5 text-[8.5px] text-white rounded print:text-[7px] print:px-1.5"
                                    style={{ backgroundColor: status.color }}
                                >
                                    {status.value || 0}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-400 py-2 text-[9.5px] col-span-3 print:text-[8px] print:py-1">
                            No room data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Housekeeping Reports Tab                                                  */
/* -------------------------------------------------------------------------- */

function HousekeepingReports({ start, end }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);

        fetchJson(`/reports/housekeeping?${params.toString()}`)
            .then((data) => {
                if (!cancelled) {
                    setData(data);
                }
            })
            .catch((error) => {
                console.error("Housekeeping API error:", error);
                if (!cancelled) {
                    setData({
                        total_dirty_rooms: 0,
                        total_cleaning_rooms: 0,
                        total_available_rooms: 0,
                        total_reserved_rooms: 0,
                        total_occupied_rooms: 0,
                        total_maintenance_rooms: 0,
                    });
                }
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const housekeepingData = data || {
        total_dirty_rooms: 0,
        total_cleaning_rooms: 0,
        total_available_rooms: 0,
        total_reserved_rooms: 0,
        total_occupied_rooms: 0,
        total_maintenance_rooms: 0,
    };

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Housekeeping Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-3 print:grid-cols-3 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Dirty Rooms
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {housekeepingData.total_dirty_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Cleaning
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {housekeepingData.total_cleaning_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Available
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {housekeepingData.total_available_rooms || 0}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Maintenance Reports Tab                                                   */
/* -------------------------------------------------------------------------- */

function MaintenanceReports({ start, end }: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);

        fetchJson(`/reports/maintenance?${params.toString()}`)
            .then((data) => {
                if (!cancelled) {
                    setData(data);
                }
            })
            .catch((error) => {
                console.error("Maintenance API error:", error);
                if (!cancelled) {
                    setData({ total_maintenance_rooms: 0 });
                }
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [start, end]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-4 print:space-y-2">
            <div className="print-header">
                <div className="print-header-top">
                    <div className="print-logo-container">
                        <img 
                            src={logo} 
                            alt="Hotel Logo" 
                            className="print-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="print-header-text">
                        <h1>Maintenance Reports</h1>
                        <div className="subtitle">
                            {start && end
                                ? `${dateFmt(start)} – ${dateFmt(end)}`
                                : "All dates"}{" "}
                            · Generated {new Date().toLocaleString("en-PH")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-1 print:grid-cols-1">
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[8.5px] text-gray-500 font-medium print:text-[7.5px]">
                        Total Maintenance Rooms
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mt-1 print:text-[16px]">
                        {data?.total_maintenance_rooms || 0}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Main Reports Page                                                         */
/* -------------------------------------------------------------------------- */

export default function Reports() {
    const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [isPrintPreview, setIsPrintPreview] = useState(false);

    const handleRangeChange = useCallback((s: string, e: string) => {
        setStart(s);
        setEnd(e);
    }, []);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const togglePrintPreview = useCallback(() => {
        setIsPrintPreview(!isPrintPreview);
    }, [isPrintPreview]);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const groupedItems = reportMenuItems.reduce<
        Record<string, ReportMenuItem[]>
    >((acc, item) => {
        if (item?.group) {
            const group = item.group;
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
        }
        return acc;
    }, {});

    const renderContent = () => {
        const props = {
            start,
            end,
            searchQuery,
            filterType,
            onSearchChange: setSearchQuery,
        };

        switch (activeTab) {
            case "dashboard":
                return <DashboardReport {...props} />;
            case "bookings":
                return <BookingReports {...props} />;
            case "guests":
                return <GuestReports {...props} />;
            case "revenue":
                return <RevenueReports {...props} />;
            case "transactions":
                return <TransactionReports {...props} />;
            case "occupancy":
                return <OccupancyReports {...props} />;
            case "housekeeping":
                return <HousekeepingReports {...props} />;
            case "maintenance":
                return <MaintenanceReports {...props} />;
            case "incidents":
                return <IncidentReports {...props} />;
            case "reviews":
                return <GuestReviews {...props} />;
            case "inquiries":
                return <InquiriesReports {...props} />;
            default:
                return <DashboardReport {...props} />;
        }
    };

    const renderSidebarItems = () => {
        return Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="space-y-1">
                {!sidebarCollapsed && (
                    <h3 className="group-label text-[8.5px] uppercase tracking-wider px-3 py-1 select-none text-gray-500 font-semibold">
                        {group}
                    </h3>
                )}
                {items &&
                    items.map((item) => (
                        <button
                            key={item.id}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[9.5px] transition-all duration-200 menu-item select-none ${activeTab === item.id ? "active-tab bg-emerald-500 text-white shadow-md" : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"} ${sidebarCollapsed ? "justify-center" : ""}`}
                            onClick={() => setActiveTab(item.id)}
                            title={sidebarCollapsed ? item.label : ""}
                        >
                            <span
                                className={
                                    activeTab === item.id
                                        ? "text-white"
                                        : "text-gray-500"
                                }
                            >
                                {item.icon}
                            </span>
                            {!sidebarCollapsed && (
                                <span className="flex-1 text-left">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    ))}
            </div>
        ));
    };

    const renderMobileSidebarItems = () => {
        return Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="space-y-1 mb-4">
                <h3 className="text-[8.5px] font-semibold text-gray-500 uppercase tracking-wider px-3 py-1 select-none">
                    {group}
                </h3>
                {items &&
                    items.map((item) => (
                        <button
                            key={item.id}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[9.5px] transition-all duration-200 select-none ${activeTab === item.id ? "bg-emerald-500 text-white shadow-md" : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"}`}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <span
                                className={
                                    activeTab === item.id
                                        ? "text-white"
                                        : "text-gray-500"
                                }
                            >
                                {item.icon}
                            </span>
                            <span className="flex-1 text-left">
                                {item.label}
                            </span>
                        </button>
                    ))}
            </div>
        ));
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <style>{`
                /* Print header with logo styles */
                .print-header-top {
                    display: flex !important;
                    align-items: center !important;
                    gap: 16px !important;
                }

                .print-logo-container {
                    flex-shrink: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .print-logo {
                    max-height: 60px !important;
                    max-width: 120px !important;
                    width: auto !important;
                    height: auto !important;
                    object-fit: contain !important;
                }

                .print-header-text {
                    flex: 1 !important;
                }

                .print-footer {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-top: 20px !important;
                    padding-top: 10px !important;
                    border-top: 1px solid #e5e7eb !important;
                    font-size: 9px !important;
                    color: #6b7280 !important;
                }

                .print-footer-left {
                    text-align: left !important;
                }

                .print-footer-right {
                    text-align: right !important;
                }

                /* Print styles */
                .print-header {
                    display: none !important;
                }

                /* Screen-only "paper" look for in-app Print Preview */
                .print-preview-page {
                    max-width: 210mm;
                    margin: 0 auto;
                    background: white;
                    padding: 8mm 10mm 8mm 10mm;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    min-height: 297mm;
                }
                
                @media print {
                    /* Neutralize the on-screen "fake paper" styling during real print */
                    .print-preview-page {
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        min-height: auto !important;
                    }

                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        background: white !important;
                        overflow: visible !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #printable-report-wrapper,
                    #printable-report-wrapper * {
                        visibility: visible;
                    }
                    
                    #printable-report-wrapper {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 100%;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .print-header {
                        display: block !important;
                        margin-bottom: 12px !important;
                        border-bottom: 2px solid #e5e7eb !important;
                        padding-bottom: 10px !important;
                    }
                    
                    .print-header h1 {
                        font-size: 20px !important;
                        font-weight: 700 !important;
                        color: #1a1a2e !important;
                        margin: 0 0 2px 0 !important;
                    }
                    
                    .print-header .subtitle {
                        font-size: 10px !important;
                        color: #6b7280 !important;
                    }
                    
                    .print-header .generated-date {
                        font-size: 8px !important;
                        color: #9ca3af !important;
                    }

                    .print-header-top {
                        display: flex !important;
                        align-items: center !important;
                        gap: 16px !important;
                    }

                    .print-logo {
                        max-height: 60px !important;
                        max-width: 120px !important;
                        width: auto !important;
                        height: auto !important;
                        object-fit: contain !important;
                    }

                    .print-footer {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        margin-top: 20px !important;
                        padding-top: 10px !important;
                        border-top: 1px solid #e5e7eb !important;
                        font-size: 9px !important;
                        color: #6b7280 !important;
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    .bg-white.border.rounded-lg {
                        box-shadow: none !important;
                        border: 1px solid #d1d5db !important;
                        background: white !important;
                        page-break-inside: avoid !important;
                        padding: 10px 12px !important;
                    }
                    
                    .print\\:grid-cols-4 {
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 8px !important;
                    }
                    
                    .print\\:grid-cols-5 {
                        grid-template-columns: repeat(5, 1fr) !important;
                        gap: 8px !important;
                    }
                    
                    .print\\:grid-cols-2 {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 8px !important;
                    }
                    
                    .print\\:grid-cols-3 {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 8px !important;
                    }
                    
                    .print\\:gap-2 {
                        gap: 8px !important;
                    }
                    
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    
                    .print\\:border {
                        border: 1px solid #d1d5db !important;
                    }
                    
                    .print\\:border-gray-300 {
                        border-color: #d1d5db !important;
                    }
                    
                    .print\\:bg-white {
                        background: white !important;
                    }
                    
                    .print\\:bg-gray-100 {
                        background: #f3f4f6 !important;
                    }
                    
                    .print\\:page-break-inside-avoid {
                        page-break-inside: avoid !important;
                    }
                    
                    .print\\:p-2 {
                        padding: 8px !important;
                    }
                    
                    .print\\:p-1 {
                        padding: 4px !important;
                    }
                    
                    .print\\:text-\\[16px\\] {
                        font-size: 20px !important;
                    }
                    
                    .print\\:text-\\[9px\\] {
                        font-size: 11px !important;
                    }
                    
                    .print\\:text-\\[8\\.5px\\] {
                        font-size: 10.5px !important;
                    }
                    
                    .print\\:text-\\[8px\\] {
                        font-size: 10px !important;
                    }
                    
                    .print\\:text-\\[7\\.5px\\] {
                        font-size: 9.5px !important;
                    }
                    
                    .print\\:text-\\[7px\\] {
                        font-size: 9px !important;
                    }
                    
                    .print\\:space-y-1 > * + * {
                        margin-top: 4px !important;
                    }
                    
                    .print\\:space-y-2 > * + * {
                        margin-top: 8px !important;
                    }
                    
                    .print\\:mb-1 {
                        margin-bottom: 4px !important;
                    }
                    
                    .print\\:mt-1 {
                        margin-top: 4px !important;
                    }
                    
                    .print\\:pb-0 {
                        padding-bottom: 0 !important;
                    }
                    
                    .print\\:mb-0 {
                        margin-bottom: 0 !important;
                    }
                    
                    table {
                        page-break-inside: auto !important;
                        width: 100% !important;
                    }
                    
                    thead {
                        display: table-header-group !important;
                    }
                    
                    thead th {
                        background: #f3f4f6 !important;
                        color: #1f2937 !important;
                        font-weight: 600 !important;
                        font-size: 8px !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.04em !important;
                        padding: 4px 8px !important;
                        border: 1px solid #d1d5db !important;
                        text-align: left !important;
                    }
                    
                    tbody td {
                        padding: 4px 8px !important;
                        border: 1px solid #e5e7eb !important;
                        font-size: 9px !important;
                        vertical-align: middle !important;
                    }
                    
                    tbody tr {
                        page-break-inside: avoid !important;
                    }
                    
                    tbody tr:nth-child(even) {
                        background: #fafafa !important;
                    }
                    
                    tbody tr:nth-child(odd) {
                        background: #ffffff !important;
                    }
                    
                    tbody tr:hover {
                        background: inherit !important;
                    }
                    
                    .bg-green-600 { background: #16a34a !important; }
                    .bg-red-600 { background: #dc2626 !important; }
                    .bg-amber-500 { background: #f59e0b !important; }
                    .bg-gray-600 { background: #4b5563 !important; }
                    .bg-blue-500 { background: #3b82f6 !important; }
                    .bg-orange-500 { background: #f97316 !important; }
                    .bg-gray-100 { background: #f3f4f6 !important; }
                    .bg-gray-50 { background: #f9fafb !important; }
                    
                    .text-white { color: white !important; }
                    .text-gray-600 { color: #4b5563 !important; }
                    .text-emerald-600 { color: #0d9488 !important; }
                    .text-orange-600 { color: #ea580c !important; }
                    .text-red-600 { color: #dc2626 !important; }
                    .text-blue-600 { color: #2563eb !important; }
                    .text-gray-800 { color: #1f2937 !important; }
                    
                    .space-y-4 {
                        margin-bottom: 0 !important;
                    }
                    
                    .space-y-4 > * + * {
                        margin-top: 8px !important;
                    }
                    
                    .space-y-4 > *:last-child {
                        margin-bottom: 0 !important;
                    }
                    
                    .space-y-2 > * + * {
                        margin-top: 4px !important;
                    }
                    
                    .mb-2 {
                        margin-bottom: 4px !important;
                    }
                    
                    .mt-1 {
                        margin-top: 4px !important;
                    }
                    
                    .p-3 {
                        padding: 8px !important;
                    }
                    
                     #printable-report-wrapper > :last-child {
                        margin-bottom: 0 !important;
                        padding-bottom: 0 !important;
                    }

                    /* Prevent trailing blank page */
                    #printable-report-wrapper {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }

                    #printable-report-wrapper > div:last-child,
                    #printable-report-wrapper > div:last-child > *:last-child,
                    #printable-report-wrapper > div:last-child > *:last-child > *:last-child {
                        margin-bottom: 0 !important;
                        padding-bottom: 0 !important;
                    }

                    html, body {
                        page-break-after: avoid !important;
                    }
                    
                    .rounded-full {
                        font-size: 8px !important;
                        padding: 2px 8px !important;
                    }
                    
                    .h-3\\.5.w-3\\.5 {
                        height: 14px !important;
                        width: 14px !important;
                    }
                    
                    .print\\:h-3.w-3 {
                        height: 12px !important;
                        width: 12px !important;
                    }
                }
                
                @media screen {
                    .print-header {
                        display: none !important;
                    }
                }
                
                .sidebar-white {
                    background: #ffffff;
                    border-right: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                }
                .sidebar-white .active-tab {
                    background: #10b981 !important;
                    color: white !important;
                }
                .sidebar-white .active-tab:hover {
                    background: #059669 !important;
                }
                .sidebar-white .menu-item:hover {
                    background: #d1fae5 !important;
                    color: #065f46 !important;
                }
                .sidebar-white .group-label {
                    color: #6b7280;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }
                .white-badge {
                    background: #6b7280;
                    color: white;
                }
                .white-badge:hover {
                    background: #4b5563;
                }
                .scrollbar-white::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .scrollbar-white::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .scrollbar-white::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 10px;
                }
                .scrollbar-white::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                .scrollbar-white {
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db #f1f1f1;
                }
                .scrollbar-mint::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .scrollbar-mint::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .scrollbar-mint::-webkit-scrollbar-thumb {
                    background: #10b981;
                    border-radius: 10px;
                }
                .scrollbar-mint::-webkit-scrollbar-thumb:hover {
                    background: #059669;
                }
                .scrollbar-mint {
                    scrollbar-width: thin;
                    scrollbar-color: #10b981 #f1f1f1;
                }
                .sidebar-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 10px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                .sidebar-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db #f1f1f1;
                }
                .select-none {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                .ring-0 {
                    ring: 0 !important;
                }
                .focus\\:ring-0:focus {
                    ring: 0 !important;
                }
                .focus\\:outline-none:focus {
                    outline: none !important;
                }
                *:focus {
                    outline: none !important;
                    --tw-ring-offset-shadow: 0 0 #0000 !important;
                    --tw-ring-shadow: 0 0 #0000 !important;
                    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000) !important;
                }
                *:focus-visible {
                    outline: 2px solid #6b7280 !important;
                    outline-offset: 2px !important;
                }
                .ring-0 {
                    --tw-ring-offset-shadow: 0 0 #0000 !important;
                    --tw-ring-shadow: 0 0 #0000 !important;
                    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000) !important;
                }
            `}</style>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 no-print flex-shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
                            Reports
                        </h1>
                        <p className="text-[9.5px] text-gray-500">
                            Review records using search, date filters, and
                            pagination
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 w-[180px] pl-8 border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none text-[8.5px] shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                            <CalendarRange className="h-3.5 w-3.5" />
                            <DateRangeFilter
                                start={start}
                                end={end}
                                onChange={handleRangeChange}
                            />
                        </div>
                        <Button
                            onClick={togglePrintPreview}
                            variant={isPrintPreview ? "default" : "outline"}
                            className={`gap-2 no-print focus:ring-0 focus:outline-none text-[8.5px] h-8 shadow-sm ${
                                isPrintPreview
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                    : "border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                            <Eye className="h-3.5 w-3.5" />
                            {isPrintPreview ? "Exit Preview" : "Print Preview"}
                        </Button>
                        <Button
                            onClick={handlePrint}
                            className="gap-2 no-print white-badge focus:ring-0 focus:outline-none text-[8.5px] h-8 shadow-sm"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {!isPrintPreview && (
                    <div
                        className={`sidebar-white rounded-lg shadow-md no-print transition-all duration-300 ${sidebarCollapsed ? "w-14" : "w-52"} shrink-0 relative hidden lg:block overflow-y-auto`}
                    >
                        <div className="sticky top-0 p-3 space-y-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSidebar}
                                className="w-full justify-center hover:bg-emerald-50 hover:text-emerald-600 focus:ring-0 focus:outline-none text-gray-500 text-[8.5px] h-7"
                            >
                                {sidebarCollapsed ? (
                                    <ChevronRightIcon className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                )}
                                {!sidebarCollapsed && (
                                    <span className="ml-2 text-[8.5px]">
                                        Collapse
                                    </span>
                                )}
                            </Button>
                            {renderSidebarItems()}
                        </div>
                    </div>
                )}

                {!isPrintPreview && (
                    <>
                        <div
                            className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 text-gray-700 transition-transform duration-300 ease-out z-50 flex flex-col shadow-xl lg:hidden mobile-sidebar ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
                        >
                            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-800 text-[10.5px]">
                                    Reports
                                </h2>
                                <button
                                    onClick={toggleMobileMenu}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:ring-0 focus:outline-none"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                            <nav className="flex-1 py-4 px-3 overflow-y-auto sidebar-scrollbar">
                                {renderMobileSidebarItems()}
                            </nav>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden h-8 w-8 rounded-md hover:bg-gray-100 focus:ring-0 focus:outline-none"
                            onClick={toggleMobileMenu}
                        >
                            <Menu className="h-4 w-4 text-gray-500" />
                        </Button>

                        {isMobileMenuOpen && (
                            <div
                                className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                        )}
                    </>
                )}

                <div
                    className={`flex-1 min-w-0 overflow-y-auto ${!isPrintPreview ? "scrollbar-mint px-6 pb-6" : "px-0 pb-0"}`}
                    style={
                        isPrintPreview
                            ? { background: "#f5f5f5", padding: "20px" }
                            : {}
                    }
                >
                    <div id="printable-report-wrapper" className="print:pb-0 print:mb-0">
                        {isPrintPreview ? (
                            <div className="print-preview-page">
                                {renderContent()}
                            </div>
                        ) : (
                            renderContent()
                        )}
                    </div>
                </div>
            </div>

            {isPrintPreview && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-xs flex items-center gap-3 no-print z-50">
                    <span>📄 Print Preview</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-300">Page size: A4</span>
                    <button
                        onClick={togglePrintPreview}
                        className="ml-2 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-xs"
                    >
                        Exit Preview
                    </button>
                    <button
                        onClick={handlePrint}
                        className="ml-1 bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded text-white text-xs"
                    >
                        Print / PDF
                    </button>
                </div>
            )}
        </div>
    );
}