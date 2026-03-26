import { useEffect, useState } from "react";
import { createRoom, uploadRoomImage } from "@/services/roomService";
import { getRoomTypesCached } from "@/services/roomTypeService";

export default function AddRoomModal({ onClose, refresh }: any) {
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [form, setForm] = useState({
        room_number: "",
        room_type_id: "",
        status: "available",
    });

    useEffect(() => {
        getRoomTypesCached().then(setRoomTypes);
    }, []);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        // ✅ VALIDATION
        if (!form.room_number) {
            alert("Room number is required");
            return;
        }

        if (!form.room_type_id) {
            alert("Please select room type");
            return;
        }

        try {
            const res = await createRoom({
                ...form,
                room_type_id: Number(form.room_type_id),
            });

            if (file) {
                const fd = new FormData();
                fd.append("room_id", res.data.data.id);
                fd.append("image", file);
                await uploadRoomImage(fd);
            }

            alert("✅ Room added successfully!");

            refresh();
            onClose();
        } catch (err: any) {
            console.error(err);

            // 🔥 SHOW BACKEND ERROR
            if (err.response?.data?.errors) {
                console.log(err.response.data.errors);
                alert(JSON.stringify(err.response.data.errors));
            } else {
                alert("❌ Failed to add room");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <form className="bg-white p-6 rounded w-96" onSubmit={handleSubmit}>
                <h2 className="text-xl font-bold mb-4">Add Room</h2>

                {/* ROOM NUMBER */}
                <input
                    className="border w-full p-2 mb-2"
                    placeholder="Room Number"
                    onChange={e =>
                        setForm(prev => ({
                            ...prev,
                            room_number: e.target.value,
                        }))
                    }
                />

                {/* ROOM TYPE */}
                <select
                    className="border w-full p-2 mb-2"
                    value={form.room_type_id}
                    onChange={e =>
                        setForm(prev => ({
                            ...prev,
                            room_type_id: e.target.value,
                        }))
                    }
                >
                    <option value="">Select Type</option>
                    {roomTypes.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.type_name} - ₱{t.base_price}
                        </option>
                    ))}
                </select>

                {/* STATUS */}
                <select
                    className="border w-full p-2 mb-2"
                    value={form.status}
                    onChange={e =>
                        setForm(prev => ({
                            ...prev,
                            status: e.target.value,
                        }))
                    }
                >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                </select>

                {/* IMAGE INPUT */}
                <input
                    type="file"
                    className="mb-2"
                    onChange={e => {
                        const selected = e.target.files?.[0] || null;
                        setFile(selected);

                        if (selected) {
                            setPreview(URL.createObjectURL(selected));
                        }
                    }}
                />

                {/* PREVIEW */}
                {preview && (
                    <img
                        src={preview}
                        className="w-full h-40 object-cover rounded mb-3"
                    />
                )}

                {/* BUTTON */}
                <button className="bg-blue-500 text-white px-4 py-2 w-full rounded">
                    Save
                </button>
            </form>
        </div>
    );
}