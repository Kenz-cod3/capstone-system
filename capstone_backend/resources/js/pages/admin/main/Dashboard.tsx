import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    CalendarDays,
    Hotel,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Eye,
    Filter,
    Download,
    Calendar,
    MoreHorizontal,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import RoomStatusGrid from "@/components/AdminComponents/dashboard/RoomStatusGrid";
import StatCardsGrid from "@/components/AdminComponents/dashboard/StatCardsGrid";
import OccupancyTrendChart from "@/components/AdminComponents/dashboard/OccupancyTrendChart";
import RoomStatusChart from "@/components/AdminComponents/dashboard/RoomStatusChart";
import RevenueChart from "@/components/AdminComponents/dashboard/RevenueChart";

import Echo from "@/services/echo";

// ============================================
// TYPES
// ============================================

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

interface Booking {
    id: number;
    booking_reference?: string;
    walk_in_guest?: {
        first_name: string;
        middle_name?: string;
        last_name: string;
        full_name?: string;
    };
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    booked_rooms?: {
        room: {
            room_number: string;
        };
    }[];
    payments?: {
        id: number;
        payment_status: string;
        payment_date: string;
        amount: number;
    }[];
    created_at: string;
    booking_status: string;
    // latestPayment?: {
    //     payment_status: string;
    // };
    total_price?: number;
}

interface RoomStatusItem {
    name: string;
    value: number;
    color: string;
}

interface OccupancyTrendItem {
    day: string;
    occupancy: number;
}

interface DashboardData {
    stats: DashboardStats;
    recentBookings: Booking[];
    occupancy: number;
    roomStatus: RoomStatusItem[];
    trend: OccupancyTrendItem[];

    financialTrend: {
        name: string;
        date: string;
        revenue: number;
        expenses: number;
        profit: number;
    }[];

    yearlyTrend: {
        name: string;
        date: string;
        revenue: number;
        expenses: number;
        profit: number;
    }[];
    lastYearTrend?: {
        name: string;
        date: string;
        revenue: number;
        expenses: number;
        profit: number;
    }[];
}

// ============================================
// ANIMATED COUNTER COMPONENT - UPDATED
// ============================================

