import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Search, Plus, Minus, X, Coffee, Utensils, Cake, Filter, Smartphone, Wallet, Loader2, Divide } from "lucide-react";
import { toast } from "sonner";

export default function Orders() {
    const [menu, setMenu] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [cashAmount, setCashAmount] = useState<number | string>("");
    const [gcashAmount, setGcashAmount] = useState<number | string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "split">("cash");
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const res = await api.get("/menu-items-available");
            setMenu(res.data);
        } catch (error) {
            toast.error("Failed to load menu");
        }
    };

    const isItemAvailable = (item: any) => {
        return item.stock_quantity > 0 && !item.is_disabled;
    };

    const addToCart = (item: any) => {
        if (!isItemAvailable(item)) {
            if (item.stock_quantity <= 0) {
                toast.error(`${item.name} is out of stock!`);
            } else if (item.is_disabled) {
                toast.error(`${item.name} is currently unavailable!`);
            }
            return;
        }

        setCart((prev) => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.quantity + 1 > item.stock_quantity) {
                    toast.error(`Only ${item.stock_quantity} ${item.name}(s) available!`);
                    return prev;
                }
                toast.success(`Added another ${item.name} to cart`);
                return prev.map(i =>
                    i.id === item.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            toast.success(`${item.name} added to cart`);
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const increase = (id: number) => {
        const cartItem = cart.find(i => i.id === id);
        const menuItem = menu.find(m => m.id === id);
        
        if (cartItem && menuItem && cartItem.quantity + 1 > menuItem.stock_quantity) {
            toast.error(`Only ${menuItem.stock_quantity} ${menuItem.name}(s) available!`);
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
        const item = cart.find(i => i.id === id);
        setCart(cart.filter(i => i.id !== id));
        toast.info(`${item?.name} removed from cart`);
    };

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const grandTotal = total;

    // Parse amounts for split payment
    const parsedCash = typeof cashAmount === "string" ? parseFloat(cashAmount) : cashAmount;
    const parsedGcash = typeof gcashAmount === "string" ? parseFloat(gcashAmount) : gcashAmount;
    const totalPayment = (isNaN(parsedCash) ? 0 : parsedCash) + (isNaN(parsedGcash) ? 0 : parsedGcash);
    const remainingAmount = grandTotal - totalPayment;
    const isExactOrOverpaid = totalPayment >= grandTotal;

    // Process payment and create order in one go
    const processOrder = async () => {
        if (cart.length === 0) {
            toast.error("Please add items to cart first");
            return;
        }

        let amount = 0;
        let paymentData = [];

        if (paymentMethod === "split") {
            if (totalPayment < grandTotal) {
                toast.error(`Total payment (₱${totalPayment.toFixed(2)}) is insufficient. Need ₱${remainingAmount.toFixed(2)} more`);
                return;
            }
            amount = totalPayment;
        } else {
            const singleAmount = paymentMethod === "cash" ? 
                (typeof cashAmount === "string" ? parseFloat(cashAmount) : cashAmount) :
                (typeof gcashAmount === "string" ? parseFloat(gcashAmount) : gcashAmount);
            
            if (isNaN(singleAmount) || singleAmount < grandTotal) {
                toast.error(`Insufficient ${paymentMethod === "cash" ? "cash" : "GCash balance"}. Need ₱${grandTotal.toFixed(2)}`);
                return;
            }
            amount = singleAmount;
        }

        setIsProcessingOrder(true);
        const loadingToast = toast.loading("Processing order...");
        
        try {
            // Step 1: Create the order
            const orderPayload = {
                items: cart.map((item: any) => ({
                    menu_item_id: item.id,
                    quantity: item.quantity
                }))
            };

            const orderResponse = await api.post("/orders", orderPayload);
            const newOrderId = orderResponse.data.data.id;
            
            // Step 2: Process payment(s)
            if (paymentMethod === "split") {
                // Process split payments
                const paymentPromises = [];
                
                if (parsedCash > 0) {
                    paymentPromises.push(
                        api.post("/order-payments", {
                            order_id: newOrderId,
                            amount: parsedCash,
                            payment_method: "cash"
                        })
                    );
                }
                
                if (parsedGcash > 0) {
                    paymentPromises.push(
                        api.post("/order-payments", {
                            order_id: newOrderId,
                            amount: parsedGcash,
                            payment_method: "gcash"
                        })
                    );
                }
                
                await Promise.all(paymentPromises);
                const change = totalPayment - grandTotal;
                
                toast.dismiss(loadingToast);
                toast.success(
                    `✅ Order completed! Split Payment: Cash: ₱${parsedCash.toFixed(2)} + GCash: ₱${parsedGcash.toFixed(2)} | Change: ₱${change.toFixed(2)}`
                );
            } else {
                // Process single payment
                const paymentResponse = await api.post("/order-payments", {
                    order_id: newOrderId,
                    amount: amount,
                    payment_method: paymentMethod
                });
                
                toast.dismiss(loadingToast);
                toast.success(`✅ Order completed! Payment successful via ${paymentMethod.toUpperCase()}! Change: ₱${paymentResponse.data.change}`);
            }

            // Reset everything
            setCart([]);
            setCashAmount("");
            setGcashAmount("");
            setSelectedCategory("All");
            setSearchTerm("");
            setPaymentMethod("cash");

        } catch (error: any) {
            toast.dismiss(loadingToast);
            console.error("ORDER ERROR:", error.response?.data);
            toast.error(error.response?.data?.message || "Failed to process order");
        } finally {
            setIsProcessingOrder(false);
        }
    };

    // Get unique categories from menu
    const categories = ["All", ...new Set(menu.map(item => item.category).filter(Boolean))];

    // Filter menu by category and search term
    const filteredMenu = menu.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getStockStatusText = (item: any) => {
        if (item.is_disabled) return "Unavailable";
        if (item.stock_quantity <= 0) return "Out of Stock";
        if (item.stock_quantity <= (item.low_stock_threshold || 5)) {
            return `Only ${item.stock_quantity} left`;
        }
        return null;
    };

    const getCategoryIcon = (category: string) => {
        switch(category?.toLowerCase()) {
            case "drinks": return <Coffee className="w-4 h-4" />;
            case "meals": return <Utensils className="w-4 h-4" />;
            case "desserts": return <Cake className="w-4 h-4" />;
            default: return <Filter className="w-4 h-4" />;
        }
    };

    const getPaymentIcon = () => {
        switch(paymentMethod) {
            case "cash": return <Wallet className="w-5 h-5" />;
            case "gcash": return <Smartphone className="w-5 h-5" />;
            case "split": return <Divide className="w-5 h-5" />;
            default: return <Wallet className="w-5 h-5" />;
        }
    };

    const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (value === "") {
            setCashAmount("");
            return;
        }
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setCashAmount(value);
        }
    };

    const handleGcashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (value === "") {
            setGcashAmount("");
            return;
        }
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setGcashAmount(value);
        }
    };

    const isPayButtonDisabled = () => {
        if (cart.length === 0 || isProcessingOrder) return true;
        
        if (paymentMethod === "split") {
            return totalPayment < grandTotal;
        } else {
            const amount = paymentMethod === "cash" ? 
                (typeof cashAmount === "string" ? parseFloat(cashAmount) : cashAmount) :
                (typeof gcashAmount === "string" ? parseFloat(gcashAmount) : gcashAmount);
            return isNaN(amount) || amount < grandTotal;
        }
    };

    return (
        <div className="h-full flex gap-4">
            {/* LEFT - MENU & PRODUCTS */}
            <div className="w-3/5 flex flex-col h-full">
                {/* Header with Filters */}
                <div className="mb-4 space-y-3 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Menu Items ({filteredMenu.length})
                    </h2>
                    
                    {/* Category Filter Buttons */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                                    selectedCategory === category
                                        ? "bg-emerald-500 text-white shadow-md"
                                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                {category !== "All" && getCategoryIcon(category)}
                                {category}
                                {category !== "All" && (
                                    <span className={`text-xs ${
                                        selectedCategory === category 
                                            ? "text-white" 
                                            : "text-gray-500"
                                    }`}>
                                        ({menu.filter(item => item.category === category).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4 flex-shrink-0">
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
                <div className="grid grid-cols-2 gap-3 overflow-auto pr-2 flex-1">
                    {filteredMenu.map(item => {
                        const available = isItemAvailable(item);
                        const stockStatus = getStockStatusText(item);
                        
                        return (
                            <div
                                key={item.id}
                                className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                                    available 
                                        ? "border-gray-200 hover:shadow-lg hover:border-emerald-200 hover:scale-[1.02] cursor-pointer" 
                                        : "border-gray-200 bg-gray-50/80 opacity-70 cursor-not-allowed"
                                }`}
                            >
                                <div className="flex flex-row h-full min-h-[110px]">
                                    {/* Image Section */}
                                    <div className="relative w-28 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover absolute inset-0"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl absolute inset-0">
                                                🍽️
                                            </div>
                                        )}
                                        {!available && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                                                    {item.stock_quantity <= 0 ? "Out" : "Unavail"}
                                                </span>
                                            </div>
                                        )}
                                        {item.is_veg !== undefined && available && (
                                            <div className="absolute top-1 left-1 z-10">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-sm ${
                                                    item.is_veg 
                                                        ? "bg-green-500 text-white" 
                                                        : "bg-red-500 text-white"
                                                }`}>
                                                    {item.is_veg ? "Veg" : "Non-Veg"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content */}
                                    <div className="flex-1 p-2.5 flex flex-col justify-between">
                                        <div>
                                            <h3 className={`font-semibold text-sm leading-tight ${
                                                available ? "text-gray-800" : "text-gray-500"
                                            }`}>
                                                {item.name}
                                            </h3>
                                            {stockStatus && available && (
                                                <div className="mb-1.5 mt-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                                        {stockStatus}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <span className={`text-base font-bold ${
                                                available ? "text-emerald-600" : "text-gray-400"
                                            }`}>
                                                ₱{item.price}
                                            </span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                disabled={!available}
                                                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
                                                    available 
                                                        ? "bg-emerald-500 hover:bg-emerald-600 hover:shadow-md text-white active:scale-95" 
                                                        : "bg-gray-300 cursor-not-allowed text-gray-500"
                                                }`}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filteredMenu.length === 0 && (
                        <div className="col-span-2 text-center text-gray-400 py-12">
                            No items found
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT - CART & ORDER SUMMARY */}
            <div className="w-2/5 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
                {/* Cart Header */}
                <div className="p-4 border-b flex-shrink-0">
                    <h2 className="font-bold text-gray-800">Current Order</h2>
                    {cart.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            {cart.length} item(s) in cart
                        </p>
                    )}
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
                                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                                                🍽️
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 text-sm">
                                            {item.name}
                                        </h4>
                                        <p className="text-emerald-600 font-semibold text-sm mt-0.5">
                                            ₱{item.price}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => decrease(item.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-6 text-center font-medium">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => increase(item.id)}
                                            disabled={!isStillAvailable}
                                            className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${
                                                isStillAvailable 
                                                    ? "border-gray-300 hover:bg-gray-100" 
                                                    : "border-gray-200 cursor-not-allowed opacity-50"
                                            }`}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
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
                <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Sub Total</span>
                            <span>₱{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t">
                            <span>Total Amount</span>
                            <span className="text-emerald-600">₱{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Method Selection - 3 Options */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <button
                            onClick={() => {
                                setPaymentMethod("cash");
                                setCashAmount("");
                                setGcashAmount("");
                            }}
                            className={`py-2 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                paymentMethod === "cash"
                                    ? "bg-emerald-500 text-white shadow-md"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <Wallet className="w-4 h-4" />
                            Cash
                        </button>
                        <button
                            onClick={() => {
                                setPaymentMethod("gcash");
                                setCashAmount("");
                                setGcashAmount("");
                            }}
                            className={`py-2 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                paymentMethod === "gcash"
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            GCash
                        </button>
                        <button
                            onClick={() => {
                                setPaymentMethod("split");
                                setCashAmount("");
                                setGcashAmount("");
                            }}
                            className={`py-2 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                paymentMethod === "split"
                                    ? "bg-purple-500 text-white shadow-md"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <Divide className="w-4 h-4" />
                            Split
                        </button>
                    </div>

                    {/* Payment Input Section */}
                    {paymentMethod === "split" ? (
                        // Split Payment UI
                        <div className="space-y-3 mb-3">
                            <div className="bg-emerald-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="w-4 h-4 text-emerald-600" />
                                    <span className="font-semibold text-emerald-900 text-sm">Cash Amount</span>
                                </div>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Enter cash amount"
                                    value={cashAmount}
                                    onChange={handleCashChange}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-1 outline-none bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-sm"
                                />
                            </div>
                            
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Smartphone className="w-4 h-4 text-blue-600" />
                                    <span className="font-semibold text-blue-900 text-sm">GCash Amount</span>
                                </div>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Enter GCash amount"
                                    value={gcashAmount}
                                    onChange={handleGcashChange}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-1 outline-none bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-sm"
                                />
                            </div>
                            
                            <div className="bg-gray-100 rounded-lg p-3">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium">Total Payment:</span>
                                    <span className={`font-bold ${totalPayment >= grandTotal ? 'text-green-600' : 'text-orange-600'}`}>
                                        ₱{totalPayment.toFixed(2)}
                                    </span>
                                </div>
                                {totalPayment < grandTotal && totalPayment > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-500">Remaining:</span>
                                        <span className="text-red-500 font-semibold">₱{remainingAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totalPayment >= grandTotal && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-600">Change:</span>
                                        <span className="text-green-600 font-semibold">₱{(totalPayment - grandTotal).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Single Payment UI
                        <div className={`rounded-lg p-3 mb-3 ${
                            paymentMethod === "cash" ? "bg-emerald-50" : "bg-blue-50"
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {getPaymentIcon()}
                                <span className={`font-semibold ${
                                    paymentMethod === "cash" ? "text-emerald-900" : "text-blue-900"
                                }`}>
                                    {paymentMethod === "cash" ? "Cash Payment" : "GCash Payment"}
                                </span>
                            </div>
                            
                            <input
                                type="number"
                                inputMode="decimal"
                                placeholder={`Enter ${paymentMethod === "cash" ? "cash" : "GCash"} amount`}
                                value={paymentMethod === "cash" ? cashAmount : gcashAmount}
                                onChange={paymentMethod === "cash" ? handleCashChange : handleGcashChange}
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-1 outline-none bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                    paymentMethod === "cash" 
                                        ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500" 
                                        : "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                                }`}
                            />
                            
                            {(() => {
                                const amount = paymentMethod === "cash" ? 
                                    (typeof cashAmount === "string" ? parseFloat(cashAmount) : cashAmount) :
                                    (typeof gcashAmount === "string" ? parseFloat(gcashAmount) : gcashAmount);
                                if (!isNaN(amount) && amount > 0 && amount < grandTotal) {
                                    return <p className="text-xs text-red-500 mt-2">Need ₱{(grandTotal - amount).toFixed(2)} more</p>;
                                }
                                if (!isNaN(amount) && amount >= grandTotal) {
                                    return <p className="text-xs text-green-600 mt-2">✅ Change: ₱{(amount - grandTotal).toFixed(2)}</p>;
                                }
                                return null;
                            })()}
                        </div>
                    )}

                    {/* Process Order Button */}
                    <button
                        onClick={processOrder}
                        disabled={isPayButtonDisabled()}
                        className={`w-full py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                            isPayButtonDisabled()
                                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                : paymentMethod === "cash"
                                    ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white"
                                    : paymentMethod === "gcash"
                                        ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white"
                                        : "bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white"
                        }`}
                    >
                        {isProcessingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                        {getPaymentIcon()}
                        {isProcessingOrder ? "Processing Order..." : 
                            paymentMethod === "split" ? "Complete Split Payment" : `Pay with ${paymentMethod.toUpperCase()}`}
                    </button>
                </div>
            </div>
        </div>
    );
}