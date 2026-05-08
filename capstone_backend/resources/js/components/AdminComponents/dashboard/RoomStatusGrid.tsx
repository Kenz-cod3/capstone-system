import React, { useEffect, useState } from "react";

export default function RoomStatusGrid({ rooms = [] }: any) {
    const [page, setPage] = useState(0);

    const itemsPerPage = 16;

    const startIndex = page * itemsPerPage;
    const paginatedRooms = rooms.slice(startIndex, startIndex + itemsPerPage);

    const totalPages = Math.max(1, Math.ceil(rooms.length / itemsPerPage));

    const getColor = (status: string) => {
        switch (status) {
            case "available":
                return "bg-emerald-100 text-emerald-700";

            case "occupied":
                return "bg-blue-100 text-blue-700";

            case "maintenance":
                return "bg-red-100 text-red-700";

            case "cleaning":
                return "bg-yellow-100 text-yellow-700";

            case "dirty":
                return "bg-purple-100 text-purple-700";

            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    useEffect(() => {
        setPage(0);
    }, [rooms]);

    // ALWAYS CREATE 16 SLOTS
    const slots = Array.from({ length: itemsPerPage });

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-200 flex flex-col h-full">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">
                    Room Status Panel
                </h2>

                <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Available
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Occupied
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Maintenance
                    </span>
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 flex-1 auto-rows-fr">
                {slots.map((_, index) => {
                    const room = paginatedRooms[index];

                    return (
                        <div
                            key={index}
                            className={`rounded-lg p-4 w-full flex flex-col justify-center items-center aspect-square
                            ${room
                                    ? getColor(room.status)
                                    : "bg-gray-100 text-gray-400"
                                }
                            shadow-sm 
                            transition duration-200`}
                        >
                            {room ? (
                                <>
                                    <p className="text-base relative top-2 font-semibold">
                                        {room.room_number}
                                    </p>
                                    <p className="text-xs opacity-70 capitalize">
                                        {room.status}
                                    </p>
                                </>
                            )
                                : (
                                    <p className="text-xs opacity-50">Empty</p>
                                )
                            }
                        </div>
                    );
                })}
            </div>

            {/* PAGINATION */}
            <div className="flex justify-between items-center mt-auto pt-3 text-xs">
                <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                    disabled={page === 0}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded disabled:opacity-40 hover:bg-gray-200"
                >
                    Prev
                </button>

                <span className="text-gray-500">
                    {page + 1} / {totalPages}
                </span>

                <button
                    onClick={() =>
                        setPage((prev) => Math.min(prev + 1, totalPages - 1))
                    }
                    disabled={page === totalPages - 1}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded disabled:opacity-40 hover:bg-gray-200"
                >
                    Next
                </button>
            </div>
        </div>
    );
}