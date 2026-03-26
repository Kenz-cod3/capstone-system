import { useEffect, useState } from "react";
import { updateRoom, uploadRoomImage } from "@/services/roomService";
import { getRoomTypesCached } from "@/services/roomTypeService";

export default function EditRoomModal({ room, onClose, refresh }: any) {
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);

    // ✅ PREVIEW STATE (IMPORTANT)
    const [preview, setPreview] = useState<string | null>(
        room?.image_url || null
    );

    const [form, setForm] = useState({
        room_number: room?.room_number || "",
        room_type_id: room?.room_type_id || "",
        status: room?.status || "available",
    });

    useEffect(() => {
        getRoomTypesCached().then(setRoomTypes);
    }, []);

    // ✅ UPDATE FORM + PREVIEW WHEN ROOM CHANGES
    useEffect(() => {
        if (room) {
            setForm({
                room_number: room.room_number,
                room_type_id: room.room_type_id || "",
                status: room.status,
            });

            setPreview(room.image_url || null);
        }
    }, [room]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        try {
            await updateRoom(room.id, {
                room_number: form.room_number,
                room_type_id: form.room_type_id
                    ? Number(form.room_type_id)
                    : null,
                status: form.status,
            });

            if (file) {
                const fd = new FormData();
                fd.append("room_id", room.id);
                fd.append("image", file);
                await uploadRoomImage(fd);
            }

            alert("✅ Room updated!");

            refresh();
            onClose();
        } catch (err: any) {
            console.error(err.response?.data);
            alert("❌ Update failed");
        }
    };

    if (!room) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-6 rounded w-96"
            >
                <h2 className="text-xl font-bold mb-4">Edit Room</h2>

                {/* ✅ IMAGE PREVIEW (EXISTING OR NEW) */}
                {preview && (
                    <img
                        src={preview}
                        className="w-full h-40 object-cover rounded mb-3"
                    />
                )}

                {/* ROOM NUMBER */}
                <input
                    className="border w-full p-2 mb-2"
                    value={form.room_number}
                    onChange={(e) =>
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
                    onChange={(e) =>
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
                    onChange={(e) =>
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

                {/* FILE INPUT */}
                <input
                    type="file"
                    className="mb-3"
                    onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        setFile(selected);

                        if (selected) {
                            setPreview(URL.createObjectURL(selected));
                        }
                    }}
                />

                {/* BUTTONS */}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-400 px-4 py-2 text-white rounded"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="bg-green-500 px-4 py-2 text-white rounded"
                    >
                        Update
                    </button>
                </div>
            </form>
        </div>
    );
}