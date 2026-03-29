import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AdminMenu() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        description: "",
        category: "Drinks",
        price: "",
        stock_quantity: "",
        low_stock_threshold: "",
        is_active: true,
    });

    // 🔹 FETCH MENU
    const fetchItems = async () => {
        try {
            const res = await api.get("/menu-items");
            setItems(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // 🔹 ADD PRODUCT
    const handleSubmit = async () => {
        if (!form.name || !form.price) {
            alert("Name and price required");
            return;
        }

        setLoading(true);

        try {
            await api.post("/menu-items", {
                name: form.name,
                description: form.description,
                category: form.category,
                price: Number(form.price),
                stock_quantity: Number(form.stock_quantity || 0),
                low_stock_threshold: Number(form.low_stock_threshold || 0),
                is_active: form.is_active,
            });

            // reset form
            setForm({
                name: "",
                description: "",
                category: "Drinks",
                price: "",
                stock_quantity: "",
                low_stock_threshold: "",
                is_active: true,
            });

            fetchItems();
        } catch (err: any) {
            alert(err.response?.data?.message || "Error adding product");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 DELETE PRODUCT
    const deleteItem = async (id: number) => {
        if (!confirm("Delete this product?")) return;

        try {
            await api.delete(`/menu-items/${id}`);
            fetchItems();
        } catch {
            alert("Cannot delete (maybe used in orders)");
        }
    };

    return (
        <div className="pt-5 space-y-6">

            {/* 🔥 ADD PRODUCT FORM */}
            <div className="bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-bold mb-4">Add Menu Item</h2>

                <div className="grid grid-cols-2 gap-4">

                    <input
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                        className="border p-2 rounded"
                    />

                    <input
                        placeholder="Price"
                        type="number"
                        value={form.price}
                        onChange={(e) =>
                            setForm({ ...form, price: e.target.value })
                        }
                        className="border p-2 rounded"
                    />

                    <input
                        placeholder="Stock Quantity"
                        type="number"
                        value={form.stock_quantity}
                        onChange={(e) =>
                            setForm({ ...form, stock_quantity: e.target.value })
                        }
                        className="border p-2 rounded"
                    />

                    <input
                        placeholder="Low Stock Alert"
                        type="number"
                        value={form.low_stock_threshold}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                low_stock_threshold: e.target.value
                            })
                        }
                        className="border p-2 rounded"
                    />

                    <select
                        value={form.category}
                        onChange={(e) =>
                            setForm({ ...form, category: e.target.value })
                        }
                        className="border p-2 rounded"
                    >
                        <option value="Drinks">Drinks</option>
                        <option value="Meals">Meals</option>
                        <option value="Desserts">Desserts</option>
                    </select>

                    <select
                        value={form.is_active ? "1" : "0"}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                is_active: e.target.value === "1"
                            })
                        }
                        className="border p-2 rounded"
                    >
                        <option value="1">Available</option>
                        <option value="0">Unavailable</option>
                    </select>

                    <textarea
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                        }
                        className="border p-2 rounded col-span-2"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-4 bg-green-600 text-white px-6 py-2 rounded"
                >
                    {loading ? "Adding..." : "Add Menu Item"}
                </button>
            </div>

            {/* 🔥 PRODUCT LIST */}
            <div className="bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-bold mb-4">Menu Items</h2>

                {items.length === 0 ? (
                    <p>No items yet</p>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">

                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex justify-between items-center border p-3 rounded"
                            >
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-gray-500">
                                        ₱{item.price} | Stock: {item.stock_quantity}
                                    </p>

                                    {item.stock_quantity <= item.low_stock_threshold && (
                                        <p className="text-red-500 text-xs">
                                            ⚠️ Low stock
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => deleteItem(item.id)}
                                    className="text-red-500"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}