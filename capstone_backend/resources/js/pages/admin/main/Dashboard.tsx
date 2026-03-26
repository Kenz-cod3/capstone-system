import React, { useEffect, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { useNavigate } from "react-router-dom";
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
    MoreHorizontal
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
    Cell
} from "recharts";

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getStatusColor = (status?: string): string => {
    const colors = {
        confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        cancelled: "bg-rose-50 text-rose-700 border-rose-200",
        checked_in: "bg-blue-50 text-blue-700 border-blue-200",
        checked_out: "bg-gray-50 text-gray-600 border-gray-200"
    };

    return colors[(status || "pending") as keyof typeof colors] || colors.pending;
};

const getStatusText = (status?: string): string => {
    const texts = {
        confirmed: "Confirmed",
        pending: "Pending",
        cancelled: "Cancelled",
        checked_in: "Checked In",
        checked_out: "Checked Out"
    };

    return texts[(status || "pending") as keyof typeof texts] || texts.pending;
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
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
            style={{ fontSize: "12px", fontWeight: "500", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        >
            {`${Math.round(percent * 100)}%`}
        </text>
    );
};

// ============================================
// CUSTOM HOOKS
// ============================================

const useDashboardData = () => {
    const [stats, setStats] = useState({
        guests: 0,
        rooms: 0,
        bookings: 0,
        revenue: 0
    });
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [occupancy, setOccupancy] = useState(0);
    const [roomStatus, setRoomStatus] = useState<any[]>([]);
    const [occupancyTrend, setOccupancyTrend] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cached = sessionStorage.getItem("dashboard_cache");

        if (cached) {
            const data = JSON.parse(cached);

            setStats(data.stats);
            setRecentBookings(data.recentBookings);
            setOccupancy(data.occupancy);
            setRoomStatus(data.roomStatus);
            setOccupancyTrend(data.trend);
        }

        // 🔥 ALWAYS FETCH NEW DATA
        fetchDashboardData();

    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const res = await api.get("/dashboard");

            setStats(res.data.stats);
            setRecentBookings(res.data.recentBookings);
            setOccupancy(res.data.occupancy);
            setRoomStatus(res.data.roomStatus);
            setOccupancyTrend(res.data.trend);

            // ✅ SAVE CACHE
            sessionStorage.setItem("dashboard_cache", JSON.stringify(res.data));

        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    return {
        stats,
        recentBookings,
        occupancy,
        roomStatus,
        occupancyTrend,
        loading,
        fetchDashboardData
    };
};

const useCurrentUser = () => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    return { user };
};

// ============================================
// COMPONENTS
// ============================================

const PageHeader = ({ user }: { user: any }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
            <h1 className="text-2xl font-bold">
                Welcome back, {user?.first_name || "Admin"}
            </h1>
            <p className="text-gray-600">
                Here's an overview of your property performance.
            </p>
        </div>
        <div className="flex gap-3">
            <Button
                variant="outline"
                className="gap-2 border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
            >
                <Filter className="h-4 w-4" />
                Filter
            </Button>
            <Button
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all"
            >
                <Download className="h-4 w-4" />
                Export Report
            </Button>
        </div>
    </div>
);

const StatCard = ({ label, value, change, trend, icon: Icon, color, bgColor }: any) => (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none">
        <CardContent className="p-5">
            <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: bgColor }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <Badge
                    variant="outline"
                    className={`gap-1 text-xs font-normal ${trend === 'up'
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-rose-600 bg-rose-50'
                        } border-0`}
                >
                    {trend === 'up'
                        ? <ArrowUpRight className="h-3 w-3" />
                        : <ArrowDownRight className="h-3 w-3" />
                    }
                    {change}
                </Badge>
            </div>
            <div className="mt-4">
                <p className="text-2xl font-semibold text-gray-800 tracking-tight">{value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
            </div>
        </CardContent>
    </Card>
);

