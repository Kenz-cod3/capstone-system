import { useEffect, useState, useMemo } from "react";
import api from "@/services/api";
import { 
    TrendingUp, 
    Coffee, 
    Utensils, 
    Cake, 
    Filter, 
    Download, 
    Calendar,
    ChevronDown,
    Loader2,
    DollarSign,
    ShoppingBag,
    Users
} from "lucide-react";

export default function AdminOrdersReport() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [dateRange, setDateRange] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    const fetchOrders = async () => {
        try {
            const res = await api.get("/orders");
            const paidOrders = res.data.filter(
                (o: any) => o.order_status === "paid"
            );
            setOrders(paidOrders);
        } catch (err: any) {
            console.error("Fetch Error:", err.response?.data || err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Filter by date range
    const filterByDate = (order: any) => {
        if (dateRange === "all") return true;
        
        const orderDate = new Date(order.created_at);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        switch(dateRange) {
            case "today":
                return orderDate.toDateString() === today.toDateString();
            case "week":
                return orderDate >= startOfWeek;
            case "month":
                return orderDate >= startOfMonth;
            default:
                return true;
        }
    };

    // Filtered items with date filtering
    const filteredItems = useMemo(() => {
        return orders
            .filter(order => filterByDate(order))
            .flatMap((order: any) =>
                order.items
                    .filter((item: any) => {
                        if (filter === "All") return true;
                        return item.menu_item?.category === filter;
                    })
                    .map((item: any) => ({
                        ...item,
                        order_id: order.id,
                        status: order.order_status,
                        order_date: order.created_at,
                        customer_name: order.customer_name || "Guest",
                        table_number: order.table_number
                    }))
            );
    }, [orders, filter, dateRange]);

    // Calculate statistics
    const stats = useMemo(() => {
        const totalRevenue = filteredItems.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0
        );
        
        const totalItems = filteredItems.reduce(
            (sum, item) => sum + item.quantity,
            0
        );
        
        const uniqueOrders = new Set(filteredItems.map(item => item.order_id)).size;
        
        const avgOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0;
        
        const categoryBreakdown = filteredItems.reduce((acc: any, item) => {
            const category = item.menu_item?.category || "Other";
            acc[category] = (acc[category] || 0) + Number(item.subtotal);
            return acc;
        }, {});
        
        return {
            totalRevenue,
            totalItems,
            uniqueOrders,
            avgOrderValue,
            categoryBreakdown
        };
    }, [filteredItems]);

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch(category) {
            case "Drinks": return <Coffee className="w-4 h-4" />;
            case "Meals": return <Utensils className="w-4 h-4" />;
            case "Desserts": return <Cake className="w-4 h-4" />;
            default: return <ShoppingBag className="w-4 h-4" />;
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ["Order #", "Product", "Quantity", "Subtotal", "Status", "Date", "Customer", "Table"];
        const csvData = filteredItems.map(item => [
            `#${item.order_id}`,
            item.menu_item?.name,
            item.quantity,
            item.subtotal,
            item.status,
            new Date(item.order_date).toLocaleDateString(),
            item.customer_name,
            item.table_number || "-"
        ]);
        
        const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales_report_${filter}_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading sales report...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-8 h-8 text-orange-500" />
                                Sales Report
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Track your restaurant's performance and revenue
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={exportToCSV}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                            
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(stats.totalRevenue)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Items Sold</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.totalItems}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.uniqueOrders}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Average Order Value</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(stats.avgOrderValue)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {["All", "Drinks", "Meals", "Desserts"].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setFilter(cat)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                filter === cat
                                                    ? "bg-orange-500 text-white shadow-md"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            {cat !== "All" && getCategoryIcon(cat)}
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date Range
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: "all", label: "All Time" },
                                        { value: "today", label: "Today" },
                                        { value: "week", label: "This Week" },
                                        { value: "month", label: "This Month" }
                                    ].map((range) => (
                                        <button
                                            key={range.value}
                                            onClick={() => setDateRange(range.value)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                dateRange === range.value
                                                    ? "bg-orange-500 text-white shadow-md"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            <Calendar className="w-4 h-4" />
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Breakdown */}
                {Object.keys(stats.categoryBreakdown).length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(stats.categoryBreakdown).map(([category, amount]) => (
                                <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {getCategoryIcon(category)}
                                        <span className="font-medium text-gray-700">{category}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">
                                        {formatCurrency(amount as number)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Order #
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Product
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subtotal
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <ShoppingBag className="w-12 h-12 text-gray-300" />
                                                <p>No data found for the selected filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                
                                {filteredItems.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            #{item.order_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {item.menu_item?.name}
                                                </p>
                                                {item.table_number && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Table {item.table_number}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            x{item.quantity}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {formatCurrency(item.subtotal)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(item.order_date)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {item.customer_name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Summary */}
                {filteredItems.length > 0 && (
                    <div className="mt-6 flex justify-end">
                        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-600">Showing {filteredItems.length} items</span>
                                <div className="w-px h-6 bg-gray-300" />
                                <div>
                                    <span className="text-gray-600">Total Revenue: </span>
                                    <span className="text-xl font-bold text-green-600">
                                        {formatCurrency(stats.totalRevenue)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}