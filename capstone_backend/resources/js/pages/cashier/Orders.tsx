import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Search, Plus, Minus, X } from "lucide-react";

export default function Orders() {
    const [menu, setMenu] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [cash, setCash] = useState(0);
    const [orderId, setOrderId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        const res = await api.get("/menu-items-available");
        setMenu(res.data);
    };

    const isItemAvailable = (item: any) => {
        return item.stock_quantity > 0 && !item.is_disabled;
    };

    const addToCart = (item: any) => {
        if (!isItemAvailable(item)) {
            if (item.stock_quantity <= 0) {
                alert(`${item.name} is out of stock!`);
            } else if (item.is_disabled) {
                alert(`${item.name} is currently unavailable!`);
            }
            return;
        }

        setCart((prev) => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.quantity + 1 > item.stock_quantity) {
                    alert(`Only ${item.stock_quantity} ${item.name}(s) available!`);
                    return prev;
                }
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
        const cartItem = cart.find(i => i.id === id);
        const menuItem = menu.find(m => m.id === id);
        
        if (cartItem && menuItem && cartItem.quantity + 1 > menuItem.stock_quantity) {
            alert(`Only ${menuItem.stock_quantity} ${menuItem.name}(s) available!`);
            return;
        }
        
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

    const removeFromCart = (id: number) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const tax = total * 0.05;
    const grandTotal = total + tax;

    const createOrder = async () => {
        if (cart.length === 0) {
            alert("Please add items to cart first");
            return;
        }

        try {
            const payload = {
                items: cart.map((item: any) => ({
                    menu_item_id: item.id,
                    quantity: item.quantity
                }))
            };

            console.log("SENDING ORDER:", payload);

            const res = await api.post("/orders", payload);
            setOrderId(res.data.data.id);
            alert("Order created!");

        } catch (error: any) {
            console.error("ORDER ERROR:", error.response?.data);
            alert(error.response?.data?.message || "Failed to create order");
        }
    };

    const payCash = async () => {
        if (!orderId) {
            alert("Create order first");
            return;
        }

        if (cash < grandTotal) {
            alert(`Insufficient cash. Need ₱${grandTotal.toFixed(2)}`);
            return;
        }

        try {
            const res = await api.post("/order-payments", {
                order_id: orderId,
                amount: cash
            });

            alert(`✅ Change: ₱${res.data.change}`);

            setCart([]);
            setCash(0);
            setOrderId(null);

        } catch (err: any) {
            alert(err.response?.data?.message);
        }
    };

    const filteredMenu = menu.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStockStatusText = (item: any) => {
        if (item.is_disabled) return "Unavailable";
        if (item.stock_quantity <= 0) return "Out of Stock";
        if (item.stock_quantity <= (item.low_stock_threshold || 5)) {
            return `Only ${item.stock_quantity} left`;
        }
        return null;
    };

    return (
        <div className="h-full flex gap-4">
            {/* LEFT - MENU & PRODUCTS */}
            <div className="w-7/12 flex flex-col">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        All {menu.length} items
                    </h2>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-2 gap-3 overflow-auto pr-2">
                    {filteredMenu.map(item => {
                        const available = isItemAvailable(item);
                        const stockStatus = getStockStatusText(item);
                        
                        return (
                            <div
                                key={item.id}
                                className={`bg-white p-4 rounded-xl border shadow-sm transition ${
                                    available 
                                        ? "border-gray-100 hover:shadow-md hover:border-emerald-200 cursor-pointer" 
                                        : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h3 className={`font-semibold text-sm leading-tight ${
                                            available ? "text-gray-800" : "text-gray-500"
                                        }`}>
                                            {item.name}
                                        </h3>
                                        {item.category && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {item.category}
                                            </p>
                                        )}
                                    </div>
                                    {item.is_veg !== undefined && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            item.is_veg 
                                                ? "bg-green-100 text-green-700" 
                                                : "bg-red-100 text-red-700"
                                        }`}>
                                            {item.is_veg ? "Veg" : "Non Veg"}
                                        </span>
                                    )}
                                </div>
                                
                                {stockStatus && (
                                    <div className="mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            stockStatus === "Unavailable" 
                                                ? "bg-gray-200 text-gray-600"
                                                : stockStatus === "Out of Stock"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-700"
                                        }`}>
                                            {stockStatus}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-3">
                                    <span className={`text-lg font-bold ${
                                        available ? "text-emerald-600" : "text-gray-400"
                                    }`}>
                                        ₱{item.price}
                                    </span>
                                    <button
                                        onClick={() => addToCart(item)}
                                        disabled={!available}
                                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                                            available 
                                                ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                                : "bg-gray-300 cursor-not-allowed text-gray-500"
                                        }`}
                                    >
                                        Add to Dish
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT - CART & ORDER SUMMARY */}
            <div className="w-5/12 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100">
                {/* Cart Header */}
                <div className="p-4 border-b">
                    <h2 className="font-bold text-gray-800">Current Order</h2>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                            No items in cart
                        </div>
                    ) : (
                        cart.map(item => {
                            const menuItem = menu.find(m => m.id === item.id);
                            const isStillAvailable = menuItem && isItemAvailable(menuItem);
                            
                            return (
                                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-gray-800 text-sm">
                                                {item.name}
                                            </h4>
                                            {item.is_veg !== undefined && (
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                    item.is_veg 
                                                        ? "bg-green-100 text-green-700" 
                                                        : "bg-red-100 text-red-700"
                                                }`}>
                                                    {item.is_veg ? "Veg" : "Non Veg"}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-emerald-600 font-semibold text-sm mt-0.5">
                                            ₱{item.price}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => decrease(item.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-6 text-center font-medium">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => increase(item.id)}
                                            disabled={!isStillAvailable}
                                            className={`w-7 h-7 flex items-center justify-center rounded-full border ${
                                                isStillAvailable 
                                                    ? "border-gray-300 hover:bg-gray-100" 
                                                    : "border-gray-200 cursor-not-allowed opacity-50"
                                            }`}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="ml-1 text-gray-400 hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Order Summary */}
                <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Sub Total</span>
                            <span>₱{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Tax 5%</span>
                            <span>₱{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t">
                            <span>Total Amount</span>
                            <span className="text-emerald-600">₱{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            Cash
                        </button>
                        <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            Card
                        </button>
                        <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            QR Code
                        </button>
                    </div>

                    {/* Cash Input */}
                    <input
                        type="number"
                        placeholder="Enter cash amount"
                        value={cash || ""}
                        onChange={(e) => setCash(Number(e.target.value))}
                        className="w-full p-2.5 border border-gray-300 rounded-lg mb-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={createOrder}
                            disabled={cart.length === 0}
                            className={`w-full py-2.5 rounded-lg font-medium transition ${
                                cart.length === 0
                                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        >
                            Create Order
                        </button>
                        <button
                            onClick={payCash}
                            disabled={!orderId || cash < grandTotal}
                            className={`w-full py-3 rounded-lg font-bold transition ${
                                !orderId || cash < grandTotal
                                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                        >
                            Place Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}