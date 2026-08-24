/**
 * Restaurant Dashboard — "Ticket Rail" design (matches Order & Menu management)
 *
 * Fonts used (add to your index.html <head>, or a global stylesheet):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
 */

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import {
    ShoppingBag,
    TrendingUp,
    Clock3,
    TriangleAlert,
    Package,
    PhilippinePeso,
    Loader2,
    RefreshCcw,
    CheckCircle2,
    PackageX,
} from "lucide-react";

const DARK_MINT = "#146C4B";

const STATUS_META: Record<string, { text: string; bg: string; dot: string }> = {
    pending: { text: "#8a5a0f", bg: "#fbf1de", dot: "#c1861f" },
    preparing: { text: "#2a4f78", bg: "#e7eef7", dot: "#3b6ea5" },
    served: { text: "#5e3c66", bg: "#f1e9f4", dot: "#845a8f" },
    paid: { text: "#155c42", bg: "#e4f3ec", dot: "#1f7a5c" },
    cancelled: { text: "#8a3226", bg: "#fbe9e6", dot: "#a1402f" },
};

function statusMeta(status: string) {
    return STATUS_META[status] || STATUS_META.pending;
}

export default function RestaurantDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, menuRes] = await Promise.all([
                api.get("/orders"),
                api.get("/menu-items"),
            ]);

            setOrders(ordersRes.data.data);
            setMenu(menuRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    // COMPUTATIONS
    const totalOrders = orders.length;
    const totalSales = orders.reduce(
        (sum, o) => sum + parseFloat(o.total_amount || 0),
        0,
    );
    const pendingOrders = orders.filter((o) => o.order_status === "pending").length;
    const paidOrders = orders.filter((o) => o.order_status === "paid").length;

    const lowStock = menu.filter(
        (item) => item.stock_quantity <= (item.low_stock_threshold || 5),
    );
    const outOfStock = menu.filter((item) => item.stock_quantity === 0);

    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(amount);

    if (loading) {
        return (
            //bg-[#eef0ea]
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#a8822f]" />
                <p className="mt-4 text-[#8a8f83] text-sm">Loading dashboard...</p>
            </div>
        );
    }

    return (
        //bg-[#eef0ea]
        <div className="min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#a8822f] uppercase mb-1 font-['IBM_Plex_Mono']">
                            Overview
                        </p>
                        <h1 className="font-['Space_Grotesk'] text-[28px] font-semibold text-[#1c2420] tracking-tight m-0">
                            Restaurant dashboard
                        </h1>
                        <p className="text-[13px] text-[#6b7268] mt-1">
                            A snapshot of orders, sales, and stock right now
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#dde1d7] rounded-lg text-[#5c6258] text-[13px] font-medium hover:bg-[#f5f6f2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {/* Total Orders */}
                    <div className="bg-white rounded-lg p-4 border border-[#dde1d7]">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10.5px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono']">
                                Total orders
                            </p>
                            <ShoppingBag className="w-4 h-4 text-[#8a8f83]" />
                        </div>
                        <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420] tabular-nums mb-2">
                            {totalOrders}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-['IBM_Plex_Mono']">
                            <span className="text-[#1f7a5c]">Paid {paidOrders}</span>
                            <span className="text-[#dde1d7]">·</span>
                            <span className="text-[#c1861f]">Pending {pendingOrders}</span>
                        </div>
                    </div>

                    {/* Total Sales */}
                    <div className="bg-white rounded-lg p-4 border border-[#dde1d7]">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10.5px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono']">
                                Total sales
                            </p>
                            <PhilippinePeso className="w-4 h-4 text-[#8a8f83]" />
                        </div>
                        <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420] tabular-nums mb-2">
                            {formatCurrency(totalSales)}
                        </p>
                        <div className="text-[11px] text-[#8a8f83] font-['IBM_Plex_Mono']">
                            From {totalOrders} orders
                        </div>
                    </div>

                    {/* Pending Orders */}
                    <div className="bg-white rounded-lg p-4 border border-[#dde1d7]">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10.5px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono']">
                                Pending orders
                            </p>
                            <Clock3 className="w-4 h-4 text-[#8a8f83]" />
                        </div>
                        <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420] tabular-nums mb-2">
                            {pendingOrders}
                        </p>
                        {pendingOrders > 0 && (
                            <div className="text-[11px] text-[#8a5a0f] font-['IBM_Plex_Mono']">
                                Needs attention
                            </div>
                        )}
                    </div>

                    {/* Low Stock */}
                    <div className="bg-white rounded-lg p-4 border border-[#dde1d7]">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10.5px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono']">
                                Low stock items
                            </p>
                            <TriangleAlert className="w-4 h-4 text-[#8a8f83]" />
                        </div>
                        <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420] tabular-nums mb-2">
                            {lowStock.length}
                        </p>
                        {lowStock.length > 0 && (
                            <div className="text-[11px] text-[#8a3226] font-['IBM_Plex_Mono']">
                                {outOfStock.length} out of stock
                            </div>
                        )}
                    </div>
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Low Stock Items */}
                    <div className="bg-white rounded-lg border border-[#dde1d7] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#dde1d7] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#a1402f]" />
                                <h2 className="font-['Space_Grotesk'] text-[15px] font-semibold text-[#1c2420]">
                                    Low stock items
                                </h2>
                            </div>
                            <span className="text-[11px] text-[#8a8f83] font-['IBM_Plex_Mono']">
                                {lowStock.length} need attention
                            </span>
                        </div>

                        <div className="p-4">
                            {lowStock.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <CheckCircle2 className="h-10 w-10 text-[#1f7a5c] mb-3" />
                                    <p className="text-[#8a8f83] text-sm">
                                        All stock levels are healthy
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {lowStock.map((item) => {
                                        const zero = item.stock_quantity === 0;
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 bg-[#f9faf7] rounded-md"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-[#1c2420]">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[11px] text-[#8a8f83] mt-0.5 font-['IBM_Plex_Mono']">
                                                        threshold {item.low_stock_threshold || 5}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span
                                                        className="text-sm font-semibold font-['IBM_Plex_Mono']"
                                                        style={{ color: zero ? "#a1402f" : "#8a5a0f" }}
                                                    >
                                                        {item.stock_quantity} left
                                                    </span>
                                                    {zero && (
                                                        <p className="text-[11px] text-[#a1402f] mt-0.5 flex items-center justify-end gap-1">
                                                            <PackageX className="w-3 h-3" />
                                                            Out of stock
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white rounded-lg border border-[#dde1d7] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#dde1d7] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-[#8a8f83]" />
                                <h2 className="font-['Space_Grotesk'] text-[15px] font-semibold text-[#1c2420]">
                                    Recent orders
                                </h2>
                            </div>
                            <span className="text-[11px] text-[#8a8f83] font-['IBM_Plex_Mono']">
                                Last 5
                            </span>
                        </div>

                        <div className="p-4">
                            {recentOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <ShoppingBag className="h-10 w-10 text-[#dde1d7] mb-3" />
                                    <p className="text-[#8a8f83] text-sm">No orders yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentOrders.map((order) => {
                                        const meta = statusMeta(order.order_status)!;
                                        return (
                                            <div
                                                key={order.id}
                                                className="flex items-center justify-between p-3 bg-[#f9faf7] rounded-md hover:bg-[#f5f6f2] transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-['IBM_Plex_Mono'] font-semibold text-[#3c423a] bg-white border border-[#e4e7dd] px-2 py-0.5 rounded text-xs">
                                                            {order.order_number || `#${order.id}`}
                                                        </span>
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                                            style={{
                                                                backgroundColor: meta.bg,
                                                                color: meta.text,
                                                            }}
                                                        >
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full"
                                                                style={{ backgroundColor: meta.dot }}
                                                            />
                                                            {order.order_status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[#8a8f83] font-['IBM_Plex_Mono']">
                                                        {new Date(
                                                            order.created_at || order.order_date,
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-['IBM_Plex_Mono'] font-semibold text-sm text-[#1f7a5c] tabular-nums">
                                                        {formatCurrency(parseFloat(order.total_amount || 0))}
                                                    </p>
                                                    <p className="text-[11px] text-[#8a8f83] mt-0.5 font-['IBM_Plex_Mono']">
                                                        {order.items?.length || 0} items
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional stats */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                        className="rounded-lg p-5 flex items-center justify-between"
                        style={{ backgroundColor: DARK_MINT }}
                    >
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase font-['IBM_Plex_Mono'] mb-1">
                                Avg order value
                            </p>
                            <p className="font-['IBM_Plex_Mono'] text-xl font-semibold text-white tabular-nums">
                                {formatCurrency(totalOrders > 0 ? totalSales / totalOrders : 0)}
                            </p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-white/70" />
                    </div>

                    <div
                        className="rounded-lg p-5 flex items-center justify-between"
                        style={{ backgroundColor: DARK_MINT }}
                    >
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase font-['IBM_Plex_Mono'] mb-1">
                                Menu items
                            </p>
                            <p className="font-['IBM_Plex_Mono'] text-xl font-semibold text-white tabular-nums">
                                {menu.length}
                            </p>
                        </div>
                        <Package className="w-6 h-6 text-white/70" />
                    </div>

                    <div
                        className="rounded-lg p-5 flex items-center justify-between"
                        style={{ backgroundColor: DARK_MINT }}
                    >
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase font-['IBM_Plex_Mono'] mb-1">
                                Completion rate
                            </p>
                            <p className="font-['IBM_Plex_Mono'] text-xl font-semibold text-white tabular-nums">
                                {totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0}%
                            </p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-white/70" />
                    </div>
                </div>
            </div>
        </div>
    );
}