const StatCardsGrid = ({ stats, occupancy }: { stats: any; occupancy: number }) => {
    const statCards = [
        {
            label: "Total Revenue",
            value: formatCurrency(stats.revenue),
            change: "+12.5%",
            trend: "up",
            icon: DollarSign,
            color: "#2e7d64",
            bgColor: "#e6f4f0"
        },
        {
            label: "Occupancy Rate",
            value: `${occupancy}%`,
            change: "+5.2%",
            trend: "up",
            icon: Hotel,
            color: "#2e7d64",
            bgColor: "#e6f4f0"
        },
        {
            label: "Active Bookings",
            value: stats.bookings.toString(),
            change: "+23",
            trend: "up",
            icon: CalendarDays,
            color: "#2e7d64",
            bgColor: "#e6f4f0"
        },
        {
            label: "Total Guests",
            value: stats.guests.toString(),
            change: "+8",
            trend: "up",
            icon: Users,
            color: "#2e7d64",
            bgColor: "#e6f4f0"
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
};

const OccupancyTrendChart = ({ data }: { data: any[] }) => (
    <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
            <CardTitle className="text-base font-semibold text-gray-700">Occupancy Trend</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                Last 7 Days
            </Button>
        </CardHeader>
        <CardContent className="pt-4">
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2e7d64" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#2e7d64" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #c0dfd6',
                                borderRadius: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                fontSize: '12px'
                            }}
                            labelStyle={{ color: '#374151' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="occupancy"
                            stroke="#2e7d64"
                            strokeWidth={2}
                            fill="url(#mintGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
    </Card>
);

const RoomStatusChart = ({ data }: { data: any[] }) => (
    <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
            <CardTitle className="text-base font-semibold text-gray-700">Room Status Distribution</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </CardHeader>
        <CardContent className="pt-4">
            <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={95}
                            dataKey="value"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [`${value} ${value === 1 ? 'room' : 'rooms'}`, name]}
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #c0dfd6',
                                borderRadius: '6px',
                                fontSize: '12px'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 pt-2">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-500">{item.name}</span>
                        <span className="text-xs font-medium text-gray-700">
                            {item.value} {item.value === 1 ? 'room' : 'rooms'}
                        </span>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

const RecentBookingsTable = ({ bookings, loading, navigateTo }: any) => (
    <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-3">
            <CardTitle className="text-base font-semibold text-gray-700">Recent Bookings</CardTitle>
            <Button
                type="button"
                variant="ghost"
                className="gap-1 ..."
                onClick={() => navigateTo('/bookings')}
            >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="text-center py-12 text-gray-400 text-sm">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No bookings found</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                                <th className="text-left py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                                <th className="text-left py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                <th className="text-left py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-left py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-right py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="text-center py-3.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {bookings.map((booking: any) => (
                                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className="text-sm font-mono text-gray-500">
                                            {booking.booking_reference || `#${booking.id}`}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {booking.walk_in_guest?.guest_name || booking.user?.name || "Guest"}
                                            </p>
                                            <p className="text-xs text-gray-400">{booking.user?.email || ""}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {booking.rooms?.map((r: any) => r.room_number).join(", ") || "-"}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-500">
                                        {new Date(booking.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="py-3 px-4">
                                        <Badge className={`${getStatusColor(booking.booking_status)} border-0 font-normal text-xs`}>
                                            {getStatusText(booking.booking_status)}
                                        </Badge>
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-gray-700 text-sm">
                                        {formatCurrency(booking.total_price || 0)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600"
                                            onClick={() => navigateTo(`/bookings/${booking.id}`)}
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </CardContent>
    </Card>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function Dashboard() {
    const { user } = useCurrentUser();
    const navigate = useNavigate();
    const { stats, recentBookings, occupancy, roomStatus, occupancyTrend, loading, fetchDashboardData } = useDashboardData();

    const navigateTo = (path: string) => {
        navigate(path);
    };

    return (
        <div className="space-y-6">
            <PageHeader user={user} />
            <StatCardsGrid stats={stats} occupancy={occupancy} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OccupancyTrendChart data={occupancyTrend} />
                <RoomStatusChart data={roomStatus} />
            </div>

            <RecentBookingsTable
                bookings={recentBookings}
                loading={loading}
                navigateTo={navigateTo}
            />
        </div>
    );
}