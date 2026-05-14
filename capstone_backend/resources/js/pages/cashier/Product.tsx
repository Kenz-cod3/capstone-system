import React, { useEffect, useState } from "react";
import api from "@/services/api";
import {
    ShoppingBag,
    Clock3,
    Ban,
    Search,
    CheckCircle2,
    XCircle,
    Loader2,
    PhilippinePeso,
    Coffee,
    Utensils,
    Cake,
    ChevronDown,
    Filter,
    Users,
    TrendingUp,
    Calendar,
    DollarSign,
} from "lucide-react";

export default function Product() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState("all");

    const fetchOrders = async () => {
        try {
            const res = await api.get("/orders");

            console.log(res.data);
            console.log(res.data[0].items);
            console.log(res.data[0].items[0]);

            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (id: number, status: string) => {
        try {
            setUpdatingId(id);
            await api.put(`/orders/${id}`, { order_status: status });
            fetchOrders();
        } catch {
            alert("Failed to update order");
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter by date range
    const filterByDate = (order: any) => {
        if (dateRange === "all") return true;

        const orderDate = new Date(order.created_at);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        switch (dateRange) {
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

    // FILTER ORDERS
    const filteredOrders = orders
        .filter((order: any) => {
            if (activeTab === "pending") {
                return (
                    order.order_status === "pending" ||
                    order.order_status === "preparing" ||
                    order.order_status === "served"
                );
            }
            if (activeTab === "sales") {
                return order.order_status === "paid";
            }
            if (activeTab === "cancelled") {
                return order.order_status === "cancelled";
            }
            return true;
        })
        .filter((order: any) => filterByDate(order))
        .filter((order: any) => {
            const productNames = order.items
                ?.map((item: any) =>
                    item.menu_item?.name ||
                    item.product_name ||
                    ""
                )
                .join(" ")
                .toLowerCase();
            return productNames?.includes(search.toLowerCase());
        });

    // Flatten orders into product rows
    const productRows = filteredOrders.flatMap((order: any) =>
        (order.items || []).map((item: any) => {
            const menuItem = item.menu_item || {};

            return {
                orderId: order.id,
                orderStatus: order.order_status,
                orderTotal: Number(order.total_amount),
                orderDate: order.created_at,

                productName:
                    menuItem.name ||
                    item.product_name ||
                    "Deleted Product",

                productCategory:
                    menuItem.category ||
                    "Uncategorized",

                quantity: Number(item.quantity || 0),

                productPrice:
                    Number(item.price_at_time_of_order) ||
                    Number(menuItem.price) ||
                    0,

                subtotal:
                    Number(item.subtotal) ||
                    (Number(item.quantity || 0) *
                        Number(item.price_at_time_of_order || 0)),
            };
        })
    );

    // TOTAL SALES
    const totalSales = orders
        .filter((o: any) => o.order_status === "paid")
        .reduce((sum: number, order: any) => sum + Number(order.total_amount), 0);

    // Calculate statistics
    const stats = {
        totalRevenue: productRows.reduce((sum, item) => sum + item.subtotal, 0),
        totalItems: productRows.reduce((sum, item) => sum + item.quantity, 0),
        uniqueOrders: new Set(productRows.map(item => item.orderId)).size,
        avgOrderValue: productRows.length > 0
            ? productRows.reduce((sum, item) => sum + item.subtotal, 0) / new Set(productRows.map(item => item.orderId)).size
            : 0,
        categoryBreakdown: productRows.reduce((acc: any, item) => {
            acc[item.productCategory] = (acc[item.productCategory] || 0) + item.subtotal;
            return acc;
        }, {})
    };

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "Drinks": return <Coffee className="w-3 h-3" />;
            case "Meals": return <Utensils className="w-3 h-3" />;
            case "Desserts": return <Cake className="w-3 h-3" />;
            default: return <ShoppingBag className="w-3 h-3" />;
        }
    };

    // STATUS DESIGN
    const getStatusClass = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-amber-100 text-amber-700 border border-amber-200";
            case "preparing":
                return "bg-blue-100 text-blue-700 border border-blue-200";
            case "served":
                return "bg-purple-100 text-purple-700 border border-purple-200";
            case "paid":
                return "bg-emerald-100 text-emerald-700 border border-emerald-200";
            case "cancelled":
                return "bg-red-100 text-red-700 border border-red-200";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="min-h-screen bg-[#f7f6f3]">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Page Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-[#1a1a18] tracking-tight m-0">
                            Order Management
                        </h1>
                        <p className="text-[13px] text-[#8a8878] font-normal tracking-wide mt-1">
                            Monitor restaurant orders, sales, and transactions
                        </p>
                    </div>

                    {/* Total Sales Card */}
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl px-6 py-4 shadow-lg min-w-[220px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-white/80 font-medium">Total Sales</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {formatCurrency(totalSales)}
                                </p>
                            </div>
                            <div className="bg-white/20 p-2 rounded-xl">
                                <PhilippinePeso className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8e6df]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wide">Revenue</p>
                                <p className="text-xl font-bold text-[#1a1a18]">{formatCurrency(stats.totalRevenue)}</p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8e6df]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wide">Items Sold</p>
                                <p className="text-xl font-bold text-[#1a1a18]">{stats.totalItems}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8e6df]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wide">Orders</p>
                                <p className="text-xl font-bold text-[#1a1a18]">{stats.uniqueOrders}</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8e6df]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wide">Avg Order</p>
                                <p className="text-xl font-bold text-[#1a1a18]">{formatCurrency(stats.avgOrderValue)}</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                {Object.keys(stats.categoryBreakdown).length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#e8e6df]">
                        <h3 className="text-sm font-semibold text-[#1a1a18] mb-3">Revenue by Category</h3>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(stats.categoryBreakdown).map(([category, amount]) => (
                                <div key={category} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                                    {getCategoryIcon(category)}
                                    <span className="text-xs font-medium text-gray-700">{category}</span>
                                    <span className="text-xs font-bold text-gray-900">{formatCurrency(amount as number)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TABS */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === "pending"
                            ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                            : "bg-white border border-[#e8e6df] text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        <Clock3 className="h-4 w-4" />
                        Pending Orders
                    </button>

                    <button
                        onClick={() => setActiveTab("sales")}
                        className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === "sales"
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                            : "bg-white border border-[#e8e6df] text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Sales History
                    </button>

                    <button
                        onClick={() => setActiveTab("cancelled")}
                        className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === "cancelled"
                            ? "bg-red-500 text-white shadow-md shadow-red-200"
                            : "bg-white border border-[#e8e6df] text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        <Ban className="h-4 w-4" />
                        Cancelled
                    </button>

                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-white border border-[#e8e6df] text-gray-600 hover:bg-gray-50 ml-auto"
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-[#e8e6df]">
                        <div className="flex flex-wrap gap-6">
                            <div>
                                <label className="block text-[11px] font-semibold text-[#8a8878] uppercase tracking-wide mb-2">
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
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateRange === range.value
                                                ? "bg-emerald-500 text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-white rounded-xl border border-[#e8e6df] shadow-sm p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by product name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border-0 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                        />
                    </div>
                </div>

                {/* Data Table - Per Product Row */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8e6df] overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                            <p className="mt-4 text-gray-500">Loading orders...</p>
                        </div>
                    ) : productRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <ShoppingBag className="h-16 w-16 text-gray-300" />
                            <p className="mt-4 text-xl font-semibold text-gray-500">No Orders Found</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {activeTab === "pending"
                                    ? "All orders are completed"
                                    : activeTab === "sales"
                                        ? "No completed sales yet"
                                        : "No cancelled orders"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#f8f7f4] border-b border-[#e8e6df]">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Order #
                                        </th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Product
                                        </th>
                                        <th className="px-5 py-3 text-center text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Qty
                                        </th>
                                        <th className="px-5 py-3 text-right text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Unit Price
                                        </th>
                                        <th className="px-5 py-3 text-right text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Subtotal
                                        </th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Status
                                        </th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Date
                                        </th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-bold text-[#8a8878] uppercase tracking-wide">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productRows.map((row, idx) => (
                                        <tr
                                            key={`${row.orderId}-${idx}`}
                                            className={`border-b border-[#f2f0eb] hover:bg-[#f9f8f5] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-white'
                                                }`}
                                        >
                                            <td className="px-5 py-3">
                                                <span className="font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md text-xs">
                                                    #{row.orderId}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getCategoryIcon(row.productCategory)}
                                                    <span className="font-medium text-gray-800 text-sm">
                                                        {row.productName}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3 text-center">
                                                <span className="inline-flex items-center justify-center bg-gray-100 px-2 py-1 rounded-md text-xs font-medium text-gray-700 min-w-[40px]">
                                                    x{row.quantity}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3 text-right text-gray-600 text-sm">
                                                {formatCurrency(row.productPrice)}
                                            </td>

                                            <td className="px-5 py-3 text-right font-semibold text-emerald-600 text-sm">
                                                {formatCurrency(row.subtotal)}
                                            </td>

                                            <td className="px-5 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusClass(row.orderStatus)}`}>
                                                    {row.orderStatus}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3 text-xs text-gray-500">
                                                {formatDate(row.orderDate)}
                                            </td>

                                            <td className="px-5 py-3">
                                                <div className="flex gap-2">
                                                    {row.orderStatus !== "paid" && row.orderStatus !== "cancelled" && (
                                                        <button
                                                            onClick={() => updateStatus(row.orderId, "paid")}
                                                            disabled={updatingId === row.orderId}
                                                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                                                        >
                                                            {updatingId === row.orderId ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            )}
                                                            Paid
                                                        </button>
                                                    )}
                                                    {row.orderStatus !== "cancelled" && row.orderStatus !== "paid" && (
                                                        <button
                                                            onClick={() => updateStatus(row.orderId, "cancelled")}
                                                            disabled={updatingId === row.orderId}
                                                            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Summary */}
                {!loading && productRows.length > 0 && (
                    <div className="mt-6 flex justify-end">
                        <div className="bg-white rounded-lg shadow-sm p-4 border border-[#e8e6df]">
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500">
                                    Showing <span className="font-semibold text-gray-700">{productRows.length}</span> items
                                </span>
                                <div className="w-px h-5 bg-gray-300" />
                                <div>
                                    <span className="text-xs text-gray-500">Total Revenue: </span>
                                    <span className="text-base font-bold text-emerald-600">
                                        {formatCurrency(stats.totalRevenue)}
                                    </span>
                                </div>
                                <div className="w-px h-5 bg-gray-300" />
                                <div>
                                    <span className="text-xs text-gray-500">Orders: </span>
                                    <span className="text-base font-bold text-gray-700">
                                        {stats.uniqueOrders}
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