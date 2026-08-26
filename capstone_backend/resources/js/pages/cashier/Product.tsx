/**
 * Order Management — "Ticket Rail" design
 *
 * Requires (make sure these are installed in the project):
 *   npm install @tanstack/react-query antd dayjs
 *
 * Fonts used (add to your index.html <head>, or a global stylesheet):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
 *
 * Also import antd's stylesheet once at your app root:
 *   import "antd/dist/reset.css";
 */

import React, { useMemo, useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { DatePicker, Pagination, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
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
    Users,
    TrendingUp,
    Wallet,
    X,
} from "lucide-react";

const { RangePicker } = DatePicker;

// ---------------------------------------------------------------------------
// Small utility hook: debounce a fast-changing value
// ---------------------------------------------------------------------------
function useDebouncedValue<T>(value: T, delayMs = 400): T {
    const [debounced, setDebounced] = useState(value);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}

// ---------------------------------------------------------------------------
// Design tokens — "Ticket Rail": a POS / receipt-inspired palette.
// Dark mint replaces the ink/black accents.
// ---------------------------------------------------------------------------
const DARK_MINT = "#146C4B";

type OrderStatus = "pending" | "preparing" | "served" | "paid" | "cancelled";

type StatusMeta = {
    label: string;
    text: string;
    bg: string;
    dot: string;
};

const STATUS_META: Record<OrderStatus, StatusMeta> = {
    pending: {
        label: "Pending",
        text: "#8a5a0f",
        bg: "#fbf1de",
        dot: "#c1861f",
    },
    preparing: {
        label: "Preparing",
        text: "#2a4f78",
        bg: "#e7eef7",
        dot: "#3b6ea5",
    },
    served: {
        label: "Served",
        text: "#5e3c66",
        bg: "#f1e9f4",
        dot: "#845a8f",
    },
    paid: {
        label: "Paid",
        text: "#155c42",
        bg: "#e4f3ec",
        dot: "#1f7a5c",
    },
    cancelled: {
        label: "Cancelled",
        text: "#8a3226",
        bg: "#fbe9e6",
        dot: "#a1402f",
    },
};

type TabKey = "pending" | "sales" | "cancelled";

export default function Product() {
    const [activeTab, setActiveTab] = useState<TabKey>("sales");
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebouncedValue(searchInput, 400);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        null,
        null,
    ]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingId, setPendingId] = useState<number | null>(null);

    const queryClient = useQueryClient();

    // -----------------------------------------------------------------------
    // Data fetching — react-query owns loading / caching / pagination state
    // -----------------------------------------------------------------------
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["orders", currentPage],
        queryFn: async () => {
            const res = await api.get("/orders", {
                params: { page: currentPage, per_page: 10 },
            });
            return res.data;
        },
        placeholderData: keepPreviousData,
    });

    const orders: any[] = data?.data ?? [];
    const lastPage: number = data?.last_page ?? 1;
    const totalOrdersOnServer: number = data?.total ?? 0;

    // -----------------------------------------------------------------------
    // Status mutation
    // -----------------------------------------------------------------------
    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.put(`/orders/${id}`, { order_status: status }),
        onMutate: ({ id }) => setPendingId(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
        onError: () => {
            message.error("Failed to update order");
        },
        onSettled: () => setPendingId(null),
    });

    const updateStatus = (id: number, status: string) => {
        statusMutation.mutate({ id, status });
    };

    // -----------------------------------------------------------------------
    // Filtering (tab + date range + debounced search)
    // -----------------------------------------------------------------------
    const filterByDate = (order: any) => {
        const [start, end] = dateRange;
        if (!start || !end) return true;
        const d = dayjs(order.created_at);
        return (
            d.isAfter(start.startOf("day").subtract(1, "millisecond")) &&
            d.isBefore(end.endOf("day").add(1, "millisecond"))
        );
    };

    const filteredOrders = useMemo(() => {
        return orders
            .filter((order: any) => {
                if (activeTab === "pending") {
                    return ["pending", "preparing", "served"].includes(
                        order.order_status,
                    );
                }
                if (activeTab === "sales") return order.order_status === "paid";
                if (activeTab === "cancelled")
                    return order.order_status === "cancelled";
                return true;
            })
            .filter(filterByDate)
            .filter((order: any) => {
                const productNames = (order.items || [])
                    .map(
                        (item: any) =>
                            item.menu_item?.name || item.product_name || "",
                    )
                    .join(" ")
                    .toLowerCase();
                return productNames.includes(debouncedSearch.toLowerCase());
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, activeTab, dateRange, debouncedSearch]);

    // Flatten orders into per-product rows
    const productRows = useMemo(
        () =>
            filteredOrders.flatMap((order: any) =>
                (order.items || []).map((item: any) => {
                    const menuItem = item.menu_item || {};
                    return {
                        orderId: order.id,
                        orderStatus: order.order_status,
                        orderDate: order.created_at,
                        productName:
                            menuItem.name ||
                            item.product_name ||
                            "Deleted Product",
                        productCategory: menuItem.category || "Uncategorized",
                        quantity: Number(item.quantity || 0),
                        productPrice:
                            Number(item.price_at_time_of_order) ||
                            Number(menuItem.price) ||
                            0,
                        subtotal:
                            Number(item.subtotal) ||
                            Number(item.quantity || 0) *
                                Number(item.price_at_time_of_order || 0),
                    };
                }),
            ),
        [filteredOrders],
    );

    const totalSales = orders
        .filter((o: any) => o.order_status === "paid")
        .reduce(
            (sum: number, order: any) => sum + Number(order.total_amount),
            0,
        );

    const stats = useMemo(() => {
        const uniqueOrders = new Set(productRows.map((r) => r.orderId)).size;
        const totalRevenue = productRows.reduce(
            (sum, r) => sum + r.subtotal,
            0,
        );
        return {
            totalRevenue,
            totalItems: productRows.reduce((sum, r) => sum + r.quantity, 0),
            uniqueOrders,
            avgOrderValue: uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0,
            categoryBreakdown: productRows.reduce(
                (acc: Record<string, number>, r) => {
                    acc[r.productCategory] =
                        (acc[r.productCategory] || 0) + r.subtotal;
                    return acc;
                },
                {},
            ),
        };
    }, [productRows]);

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

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(amount);

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const TABS: {
        key: TabKey;
        label: string;
        icon: React.ReactNode;
    }[] = [
        {
            key: "sales",
            label: "Sales history",
            icon: <CheckCircle2 className="h-4 w-4" />,
        },
        {
            key: "pending",
            label: "Pending",
            icon: <Clock3 className="h-4 w-4" />,
        },
        {
            key: "cancelled",
            label: "Cancelled",
            icon: <Ban className="h-4 w-4" />,
        },
    ];

    const hasActiveFilters = Boolean(
        dateRange[0] || dateRange[1] || searchInput,
    );

    return (
        //bg-[#eef0ea]
        <div className="min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#a8822f] uppercase mb-1 font-['IBM_Plex_Mono']">
                            Front of house
                        </p>
                        <h1 className="font-['Space_Grotesk'] text-[28px] font-semibold text-[#1c2420] tracking-tight m-0">
                            Order management
                        </h1>
                        <p className="text-[13px] text-[#6b7268] mt-1">
                            Track tickets, sales, and cancellations across the
                            floor
                        </p>
                    </div>

                    {/* Register total — receipt-style summary */}
                    <div
                        className="relative rounded-lg px-6 py-4 min-w-[240px] shadow-[0_10px_30px_-12px_rgba(20,108,75,0.5)]"
                        style={{ backgroundColor: DARK_MINT }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-3.5 w-3.5 text-white/70" />
                            <span className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase font-['IBM_Plex_Mono']">
                                Register total
                            </span>
                        </div>
                        <p className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-white tabular-nums">
                            {formatCurrency(totalSales)}
                        </p>
                        <div
                            className="absolute -bottom-1.5 left-4 right-4 h-3 bg-[#eef0ea]"
                            style={{
                                maskImage:
                                    "radial-gradient(circle at 6px 0, transparent 5px, black 5.5px)",
                                maskSize: "12px 12px",
                                maskRepeat: "repeat-x",
                                WebkitMaskImage:
                                    "radial-gradient(circle at 6px 0, transparent 5px, black 5.5px)",
                                WebkitMaskSize: "12px 12px",
                                WebkitMaskRepeat: "repeat-x",
                            }}
                        />
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {[
                        {
                            label: "Revenue",
                            value: formatCurrency(stats.totalRevenue),
                            icon: <TrendingUp className="w-4 h-4" />,
                        },
                        {
                            label: "Items sold",
                            value: String(stats.totalItems),
                            icon: <ShoppingBag className="w-4 h-4" />,
                        },
                        {
                            label: "Orders",
                            value: String(stats.uniqueOrders),
                            icon: <Users className="w-4 h-4" />,
                        },
                        {
                            label: "Avg order",
                            value: formatCurrency(stats.avgOrderValue),
                            icon: <PhilippinePeso className="w-4 h-4" />,
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="bg-white rounded-lg p-4 border border-[#dde1d7]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10.5px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono']">
                                    {s.label}
                                </p>
                                <span className="text-[#8a8f83]">
                                    {s.icon}
                                </span>
                            </div>
                            <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420] tabular-nums">
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Category breakdown */}
                {Object.keys(stats.categoryBreakdown).length > 0 && (
                    <div className="bg-white rounded-lg p-4 mb-5 border border-[#dde1d7]">
                        <h3 className="text-[11px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono'] mb-2.5">
                            Revenue by category
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.categoryBreakdown).map(
                                ([category, amount]) => (
                                    <div
                                        key={category}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f6f2] rounded-md border border-[#e4e7dd]"
                                    >
                                        <span className="text-[#6b7268]">
                                            {getCategoryIcon(category)}
                                        </span>
                                        <span className="text-xs font-medium text-[#3c423a]">
                                            {category}
                                        </span>
                                        <span className="text-xs font-semibold text-[#1c2420] font-['IBM_Plex_Mono']">
                                            {formatCurrency(amount as number)}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

                {/* Tabs — segmented control */}
                <div className="inline-flex items-center gap-1 bg-white border border-[#dde1d7] rounded-lg p-1 mb-5">
                    {TABS.map((tab) => {
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setCurrentPage(1);
                                }}
                                style={
                                    active
                                        ? { backgroundColor: DARK_MINT }
                                        : undefined
                                }
                                className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
                                    active
                                        ? "text-white"
                                        : "text-[#5c6258] hover:bg-[#f5f6f2]"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar: search + date range */}
                <div className="bg-white rounded-lg border border-[#dde1d7] p-3 mb-5 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8ad9f]" />
                        <input
                            type="text"
                            placeholder="Search by product name..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full border border-[#e4e7dd] rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#146C4B]/30 focus:border-[#146C4B] bg-[#f9faf7]"
                        />
                    </div>

                    <RangePicker
                        value={dateRange}
                        onChange={(vals) => {
                            setDateRange(
                                (vals as [Dayjs | null, Dayjs | null]) || [
                                    null,
                                    null,
                                ],
                            );
                            setCurrentPage(1);
                        }}
                        allowEmpty={[true, true]}
                        className="!rounded-md !border-[#e4e7dd] !py-2"
                    />

                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setSearchInput("");
                                setDateRange([null, null]);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-[#8a3226] hover:bg-[#fbe9e6] transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border border-[#dde1d7] overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2
                                className="h-10 w-10 animate-spin"
                                style={{ color: DARK_MINT }}
                            />
                            <p className="mt-4 text-[#8a8f83] text-sm">
                                Loading orders...
                            </p>
                        </div>
                    ) : productRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <ShoppingBag className="h-14 w-14 text-[#dde1d7]" />
                            <p className="mt-4 text-lg font-semibold text-[#5c6258] font-['Space_Grotesk']">
                                No orders found
                            </p>
                            <p className="text-[#a8ad9f] text-sm mt-1">
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
                                <thead className="bg-[#f9faf7] border-b border-[#dde1d7]">
                                    <tr>
                                        {[
                                            "Order",
                                            "Product",
                                            "Qty",
                                            "Unit price",
                                            "Subtotal",
                                            "Status",
                                            "Time",
                                            "Actions",
                                        ].map((h, i) => (
                                            <th
                                                key={h}
                                                className={`px-4 py-2.5 text-[10px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono'] ${
                                                    i === 2
                                                        ? "text-center"
                                                        : i === 3 || i === 4
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
                                    {productRows.map((row, idx) => {
                                        const meta =
                                            STATUS_META[
                                                row.orderStatus as OrderStatus
                                            ] ?? STATUS_META.pending;
                                        const isRowMutating =
                                            pendingId === row.orderId &&
                                            statusMutation.isPending;
                                        return (
                                            <tr
                                                key={`${row.orderId}-${idx}`}
                                                className="border-b border-[#f0f1eb] hover:bg-[#f9faf7] transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-['IBM_Plex_Mono'] font-semibold text-[#3c423a] bg-[#f5f6f2] px-2 py-1 rounded text-xs">
                                                        #{row.orderId}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[#8a8f83]">
                                                            {getCategoryIcon(
                                                                row.productCategory,
                                                            )}
                                                        </span>
                                                        <span className="font-medium text-[#1c2420] text-sm">
                                                            {row.productName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-['IBM_Plex_Mono'] text-xs font-medium text-[#5c6258]">
                                                        x{row.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-['IBM_Plex_Mono'] text-sm text-[#5c6258] tabular-nums">
                                                    {formatCurrency(
                                                        row.productPrice,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-['IBM_Plex_Mono'] font-semibold text-sm text-[#1f7a5c] tabular-nums">
                                                    {formatCurrency(
                                                        row.subtotal,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                                                        style={{
                                                            backgroundColor:
                                                                meta.bg,
                                                            color: meta.text,
                                                        }}
                                                    >
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    meta.dot,
                                                            }}
                                                        />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[#8a8f83] font-['IBM_Plex_Mono']">
                                                    {formatDate(row.orderDate)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1.5">
                                                        {row.orderStatus !==
                                                            "paid" &&
                                                            row.orderStatus !==
                                                                "cancelled" && (
                                                                <button
                                                                    onClick={() =>
                                                                        updateStatus(
                                                                            row.orderId,
                                                                            "paid",
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isRowMutating
                                                                    }
                                                                    className="border border-[#1f7a5c] text-[#1f7a5c] hover:bg-[#1f7a5c] hover:text-white disabled:opacity-40 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1"
                                                                >
                                                                    {isRowMutating ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                    )}
                                                                    Paid
                                                                </button>
                                                            )}
                                                        {row.orderStatus !==
                                                            "cancelled" &&
                                                            row.orderStatus !==
                                                                "paid" && (
                                                                <button
                                                                    onClick={() =>
                                                                        updateStatus(
                                                                            row.orderId,
                                                                            "cancelled",
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isRowMutating
                                                                    }
                                                                    className="border border-[#a1402f] text-[#a1402f] hover:bg-[#a1402f] hover:text-white disabled:opacity-40 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1"
                                                                >
                                                                    <XCircle className="h-3 w-3" />
                                                                    Cancel
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-5">
                    <p className="text-xs text-[#8a8f83] font-['IBM_Plex_Mono']">
                        {totalOrdersOnServer} orders total
                        {isFetching && !isLoading ? " · refreshing…" : ""}
                    </p>
                    <Pagination
                        current={currentPage}
                        total={lastPage * 10}
                        pageSize={10}
                        onChange={(page) => setCurrentPage(page)}
                        showSizeChanger={false}
                    />
                </div>
            </div>
        </div>
    );
}