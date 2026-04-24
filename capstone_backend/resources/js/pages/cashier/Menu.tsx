import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/CashierLayout";
import api from "@/services/api";

export default function Menu() {
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const res = await api.get("/menu-items-available");
        setItems(res.data);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">🍽️ Menu</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p>₱{item.price}</p>

                        <p className="text-xs text-gray-500">
                            Stock: {item.stock_quantity}
                        </p>

                        {item.stock_quantity <= item.low_stock_threshold && (
                            <p className="text-red-500 text-xs">
                                ⚠️ Low stock
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}