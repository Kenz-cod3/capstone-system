/**
 * Point of Sale — "Ticket Rail" design
 *
 * Payment methods:
 *   cash  - recorded immediately via POST /order-payments
 *   qrph  - PayMongo dynamic QR; the webhook records the payment
 *   split - cash portion + QRPH for the remainder
 */

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import {
    Search,
    Plus,
    Minus,
    X,
    Coffee,
    Utensils,
    Cake,
    ShoppingBag,
    QrCode,
    Wallet,
    Loader2,
    Divide,
    ReceiptText,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const DARK_MINT = "#146C4B";
const DARK_MINT_HOVER = "#0F5A3E";

const CATEGORY_META: Record<string, { text: string; bg: string; dot: string }> =
    {
        Drinks: { text: "#2a4f78", bg: "#e7eef7", dot: "#3b6ea5" },
        Meals: { text: "#8a5a0f", bg: "#fbf1de", dot: "#c1861f" },
        Desserts: { text: "#5e3c66", bg: "#f1e9f4", dot: "#845a8f" },
        Uncategorized: { text: "#5c6258", bg: "#f5f6f2", dot: "#8a8f83" },
    };

function categoryMeta(category: string) {
    return CATEGORY_META[category] || CATEGORY_META.Uncategorized;
}

const PAYMENT_META = {
    cash: { accent: "#1f7a5c", accentBg: "#e4f3ec", accentText: "#155c42" },
    qrph: { accent: "#3b6ea5", accentBg: "#e7eef7", accentText: "#2a4f78" },
    split: { accent: "#845a8f", accentBg: "#f1e9f4", accentText: "#5e3c66" },
};

type QrState = {
    orderId: number;
    imageUrl: string;
    intentId: string;
    clientKey: string;
    amount: number;
    cash: number;
    expiresAt: number;
    testUrl?: string | null;
};

export default function Orders() {
    const [menu, setMenu] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [cashAmount, setCashAmount] = useState<number | string>("");
    const [qr, setQr] = useState<QrState | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [paymentMethod, setPaymentMethod] = useState<
        "cash" | "qrph" | "split"
    >("cash");
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
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                if (existing.quantity + 1 > item.stock_quantity) {
                    toast.error(
                        `Only ${item.stock_quantity} ${item.name}(s) available!`,
                    );
                    return prev;
                }
                toast.success(`Added another ${item.name} to cart`);
                return prev.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
                );
            }
            toast.success(`${item.name} added to cart`);
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const increase = (id: number) => {
        const cartItem = cart.find((i) => i.id === id);
        const menuItem = menu.find((m) => m.id === id);

        if (
            cartItem &&
            menuItem &&
            cartItem.quantity + 1 > menuItem.stock_quantity
        ) {
            toast.error(
                `Only ${menuItem.stock_quantity} ${menuItem.name}(s) available!`,
            );
            return;
        }

        setCart(
            cart.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
        );
    };

    const decrease = (id: number) => {
        setCart(
            cart
                .map((i) =>
                    i.id === id ? { ...i, quantity: i.quantity - 1 } : i,
                )
                .filter((i) => i.quantity > 0),
        );
    };

    const removeFromCart = (id: number) => {
        const item = cart.find((i) => i.id === id);
        setCart(cart.filter((i) => i.id !== id));
        toast.info(`${item?.name} removed from cart`);
    };

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );
    const grandTotal = total;

    const cashNum = parseFloat(String(cashAmount)) || 0;
    const qrAmount =
        paymentMethod === "qrph"
            ? grandTotal
            : Math.max(0, grandTotal - cashNum);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(isNaN(amount) ? 0 : amount);

    // -----------------------------------------------------------------------
    // Reset / cancel
    // -----------------------------------------------------------------------
    const resetPos = () => {
        setCart([]);
        setCashAmount("");
        setSelectedCategory("All");
        setSearchTerm("");
        setPaymentMethod("cash");
        setQr(null);
        fetchMenu();
    };

    const cancelQr = async (reason = "Payment cancelled") => {
        if (!qr) return;
        try {
            await api.delete(`/orders/${qr.orderId}`);
            toast.info(reason);
        } catch {
            toast.error("Could not cancel order. Check Order Management.");
        }
        setQr(null);
        fetchMenu();
    };

    // -----------------------------------------------------------------------
    // Poll QR status
    //
    // HINDI tayo mag-sasabi ng success hangga't hindi confirmed ng DB
    // na paid na ang order. Kung hindi pa, magsa-save tayo ng payment
    // manually (fallback) at magre-recheck.
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!qr) return;

        let attempts = 0;
        const MAX_ATTEMPTS = 60; // 60 * 2s = 2 minutes max wait

        const timer = setInterval(async () => {
            attempts++;

            // Timeout: QR expired or too many attempts
            if (Date.now() > qr.expiresAt || attempts > MAX_ATTEMPTS) {
                clearInterval(timer);
                await cancelQr("QR expired");
                return;
            }

            try {
                // 1) Check PayMongo status
                const { data } = await api.get(
                    `/orders/qr-status/${qr.intentId}`,
                    { params: { client_key: qr.clientKey } },
                );

                // 2) If PayMongo says succeeded, verify the DB has the payment
                if (data.status === "succeeded") {
                    try {
                        // Check if webhook already saved the OrderPayment
                        const orderRes = await api.get(`/orders/${qr.orderId}`);
                        const order = orderRes.data;

                        // Calculate total PAID from order_payments
                        // (filter by payment_status === 'paid')
                        const totalPaid = (order.payments || [])
                            .filter((p: any) => p.payment_status === "paid")
                            .reduce(
                                (sum: number, p: any) =>
                                    sum + Number(p.amount || 0),
                                0,
                            );

                        // Check if the order is already marked as paid
                        if (order.order_status === "paid") {
                            // Webhook already handled it — success na!
                            clearInterval(timer);
                            toast.success(
                                "QR payment received. Order completed!",
                            );
                            resetPos();
                            return;
                        }

                        // If not yet paid, save the payment manually (fallback)
                        if (totalPaid < order.total_amount) {
                            const remaining =
                                order.total_amount - totalPaid;

                            // Save QRPH payment (webhook fallback)
                            await api.post("/order-payments", {
                                order_id: qr.orderId,
                                amount: remaining,
                                payment_method: "qrph",
                                gcash_reference: data.payment_id,
                            });

                            // Save cash portion if split payment
                            if (qr.cash > 0) {
                                await api.post("/order-payments", {
                                    order_id: qr.orderId,
                                    amount: qr.cash,
                                    payment_method: "cash",
                                });
                            }

                            // Re-check the order to confirm it's now paid
                            const finalRes = await api.get(
                                `/orders/${qr.orderId}`,
                            );

                            if (finalRes.data.order_status === "paid") {
                                clearInterval(timer);
                                toast.success(
                                    "QR payment received. Order completed!",
                                );
                                resetPos();
                            } else {
                                // Still not paid? Wait for next poll
                                console.warn(
                                    "Payment saved but order not marked paid yet. Retrying...",
                                );
                            }
                        } else {
                            // Total paid na pero hindi pa naka-mark as paid?
                            // I-update natin ang order manually
                            await api.put(`/orders/${qr.orderId}`, {
                                order_status: "paid",
                            });

                            clearInterval(timer);
                            toast.success(
                                "QR payment received. Order completed!",
                            );
                            resetPos();
                        }
                    } catch (dbErr: any) {
                        // DB save failed — keep polling, don't reset POS
                        console.error(
                            "Failed to verify/save payment:",
                            dbErr?.response?.data || dbErr,
                        );
                    }
                }
                // Kung 'pending' pa ang status, maghintay lang tayo
                // Walang gagawin — hindi mag-sasabi ng success
            } catch {
                // ignore transient polling errors
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qr]);

    // -----------------------------------------------------------------------
    // Process order
    // -----------------------------------------------------------------------
    const processOrder = async () => {
        if (cart.length === 0) {
            toast.error("Please add items to cart first");
            return;
        }
        if (paymentMethod === "cash" && cashNum < grandTotal) {
            toast.error(
                `Insufficient cash. Need ${formatCurrency(grandTotal)}`,
            );
            return;
        }
        if (
            paymentMethod === "split" &&
            (cashNum <= 0 || cashNum >= grandTotal)
        ) {
            toast.error(
                "Split cash must be more than 0 and less than the total",
            );
            return;
        }

        setIsProcessingOrder(true);
        const loadingToast = toast.loading("Processing order...");
        let newOrderId: number | undefined;

        try {
            const orderResponse = await api.post("/orders", {
                items: cart.map((item: any) => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                })),
            });
            newOrderId = orderResponse.data.data.id;

            if (paymentMethod === "cash") {
                const res = await api.post("/order-payments", {
                    order_id: newOrderId,
                    amount: cashNum,
                    payment_method: "cash",
                });
                toast.dismiss(loadingToast);
                toast.success(
                    `Order completed! Change ${formatCurrency(res.data.change)}`,
                );
                resetPos();
            } else {
                // qrph or split
                const { data } = await api.post(`/orders/${newOrderId}/qrph`, {
                    amount: qrAmount,
                });
                toast.dismiss(loadingToast);
                setQr({
                    orderId: newOrderId!,
                    imageUrl: data.qr_image_url,
                    intentId: data.payment_intent_id,
                    clientKey: data.client_key,
                    amount: data.amount,
                    cash: paymentMethod === "split" ? cashNum : 0,
                    expiresAt: Date.now() + data.expiry_seconds * 1000,
                    testUrl: data.test_url ?? null,
                });
            }
        } catch (error: any) {
            toast.dismiss(loadingToast);
            if (newOrderId !== undefined) {
                await api.delete(`/orders/${newOrderId}`).catch(() => {});
                fetchMenu();
            }
            console.error("ORDER ERROR:", error.response?.data);
            toast.error(
                error.response?.data?.message || "Failed to process order",
            );
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const categories = [
        "All",
        ...new Set(menu.map((item) => item.category).filter(Boolean)),
    ];

    const filteredMenu = menu.filter((item) => {
        const matchesSearch = item.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesCategory =
            selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getStockStatusText = (item: any) => {
        if (item.is_disabled) return "Unavailable";
        if (item.stock_quantity <= 0) return "Out of stock";
        if (item.stock_quantity <= (item.low_stock_threshold || 5)) {
            return `Only ${item.stock_quantity} left`;
        }
        return null;
    };

    const getCategoryIcon = (category: string) => {
        switch (category?.toLowerCase()) {
            case "drinks":
                return <Coffee className="w-3.5 h-3.5" />;
            case "meals":
                return <Utensils className="w-3.5 h-3.5" />;
            case "desserts":
                return <Cake className="w-3.5 h-3.5" />;
            default:
                return <ShoppingBag className="w-3.5 h-3.5" />;
        }
    };

    const getPaymentIcon = (method = paymentMethod) => {
        switch (method) {
            case "cash":
                return <Wallet className="w-4 h-4" />;
            case "qrph":
                return <QrCode className="w-4 h-4" />;
            case "split":
                return <Divide className="w-4 h-4" />;
            default:
                return <Wallet className="w-4 h-4" />;
        }
    };

    const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            setCashAmount("");
            return;
        }
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setCashAmount(value);
        }
    };

    const isPayButtonDisabled = () => {
        if (cart.length === 0 || isProcessingOrder || qr) return true;
        if (paymentMethod === "cash") return cashNum < grandTotal;
        if (paymentMethod === "split")
            return cashNum <= 0 || cashNum >= grandTotal;
        return false;
    };

    const payMeta = PAYMENT_META[paymentMethod];

    return (
        <div className="h-full flex gap-4  p-4">
            {/* LEFT — MENU */}
            <div className="w-3/5 flex flex-col h-full">
                <div className="mb-4 flex-shrink-0">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-[#a8822f] uppercase mb-1 font-['IBM_Plex_Mono']">
                        Point of sale
                    </p>
                    <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420]">
                        Menu items{" "}
                        <span className="text-[#8a8f83] text-sm font-normal font-['IBM_Plex_Mono']">
                            ({filteredMenu.length})
                        </span>
                    </h2>
                </div>

                <div className="mb-3 flex-shrink-0 overflow-x-auto">
                    <div className="inline-flex items-center gap-1 bg-white border border-[#dde1d7] rounded-lg p-1">
                        {categories.map((category) => {
                            const active = selectedCategory === category;
                            const meta =
                                category === "All"
                                    ? null
                                    : categoryMeta(category);
                            return (
                                <button
                                    key={category}
                                    onClick={() =>
                                        setSelectedCategory(category)
                                    }
                                    style={
                                        active
                                            ? { backgroundColor: DARK_MINT }
                                            : undefined
                                    }
                                    className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        active
                                            ? "text-white"
                                            : "text-[#5c6258] hover:bg-[#f5f6f2]"
                                    }`}
                                >
                                    {meta && (
                                        <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                                backgroundColor: meta.dot,
                                            }}
                                        />
                                    )}
                                    {category !== "All" &&
                                        getCategoryIcon(category)}
                                    {category}
                                    {category !== "All" && (
                                        <span
                                            className={`font-['IBM_Plex_Mono'] text-[10px] ${
                                                active
                                                    ? "text-white/70"
                                                    : "text-[#a8ad9f]"
                                            }`}
                                        >
                                            {
                                                menu.filter(
                                                    (item) =>
                                                        item.category ===
                                                        category,
                                                ).length
                                            }
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="relative mb-4 flex-shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8ad9f]" />
                    <input
                        type="text"
                        placeholder="Search product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-[#e4e7dd] rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#a8822f]/30 focus:border-[#a8822f] bg-white"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 overflow-auto pr-1 flex-1">
                    {filteredMenu.map((item) => {
                        const available = isItemAvailable(item);
                        const stockStatus = getStockStatusText(item);
                        const catMeta = categoryMeta(
                            item.category || "Uncategorized",
                        )!;

                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-lg border border-[#dde1d7] overflow-hidden transition-all ${
                                    available
                                        ? "hover:shadow-[0_10px_24px_-16px_rgba(28,36,32,0.35)] cursor-pointer"
                                        : "opacity-60 cursor-not-allowed"
                                }`}
                            >
                                <div className="flex flex-row h-full min-h-[104px]">
                                    <div className="relative w-24 flex-shrink-0 bg-[#f5f6f2]">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover absolute inset-0"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center absolute inset-0"
                                                style={{ color: catMeta.dot }}
                                            >
                                                {React.cloneElement(
                                                    getCategoryIcon(
                                                        item.category,
                                                    ),
                                                    {
                                                        className: "w-6 h-6",
                                                    },
                                                )}
                                            </div>
                                        )}
                                        {!available && (
                                            <div
                                                className="absolute inset-0 flex items-center justify-center"
                                                style={{
                                                    backgroundColor: `${DARK_MINT}8c`,
                                                }}
                                            >
                                                <span className="bg-[#a1402f] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                                                    {item.stock_quantity <= 0
                                                        ? "Out"
                                                        : "Unavail."}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                                        <div>
                                            <h3
                                                className={`font-medium text-[13px] leading-tight truncate ${
                                                    available
                                                        ? "text-[#1c2420]"
                                                        : "text-[#8a8f83]"
                                                }`}
                                            >
                                                {item.name}
                                            </h3>
                                            {stockStatus && available && (
                                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#fbf1de] text-[#8a5a0f] font-medium">
                                                    {stockStatus}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <span
                                                className={`font-['IBM_Plex_Mono'] font-semibold text-sm tabular-nums ${
                                                    available
                                                        ? "text-[#1c2420]"
                                                        : "text-[#a8ad9f]"
                                                }`}
                                            >
                                                ₱{item.price}
                                            </span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                disabled={!available}
                                                style={
                                                    available
                                                        ? {
                                                              backgroundColor:
                                                                  DARK_MINT,
                                                          }
                                                        : undefined
                                                }
                                                onMouseEnter={(e) => {
                                                    if (available)
                                                        e.currentTarget.style.backgroundColor =
                                                            DARK_MINT_HOVER;
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (available)
                                                        e.currentTarget.style.backgroundColor =
                                                            DARK_MINT;
                                                }}
                                                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                                    available
                                                        ? "text-white active:scale-95"
                                                        : "bg-[#e4e7dd] cursor-not-allowed text-[#a8ad9f]"
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
                        <div className="col-span-2 flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-[#dde1d7]">
                            <ShoppingBag className="h-10 w-10 text-[#dde1d7] mb-3" />
                            <p className="text-[#8a8f83] text-sm">
                                No items found
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT — CART & PAYMENT */}
            <div className="w-2/5 flex flex-col bg-white rounded-lg border border-[#dde1d7] h-full overflow-hidden">
                <div className="px-5 py-4 border-b border-[#dde1d7] flex-shrink-0 flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-[#a8822f]" />
                    <div>
                        <h2 className="font-['Space_Grotesk'] font-semibold text-[15px] text-[#1c2420]">
                            Current order
                        </h2>
                        {cart.length > 0 && (
                            <p className="text-[11px] text-[#8a8f83] font-['IBM_Plex_Mono']">
                                {cart.length} item{cart.length > 1 ? "s" : ""}{" "}
                                in cart
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <ShoppingBag className="h-10 w-10 text-[#dde1d7] mb-3" />
                            <p className="text-[#8a8f83] text-sm">
                                No items in cart
                            </p>
                        </div>
                    ) : (
                        cart.map((item) => {
                            const menuItem = menu.find((m) => m.id === item.id);
                            const isStillAvailable =
                                menuItem && isItemAvailable(menuItem);
                            const catMeta = categoryMeta(
                                item.category || "Uncategorized",
                            )!;

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2.5 bg-[#f9faf7] rounded-md"
                                >
                                    <div className="w-9 h-9 rounded-md overflow-hidden bg-[#f5f6f2] flex-shrink-0">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center"
                                                style={{ color: catMeta.dot }}
                                            >
                                                {getCategoryIcon(item.category)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-[#1c2420] text-[13px] truncate">
                                            {item.name}
                                        </h4>
                                        <p className="text-[#1f7a5c] font-['IBM_Plex_Mono'] font-semibold text-xs mt-0.5">
                                            ₱{item.price}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                            onClick={() => decrease(item.id)}
                                            className="w-6 h-6 flex items-center justify-center rounded-full border border-[#dde1d7] hover:bg-[#f0f1eb] transition-colors"
                                        >
                                            <Minus className="h-3 w-3 text-[#5c6258]" />
                                        </button>
                                        <span className="w-5 text-center text-sm font-medium text-[#1c2420] font-['IBM_Plex_Mono']">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => increase(item.id)}
                                            disabled={!isStillAvailable}
                                            className={`w-6 h-6 flex items-center justify-center rounded-full border transition-colors ${
                                                isStillAvailable
                                                    ? "border-[#dde1d7] hover:bg-[#f0f1eb]"
                                                    : "border-[#e4e7dd] cursor-not-allowed opacity-50"
                                            }`}
                                        >
                                            <Plus className="h-3 w-3 text-[#5c6258]" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                removeFromCart(item.id)
                                            }
                                            className="ml-0.5 text-[#a8ad9f] hover:text-[#a1402f] transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex-shrink-0 border-t border-[#dde1d7]">
                    <div
                        className="relative px-5 pt-4 pb-3"
                        style={{ backgroundColor: DARK_MINT }}
                    >
                        <div className="flex justify-between text-xs text-white/70 font-['IBM_Plex_Mono'] mb-1.5">
                            <span>Subtotal</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1.5 border-t border-white/10">
                            <span className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase font-['IBM_Plex_Mono']">
                                Total
                            </span>
                            <span className="font-['IBM_Plex_Mono'] text-xl font-semibold text-white tabular-nums">
                                {formatCurrency(grandTotal)}
                            </span>
                        </div>
                        <div
                            className="absolute -bottom-1.5 left-4 right-4 h-3 bg-white"
                            style={{
                                maskImage:
                                    "radial-gradient(circle at 6px 0, transparent 5px, black 5.5px)",
                                maskSize: "12px 12px",
                                maskRepeat: "repeat-x",
                                WebkitMaskImage:
                                    "radial-gradient(circle at 6px 0, transparent 5px, black 5.5px)",
                                WebkitMaskSize: "12px 12px",
                                WebkitMaskRepeat: "repeat-x",
                            }}
                        />
                    </div>

                    <div className="p-4 pt-3">
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                            {(["cash", "qrph", "split"] as const).map(
                                (method) => {
                                    const active = paymentMethod === method;
                                    const meta = PAYMENT_META[method];
                                    return (
                                        <button
                                            key={method}
                                            onClick={() => {
                                                setPaymentMethod(method);
                                                setCashAmount("");
                                            }}
                                            className={`py-2 px-2 rounded-md text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                                                active
                                                    ? "text-white"
                                                    : "bg-white border border-[#dde1d7] text-[#5c6258] hover:bg-[#f5f6f2]"
                                            }`}
                                            style={
                                                active
                                                    ? {
                                                          backgroundColor:
                                                              meta.accent,
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {getPaymentIcon(method)}
                                            {method === "cash"
                                                ? "Cash"
                                                : method === "qrph"
                                                  ? "QRPH"
                                                  : "Cash + QR"}
                                        </button>
                                    );
                                },
                            )}
                        </div>

                        {paymentMethod === "qrph" ? (
                            <div
                                className="rounded-md p-3 mb-3"
                                style={{ backgroundColor: payMeta.accentBg }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <QrCode
                                        className="w-3.5 h-3.5"
                                        style={{ color: payMeta.accentText }}
                                    />
                                    <span
                                        className="font-semibold text-[13px]"
                                        style={{ color: payMeta.accentText }}
                                    >
                                        QRPH payment
                                    </span>
                                </div>
                                <p
                                    className="text-xs font-['IBM_Plex_Mono']"
                                    style={{ color: payMeta.accentText }}
                                >
                                    A QR for {formatCurrency(grandTotal)} will
                                    be generated.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="rounded-md p-3 mb-3"
                                style={{
                                    backgroundColor: PAYMENT_META.cash.accentBg,
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet
                                        className="w-3.5 h-3.5"
                                        style={{
                                            color: PAYMENT_META.cash.accentText,
                                        }}
                                    />
                                    <span
                                        className="font-semibold text-[13px]"
                                        style={{
                                            color: PAYMENT_META.cash.accentText,
                                        }}
                                    >
                                        Cash amount
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Enter cash amount"
                                    value={cashAmount}
                                    onChange={handleCashChange}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-full px-3 py-2 border border-[#c7ded3] rounded-md focus:ring-1 outline-none bg-white text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />

                                {paymentMethod === "cash" &&
                                    cashNum >= grandTotal &&
                                    grandTotal > 0 && (
                                        <p className="text-xs text-[#1f7a5c] mt-2 font-['IBM_Plex_Mono']">
                                            Change{" "}
                                            {formatCurrency(
                                                cashNum - grandTotal,
                                            )}
                                        </p>
                                    )}
                                {paymentMethod === "cash" &&
                                    cashNum > 0 &&
                                    cashNum < grandTotal && (
                                        <p className="text-xs text-[#a1402f] mt-2 font-['IBM_Plex_Mono']">
                                            Need{" "}
                                            {formatCurrency(
                                                grandTotal - cashNum,
                                            )}{" "}
                                            more
                                        </p>
                                    )}
                                {paymentMethod === "split" &&
                                    cashNum > 0 &&
                                    cashNum < grandTotal && (
                                        <p className="text-xs text-[#2a4f78] mt-2 font-['IBM_Plex_Mono']">
                                            QR portion{" "}
                                            {formatCurrency(qrAmount)}
                                        </p>
                                    )}
                                {paymentMethod === "split" &&
                                    cashNum >= grandTotal &&
                                    grandTotal > 0 && (
                                        <p className="text-xs text-[#a1402f] mt-2 font-['IBM_Plex_Mono']">
                                            Cash covers the total — use the Cash
                                            method instead
                                        </p>
                                    )}
                            </div>
                        )}

                        <button
                            onClick={processOrder}
                            disabled={isPayButtonDisabled()}
                            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                                isPayButtonDisabled()
                                    ? "bg-[#e4e7dd] cursor-not-allowed text-[#a8ad9f]"
                                    : "text-white active:scale-[0.98]"
                            }`}
                            style={
                                !isPayButtonDisabled()
                                    ? { backgroundColor: payMeta.accent }
                                    : undefined
                            }
                        >
                            {isProcessingOrder && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {getPaymentIcon()}
                            {isProcessingOrder
                                ? "Processing order..."
                                : paymentMethod === "split"
                                  ? "Generate QR + complete"
                                  : `Pay with ${paymentMethod.toUpperCase()}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* QR MODAL */}
            {qr && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-[360px] text-center">
                        <h3 className="font-['Space_Grotesk'] font-semibold text-lg text-[#1c2420]">
                            Scan to pay
                        </h3>
                        <p className="font-['IBM_Plex_Mono'] text-2xl font-semibold my-2">
                            {formatCurrency(qr.amount)}
                        </p>
                        {qr.cash > 0 && (
                            <p className="text-xs text-[#8a8f83] mb-2">
                                + {formatCurrency(qr.cash)} cash to collect
                            </p>
                        )}
                        <img
                            src={qr.imageUrl}
                            alt="QRPH"
                            className="mx-auto w-64 h-64 object-contain"
                        />
                        <p className="text-xs text-[#8a8f83] mt-2 flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" /> Waiting
                            for payment...
                        </p>
                        {qr.testUrl && (
                            <a
                                href={qr.testUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 rounded-md bg-[#fbf1de] border border-[#e8d3a3] text-sm font-medium text-[#8a5a0f] hover:bg-[#f7e8c6]"
                            >
                                <QrCode className="w-4 h-4" />
                                Test payment (PayMongo sandbox)
                            </a>
                        )}
                        <button
                            onClick={() => cancelQr()}
                            className="mt-4 w-full py-2.5 rounded-md border border-[#dde1d7] text-sm text-[#5c6258] hover:bg-[#f5f6f2]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}