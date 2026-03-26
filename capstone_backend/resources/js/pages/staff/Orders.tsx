import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/StaffLayout";
import api from "@/services/api";

export default function Orders() {
    const [menu, setMenu] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const res = await api.get("/menu-items-available");
            setMenu(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const addToCart = (item: any) => {
        setCart((prev) => [...prev, item]);
    };

    const getTotal = () => {
        return cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
    };

    return (
        <StaffLayout>
            <div className="grid grid-cols-2 gap-6">

                {/* 🍔 MENU LIST */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Menu</h2>

                    <div className="grid grid-cols-2 gap-3">
                        {menu.map((item) => (
                            <div key={item.id} className="bg-white p-3 rounded shadow">
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-sm text-gray-500">₱{item.price}</p>

                                <button
                                    onClick={() => addToCart(item)}
                                    className="mt-2 w-full bg-orange-500 text-white p-1 rounded"
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🧾 CART */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Cart</h2>

                    <div className="bg-white p-4 rounded shadow space-y-2">
                        {cart.map((item, index) => (
                            <div key={index} className="flex justify-between">
                                <span>{item.name}</span>
                                <span>₱{item.price}</span>
                            </div>
                        ))}

                        <hr />

                        <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>₱{getTotal()}</span>
                        </div>

                        <button className="w-full bg-green-600 text-white p-2 rounded mt-3">
                            Checkout
                        </button>
                    </div>
                </div>

            </div>
        </StaffLayout>
    );
}