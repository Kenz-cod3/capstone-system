import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/CashierLayout";
import api from "@/services/api";

export default function RestaurantDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);

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
        }
    };

    // 📊 COMPUTATIONS
    const totalOrders = orders.length;

    const totalSales = orders.reduce(
        (sum, o) => sum + parseFloat(o.total_amount || 0),
        0
    );

    const pendingOrders = orders.filter(o => o.status === "pending").length;

    const lowStock = menu.filter(
        item => item.stock_quantity <= item.low_stock_threshold
    );

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">
                🍽️ Restaurant Dashboard
            </h1>

            {/* 📊 STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

                <div className="bg-white p-4 rounded-xl shadow">
                    <p className="text-sm text-gray-500">Orders Today</p>
                    <h2 className="text-xl font-bold">{totalOrders}</h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                    <p className="text-sm text-gray-500">Sales</p>
                    <h2 className="text-xl font-bold">₱{totalSales}</h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                    <p className="text-sm text-gray-500">Pending</p>
                    <h2 className="text-xl font-bold">{pendingOrders}</h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                    <p className="text-sm text-gray-500">Low Stock</p>
                    <h2 className="text-xl font-bold text-red-500">
                        {lowStock.length}
                    </h2>
                </div>

            </div>

            {/* ⚠️ LOW STOCK LIST */}
            <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="font-bold mb-3">⚠️ Low Stock Items</h2>

                {lowStock.length === 0 ? (
                    <p className="text-gray-400">All good 👍</p>
                ) : (
                    <div className="space-y-2">
                        {lowStock.map(item => (
                            <div key={item.id} className="flex justify-between">
                                <span>{item.name}</span>
                                <span className="text-red-500">
                                    {item.stock_quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}