import { useEffect, useState, useRef } from "react";
import api from "@/services/api";
import { 
    Plus, 
    Trash2, 
    Edit, 
    Search, 
    X, 
    AlertCircle, 
    CheckCircle, 
    Package, 
    Coffee, 
    Utensils, 
    Cake,
    AlertTriangle,
    Loader2,
    Filter,
    ChevronDown,
    ChevronUp,
    Upload,
    Image as ImageIcon
} from "lucide-react";

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
            if (!file.type.startsWith('image/')) {
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
            fileInputRef.current.value = '';
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
            formData.append('name', form.name);
            formData.append('description', form.description || '');
            formData.append('category', form.category);
            formData.append('price', form.price);
            formData.append('stock_quantity', form.stock_quantity || '0');
            formData.append('low_stock_threshold', form.low_stock_threshold || '0');
            formData.append('is_active', form.is_active ? '1' : '0');
            
            if (imageFile) {
                formData.append('image', imageFile);
            }

            if (editingItem) {
                formData.append('_method', 'PUT');
                await api.post(`/menu-items/${editingItem.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/menu-items', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            resetForm();
            setOpen(false);
            setEditingItem(null);
            setImageFile(null);
            setImagePreview(null);
            fetchItems();
        } catch (err: any) {
            alert(err.response?.data?.message || `Error ${editingItem ? "updating" : "adding"} product`);
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
        switch(category) {
            case "Drinks": return <Coffee className="w-4 h-4" />;
            case "Meals": return <Utensils className="w-4 h-4" />;
            case "Desserts": return <Cake className="w-4 h-4" />;
            default: return <Package className="w-4 h-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch(category) {
            case "Drinks": return "bg-blue-100 text-blue-700";
            case "Meals": return "bg-orange-100 text-orange-700";
            case "Desserts": return "bg-pink-100 text-pink-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    // Filter and sort items
    const filteredAndSortedItems = items
        .filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (item.description?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
            const matchesStatus = statusFilter === "All" || 
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
        if (item.stock_quantity <= 0) return { label: "Out of Stock", color: "bg-red-100 text-red-700" };
        if (item.stock_quantity <= item.low_stock_threshold) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700" };
        return { label: "In Stock", color: "bg-green-100 text-green-700" };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-8 h-8 text-orange-500" />
                            Menu Management
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Manage your restaurant's menu items and inventory
                        </p>
                    </div>
                    
                    <button
                        onClick={() => {
                            resetForm();
                            setEditingItem(null);
                            setOpen(true);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Add Menu Item
                    </button>
                </div>

                {/* Search and Filters - Keep your existing code */}
                {/* ... (keep your existing search and filters section) ... */}

                {/* Statistics Summary - Keep your existing code */}
                {/* ... (keep your existing statistics section) ... */}

                {/* Menu Items Grid with Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedItems.length === 0 ? (
                        <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No menu items found</p>
                            <p className="text-gray-400 text-sm mt-2">
                                {searchTerm || categoryFilter !== "All" || statusFilter !== "All" 
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
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden"
                                >
                                    {/* Image Section */}
                                    {item.image_url && (
                                        <div className="relative h-48 overflow-hidden bg-gray-100">
                                            <img 
                                                src={item.image_url} 
                                                alt={item.name}
                                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                            />
                                            {!item.is_active && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                        Unavailable
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {getCategoryIcon(item.category)}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                                                        {item.category}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {item.name}
                                                </h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => editItem(item)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(item.id, item.name)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Description */}
                                        {item.description && (
                                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}
                                        
                                        {/* Price and Stock */}
                                        <div className="space-y-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold text-orange-600">
                                                    ₱{Number(item.price).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    Stock: {item.stock_quantity} units
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Status Badges */}
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                item.is_active 
                                                    ? "bg-green-100 text-green-700" 
                                                    : "bg-gray-100 text-gray-700"
                                            }`}>
                                                {item.is_active ? "Active" : "Inactive"}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                                {stockStatus.label}
                                            </span>
                                            {item.stock_quantity <= item.low_stock_threshold && item.stock_quantity > 0 && (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Low Stock Alert
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Add/Edit Modal with Image Upload */}
                {open && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {editingItem ? "Update the details below" : "Fill in the details to add a new item"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setEditingItem(null);
                                        resetForm();
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="p-6">
                                {/* Image Upload Section */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Item Image
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-orange-500 transition-colors">
                                        {imagePreview ? (
                                            <div className="relative">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Preview" 
                                                    className="h-40 w-auto object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={removeImage}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                <div className="flex text-sm text-gray-600">
                                                    <label
                                                        htmlFor="image-upload"
                                                        className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none"
                                                    >
                                                        <span>Upload a file</span>
                                                        <input
                                                            id="image-upload"
                                                            name="image-upload"
                                                            type="file"
                                                            className="sr-only"
                                                            accept="image/*"
                                                            onChange={handleImageSelect}
                                                            ref={fileInputRef}
                                                        />
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    PNG, JPG, GIF up to 2MB
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Item Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            placeholder="e.g., Chicken Adobo"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            placeholder="Describe the item..."
                                            rows={3}
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        >
                                            <option value="Drinks">Drinks</option>
                                            <option value="Meals">Meals</option>
                                            <option value="Desserts">Desserts</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Price (₱) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={form.price}
                                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Stock Quantity
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={form.stock_quantity}
                                            onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Low Stock Threshold
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="10"
                                            value={form.low_stock_threshold}
                                            onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={form.is_active ? "1" : "0"}
                                            onChange={(e) => setForm({ ...form, is_active: e.target.value === "1" })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        >
                                            <option value="1">Available</option>
                                            <option value="0">Unavailable</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setEditingItem(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {loading ? (editingItem ? "Updating..." : "Adding...") : (editingItem ? "Update Item" : "Save Item")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}