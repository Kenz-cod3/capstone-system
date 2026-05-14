import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/CashierLayout";
import api from "@/services/api";
import { Search, Coffee, Utensils, Cake, Filter, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

    // Get unique categories from menu
    const categories = ["All", ...new Set(items.map(item => item.category).filter(Boolean))];

    // Filter menu by category and search term
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryIcon = (category: string) => {
        switch(category?.toLowerCase()) {
            case "drinks": return <Coffee className="w-4 h-4" />;
            case "meals": return <Utensils className="w-4 h-4" />;
            case "desserts": return <Cake className="w-4 h-4" />;
            default: return <Filter className="w-4 h-4" />;
        }
    };

    const getStockStatus = (item: any) => {
        if (item.stock_quantity <= 0) {
            return { text: "Out of Stock", color: "bg-red-500", textColor: "text-red-600" };
        }
        if (item.stock_quantity <= (item.low_stock_threshold || 5)) {
            return { text: `Low Stock (${item.stock_quantity} left)`, color: "bg-amber-500", textColor: "text-amber-600" };
        }
        return { text: "In Stock", color: "bg-emerald-500", textColor: "text-emerald-600" };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                <p className="mt-4 text-gray-500">Loading menu items...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Menu Management
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Browse and manage your restaurant's menu items
                </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                </div>

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
                                    ({items.filter(item => item.category === category).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Search className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No menu items found</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Try adjusting your search or category filter
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-auto pb-4">
                    {filteredItems.map(item => {
                        const stockStatus = getStockStatus(item);
                        const isOutOfStock = item.stock_quantity <= 0;
                        
                        return (
                            <div
                                key={item.id}
                                className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isOutOfStock 
                                        ? "border-gray-200 bg-gray-50/80 opacity-75" 
                                        : "border-gray-200 hover:shadow-xl hover:border-emerald-200 hover:scale-[1.02] cursor-pointer"
                                }`}
                            >
                                {/* Image Section */}
                                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
                                            🍽️
                                        </div>
                                    )}
                                    
                                    {/* Stock Status Badge */}
                                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-white text-xs font-medium ${stockStatus.color}`}>
                                        {stockStatus.text}
                                    </div>
                                    
                                    {/* Category Badge */}
                                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                        {getCategoryIcon(item.category)}
                                        <span className="text-white text-xs font-medium capitalize">
                                            {item.category || "Uncategorized"}
                                        </span>
                                    </div>

                                    {/* Out of Stock Overlay */}
                                    {isOutOfStock && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                Out of Stock
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Card Content */}
                                <div className="p-4">
                                    <h3 className={`font-semibold text-lg leading-tight mb-2 ${
                                        isOutOfStock ? "text-gray-500" : "text-gray-800"
                                    }`}>
                                        {item.name}
                                    </h3>
                                    
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-3 min-h-[40px]">
                                        {item.description || "No description available"}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className={`text-2xl font-bold ${
                                                isOutOfStock ? "text-gray-400" : "text-emerald-600"
                                            }`}>
                                                ₱{item.price.toLocaleString()}
                                            </span>
                                            {!isOutOfStock && item.stock_quantity <= (item.low_stock_threshold || 5) && item.stock_quantity > 0 && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Only {item.stock_quantity} left!
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="text-right">
                                            <span className={`text-xs ${
                                                isOutOfStock ? "text-gray-400" : "text-gray-500"
                                            }`}>
                                                Stock: {item.stock_quantity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer Stats */}
            {filteredItems.length > 0 && (
                <div className="mt-6 flex justify-between items-center bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex gap-6">
                        <div>
                            <span className="text-xs text-gray-400">Showing</span>
                            <p className="font-semibold text-gray-700">{filteredItems.length} items</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">Total Categories</span>
                            <p className="font-semibold text-gray-700">{categories.length - 1}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">Low Stock Items</span>
                            <p className="font-semibold text-amber-600">
                                {items.filter(i => i.stock_quantity > 0 && i.stock_quantity <= (i.low_stock_threshold || 5)).length}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">Out of Stock</span>
                            <p className="font-semibold text-red-600">
                                {items.filter(i => i.stock_quantity <= 0).length}
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={fetchItems}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                        Refresh ↻
                    </button>
                </div>
            )}
        </div>
    );
}