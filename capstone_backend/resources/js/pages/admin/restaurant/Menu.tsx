import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AdminMenu() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false); // 🔥 modal state

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
        const res = await api.get("/menu-items");
        setItems(res.data);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleSubmit = async () => {
        if (!form.name || !form.price) {
            alert("Name and price required");
            return;
        }

        setLoading(true);

        try {
            await api.post("/menu-items", {
                ...form,
                price: Number(form.price),
                stock_quantity: Number(form.stock_quantity || 0),
                low_stock_threshold: Number(form.low_stock_threshold || 0),
            });

            setForm({
                name: "",
                description: "",
                category: "Drinks",
                price: "",
                stock_quantity: "",
                low_stock_threshold: "",
                is_active: true,
            });

            setOpen(false); // 🔥 close modal
            fetchItems();
        } catch (err: any) {
            alert(err.response?.data?.message || "Error adding product");
        } finally {
            setLoading(false);
        }
    };

    const deleteItem = async (id: number) => {
        if (!confirm("Delete this product?")) return;
        await api.delete(`/menu-items/${id}`);
        fetchItems();
    };

    return (
        <div className="pt-5 space-y-6">

            {/* 🔥 HEADER */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Menu Items</h2>

                <button
                    onClick={() => setOpen(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded"
                >
                    + Add Menu Item
                </button>
            </div>

            {/* 🔥 PRODUCT LIST */}
            <div className="bg-white p-6 rounded-xl shadow">
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

            {/* 🔥 MODAL */}
            {open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white p-6 rounded-xl shadow w-[500px] space-y-4">

                        <h2 className="text-lg font-bold">Add Menu Item</h2>

                        <div className="grid grid-cols-2 gap-3">

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
                                placeholder="Stock"
                                type="number"
                                value={form.stock_quantity}
                                onChange={(e) =>
                                    setForm({ ...form, stock_quantity: e.target.value })
                                }
                                className="border p-2 rounded"
                            />

                            <input
                                placeholder="Low Stock"
                                type="number"
                                value={form.low_stock_threshold}
                                onChange={(e) =>
                                    setForm({ ...form, low_stock_threshold: e.target.value })
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
                                <option>Drinks</option>
                                <option>Meals</option>
                                <option>Desserts</option>
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

                        {/* 🔥 ACTIONS */}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                className="bg-gray-300 px-4 py-2 rounded"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                {loading ? "Adding..." : "Save"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}