interface AnimatedCounterProps {
    value: number | string;
    isCurrency?: boolean;
    duration?: number;
    dataKey: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    isCurrency = false,
    duration = 600,
    dataKey,
}) => {
    const [displayValue, setDisplayValue] = React.useState(0);

    const getNumericValue = (val: number | string): number => {
        if (typeof val === "number") return val;

        if (isCurrency) {
            const numeric = val.replace(/[^0-9.-]/g, "");
            return parseFloat(numeric) || 0;
        }

        return parseFloat(val) || 0;
    };

    const targetValue = getNumericValue(value);

    React.useEffect(() => {
        const storageKey = `counter_${dataKey}`;

        const stored = sessionStorage.getItem(storageKey);
        const previousValue = stored ? parseFloat(stored) : null;

        // 🔥 FIRST LOAD → animate
        const isFirstLoad = previousValue === null;

        // 🔥 CHECK CHANGE
        const hasChanged =
            previousValue !== null &&
            Math.abs(targetValue - previousValue) > 0.01;

        // 🔥 SAVE VALUE
        sessionStorage.setItem(storageKey, targetValue.toString());

        // ❌ NO CHANGE → no animation
        if (!isFirstLoad && !hasChanged) {
            setDisplayValue(targetValue);
            return;
        }

        let startTime: number | null = null;
        let animationFrame: number;

        const startValue = previousValue ?? 0;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;

            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const current = startValue + (targetValue - startValue) * easeOut;

            setDisplayValue(current);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setDisplayValue(targetValue);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [targetValue, duration, dataKey]);

    const formatDisplay = (val: number): string => {
        if (isCurrency) {
            return new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(Math.round(val));
        }

        if (value.toString().includes("%")) {
            return `${Math.round(val)}%`;
        }

        if (Number.isInteger(val)) {
            return Math.round(val).toString();
        }

        return val.toFixed(1);
    };

    return <span className="tabular-nums">{formatDisplay(displayValue)}</span>;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getStatusColor = (status?: string): string => {
    const colors = {
        confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        cancelled: "bg-rose-50 text-rose-700 border-rose-200",
        checked_in: "bg-blue-50 text-blue-700 border-blue-200",
        checked_out: "bg-gray-50 text-gray-600 border-gray-200",
        refunded: "bg-red-50 text-red-700 border-red-200",
        paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

    return (
        colors[(status || "pending") as keyof typeof colors] || colors.pending
    );
};

const getStatusText = (status?: string): string => {
    const texts = {
        confirmed: "Confirmed",
        pending: "Pending",
        cancelled: "Cancelled",
        checked_in: "Checked In",
        checked_out: "Checked Out",
        refunded: "Refunded",
        paid: "Paid",
    };

    return texts[(status || "pending") as keyof typeof texts] || texts.pending;
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

    if (percent === 0) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
                fontSize: "12px",
                fontWeight: "500",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
        >
            {`${Math.round(percent * 100)}%`}
        </text>
    );
};

// ============================================
// COMPONENTS
// ============================================

// const PageHeader = ({ user }: { user: any }) => (
//     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//         <div>
//             <h1 className="text-2xl font-bold">
//                 Welcome back, {user?.first_name || "Admin"}
//             </h1>
//             <p className="text-gray-600">
//                 Here's an overview of your property performance.
//             </p>
//         </div>
//         <div className="flex gap-3">
//             <Button
//                 variant="outline"
//                 className="gap-2 border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
//             >
//                 <Filter className="h-4 w-4" />
//                 Filter
//             </Button>
//             <Button
//                 className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all"
//             >
//                 <Download className="h-4 w-4" />
//                 Export Report
//             </Button>
//         </div>
//     </div>
// );

const RecentBookingsTable = ({
    bookings,
    isLoading,
    navigateTo,
}: {
    bookings: Booking[];
    isLoading: boolean;
    navigateTo: (path: string) => void;
}) => (
    <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-200 flex flex-col mb-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Recent Bookings</h2>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-500 text-xs hover:text-gray-700"
                onClick={() => navigateTo("/bookings")}
            >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
            </Button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
            {isLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    Loading bookings...
                </div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    No bookings found
                </div>
            ) : (
                <table className="w-full text-sm">
                    {/* HEADER */}
                    <thead>
                        <tr className="text-gray-500 text-xs border-b border-gray-100">
                            <th className="text-left py-3 px-3 font-medium">
                                Booking ID
                            </th>
                            <th className="text-left py-3 px-3 font-medium">
                                Guest
                            </th>
                            <th className="text-left py-3 px-3 font-medium">
                                Room
                            </th>
                            <th className="text-left py-3 px-3 font-medium">
                                Date
                            </th>
                            {/* <th className="text-left py-3 px-3 font-medium">
                                Status
                            </th> */}
                            <th className="text-right py-3 px-3 font-medium">
                                Amount
                            </th>
                            {/* <th className="text-center py-3 px-3 font-medium">
                                Action
                            </th> */}
                            <th className="text-center py-3 px-3 font-medium">
                                Status
                            </th>
                        </tr>
                    </thead>

                    {/* BODY */}
                    <tbody className="divide-y divide-gray-50">
                        {bookings.map((booking: Booking) => (
                            <tr
                                key={booking.id}
                                className="hover:bg-gray-50/60 transition"
                            >
                                {/* ID */}
                                <td className="py-3 px-3 font-mono text-gray-500">
                                    {booking.booking_reference ||
                                        `#${booking.id}`}
                                </td>

                                {/* GUEST */}
                                <td className="py-3 px-3">
                                    <p className="font-medium text-gray-800">
                                        {booking.walk_in_guest?.full_name ||
                                            `${booking.user?.first_name || ""} ${booking.user?.last_name || ""}`.trim() ||
                                            "Unnamed Guest"}
                                    </p>
                                </td>

                                {/* ROOM */}
                                <td className="py-3 px-3 text-gray-600">
                                    {booking.booked_rooms
                                        ?.map((br) => br.room?.room_number)
                                        .filter(Boolean)
                                        .join(", ") || "-"}
                                </td>

                                {/* DATE */}
                                <td className="py-3 px-2 text-gray-500">
                                    {new Date(
                                        booking.created_at,
                                    ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </td>

                                {/* STATUS
                                <td className="py-3 px-3">
                                    <span
                                        className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                                            booking.booking_status,
                                        )}`}
                                    >
                                        {getStatusText(booking.booking_status)}
                                    </span>
                                </td> */}

                                {/* AMOUNT */}
                                {/* <td className="py-3 px-3 text-right font-semibold text-gray-700">
                                    {formatCurrency(booking.total_price || 0)}
                                </td> */}
                                <td className="py-3 px-3 text-right font-semibold text-gray-700">
                                    {formatCurrency(
                                        Number(
                                            booking.payments?.[
                                                booking.payments.length - 1
                                            ]?.amount ?? 0,
                                        ),
                                    )}
                                </td>

                                {/* ACTION */}
                                {/* <td className="py-3 px-3 text-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600"
                                        onClick={() =>
                                            navigateTo(
                                                `/bookings/${booking.id}`,
                                            )
                                        }
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                </td> */}
                                <td className="py-3 px-3 text-center">
                                    <Badge
                                        className={getStatusColor(
                                            booking.payments?.[
                                                booking.payments.length - 1
                                            ]?.payment_status,
                                        )}
                                    >
                                        {getStatusText(
                                            booking.payments?.[
                                                booking.payments.length - 1
                                            ]?.payment_status,
                                        )}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
);

// ============================================
// CUSTOM HOOKS
// ============================================

const useCurrentUser = () => {
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error("Error parsing user data:", error);
                setUser(null);
            }
        }
    }, []);

    return { user };
};

// ============================================
// MAIN COMPONENT - SILENT AUTO UPDATE
// ============================================

export default function Dashboard() {
    const { user } = useCurrentUser();
    const navigate = useNavigate();

    // TanStack Query with silent auto refresh every 5 seconds
    const {
        data: dashboardData,
        isLoading,
        error,
        isError,
    } = useQuery<DashboardData>({
        queryKey: ["dashboard"],
        queryFn: async () => {
            const res = await api.get("/dashboard");
            return res.data;
        },

        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,

        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    const { data: statsData, refetch: refetchStats } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const res = await api.get("/dashboard/stats");
            return res.data;
        },

        staleTime: 0,
        refetchOnWindowFocus: true,

        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        notifyOnChangeProps: ["data"],
    });

    const { data: roomsData, refetch: refetchRooms } = useQuery({
        queryKey: ["rooms-status-grid"],
        queryFn: async () => {
            const res = await api.get("/rooms/status-grid");
            return res.data;
        },

        staleTime: 0,
        refetchOnWindowFocus: false,
    });

    React.useEffect(() => {
        console.log("Subscribing to dashboard channel...");

        Echo.channel("dashboard").listen(
            ".DashboardUpdated",
            async (e: any) => {
                console.log("✅ Realtime received!", e);

                await Promise.all([refetchStats(), refetchRooms()]);
            },
        );

        return () => {
            Echo.leave("dashboard");
        };
    }, []); // ← EMPTY, walang refetch dito

    // Handle error state
    if (isError) {
        console.error("Dashboard data fetch error:", error);
        return (
            <div className="flex flex-col gap-4 min-h-screen">
                {/* <PageHeader user={user} /> */}
                <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                        <p className="text-red-600 mb-4 font-medium">
                            Failed to load dashboard data
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                            Please check your connection and try again.
                        </p>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="mx-auto"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Safe destructuring with fallbacks
    const stats = statsData?.stats;
    const recentBookings = statsData?.recentBookings ?? [];
    const occupancy = statsData?.occupancy ?? 0;
    const roomStatus = statsData?.roomStatus ?? [];

    const occupancyTrend = dashboardData?.trend ?? [];

    console.log(JSON.stringify(recentBookings[0], null, 2));

    const navigateTo = (path: string) => {
        navigate(path);
    };

    // Show loading skeleton only on initial load
    if (isLoading) {
        return (
            <div className="space-y-3">
                {/* TOP STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse"
                        >
                            <div className="flex justify-between mb-6">
                                <div className="w-20 h-4 bg-gray-100 rounded"></div>
                                <div className="w-10 h-4 bg-gray-100 rounded"></div>
                            </div>

                            <div className="w-32 h-8 bg-gray-100 rounded mb-3"></div>
                            <div className="w-24 h-4 bg-gray-100 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* ROOM STATUS + PIE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* ROOM GRID */}
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
                        <div className="flex justify-between items-center mb-5">
                            <div className="w-44 h-6 bg-gray-100 rounded"></div>

                            <div className="flex gap-3">
                                <div className="w-16 h-4 bg-gray-100 rounded"></div>
                                <div className="w-16 h-4 bg-gray-100 rounded"></div>
                                <div className="w-20 h-4 bg-gray-100 rounded"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {[...Array(16)].map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-lg p-4 w-full aspect-square bg-gray-100 animate-pulse"
                                />
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-3">
                            <div className="w-12 h-6 rounded bg-gray-100"></div>

                            <div className="w-8 h-4 rounded bg-gray-100"></div>

                            <div className="w-12 h-6 rounded bg-gray-100"></div>
                        </div>
                    </div>

                    {/* PIE CHART */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="w-52 h-7 bg-gray-100 rounded"></div>
                            <div className="w-4 h-4 bg-gray-100 rounded"></div>
                        </div>

                        {/* CHART + LEGEND */}
                        <div className="flex items-center justify-between gap-6 mt-8">
                            {/* DONUT */}
                            <div className="w-44 h-44 rounded-full border-[28px] border-gray-100 shrink-0"></div>

                            {/* LEGEND */}
                            <div className="flex-1 space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div
                                        key={i}
                                        className="h-4 bg-gray-100 rounded"
                                    />
                                ))}

                                <div className="h-px bg-gray-100 my-2"></div>

                                <div className="h-5 bg-gray-100 rounded w-32"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3 -mt-1">
            {/* <PageHeader user={user} /> */}

            <StatCardsGrid
                stats={stats}
                occupancy={occupancy}
                role={user?.role ?? "staff"}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-6 items-stretch">
                <div className="lg:col-span-2">
                    <RoomStatusGrid rooms={roomsData || []} />
                </div>
                <div className="lg:col-span-1">
                    <RoomStatusChart data={roomStatus} />
                </div>
            </div>

            <RecentBookingsTable
                bookings={recentBookings}
                isLoading={false}
                navigateTo={navigateTo}
            />

            {/*---------REVENUE CHART---->*/}
            <div className="mt-8">
                <RevenueChart
                    data={dashboardData?.financialTrend ?? []}
                    yearlyData={dashboardData?.yearlyTrend ?? []}
                    lastYearData={dashboardData?.lastYearTrend ?? []}
                    role={user?.role ?? "staff"}
                />
            </div>

            <div className="mt-8">
                <OccupancyTrendChart data={occupancyTrend} />
            </div>
        </div>
    );
}
