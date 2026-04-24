import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/CashierLayout";
import api from "@/services/api";

export default function Product() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const res = await api.get("/orders");

            // 🔥 FILTER PENDING
            const pending = res.data.filter(
                (o: any) => o.order_status === "pending"
            );

            setOrders(pending);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // 🔥 MARK AS PAID
    const markAsPaid = async (id: number) => {
        try {
            await api.put(`/orders/${id}`, {
                order_status: "paid",
            });

            fetchOrders();
        } catch {
            alert("Failed to update order");
        }
    };

    return (
        <div>
            <div className="p-5 space-y-4">

                <h1 className="text-2xl font-bold">
                    📦 Pending Orders
                </h1>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-auto">
                        <table className="w-full text-sm">

                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left">Order #</th>
                                    <th className="p-3 text-left">Products</th>
                                    <th className="p-3 text-left">Total</th>
                                    <th className="p-3 text-left">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center">
                                            No pending orders
                                        </td>
                                    </tr>
                                )}

                                {orders.map((order: any) => (
                                    <tr key={order.id} className="border-t">

                                        {/* ORDER ID */}
                                        <td className="p-3 font-semibold">
                                            #{order.id}
                                        </td>

                                        {/* PRODUCTS */}
                                        <td className="p-3">
                                            {order.items.map((item: any, i: number) => (
                                                <div key={i}>
                                                    {item.menuItem?.name} x {item.quantity}
                                                </div>
                                            ))}
                                        </td>

                                        {/* TOTAL */}
                                        <td className="p-3 font-semibold">
                                            ₱{Number(order.total_amount).toFixed(2)}
                                        </td>

                                        {/* ACTION */}
                                        <td className="p-3">
                                            <button
                                                onClick={() => markAsPaid(order.id)}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                                            >
                                                Mark as Paid
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}