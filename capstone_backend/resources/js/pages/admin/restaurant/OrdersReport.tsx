/**
 * Orders Report — Orange theme (matches AdminMenu & OrdersTransactionReport)
 *
 * Lists all paid orders with:
 *   - Order number
 *   - Product details
 *   - Quantity
 *   - Subtotal
 *   - Status
 *   - Date
 *   - Customer
 *
 * Export format: XLSX — ginagamit ang shared utility sa
 * `src/utils/restaurantExport.ts` para hindi mag-duplicate ng code.
 *
 * May SERVER-SIDE PAGINATION na (per_page + current_page).
 * May FOOTER para sa pagination (Show Total + Page Size + Prev/Next).
 */

import { useEffect, useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Pagination } from "antd";
import api from "@/services/api";
import { exportOrdersReport } from "./utils/restaurantExport";
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
    Users,
    Search,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — ORANGE THEME
// ---------------------------------------------------------------------------
const ORANGE = "#f97316";
const ORANGE_HOVER = "#ea580c";

export default function AdminOrdersReport() {
    const [filter, setFilter] = useState("All");
    const [dateRange, setDateRange] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    // Pagination state — MATCH SA BACKEND DEFAULT (10)
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Search state (client-side sa loob ng page)
    const [searchInput, setSearchInput] = useState("");

    // -----------------------------------------------------------------------
    // Fetch orders — server-side pagination
    // -----------------------------------------------------------------------
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["orders", currentPage, pageSize],
        queryFn: async () => {
            const res = await api.get("/orders", {
                params: {
                    page: currentPage,
                    per_page: pageSize,
                },
            });
            return res.data;
        },
        placeholderData: keepPreviousData,
        refetchInterval: 10000,
        refetchIntervalInBackground: false,
    });

    // -----------------------------------------------------------------------
    // Kunin lang ang PAID orders
    // -----------------------------------------------------------------------
    const orders: any[] = useMemo(() => {
        const rows = data?.data ?? [];
        return rows.filter((o: any) => o.order_status === "paid");
    }, [data]);

    const totalFromServer: number = data?.total ?? 0;
    const lastPage: number = data?.last_page ?? 1;

    // Filter by date range
    const filterByDate = (order: any) => {
        if (dateRange === "all") return true;

        const orderDate = new Date(order.created_at);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
        );

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

    // Filtered items with date + category + search
    const filteredItems = useMemo(() => {
        return orders
            .filter((order) => filterByDate(order))
            .flatMap((order: any) =>
                (order.items ?? [])
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
                        table_number: order.table_number,
                    })),
            )
            .filter((item: any) => {
                if (!searchInput.trim()) return true;
                const needle = searchInput.toLowerCase();
                const haystack = [
                    item.menu_item?.name ?? "",
                    item.menu_item?.category ?? "",
                    `#${item.order_id}`,
                    String(item.order_id),
                ]
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(needle);
            });
    }, [orders, filter, dateRange, searchInput]);

    // Calculate statistics (base sa filtered items sa current page)
    const stats = useMemo(() => {
        const totalRevenue = filteredItems.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0,
        );

        const totalItems = filteredItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
        );

        const uniqueOrders = new Set(
            filteredItems.map((item) => item.order_id),
        ).size;

        const avgOrderValue =
            uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0;

        const categoryBreakdown = filteredItems.reduce(
            (acc: any, item) => {
                const category = item.menu_item?.category || "Other";
                acc[category] = (acc[category] || 0) + Number(item.subtotal);
                return acc;
            },
            {},
        );

        return {
            totalRevenue,
            totalItems,
            uniqueOrders,
            avgOrderValue,
            categoryBreakdown,
        };
    }, [filteredItems]);

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "Drinks":
                return <Coffee className="w-3.5 h-3.5" />;
            case "Meals":
                return <Utensils className="w-3.5 h-3.5" />;
            case "Desserts":
                return <Cake className="w-3.5 h-3.5" />;
            default:
                return <ShoppingBag className="w-3.5 h-3.5" />;
        }
    };

    // -----------------------------------------------------------------------
    // EXPORT TO XLSX — gumagamit ng shared utility
    //
    // NOTE: Ang export ay base sa filteredItems ng current page.
    // Kung gusto mo ng full export, kailangan mo ng separate API call
    // na kumukuha ng lahat ng orders (walang pagination).
    // -----------------------------------------------------------------------
    const handleExport = () => {
        exportOrdersReport(filteredItems, { filter, dateRange });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Format date
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Reset page kapag nagbago ang filters
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, dateRange, searchInput]);

    // -----------------------------------------------------------------------
    // Compute start/end item number para sa footer
    // -----------------------------------------------------------------------
    const startItem =
        totalFromServer === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalFromServer);

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2
                        className="w-10 h-10 animate-spin mx-auto mb-4"
                        style={{ color: ORANGE }}
                    />
                    <p className="text-gray-400 text-sm">
                        Loading sales report...
                    </p>
                </div>
            </div>
        );
    }

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
                            Sales Report
                        </h1>
                        <p className="text-[13px] text-gray-500 mt-1">
                            Track your restaurant's performance and revenue
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {/* EXPORT TO XLSX BUTTON */}
                        <button
                            onClick={handleExport}
                            disabled={filteredItems.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: ORANGE }}
                            onMouseEnter={(e) => {
                                if (filteredItems.length > 0)
                                    e.currentTarget.style.backgroundColor =
                                        ORANGE_HOVER;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    ORANGE;
                            }}
                            title="Export to Excel (XLSX)"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export to Excel
                        </button>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-[13px] font-medium shadow-sm"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filters
                            <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                    showFilters ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {[
                        {
                            label: "Total Revenue",
                            value: formatCurrency(stats.totalRevenue),
                            sub: "From paid orders",
                            icon: (
                                <DollarSign className="w-4 h-4 text-green-600" />
                            ),
                        },
                        {
                            label: "Items Sold",
                            value: String(stats.totalItems),
                            sub: "Total quantity",
                            icon: (
                                <ShoppingBag className="w-4 h-4 text-blue-600" />
                            ),
                        },
                        {
                            label: "Orders",
                            value: String(stats.uniqueOrders),
                            sub: "Unique orders",
                            icon: (
                                <ShoppingBag className="w-4 h-4 text-purple-600" />
                            ),
                        },
                        {
                            label: "Avg Order Value",
                            value: formatCurrency(stats.avgOrderValue),
                            sub: "Per order",
                            icon: (
                                <Users className="w-4 h-4 text-orange-600" />
                            ),
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
                                <span>{s.icon}</span>
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

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-lg border border-gray-100 p-4 mb-5 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Category Filter */}
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-2">
                                    Category
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        "All",
                                        "Drinks",
                                        "Meals",
                                        "Desserts",
                                    ].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setFilter(cat)}
                                            style={
                                                filter === cat
                                                    ? {
                                                          backgroundColor:
                                                              ORANGE,
                                                      }
                                                    : undefined
                                            }
                                            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                                                filter === cat
                                                    ? "text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            {cat !== "All" &&
                                                getCategoryIcon(cat)}
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-2">
                                    Date Range
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        {
                                            value: "all",
                                            label: "All Time",
                                        },
                                        { value: "today", label: "Today" },
                                        {
                                            value: "week",
                                            label: "This Week",
                                        },
                                        {
                                            value: "month",
                                            label: "This Month",
                                        },
                                    ].map((range) => (
                                        <button
                                            key={range.value}
                                            onClick={() =>
                                                setDateRange(range.value)
                                            }
                                            style={
                                                dateRange === range.value
                                                    ? {
                                                          backgroundColor:
                                                              ORANGE,
                                                      }
                                                    : undefined
                                            }
                                            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                                                dateRange === range.value
                                                    ? "text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            <Calendar className="w-3 h-3" />
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-white rounded-lg border border-gray-100 p-3 mb-5 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by product name or order #..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-gray-50"
                        />
                    </div>
                </div>

                {/* Category Breakdown */}
                {Object.keys(stats.categoryBreakdown).length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-100 p-4 mb-5 shadow-sm">
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-3">
                            Revenue by category (current page)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(stats.categoryBreakdown).map(
                                ([category, amount]) => (
                                    <div
                                        key={category}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                    >
                                        <div className="flex items-center gap-2">
                                            {getCategoryIcon(category)}
                                            <span className="text-xs font-medium text-gray-700">
                                                {category}
                                            </span>
                                        </div>
                                        <span className="font-['IBM_Plex_Mono'] text-xs font-semibold text-gray-900">
                                            {formatCurrency(
                                                amount as number,
                                            )}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {[
                                        "Order #",
                                        "Product",
                                        "Qty",
                                        "Subtotal",
                                        "Status",
                                        "Date",
                                        "Customer",
                                    ].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-['IBM_Plex_Mono'] ${
                                                i === 2
                                                    ? "text-center"
                                                    : i === 3
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
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <ShoppingBag className="w-12 h-12 text-gray-300" />
                                                <p className="text-gray-400 text-sm">
                                                    No data found for the
                                                    selected filters
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {filteredItems.map((item: any, i: number) => (
                                    <tr
                                        key={i}
                                        className="border-b border-gray-50 hover:bg-orange-50/40 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-['IBM_Plex_Mono'] font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md text-xs">
                                                #{item.order_id}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-medium text-gray-900">
                                                    {item.menu_item?.name}
                                                </p>
                                                {item.table_number && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Table{" "}
                                                        {item.table_number}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-['IBM_Plex_Mono'] text-xs font-medium text-gray-600">
                                                x{item.quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-['IBM_Plex_Mono'] font-semibold text-xs text-emerald-700 tabular-nums">
                                            {formatCurrency(item.subtotal)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-green-100 text-green-800 capitalize">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 font-['IBM_Plex_Mono']">
                                            {formatDate(item.order_date)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {item.customer_name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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
                                    orders
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

                {/* Footer Summary — Total Revenue */}
                {filteredItems.length > 0 && (
                    <div className="mt-5 flex justify-end">
                        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500 font-['IBM_Plex_Mono']">
                                    {filteredItems.length} items (current page)
                                </span>
                                <div className="w-px h-5 bg-gray-200" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-['IBM_Plex_Mono']">
                                        Total:
                                    </span>
                                    <span className="text-sm font-['IBM_Plex_Mono'] font-semibold text-emerald-700 tabular-nums">
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