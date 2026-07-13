import { useState } from "react";
import { Modal, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRooms, deleteRoom } from "@/services/roomService";
import RoomCard from "@/components/AdminComponents/room/RoomCard";
import EditRoomModal from "@/components/AdminComponents/room/EditRoomModal";
import AddRoomModal from "@/components/AdminComponents/room/AddRoomModal";
import PanoramaModal from "@/components/AdminComponents/room/PanoramaModal";
import RoomTypeManager from "@/components/AdminComponents/room/RoomTypeManager";

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
    const [panoramaData, setPanoramaData] = useState<any>(null);
    const [roomTypeManagerOpen, setRoomTypeManagerOpen] = useState(false); // New state

    const queryClient = useQueryClient();

    // FETCH ROOMS
    const { data: rooms = [], isLoading } = useQuery<Room[]>({
        queryKey: ["rooms"],
        queryFn: async () => {
            const res = await getRooms();
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    // DELETE ROOM
    const deleteMutation = useMutation({
        mutationFn: deleteRoom,

        onSuccess: (_, id) => {

            queryClient.setQueryData(["rooms"], (old: any[] = []) =>
                old.filter(r => r.id !== id)
            );

            message.success("Room deleted successfully.");
        },

        onError: (err: any) => {

            Modal.warning({
                title: "Cannot Delete Room",
                content:
                    err.response?.data?.message ||
                    "The room is occupied and cannot be deleted.",
                okText: "OK",
                centered: true,
            });
        },
    });

    const handleDelete = (id: number) => {

        Modal.confirm({
            title: "Delete Room",
            content: "Are you sure you want to delete this room?",
            okText: "Delete",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            centered: true,

            onOk: () => {
                deleteMutation.mutate(id);
            }
        });
    };

    // Calculate stats with color coding
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status?.toLowerCase() === "available").length;
    const occupiedRooms = rooms.filter(r => r.status?.toLowerCase() === "occupied").length;
    const maintenanceRooms = rooms.filter(r => r.status?.toLowerCase() === "maintenance").length;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl animate-pulse"></div>
                            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                                <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300"></div>
                                <div className="p-4 space-y-3">
                                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Rooms Management
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">Manage all hotel rooms, track availability, and update details</p>
                    </div>
                    <div className="flex gap-3">
                        {/* NEW: Room Types Management Button */}
                        <button
                            onClick={() => setRoomTypeManagerOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Manage Room
                        </button>

                        {/* Existing Add Room Button */}
                        <button
                            onClick={() => setOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Room
                        </button>
                    </div>
                </div>

                {/* Stats Cards with Color Coding */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Total Rooms */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Rooms</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{totalRooms}</p>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-xl">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Available - GREEN */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Available</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">{availableRooms}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Occupied - BLUE */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Occupied</p>
                                <p className="text-3xl font-bold text-blue-600 mt-1">{occupiedRooms}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance - RED */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Maintenance</p>
                                <p className="text-3xl font-bold text-red-600 mt-1">{maintenanceRooms}</p>
                            </div>
                            <div className="p-3 bg-red-50 rounded-xl">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rooms Grid */}
                {rooms.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No rooms available</h3>
                        <p className="text-gray-500 mb-6">Get started by adding your first room to the system.</p>
                        <button
                            onClick={() => setOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Your First Room
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {rooms.map(room => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onEdit={(room: any) => {
                                    setSelectedRoom(room);
                                    setEditOpen(true);
                                }}
                                onDelete={handleDelete}
                                onView={(data: any) => setPanoramaData(data)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ADD MODAL */}
            {open && (
                <AddRoomModal
                    onClose={() => setOpen(false)}
                    refresh={() => queryClient.invalidateQueries({ queryKey: ["rooms"] })}
                />
            )}

            {/* EDIT MODAL */}
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

            {/* PANORAMA MODAL */}
            {panoramaData && (
                <PanoramaModal
                    data={panoramaData}
                    onClose={() => setPanoramaData(null)}
                />
            )}

            {/* ROOM TYPE MANAGER MODAL */}
            {roomTypeManagerOpen && (
                <RoomTypeManager
                    onClose={() => setRoomTypeManagerOpen(false)}
                    onRefresh={() => {
                        // Also refresh rooms since room types affect room data
                        queryClient.invalidateQueries({ queryKey: ["rooms"] });
                    }}
                />
            )}
        </div>
    );
}
