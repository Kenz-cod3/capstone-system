import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/StaffLayout";
import api from "@/services/api";

export default function Orders() {
    const [menu, setMenu] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        const res = await api.get("/menu-items-available");
        setMenu(res.data);
    };

    // ✅ ADD TO CART (NO DUPLICATES)
    const addToCart = (item: any) => {
        setCart((prev) => {
            const existing = prev.find(i => i.id === item.id);

            if (existing) {
                return prev.map(i =>
                    i.id === item.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }

            return [...prev, { ...item, quantity: 1 }];
        });
    };

    // ➕ INCREASE
    const increase = (id: number) => {
        setCart(cart.map(i =>
            i.id === id ? { ...i, quantity: i.quantity + 1 } : i
        ));
    };

    // ➖ DECREASE
    const decrease = (id: number) => {
        setCart(cart
            .map(i =>
                i.id === id ? { ...i, quantity: i.quantity - 1 } : i
            )
            .filter(i => i.quantity > 0)
        );
    };

    // 💰 TOTAL
    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    // 🧾 CHECKOUT
    const checkout = async () => {
        if (cart.length === 0) {
            alert("Cart is empty");
            return;
        }

        setLoading(true);

        try {
            await api.post("/orders", {
                items: cart.map(i => ({
                    menu_item_id: i.id,
                    quantity: i.quantity
                }))
            });

            alert("✅ Order created!");
            setCart([]);
            fetchMenu(); // refresh stock
        } catch (err: any) {
            console.log("FULL ERROR:", err.response?.data);

            alert(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Error"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 🍔 MENU */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Menu</h2>

                    <div className="grid grid-cols-2 gap-3">
                        {menu.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition">
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-sm text-gray-500">₱{item.price}</p>

                                <button
                                    onClick={() => addToCart(item)}
                                    className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white p-2 rounded"
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

                    <div className="bg-white p-4 rounded-xl shadow space-y-3">

                        {cart.length === 0 && (
                            <p className="text-gray-400">No items yet</p>
                        )}

                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">

                                <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-gray-500">
                                        ₱{item.price} x {item.quantity}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => decrease(item.id)}
                                        className="bg-gray-200 px-2 rounded"
                                    >
                                        -
                                    </button>

                                    <span>{item.quantity}</span>

                                    <button
                                        onClick={() => increase(item.id)}
                                        className="bg-gray-200 px-2 rounded"
                                    >
                                        +
                                    </button>
                                </div>

                            </div>
                        ))}

                        <hr />

                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>₱{total}</span>
                        </div>

                        <button
                            onClick={checkout}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded"
                        >
                            {loading ? "Processing..." : "Checkout"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}