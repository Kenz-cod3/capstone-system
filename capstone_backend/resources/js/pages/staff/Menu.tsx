import React, { useEffect, useState } from "react";
import StaffLayout from "@/layouts/StaffLayout";
import api from "@/services/api";

export default function Menu() {
    const [items, setItems] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const res = await api.get("/menu-items");
        setItems(res.data);
    };

    const addItem = async () => {
        await api.post("/menu-items", {
            name,
            price,
        });

        setName("");
        setPrice("");
        fetchItems();
    };

    const deleteItem = async (id: number) => {
        await api.delete(`/menu-items/${id}`);
        fetchItems();
    };

    return (
        <StaffLayout>
            <h1 className="text-2xl font-bold mb-4">Menu Management</h1>

            {/* ➕ ADD ITEM */}
            <div className="bg-white p-4 rounded shadow mb-4">
                <input
                    type="text"
                    placeholder="Item name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border p-2 mr-2"
                />

                <input
                    type="number"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="border p-2 mr-2"
                />

                <button
                    onClick={addItem}
                    className="bg-blue-500 text-white px-3 py-2 rounded"
                >
                    Add
                </button>
            </div>

            {/* 📋 LIST */}
            <div className="bg-white p-4 rounded shadow">
                {items.map((item) => (
                    <div key={item.id} className="flex justify-between border-b py-2">
                        <span>{item.name} - ₱{item.price}</span>

                        <button
                            onClick={() => deleteItem(item.id)}
                            className="text-red-500"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </StaffLayout>
    );
}