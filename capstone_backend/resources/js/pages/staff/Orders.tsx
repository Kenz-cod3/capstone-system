import React, { useEffect, useState } from "react";
import api from "@/services/api";

export default function Orders() {
    const [menu, setMenu] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [cash, setCash] = useState(0);
    const [orderId, setOrderId] = useState<number | null>(null);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        const res = await api.get("/menu-items-available");
        setMenu(res.data);
    };

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

    const increase = (id: number) => {
        setCart(cart.map(i =>
            i.id === id ? { ...i, quantity: i.quantity + 1 } : i
        ));
    };

    const decrease = (id: number) => {
        setCart(cart
            .map(i =>
                i.id === id ? { ...i, quantity: i.quantity - 1 } : i
            )
            .filter(i => i.quantity > 0)
        );
    };

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const vat = total * 0.12;
    const grandTotal = total;

    // 🔥 CREATE ORDER
    const createOrder = async () => {
        if (cart.length === 0) {
            alert("Cart is empty");
            return;
        }

        const res = await api.post("/orders", {
            items: cart.map(i => ({
                menu_item_id: i.id,
                quantity: i.quantity
            }))
        });

        setOrderId(res.data.data.id);
        alert("Order created!");
    };

    // 💰 PAY CASH
    const payCash = async () => {
        if (!orderId) {
            alert("Create order first");
            return;
        }

        try {
            const res = await api.post("/order-payments", {
                order_id: orderId,
                amount: cash
            });

            alert("✅ Change: ₱" + res.data.change);

            // RESET
            setCart([]);
            setCash(0);
            setOrderId(null);

        } catch (err: any) {
            alert(err.response?.data?.message);
        }
    };

    return (
        <div className="h-full flex gap-4">

            {/* 🍔 LEFT - PRODUCTS */}
            <div className="w-1/2 flex flex-col">

                <input
                    placeholder="Search product..."
                    className="mb-3 p-3 rounded-xl border"
                />

                <div className="grid grid-cols-3 gap-3 overflow-auto">
                    {menu.map(item => (
                        <div
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="bg-white p-4 rounded-xl shadow cursor-pointer hover:border-mint-400 border"
                        >
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-mint-600 font-bold">
                                ₱{item.price}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 🧾 RIGHT - CART */}
            <div className="w-1/2 flex flex-col bg-white rounded-2xl shadow">

                <div className="p-4 border-b font-semibold">
                    Orders
                </div>

                {/* ITEMS */}
                <div className="flex-1 overflow-auto p-3 space-y-2">
                    {cart.map(item => (
                        <div key={item.id}
                            className="flex justify-between items-center bg-mint-50 p-3 rounded-lg">

                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs">₱{item.price}</p>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => decrease(item.id)}>-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => increase(item.id)}>+</button>
                            </div>

                            <p>₱{item.price * item.quantity}</p>
                        </div>
                    ))}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t space-y-2 bg-mint-50">

                    <div className="flex justify-between text-sm">
                        <span>VAT</span>
                        <span>₱{vat.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₱{grandTotal.toFixed(2)}</span>
                    </div>

                    {/* 💵 CASH INPUT */}
                    <input
                        type="number"
                        placeholder="Enter cash"
                        value={cash}
                        onChange={(e) => setCash(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                    />

                    {/* BUTTONS */}
                    <button
                        onClick={createOrder}
                        className="w-full bg-blue-500 text-white py-2 rounded"
                    >
                        CREATE ORDER
                    </button>

                    <button
                        onClick={payCash}
                        className="w-full bg-mint-500 text-white py-3 rounded font-bold"
                    >
                        PAY CASH
                    </button>

                </div>
            </div>
        </div>
    );
}