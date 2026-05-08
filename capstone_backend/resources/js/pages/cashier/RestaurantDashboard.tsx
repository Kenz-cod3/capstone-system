import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/CashierLayout";
import api from "@/services/api";
import { 
    ShoppingBag, 
    TrendingUp, 
    Clock, 
    AlertTriangle, 
    Package, 
    DollarSign,
    Loader2,
    RefreshCw
} from "lucide-react";

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
                api.get("/menu-items")
            ]);

            setOrders(ordersRes.data);
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

    // 📊 COMPUTATIONS
    const totalOrders = orders.length;
    const totalSales = orders.reduce(
        (sum, o) => sum + parseFloat(o.total_amount || 0),
        0
    );
    const pendingOrders = orders.filter(o => o.order_status === "pending").length;
    const paidOrders = orders.filter(o => o.order_status === "paid").length;
    
    const lowStock = menu.filter(
        item => item.stock_quantity <= (item.low_stock_threshold || 5)
    );
    
    const outOfStock = menu.filter(item => item.stock_quantity === 0);
    
    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading dashboard...</p>
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
                                <TrendingUp className="w-8 h-8 text-emerald-500" />
                                Restaurant Dashboard
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Overview of your restaurant's performance
                            </p>
                        </div>
                        
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Orders Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {totalOrders}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            <span className="text-green-600">Paid: {paidOrders}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-yellow-600">Pending: {pendingOrders}</span>
                        </div>
                    </div>

                    {/* Total Sales Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Sales</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    ₱{totalSales.toLocaleString()}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">
                            From {totalOrders} completed orders
                        </div>
                    </div>

                    {/* Pending Orders Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Pending Orders</p>
                                <p className={`text-2xl font-bold ${pendingOrders > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                                    {pendingOrders}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                        {pendingOrders > 0 && (
                            <div className="mt-4 text-xs text-yellow-600">
                                ⚠️ Needs attention
                            </div>
                        )}
                    </div>

                    {/* Low Stock Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Low Stock Items</p>
                                <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {lowStock.length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                        {lowStock.length > 0 && (
                            <div className="mt-4 text-xs text-red-600">
                                {outOfStock.length} items out of stock
                            </div>
                        )}
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Low Stock Items Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-red-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Low Stock Items
                                    </h2>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {lowStock.length} items need attention
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {lowStock.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Package className="w-8 h-8 text-green-600" />
                                    </div>
                                    <p className="text-gray-500">All stock levels are healthy! 👍</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {lowStock.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Threshold: {item.low_stock_threshold || 5}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold ${
                                                    item.stock_quantity === 0 
                                                        ? 'text-red-600' 
                                                        : 'text-orange-600'
                                                }`}>
                                                    {item.stock_quantity} left
                                                </span>
                                                {item.stock_quantity === 0 && (
                                                    <p className="text-xs text-red-500 mt-1">Out of stock!</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Orders Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Recent Orders
                                    </h2>
                                </div>
                                <span className="text-xs text-gray-500">
                                    Last 5 orders
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {recentOrders.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">No orders yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentOrders.map(order => (
                                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-gray-900">
                                                        {order.order_number || `Order #${order.id}`}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        order.order_status === 'paid' 
                                                            ? 'bg-green-100 text-green-700'
                                                            : order.order_status === 'pending'
                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {order.order_status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(order.created_at || order.order_date).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-600">
                                                    ₱{parseFloat(order.total_amount || 0).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {order.items?.length || 0} items
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Stats Section */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 mb-1">Average Order Value</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    ₱{(totalOrders > 0 ? totalSales / totalOrders : 0).toLocaleString()}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 mb-1">Menu Items</p>
                                <p className="text-2xl font-bold text-purple-900">
                                    {menu.length}
                                </p>
                            </div>
                            <Package className="w-8 h-8 text-purple-500 opacity-50" />
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-emerald-600 mb-1">Completion Rate</p>
                                <p className="text-2xl font-bold text-emerald-900">
                                    {totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0}%
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}