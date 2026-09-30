    /**
     * Menu Management — Orange theme (matches AdminMenu & OrdersReport)
     *
     * Card grid design with:
     *   - Taller image (h-48)
     *   - No image zoom on hover — buong card ang nag-floats pataas
     *   - Slim ORANGE scrollbar sa main content at modal body
     *   - Scrollbar lalabas lang kapag kailangan (walang scroll kung kasya pa sa screen)
     *   - Search + Filters + Sort sa isang toolbar
     *   - Image upload sa modal
     */

    import { useEffect, useState, useRef } from "react";
    import api from "@/services/api";
    import {
        Plus,
        Trash2,
        Edit,
        Search,
        X,
        Package,
        Coffee,
        Utensils,
        Cake,
        AlertTriangle,
        Loader2,
        Filter,
        ChevronDown,
        Upload,
        ArrowUpDown,
    } from "lucide-react";

    const ORANGE = "#f97316";
    const ORANGE_HOVER = "#ea580c";

    export default function AdminMenu() {
        const [items, setItems] = useState<any[]>([]);
        const [loading, setLoading] = useState(false);
        const [open, setOpen] = useState(false);
        const [editingItem, setEditingItem] = useState<any>(null);
        const [searchTerm, setSearchTerm] = useState("");
        const [categoryFilter, setCategoryFilter] = useState("All");
        const [statusFilter, setStatusFilter] = useState("All");
        const [showFilters, setShowFilters] = useState(false);
        const [sortBy, setSortBy] = useState("name");
        const [sortOrder, setSortOrder] = useState("asc");
        const [imageFile, setImageFile] = useState<File | null>(null);
        const [imagePreview, setImagePreview] = useState<string | null>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const [form, setForm] = useState({
            name: "",
            description: "",
            category: "Drinks",
            price: "",
            stock_quantity: "",
            low_stock_threshold: "",
            is_active: true,
        });

        const fetchItems = async () => {
            try {
                const res = await api.get("/menu-items");
                setItems(res.data);
            } catch (err: any) {
                console.error("Error fetching items:", err);
            }
        };

        useEffect(() => {
            fetchItems();
        }, []);

        const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    alert("Image size must be less than 2MB");
                    return;
                }
                if (!file.type.startsWith("image/")) {
                    alert("Please select a valid image file");
                    return;
                }
                setImageFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        };

        const removeImage = () => {
            setImageFile(null);
            setImagePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };

        const handleSubmit = async () => {
            if (!form.name || !form.price) {
                alert("Name and price are required");
                return;
            }

            if (Number(form.price) <= 0) {
                alert("Price must be greater than 0");
                return;
            }

            setLoading(true);

            try {
                const formData = new FormData();
                formData.append("name", form.name);
                formData.append("description", form.description || "");
                formData.append("category", form.category);
                formData.append("price", form.price);
                formData.append("stock_quantity", form.stock_quantity || "0");
                formData.append(
                    "low_stock_threshold",
                    form.low_stock_threshold || "0",
                );
                formData.append("is_active", form.is_active ? "1" : "0");

                if (imageFile) {
                    formData.append("image", imageFile);
                }

                if (editingItem) {
                    formData.append("_method", "PUT");
                    await api.post(`/menu-items/${editingItem.id}`, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                } else {
                    await api.post("/menu-items", formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                }

                resetForm();
                setOpen(false);
                setEditingItem(null);
                setImageFile(null);
                setImagePreview(null);
                fetchItems();
            } catch (err: any) {
                alert(
                    err.response?.data?.message ||
                        `Error ${editingItem ? "updating" : "adding"} product`,
                );
            } finally {
                setLoading(false);
            }
        };

        const deleteItem = async (id: number, name: string) => {
            if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;

            try {
                await api.delete(`/menu-items/${id}`);
                fetchItems();
            } catch (err: any) {
                alert("Error deleting product");
            }
        };

        const editItem = (item: any) => {
            setEditingItem(item);
            setForm({
                name: item.name,
                description: item.description || "",
                category: item.category,
                price: item.price.toString(),
                stock_quantity: item.stock_quantity?.toString() || "",
                low_stock_threshold: item.low_stock_threshold?.toString() || "",
                is_active: item.is_active,
            });
            if (item.image_url) {
                setImagePreview(item.image_url);
            } else {
                setImagePreview(null);
            }
            setImageFile(null);
            setOpen(true);
        };

        const resetForm = () => {
            setForm({
                name: "",
                description: "",
                category: "Drinks",
                price: "",
                stock_quantity: "",
                low_stock_threshold: "",
                is_active: true,
            });
            setImageFile(null);
            setImagePreview(null);
        };

        const getCategoryIcon = (category: string) => {
            switch (category) {
                case "Drinks":
                    return <Coffee className="w-3.5 h-3.5" />;
                case "Meals":
                    return <Utensils className="w-3.5 h-3.5" />;
                case "Desserts":
                    return <Cake className="w-3.5 h-3.5" />;
                default:
                    return <Package className="w-3.5 h-3.5" />;
            }
        };

        const getCategoryColor = (category: string) => {
            switch (category) {
                case "Drinks":
                    return "bg-blue-100 text-blue-700";
                case "Meals":
                    return "bg-orange-100 text-orange-700";
                case "Desserts":
                    return "bg-pink-100 text-pink-700";
                default:
                    return "bg-gray-100 text-gray-700";
            }
        };

        // Filter and sort items
        const filteredAndSortedItems = items
            .filter((item) => {
                const matchesSearch =
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.description
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase());
                const matchesCategory =
                    categoryFilter === "All" || item.category === categoryFilter;
                const matchesStatus =
                    statusFilter === "All" ||
                    (statusFilter === "Active" && item.is_active) ||
                    (statusFilter === "Inactive" && !item.is_active);
                return matchesSearch && matchesCategory && matchesStatus;
            })
            .sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                if (sortBy === "price" || sortBy === "stock_quantity") {
                    aVal = Number(aVal);
                    bVal = Number(bVal);
                }

                if (sortOrder === "asc") {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });

        const toggleSort = (field: string) => {
            if (sortBy === field) {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            } else {
                setSortBy(field);
                setSortOrder("asc");
            }
        };

        const getStockStatus = (item: any) => {
            if (item.stock_quantity <= 0)
                return {
                    label: "Out of Stock",
                    color: "bg-red-100 text-red-700",
                };
            if (item.stock_quantity <= item.low_stock_threshold)
                return {
                    label: "Low Stock",
                    color: "bg-yellow-100 text-yellow-700",
                };
            return { label: "In Stock", color: "bg-green-100 text-green-700" };
        };

        return (
            <>
                {/* ----------------------------------------------------------------- */}
                {/* CUSTOM SCROLLBAR STYLES — SLIM ORANGE (AUTO-HIDE)                 */}
                {/* ----------------------------------------------------------------- */}
                <style>
                    {`
                        /* ============ MODAL BODY SCROLLBAR ============ */
                        .menu-modal-scroll {
                            scrollbar-width: thin;
                            scrollbar-color: ${ORANGE} transparent;
                        }
                        .menu-modal-scroll::-webkit-scrollbar {
                            width: 6px;
                        }
                        .menu-modal-scroll::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .menu-modal-scroll::-webkit-scrollbar-thumb {
                            background-color: ${ORANGE};
                            border-radius: 999px;
                            transition: background-color 0.2s ease;
                        }
                        .menu-modal-scroll::-webkit-scrollbar-thumb:hover {
                            background-color: ${ORANGE_HOVER};
                        }
                        .menu-modal-scroll::-webkit-scrollbar-button {
                            display: none;
                        }

                        /* ============ GLOBAL PAGE SCROLLBAR (html/body) ============ */
                        /* Ito ang gagamitin ng browser kapag nag-scroll ang buong page */
                        html, body {
                            scrollbar-width: thin;
                            scrollbar-color: ${ORANGE} transparent;
                        }
                        html::-webkit-scrollbar,
                        body::-webkit-scrollbar {
                            width: 8px;
                        }
                        html::-webkit-scrollbar-track,
                        body::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        html::-webkit-scrollbar-thumb,
                        body::-webkit-scrollbar-thumb {
                            background-color: ${ORANGE};
                            border-radius: 999px;
                        }
                        html::-webkit-scrollbar-thumb:hover,
                        body::-webkit-scrollbar-thumb:hover {
                            background-color: ${ORANGE_HOVER};
                        }
                    `}
                </style>

                {/* 🔥 WALANG min-h-screen at WALANG scrollbar class dito.
                    Ang scroll ay magmumula sa <body> (global scroll),
                    kaya walang scrollbar kapag kasya pa sa screen. */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Header */}
                        <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                            <div>
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-orange-500 uppercase mb-1 font-['IBM_Plex_Mono']">
                                    Restaurant management
                                </p>
                                <h1 className="font-['Space_Grotesk'] text-[28px] font-semibold text-gray-900 tracking-tight m-0">
                                    Menu Management
                                </h1>
                                <p className="text-[13px] text-gray-500 mt-1">
                                    Manage your restaurant's menu items and
                                    inventory
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    resetForm();
                                    setEditingItem(null);
                                    setOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium text-white transition-colors shadow-sm"
                                style={{ backgroundColor: ORANGE }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        ORANGE_HOVER;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        ORANGE;
                                }}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Menu Item
                            </button>
                        </div>

                        {/* Toolbar — Search + Filter + Sort */}
                        <div className="bg-white rounded-lg border border-gray-100 p-3 mb-5 flex flex-col sm:flex-row gap-3 shadow-sm">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search menu items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-gray-50"
                                />
                            </div>

                            {/* Filter toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium transition-colors border ${
                                    showFilters
                                        ? "bg-orange-50 border-orange-200 text-orange-700"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Filters
                                <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform ${
                                        showFilters ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {/* Sort */}
                            <button
                                onClick={() => toggleSort(sortBy)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                Sort: {sortBy} ({sortOrder})
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="bg-white rounded-lg border border-gray-100 p-4 mb-5 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Category Filter */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-2">
                                            Category
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                "All",
                                                "Drinks",
                                                "Meals",
                                                "Desserts",
                                            ].map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() =>
                                                        setCategoryFilter(cat)
                                                    }
                                                    style={
                                                        categoryFilter === cat
                                                            ? {
                                                                backgroundColor:
                                                                    ORANGE,
                                                            }
                                                            : undefined
                                                    }
                                                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                                                        categoryFilter === cat
                                                            ? "text-white shadow-sm"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {cat !== "All" &&
                                                        getCategoryIcon(cat)}
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-2">
                                            Status
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {["All", "Active", "Inactive"].map(
                                                (status) => (
                                                    <button
                                                        key={status}
                                                        onClick={() =>
                                                            setStatusFilter(status)
                                                        }
                                                        style={
                                                            statusFilter === status
                                                                ? {
                                                                    backgroundColor:
                                                                        ORANGE,
                                                                }
                                                                : undefined
                                                        }
                                                        className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                                                            statusFilter === status
                                                                ? "text-white shadow-sm"
                                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {status}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Menu Items Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredAndSortedItems.length === 0 ? (
                                <div className="col-span-full bg-white rounded-lg border border-gray-100 shadow-sm p-12 text-center">
                                    <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">
                                        No menu items found
                                    </p>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {searchTerm ||
                                        categoryFilter !== "All" ||
                                        statusFilter !== "All"
                                            ? "Try adjusting your filters"
                                            : "Click 'Add Menu Item' to get started"}
                                    </p>
                                </div>
                            ) : (
                                filteredAndSortedItems.map((item) => {
                                    const stockStatus = getStockStatus(item);
                                    return (
                                        <div
                                            key={item.id}
                                            className="group bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_12px_28px_-8px_rgba(28,36,32,0.25)] hover:border-orange-200"
                                        >
                                            {/* Image — h-48 */}
                                            <div className="relative h-48 overflow-hidden bg-gray-100">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        {getCategoryIcon(
                                                            item.category,
                                                        )}
                                                    </div>
                                                )}
                                                {!item.is_active && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <span className="bg-red-500 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold">
                                                            Unavailable
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${getCategoryColor(
                                                            item.category,
                                                        )}`}
                                                    >
                                                        {getCategoryIcon(
                                                            item.category,
                                                        )}
                                                        {item.category}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-3">
                                                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                                    <h3 className="text-[13px] font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">
                                                        {item.name}
                                                    </h3>
                                                    <div className="flex gap-0.5 flex-shrink-0">
                                                        <button
                                                            onClick={() =>
                                                                editItem(item)
                                                            }
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                deleteItem(
                                                                    item.id,
                                                                    item.name,
                                                                )
                                                            }
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {item.description && (
                                                    <p className="text-[10px] text-gray-500 mb-1.5 line-clamp-1">
                                                        {item.description}
                                                    </p>
                                                )}

                                                <p className="font-['IBM_Plex_Mono'] text-[15px] font-bold text-orange-600 mb-2">
                                                    ₱
                                                    {Number(item.price).toFixed(2)}
                                                </p>

                                                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-gray-100 text-gray-700 font-['IBM_Plex_Mono']">
                                                        <Package className="w-2.5 h-2.5" />
                                                        {item.stock_quantity}
                                                    </span>
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${
                                                            item.is_active
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-700"
                                                        }`}
                                                    >
                                                        {item.is_active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${stockStatus.color}`}
                                                    >
                                                        {stockStatus.label}
                                                    </span>
                                                    {item.stock_quantity <=
                                                        item.low_stock_threshold &&
                                                        item.stock_quantity > 0 && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-yellow-100 text-yellow-700">
                                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                                Low
                                                            </span>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add/Edit Modal */}
                        {open && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg overflow-hidden shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                                    {/* Modal Header */}
                                    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-[15px] font-semibold text-gray-900">
                                                {editingItem
                                                    ? "Edit Menu Item"
                                                    : "Add New Menu Item"}
                                            </h2>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {editingItem
                                                    ? "Update the details below"
                                                    : "Fill in the details to add a new item"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setOpen(false);
                                                setEditingItem(null);
                                                resetForm();
                                            }}
                                            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>

                                    {/* Modal Body — SCROLLBAR LALABAS LANG KAPAG KAILANGAN */}
                                    <div className="menu-modal-scroll flex-1 overflow-y-auto p-5">
                                        {/* Image Upload */}
                                        <div className="mb-5">
                                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-2">
                                                Item Image
                                            </label>
                                            <div className="flex justify-center px-4 py-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-400 transition-colors">
                                                {imagePreview ? (
                                                    <div className="relative">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="h-40 w-auto object-cover rounded-md"
                                                        />
                                                        <button
                                                            onClick={removeImage}
                                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5 text-center">
                                                        <Upload className="mx-auto h-10 w-10 text-gray-400" />
                                                        <div className="flex text-[13px] text-gray-600 justify-center">
                                                            <label
                                                                htmlFor="image-upload"
                                                                className="cursor-pointer font-medium text-orange-600 hover:text-orange-500"
                                                            >
                                                                <span>
                                                                    Upload a file
                                                                </span>
                                                                <input
                                                                    id="image-upload"
                                                                    name="image-upload"
                                                                    type="file"
                                                                    className="sr-only"
                                                                    accept="image/*"
                                                                    onChange={
                                                                        handleImageSelect
                                                                    }
                                                                    ref={
                                                                        fileInputRef
                                                                    }
                                                                />
                                                            </label>
                                                            <p className="pl-1">
                                                                or drag and drop
                                                            </p>
                                                        </div>
                                                        <p className="text-[11px] text-gray-400">
                                                            PNG, JPG, GIF up to 2MB
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Item Name{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </label>
                                                <input
                                                    placeholder="e.g., Chicken Adobo"
                                                    value={form.name}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            name: e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Description
                                                </label>
                                                <textarea
                                                    placeholder="Describe the item..."
                                                    rows={2}
                                                    value={form.description}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            description:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Category{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </label>
                                                <select
                                                    value={form.category}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            category: e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                >
                                                    <option value="Drinks">
                                                        Drinks
                                                    </option>
                                                    <option value="Meals">
                                                        Meals
                                                    </option>
                                                    <option value="Desserts">
                                                        Desserts
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Price (₱){" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={form.price}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            price: e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Stock Quantity
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={form.stock_quantity}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            stock_quantity:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Low Stock Threshold
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="10"
                                                    value={form.low_stock_threshold}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            low_stock_threshold:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide font-['IBM_Plex_Mono'] mb-1.5">
                                                    Status
                                                </label>
                                                <select
                                                    value={
                                                        form.is_active ? "1" : "0"
                                                    }
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            is_active:
                                                                e.target.value ===
                                                                "1",
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                                                >
                                                    <option value="1">
                                                        Available
                                                    </option>
                                                    <option value="0">
                                                        Unavailable
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="sticky bottom-0 z-20 bg-gray-50 border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setOpen(false);
                                                setEditingItem(null);
                                                resetForm();
                                            }}
                                            className="px-3.5 py-2 border border-gray-200 rounded-md text-[13px] font-medium text-gray-700 hover:bg-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="px-3.5 py-2 rounded-md text-[13px] font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            style={{ backgroundColor: ORANGE }}
                                            onMouseEnter={(e) => {
                                                if (!loading)
                                                    e.currentTarget.style.backgroundColor =
                                                        ORANGE_HOVER;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    ORANGE;
                                            }}
                                        >
                                            {loading && (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            )}
                                            {loading
                                                ? editingItem
                                                    ? "Updating..."
                                                    : "Adding..."
                                                : editingItem
                                                ? "Update Item"
                                                : "Save Item"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }