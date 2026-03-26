import { useEffect, useState, useCallback } from "react";
import { getRooms, deleteRoom } from "@/services/roomService";
import RoomCard from "@/components/RoomCard";
import EditRoomModal from "@/components/AdminComponents/EditRoomModal";
import AddRoomModal from "@/components/AdminComponents/AddRoomModal";

export default function Rooms() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    const fetchRooms = useCallback(async (silent = false) => {
        try {
            const res = await getRooms();

            setRooms(prev => {
                const isSame = JSON.stringify(prev) === JSON.stringify(res.data);

                if (isSame) {
                    return prev; // ❌ no update → no re-render → no image reload
                }

                return res.data; // ✔ update only if changed
            });

            // ✅ SAVE CACHE
            sessionStorage.setItem("rooms_cache", JSON.stringify(res.data));

        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        const cached = sessionStorage.getItem("rooms_cache");

        if (cached) {
            const data = JSON.parse(cached);
            setRooms(data);

            fetchRooms(true); // 🔥 silent update
        } else {
            fetchRooms(); // first load
        }
    }, [fetchRooms]);

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this room?")) return;

        await deleteRoom(id);

        // ✅ NO FULL REFETCH (FASTER)
        setRooms(prev => {
            const updated = prev.filter(r => r.id !== id);

            // ✅ UPDATE CACHE
            sessionStorage.setItem("rooms_cache", JSON.stringify(updated));

            return updated;
        });
    };

    return (
        <div>
            <div className="flex justify-between mb-6">
                <h1 className="text-2xl font-bold">Rooms</h1>

                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    + Add Room
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {rooms.map(room => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onEdit={(room: any) => {
                            setSelectedRoom(room);
                            setTimeout(() => setEditOpen(true), 0);
                        }}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {open && (
                <AddRoomModal
                    onClose={() => setOpen(false)}
                    refresh={fetchRooms}
                />
            )}

            {editOpen && selectedRoom && (
                <EditRoomModal
                    room={selectedRoom}
                    onClose={() => {
                        setEditOpen(false);
                        setSelectedRoom(null); // 🔥 IMPORTANT
                    }}
                    refresh={fetchRooms}
                />
            )}
        </div>
    );
}