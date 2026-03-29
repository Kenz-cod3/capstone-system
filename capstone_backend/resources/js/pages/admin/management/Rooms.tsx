import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRooms, deleteRoom } from "@/services/roomService";
import RoomCard from "@/components/RoomCard";
import EditRoomModal from "@/components/AdminComponents/EditRoomModal";
import AddRoomModal from "@/components/AdminComponents/AddRoomModal";

interface Room {
    id: number;
    room_number: string;
    status: string;
    image_url?: string;
    updated_at?: string;
    room_type?: {
        type_name: string;
        base_price: number;
    };
}

export default function Rooms() {
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    const queryClient = useQueryClient();

    // ✅ FETCH ROOMS
    const { data: rooms = [], isLoading } = useQuery<Room[]>({
        queryKey: ["rooms"],
        queryFn: async () => {
            const res = await getRooms();
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    // ✅ DELETE ROOM
    const deleteMutation = useMutation({
        mutationFn: deleteRoom,
        onSuccess: (_, id) => {
            queryClient.setQueryData(["rooms"], (old: any[] = []) =>
                old.filter(r => r.id !== id)
            );
        },
    });

    const handleDelete = (id: number) => {
        if (!confirm("Delete this room?")) return;
        deleteMutation.mutate(id);
    };

    if (isLoading) {
        return <p className="p-6 text-gray-500">Loading rooms...</p>;
    }

    return (
        <div>
            <div className="flex justify-between pt-4 mb-6">
                <h1 className="text-2xl font-bold">Rooms</h1>

                <button
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
                            setEditOpen(true);
                        }}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* ADD */}
            {open && (
                <AddRoomModal
                    onClose={() => setOpen(false)}
                   refresh={() => queryClient.invalidateQueries({ queryKey: ["rooms"] })}
                />
            )}

            {/* EDIT */}
            {editOpen && selectedRoom && (
                <EditRoomModal
                    room={selectedRoom}
                    onClose={() => {
                        setEditOpen(false);
                        setSelectedRoom(null);
                    }}
                    refresh={() => queryClient.invalidateQueries({ queryKey: ["rooms"] })}
                />
            )}
        </div>
    );
}

// import { useEffect, useState, useCallback } from "react";
// import { getRooms, deleteRoom } from "@/services/roomService";
// import RoomCard from "@/components/RoomCard";
// import EditRoomModal from "@/components/AdminComponents/EditRoomModal";
// import AddRoomModal from "@/components/AdminComponents/AddRoomModal";

// export default function Rooms() {
//     const [rooms, setRooms] = useState<any[]>([]);
//     const [open, setOpen] = useState(false);
//     const [editOpen, setEditOpen] = useState(false);
//     const [selectedRoom, setSelectedRoom] = useState<any>(null);

//     const fetchRooms = useCallback(async (silent = false) => {
//         try {
//             const res = await getRooms();

//             setRooms(prev => {
//                 const isSame = JSON.stringify(prev) === JSON.stringify(res.data);

//                 if (isSame) {
//                     return prev; // ❌ no update → no re-render → no image reload
//                 }

//                 return res.data; // ✔ update only if changed
//             });

//             // ✅ SAVE CACHE
//             sessionStorage.setItem("rooms_cache", JSON.stringify(res.data));

//         } catch (error) {
//             console.error(error);
//         }
//     }, []);

//     useEffect(() => {
//         const cached = sessionStorage.getItem("rooms_cache");

//         if (cached) {
//             const data = JSON.parse(cached);
//             setRooms(data);

//             fetchRooms(true); // 🔥 silent update
//         } else {
//             fetchRooms(); // first load
//         }
//     }, [fetchRooms]);

//     const handleDelete = async (id: number) => {
//         if (!confirm("Delete this room?")) return;

//         await deleteRoom(id);

//         // ✅ NO FULL REFETCH (FASTER)
//         setRooms(prev => {
//             const updated = prev.filter(r => r.id !== id);

//             // ✅ UPDATE CACHE
//             sessionStorage.setItem("rooms_cache", JSON.stringify(updated));

//             return updated;
//         });
//     };

//     return (
//         <div>
//             <div className="flex justify-between mb-6">
//                 <h1 className="text-2xl font-bold">Rooms</h1>

//                 <button
//                     type="button"
//                     onClick={() => setOpen(true)}
//                     className="bg-blue-500 text-white px-4 py-2 rounded"
//                 >
//                     + Add Room
//                 </button>
//             </div>

//             <div className="grid grid-cols-4 gap-4">
//                 {rooms.map(room => (
//                     <RoomCard
//                         key={room.id}
//                         room={room}
//                         onEdit={(room: any) => {
//                             setSelectedRoom(room);
//                             setTimeout(() => setEditOpen(true), 0);
//                         }}
//                         onDelete={handleDelete}
//                     />
//                 ))}
//             </div>

//             {open && (
//                 <AddRoomModal
//                     onClose={() => setOpen(false)}
//                     refresh={fetchRooms}
//                 />
//             )}

//             {editOpen && selectedRoom && (
//                 <EditRoomModal
//                     room={selectedRoom}
//                     onClose={() => {
//                         setEditOpen(false);
//                         setSelectedRoom(null); // 🔥 IMPORTANT
//                     }}
//                     refresh={fetchRooms}
//                 />
//             )}
//         </div>
//     );
// }