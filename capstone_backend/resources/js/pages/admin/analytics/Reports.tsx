import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { 
    TrendingUp, 
    Calendar, 
    Users, 
    CheckCircle, 
    Clock, 
    Filter, 
    Download, 
    ChevronDown, 
    ChevronUp,
    RefreshCw,
    DollarSign,
    Building2,
    UserCheck,
    AlertCircle,
    Loader2,
    PieChart,
    BarChart3
} from "lucide-react";

export default function Reports() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [filters, setFilters] = useState({
        start_date: "",
        end_date: "",
    });

    // TanStack Query
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["reports", filters],
        queryFn: async () => {
            const res = await api.get("/reports", {
                params: filters,
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    const getFilteredTransactions = () => {
        if (!data?.recent_bookings) return [];

        if (statusFilter === "all") return data.recent_bookings;

        return data.recent_bookings.filter(
            (b: any) => b.booking_status === statusFilter
        );
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case "checked_in": return "bg-blue-100 text-blue-800";
            case "checked_out": return "bg-purple-100 text-purple-800";
            case "confirmed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getBookingTypeColor = (type: string) => {
        return type === "walk_in" 
            ? "bg-blue-100 text-blue-800" 
            : "bg-emerald-100 text-emerald-800";
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const exportToCSV = () => {
        const transactions = getFilteredTransactions();
        if (transactions.length === 0) return;

        const headers = ["Guest", "Booking Type", "Status", "Check In Date", "Total Amount"];
        const csvData = transactions.map((b: any) => [
            b.walk_in_guest?.guest_name || b.user?.name || "Guest",
            b.booking_type === "walk_in" ? "Walk-in" : "Online",
            b.booking_status?.replace("_", " ").toUpperCase(),
            formatDate(b.check_in_date),
            b.total_price
        ]);
        
        const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reports_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Calculate additional stats
    const getAdditionalStats = () => {
        if (!data?.recent_bookings) return { averageRevenue: 0, onlineVsWalkin: { online: 0, walkin: 0 } };
        
        const bookings = data.recent_bookings;
        const totalRevenue = data.total_revenue || 0;
        const onlineBookings = bookings.filter((b: any) => b.booking_type === "online").length;
        const walkinBookings = bookings.filter((b: any) => b.booking_type === "walk_in").length;
        
        return {
            averageRevenue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
            onlineVsWalkin: {
                online: onlineBookings,
                walkin: walkinBookings
            }
        };
    };

    const additionalStats = getAdditionalStats();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading reports data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-orange-500" />
                            Reports Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Comprehensive overview of bookings, revenue, and transactions
                        </p>
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-700">Date Range</span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) =>
                                        setFilters({ ...filters, start_date: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>
                            
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) =>
                                        setFilters({ ...filters, end_date: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>
                            
                            <div className="flex items-end">
                                <button
                                    onClick={() => setFilters({ ...filters })}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(data?.total_revenue || 0)}
                        </h2>
                        <p className="text-xs text-gray-400 mt-2">Total earnings</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">Total Bookings</p>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {data?.total_bookings || 0}
                        </h2>
                        <p className="text-xs text-gray-400 mt-2">Total reservations</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">Checked In</p>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-blue-600">
                            {data?.checked_in || 0}
                        </h2>
                        <p className="text-xs text-gray-400 mt-2">Currently checked in</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">Average Revenue</p>
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(additionalStats.averageRevenue)}
                        </h2>
                        <p className="text-xs text-gray-400 mt-2">Per booking average</p>
                    </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <h3 className="font-semibold text-gray-900">Booking Type Distribution</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Online Bookings</span>
                                <span className="font-semibold text-gray-900">{additionalStats.onlineVsWalkin.online}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-emerald-500 rounded-full h-2 transition-all"
                                    style={{ 
                                        width: `${(additionalStats.onlineVsWalkin.online / (data?.total_bookings || 1)) * 100}% 
                                    `}}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-gray-600">Walk-in Bookings</span>
                                <span className="font-semibold text-gray-900">{additionalStats.onlineVsWalkin.walkin}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-500 rounded-full h-2 transition-all"
                                    style={{ 
                                        width: `${(additionalStats.onlineVsWalkin.walkin / (data?.total_bookings || 1)) * 100}% 
                                    `}}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="w-5 h-5 text-gray-400" />
                            <h3 className="font-semibold text-gray-900">Quick Stats</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Total Guests</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {data?.recent_bookings?.length || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Completion Rate</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {data?.total_bookings > 0 
                                        ? Math.round((data.checked_in / data.total_bookings) * 100) 
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Showing {getFilteredTransactions().length} transactions
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    statusFilter === "all"
                                        ? "bg-orange-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                All
                            </button>

                            <button
                                onClick={() => setStatusFilter("checked_out")}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    statusFilter === "checked_out"
                                        ? "bg-purple-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                Checked Out
                            </button>

                            <button
                                onClick={() => setStatusFilter("checked_in")}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    statusFilter === "checked_in"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                Checked In
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Guest
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Check In Date
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total Amount
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {getFilteredTransactions().length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertCircle className="w-12 h-12 text-gray-300" />
                                                    <p className="text-gray-500">No transactions found</p>
                                                    <p className="text-xs text-gray-400">
                                                        Try adjusting your filters or date range
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        getFilteredTransactions().map((b: any) => (
                                            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">
                                                        {b.walk_in_guest?.guest_name ||
                                                         b.user?.name ||
                                                         "Guest"}
                                                    </div>
                                                    {b.room_number && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Room {b.room_number}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBookingTypeColor(b.booking_type)}`}>
                                                        {b.booking_type === "walk_in" ? "Walk-in" : "Online"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(b.booking_status)}`}>
                                                        {b.booking_status?.replace("_", " ").toUpperCase()}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-gray-600">
                                                    {formatDate(b.check_in_date)}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-gray-900">
                                                        {formatCurrency(b.total_price)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
