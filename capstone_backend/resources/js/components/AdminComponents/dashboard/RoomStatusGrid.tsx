import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RoomStatusGrid({ rooms = [] }: any) {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [hovered, setHovered] = useState<{ room: any; rect: DOMRect } | null>(
        null,
    );
    const [tooltipPos, setTooltipPos] = useState<{
        top: number;
        left: number;
        arrowTop: number;
        placement: "right" | "left";
    } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const itemsPerPage = 16;

    const startIndex = page * itemsPerPage;
    const paginatedRooms = rooms.slice(startIndex, startIndex + itemsPerPage);

    const totalPages = Math.max(1, Math.ceil(rooms.length / itemsPerPage));

    const getColor = (status: string) => {
        switch (status) {
            case "available":
                return "bg-emerald-100 text-emerald-700";
            case "reserved":
                return "bg-amber-100 text-amber-700";
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

    // White tooltip, accented by status color: border, arrow, divider, and label text
    const getTooltipTheme = (status: string) => {
        switch (status) {
            case "available":
                return {
                    bg: "bg-white",
                    ring: "border border-emerald-200",
                    border: "border-r-emerald-200 border-l-emerald-200",
                    divider: "border-emerald-100",
                    subtle: "text-emerald-600",
                    heading: "text-emerald-700",
                };
            case "reserved":
                return {
                    bg: "bg-white",
                    ring: "border border-amber-200",
                    border: "border-r-amber-200 border-l-amber-200",
                    divider: "border-amber-100",
                    subtle: "text-amber-600",
                    heading: "text-amber-700",
                };
            case "occupied":
                return {
                    bg: "bg-white",
                    ring: "border border-blue-200",
                    border: "border-r-blue-200 border-l-blue-200",
                    divider: "border-blue-100",
                    subtle: "text-blue-600",
                    heading: "text-blue-700",
                };
            case "maintenance":
                return {
                    bg: "bg-white",
                    ring: "border border-red-200",
                    border: "border-r-red-200 border-l-red-200",
                    divider: "border-red-100",
                    subtle: "text-red-600",
                    heading: "text-red-700",
                };
            case "cleaning":
                return {
                    bg: "bg-white",
                    ring: "border border-yellow-200",
                    border: "border-r-yellow-200 border-l-yellow-200",
                    divider: "border-yellow-100",
                    subtle: "text-yellow-600",
                    heading: "text-yellow-700",
                };
            case "dirty":
                return {
                    bg: "bg-white",
                    ring: "border border-purple-200",
                    border: "border-r-purple-200 border-l-purple-200",
                    divider: "border-purple-100",
                    subtle: "text-purple-600",
                    heading: "text-purple-700",
                };
            default:
                return {
                    bg: "bg-white",
                    ring: "border border-gray-200",
                    border: "border-r-gray-200 border-l-gray-200",
                    divider: "border-gray-100",
                    subtle: "text-gray-500",
                    heading: "text-gray-700",
                };
        }
    };

    useEffect(() => {
        setPage(0);
    }, [rooms.length]);

    const formatDate = (date: string | null | undefined) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    // Recompute tooltip position once mounted and we know its real size,
    // clamping to the viewport so it never gets cut off.
    useLayoutEffect(() => {
        if (!hovered || !tooltipRef.current) {
            setTooltipPos(null);
            return;
        }

        const margin = 8;
        const gap = 12; // space between cell and tooltip
        const { rect } = hovered;
        const tw = tooltipRef.current.offsetWidth;
        const th = tooltipRef.current.offsetHeight;

        // Horizontal: prefer right side, flip to left if not enough room
        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;
        let placement: "right" | "left" = "right";
        let left: number;

        if (spaceRight >= tw + gap + margin || spaceRight >= spaceLeft) {
            placement = "right";
            left = rect.right + gap;
        } else {
            placement = "left";
            left = rect.left - tw - gap;
        }
        left = Math.min(
            Math.max(left, margin),
            window.innerWidth - tw - margin,
        );

        // Vertical: center on cell, clamp within viewport
        let top = rect.top + rect.height / 2 - th / 2;
        top = Math.min(Math.max(top, margin), window.innerHeight - th - margin);

        // Arrow should still point at the cell's vertical center
        const cellCenter = rect.top + rect.height / 2;
        const arrowTop = Math.min(Math.max(cellCenter - top, 16), th - 16);

        setTooltipPos({ top, left, arrowTop, placement });
    }, [hovered]);

    const handleEnter = (room: any, e: React.MouseEvent<HTMLDivElement>) => {
        if (!room) return;
        setHovered({ room, rect: e.currentTarget.getBoundingClientRect() });
    };

    const handleLeave = () => {
        setHovered(null);
    };

    // Navigate to the Booking List page and auto-open this room's booking details
    const handleDoubleClick = (room: any) => {
        if (!room) return;

        // Only navigate if the room actually has an associated booking
        const bookingId = room.booking_id;
        const bookedRoomId = room.booked_room_id;

        if (!bookingId || !bookedRoomId) return;

        navigate("/booking-management", {
            state: {
                bookingId,
                bookedRoomId,
            },
        });
    };

    const slots = Array.from({ length: itemsPerPage });
    const theme = hovered ? getTooltipTheme(hovered.room.status) : null;

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-200 flex flex-col h-full">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Room Status Panel</h2>

                <div className="flex gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Available
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                        Reserved
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Occupied
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Cleaning
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Dirty
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Maintenance
                    </span>
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 auto-rows-fr">
                {slots.map((_, index) => {
                    const room = paginatedRooms[index];

                    return (
                        <div
                            key={index}
                            onMouseEnter={(e) => handleEnter(room, e)}
                            onMouseLeave={handleLeave}
                            onDoubleClick={() => handleDoubleClick(room)}
                            className={`relative rounded-lg p-4 w-full aspect-square select-none
                                flex flex-col items-center justify-center
                                ${room ? getColor(room.status) : "bg-gray-100 text-gray-400"}
                                shadow-sm transition-all duration-200
                                ${room ? "hover:scale-[1.03] hover:shadow-md cursor-pointer" : ""}
                            `}
                        >
                            {room ? (
                                <>
                                    <p className="text-base relative top-2 font-semibold leading-none">
                                        {room.room_number}
                                    </p>
                                    <p className="text-xs opacity-70 capitalize leading-none mt-1">
                                        {room.status}
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs opacity-50">Empty</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* TOOLTIP: rendered once, positioned via fixed coords, clamped to viewport, white bg with status accent */}
            {hovered && theme && (
                <div
                    ref={tooltipRef}
                    className={`fixed z-[100] w-60 rounded-xl ${theme.bg} ${theme.ring} text-gray-800 p-4 shadow-xl pointer-events-none transition-opacity duration-150`}
                    style={{
                        top: tooltipPos ? tooltipPos.top : hovered.rect.top,
                        left: tooltipPos ? tooltipPos.left : hovered.rect.left,
                        opacity: tooltipPos ? 1 : 0,
                    }}
                >
                    <div className={`border-b ${theme.divider} pb-2 mb-3`}>
                        <p className={`font-semibold text-sm ${theme.heading}`}>
                            Room {hovered.room.room_number}
                        </p>
                        <p className={`text-xs ${theme.subtle} capitalize`}>
                            {hovered.room.status}
                        </p>
                    </div>

                    <div className="mb-2">
                        <p className={`text-[11px] ${theme.subtle}`}>Guest</p>
                        <p className="text-sm font-medium">
                            {hovered.room.current_guest || "No active guest"}
                        </p>
                    </div>

                    {hovered.room.booking_status && (
                        <div className="mb-2">
                            <p className={`text-[11px] ${theme.subtle}`}>
                                Booking Status
                            </p>
                            <p className="text-sm capitalize">
                                {hovered.room.booking_status.replace("_", " ")}
                            </p>
                        </div>
                    )}

                    {hovered.room.check_in_date && (
                        <div className="mb-2">
                            <p className={`text-[11px] ${theme.subtle}`}>
                                Check-in
                            </p>
                            <p className="text-sm">
                                {formatDate(hovered.room.check_in_date)}
                            </p>
                        </div>
                    )}

                    {hovered.room.check_out_date && (
                        <div className="mb-2">
                            <p className={`text-[11px] ${theme.subtle}`}>
                                Check-out
                            </p>
                            <p className="text-sm">
                                {formatDate(hovered.room.check_out_date)}
                            </p>
                        </div>
                    )}

                    {hovered.room.booking_reference && (
                        <div>
                            <p className={`text-[11px] ${theme.subtle}`}>
                                Booking Reference
                            </p>
                            <p className="text-xs font-mono">
                                {hovered.room.booking_reference}
                            </p>
                        </div>
                    )}

                    {tooltipPos && (
                        <div
                            className={`absolute border-8 border-transparent ${
                                tooltipPos.placement === "right"
                                    ? `right-full ${theme.border.split(" ")[0]}`
                                    : `left-full ${theme.border.split(" ")[1]}`
                            }`}
                            style={{
                                top: tooltipPos.arrowTop,
                                transform: "translateY(-50%)",
                            }}
                        />
                    )}
                </div>
            )}

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
