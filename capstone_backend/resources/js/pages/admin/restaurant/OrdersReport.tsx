import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AdminOrdersReport() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");

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

    // 🔥 FILTERED ITEMS (FLAT)
    const filteredItems = orders.flatMap((order: any) =>
        order.items
            .filter((item: any) => {
                if (filter === "All") return true;
                return item.menu_item?.category === filter;
            })
            .map((item: any) => ({
                ...item,
                order_id: order.id,
                status: order.order_status
            }))
    );

    // 💰 TOTAL BASED ON FILTER
    const totalRevenue = filteredItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
    );

    if (loading) {
        return <p className="p-5">Loading report...</p>;
    }

    return (
        <div className="p-5 space-y-4">

            <h2 className="text-2xl font-bold">Restaurant Sales Report</h2>

            {/* 🔥 FILTER BUTTONS */}
            <div className="flex gap-2">
                {["All", "Drinks", "Meals", "Desserts"].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded ${
                            filter === cat
                                ? "bg-orange-500 text-white"
                                : "bg-gray-200"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* 💰 TOTAL */}
            <div className="bg-green-500 text-white p-4 rounded-xl w-fit">
                <p>Total Revenue ({filter})</p>
                <h2 className="text-xl font-bold">
                    ₱{totalRevenue.toFixed(2)}
                </h2>
            </div>

            {/* 📊 TABLE */}
            <div className="bg-white rounded-xl shadow overflow-auto">
                <table className="w-full text-sm">

                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left">Order #</th>
                            <th className="p-3 text-left">Product</th>
                            <th className="p-3 text-left">Subtotal</th>
                            <th className="p-3 text-left">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center">
                                    No data found
                                </td>
                            </tr>
                        )}

                        {filteredItems.map((item: any, i: number) => (
                            <tr key={i} className="border-t">

                                {/* ORDER ID */}
                                <td className="p-3">
                                    #{item.order_id}
                                </td>

                                {/* PRODUCT */}
                                <td className="p-3">
                                    {item.menu_item?.name} x {item.quantity}
                                </td>

                                {/* SUBTOTAL */}
                                <td className="p-3 font-semibold">
                                    ₱{Number(item.subtotal).toFixed(2)}
                                </td>

                                {/* STATUS */}
                                <td className="p-3 text-green-600 capitalize">
                                    {item.status}
                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>

        </div>
    );
}