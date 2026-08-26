/**
 * Menu Management — "Ticket Rail" design (matches Order Management)
 *
 * Fonts used (add to your index.html <head>, or a global stylesheet):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
 */

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import {
    Search,
    Coffee,
    Utensils,
    Cake,
    ShoppingBag,
    Loader2,
    AlertCircle,
    PhilippinePeso,
    Layers,
    PackageX,
    TriangleAlert,
    RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Design tokens — same "Ticket Rail" palette as Order management
// ---------------------------------------------------------------------------
const DARK_MINT = "#146C4B";

const CATEGORY_META: Record<string, { text: string; bg: string; dot: string }> = {
    Drinks: { text: "#2a4f78", bg: "#e7eef7", dot: "#3b6ea5" },
    Meals: { text: "#8a5a0f", bg: "#fbf1de", dot: "#c1861f" },
    Desserts: { text: "#5e3c66", bg: "#f1e9f4", dot: "#845a8f" },
    Uncategorized: { text: "#5c6258", bg: "#f5f6f2", dot: "#8a8f83" },
};

function categoryMeta(category: string) {
    return CATEGORY_META[category] || CATEGORY_META.Uncategorized;
}

export default function Menu() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await api.get("/menu-items-available");
            setItems(res.data);
        } catch (error) {
            console.error("Failed to fetch menu:", error);
            toast.error("Failed to load menu items");
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(
        () => ["All", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
        [items],
    );

    const filteredItems = items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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

    const getStockStatus = (item: any) => {
        if (item.stock_quantity <= 0) {
            return { label: "Out of stock", text: "#8a3226", bg: "#fbe9e6", dot: "#a1402f" };
        }
        if (item.stock_quantity <= (item.low_stock_threshold || 5)) {
            return { label: `Low · ${item.stock_quantity} left`, text: "#8a5a0f", bg: "#fbf1de", dot: "#c1861f" };
        }
        return { label: "In stock", text: "#155c42", bg: "#e4f3ec", dot: "#1f7a5c" };
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(amount);

    const lowStockCount = items.filter(
        (i) => i.stock_quantity > 0 && i.stock_quantity <= (i.low_stock_threshold || 5),
    ).length;
    const outOfStockCount = items.filter((i) => i.stock_quantity <= 0).length;
    const totalCatalogValue = items.reduce(
        (sum, i) => sum + Number(i.price || 0) * Number(i.stock_quantity || 0),
        0,
    );

    if (loading) {
        return (
            //bg-[#eef0ea]
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#a8822f]" />
                <p className="mt-4 text-[#8a8f83] text-sm">Loading menu items...</p>
            </div>
        );
    }

    return (
        //bg-[#eef0ea]
        <div className="min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#a8822f] uppercase mb-1 font-['IBM_Plex_Mono']">
                            Back of house
                        </p>
                        <h1 className="font-['Space_Grotesk'] text-[28px] font-semibold text-[#1c2420] tracking-tight m-0">
                            Menu management
                        </h1>
                        <p className="text-[13px] text-[#6b7268] mt-1">
                            Browse, price, and track stock across the catalog
                        </p>
                    </div>

                    {/* Catalog value — receipt-style summary, mirrors Register total */}
                    <div
                        className="relative rounded-lg px-6 py-4 min-w-[240px] shadow-[0_10px_30px_-12px_rgba(20,108,75,0.5)]"
                        style={{ backgroundColor: DARK_MINT }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Layers className="h-3.5 w-3.5 text-white/70" />
                            <span className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase font-['IBM_Plex_Mono']">
                                Catalog value
                            </span>
                        </div>
                        <p className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-white tabular-nums">
                            {formatCurrency(totalCatalogValue)}
                        </p>
                        <div
                            className="absolute -bottom-1.5 left-4 right-4 h-3 bg-[#eef0ea]"
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
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {[
                        {
                            label: "Items",
                            value: String(items.length),
                            icon: <ShoppingBag className="w-4 h-4" />,
                        },
                        {
                            label: "Categories",
                            value: String(categories.length - 1),
                            icon: <Layers className="w-4 h-4" />,
                        },
                        {
                            label: "Low stock",
                            value: String(lowStockCount),
                            icon: <TriangleAlert className="w-4 h-4" />,
                        },
                        {
                            label: "Out of stock",
                            value: String(outOfStockCount),
                            icon: <PackageX className="w-4 h-4" />,
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="bg-white rounded-lg p-4 border border-[#dde1d7]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10.5px] font-semibold text-[#8a8f83] uppercase tracking-wide font-['IBM_Plex_Mono']">
                                    {s.label}
                                </p>
                                <span className="text-[#8a8f83]">{s.icon}</span>
                            </div>
                            <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#1c2420] tabular-nums">
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Category tabs — segmented control, same shape as Order tabs */}
                <div className="inline-flex flex-wrap items-center gap-1 bg-white border border-[#dde1d7] rounded-lg p-1 mb-5">
                    {categories.map((category) => {
                        const active = selectedCategory === category;
                        const meta = category === "All" ? null : categoryMeta(category);
                        const count =
                            category === "All"
                                ? items.length
                                : items.filter((i) => i.category === category).length;
                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                style={active ? { backgroundColor: DARK_MINT } : undefined}
                                className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
                                    active
                                        ? "text-white"
                                        : "text-[#5c6258] hover:bg-[#f5f6f2]"
                                }`}
                            >
                                {meta && (
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: meta.dot }}
                                    />
                                )}
                                {category !== "All" && getCategoryIcon(category)}
                                {category}
                                <span
                                    className={`font-['IBM_Plex_Mono'] text-[10px] ${
                                        active ? "text-white/70" : "text-[#a8ad9f]"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar: search */}
                <div className="bg-white rounded-lg border border-[#dde1d7] p-3 mb-5 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8ad9f]" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-[#e4e7dd] rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#a8822f]/30 focus:border-[#a8822f] bg-[#f9faf7]"
                        />
                    </div>
                    <button
                        onClick={fetchItems}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium text-[#5c6258] border border-[#e4e7dd] hover:bg-[#f5f6f2] transition-colors"
                    >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Refresh
                    </button>
                </div>

                {/* Grid */}
                {filteredItems.length === 0 ? (
                    <div className="bg-white rounded-lg border border-[#dde1d7] flex flex-col items-center justify-center py-24">
                        <ShoppingBag className="h-14 w-14 text-[#dde1d7]" />
                        <p className="mt-4 text-lg font-semibold text-[#5c6258] font-['Space_Grotesk']">
                            No menu items found
                        </p>
                        <p className="text-[#a8ad9f] text-sm mt-1">
                            Try adjusting your search or category filter
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.map((item) => {
                            const stock = getStockStatus(item);
                            const isOutOfStock = item.stock_quantity <= 0;
                            const catMeta = categoryMeta(item.category || "Uncategorized")!;

                            return (
                                <div
                                    key={item.id}
                                    className={`bg-white rounded-lg border border-[#dde1d7] overflow-hidden transition-all ${
                                        isOutOfStock ? "opacity-70" : "hover:shadow-[0_10px_30px_-16px_rgba(28,36,32,0.35)]"
                                    }`}
                                >
                                    {/* Image */}
                                    <div className="relative h-40 bg-[#f5f6f2] overflow-hidden">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#dde1d7]">
                                                <span style={{ color: catMeta.dot }}>
                                                    {React.cloneElement(getCategoryIcon(item.category), {
                                                        className: "w-8 h-8",
                                                    })}
                                                </span>
                                            </div>
                                        )}

                                        <div className="absolute bottom-2 left-2">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                                                style={{ backgroundColor: catMeta.bg, color: catMeta.text }}
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: catMeta.dot }}
                                                />
                                                {item.category || "Uncategorized"}
                                            </span>
                                        </div>

                                        {isOutOfStock && (
                                            <div
                                                className="absolute inset-0 flex items-center justify-center"
                                                style={{ backgroundColor: `${DARK_MINT}8c` }}
                                            >
                                                <span className="inline-flex items-center gap-1.5 bg-[#a1402f] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Out of stock
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-['Space_Grotesk'] font-semibold text-[15px] text-[#1c2420] leading-tight mb-1">
                                            {item.name}
                                        </h3>
                                        <p className="text-[#8a8f83] text-xs line-clamp-2 mb-3 min-h-[32px]">
                                            {item.description || "No description available"}
                                        </p>

                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-['IBM_Plex_Mono'] font-semibold text-lg text-[#1c2420] tabular-nums flex items-center gap-0.5">
                                                <PhilippinePeso className="w-3.5 h-3.5 text-[#a8822f]" />
                                                {Number(item.price).toLocaleString()}
                                            </span>
                                            <span className="text-[11px] text-[#8a8f83] font-['IBM_Plex_Mono']">
                                                stock {item.stock_quantity}
                                            </span>
                                        </div>

                                        <span
                                            className="inline-flex w-full justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold"
                                            style={{ backgroundColor: stock.bg, color: stock.text }}
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: stock.dot }}
                                            />
                                            {stock.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                {filteredItems.length > 0 && (
                    <div className="flex items-center justify-between mt-5">
                        <p className="text-xs text-[#8a8f83] font-['IBM_Plex_Mono']">
                            Showing {filteredItems.length} of {items.length} items
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}