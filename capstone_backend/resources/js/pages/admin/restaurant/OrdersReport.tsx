import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AdminOrdersReport() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    const totalRevenue = orders.reduce(
        (sum, o) => sum + Number(o.total_amount),
        0
    );

    if (loading) {
        return <p className="p-5">Loading report...</p>;
    }

    return (
        <div className="p-5 space-y-4">

            <h2 className="text-2xl font-bold">Restaurant Sales Report</h2>

            {/* 💰 TOTAL */}
            <div className="bg-green-500 text-white p-4 rounded-xl w-fit">
                <p>Total Revenue</p>
                <h2 className="text-xl font-bold">₱{totalRevenue}</h2>
            </div>

            {/* 📊 TABLE */}
            <div className="bg-white rounded-xl shadow overflow-auto">
                <table className="w-full text-sm">

                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left">Order #</th>
                            <th className="p-3 text-left">Products</th>
                            <th className="p-3 text-left">Total</th>
                            <th className="p-3 text-left">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center">
                                    No paid orders yet
                                </td>
                            </tr>
                        )}

                        {orders.map((order: any) => (
                            <tr key={order.id} className="border-t">

                                {/* ORDER ID */}
                                <td className="p-3">
                                    #{order.id}
                                </td>

                                {/* 🔥 PRODUCTS COLUMN */}
                                <td className="p-3">
                                    {order.items && order.items.length > 0 ? (
                                        order.items.map((item: any, i: number) => {
                                            const name = item.menuItem?.name || `Product #${item.menu_item_id}`;

                                            return (
                                                <div key={i}>
                                                    {name} x {item.quantity}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="text-gray-400">No items</span>
                                    )}
                                </td>

                                {/* TOTAL */}
                                <td className="p-3 font-semibold">
                                    ₱{order.total_amount}
                                </td>

                                {/* STATUS */}
                                <td className="p-3 capitalize text-green-600">
                                    {order.order_status}
                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>

        </div>
    );
}