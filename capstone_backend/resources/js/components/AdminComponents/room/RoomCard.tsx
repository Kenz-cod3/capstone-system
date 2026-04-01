import { memo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const imageCache = new Set<string>();

const RoomCard = memo(({ room, onEdit, onDelete, onView }: any) => {
    const navigate = useNavigate();
    const [loaded, setLoaded] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "available":
                return "bg-green-500 hover:bg-green-600";
            case "occupied":
                return "bg-blue-500 hover:bg-blue-600";
            case "maintenance":
                return "bg-red-500 hover:bg-red-600";
            default:
                return "bg-gray-500 hover:bg-gray-600";
        }
    };

    const getStatusBadgeStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case "available":
                return "bg-green-100 text-green-800 ring-green-600/20";
            case "occupied":
                return "bg-blue-100 text-blue-800 ring-blue-600/20";
            case "maintenance":
                return "bg-red-100 text-red-800 ring-red-600/20";
            default:
                return "bg-gray-100 text-gray-800 ring-gray-600/20";
        }
    };

    const getCardBgColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "available":
                return "bg-gradient-to-br from-white to-green-50 border-green-200 hover:border-green-300";
            case "occupied":
                return "bg-gradient-to-br from-white to-blue-50 border-blue-200 hover:border-blue-300";
            case "maintenance":
                return "bg-gradient-to-br from-white to-red-50 border-red-200 hover:border-red-300";
            default:
                return "bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300";
        }
    };

    const DEFAULT_IMAGE = "/images/default-room.jpg";

    // Check if room has panorama image
    const hasPanorama = room.panorama_url || room.image_360_url;
    const panoramaSrc = room.panorama_url || room.image_360_url;

    const imageSrc = room.image_url
        ? `${room.image_url}?t=${room.updated_at || ""}`
        : DEFAULT_IMAGE;

    useEffect(() => {
        setLoaded(imageCache.has(imageSrc));
    }, [imageSrc]);

    // Format price with proper currency
    const formattedPrice = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(room.room_type?.base_price ?? 0);

    // Get price color based on status
    const getPriceColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "available":
                return "text-green-600";
            case "occupied":
                return "text-blue-600";
            case "maintenance":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    // Get button color based on status
    const getEditButtonColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "available":
                return "bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800";
            case "occupied":
                return "bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800";
            case "maintenance":
                return "bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800";
            default:
                return "bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-800";
        }
    };

    // Handle eye icon click - navigate to panorama viewer
    const handleEyeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasPanorama) {
            onView({
                panoramaSrc: panoramaSrc,
                room: {
                    room_number: room.room_number,
                    room_type: room.room_type
                }
            });
        } else {
            alert("360° view is not available for this room");
        }
    };

    const cardBgClass = getCardBgColor(room.status);
    const priceColorClass = getPriceColor(room.status);
    const editButtonClass = getEditButtonColor(room.status);

    return (
        <>
            <div className={`group ${cardBgClass} rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border flex flex-col h-full`}>
                {/* IMAGE SECTION */}
                <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {/* BLUR PLACEHOLDER */}
                    {!loaded && (
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
                    )}

                    <img
                        src={imageSrc}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => {
                            imageCache.add(imageSrc);
                            setLoaded(true);
                        }}
                        onError={(e) => {
                            if (!e.currentTarget.src.includes(DEFAULT_IMAGE)) {
                                e.currentTarget.src = DEFAULT_IMAGE;
                                imageCache.add(DEFAULT_IMAGE);
                            }
                            setLoaded(true);
                        }}
                        className={`w-full h-48 object-cover transition-all duration-500 group-hover:scale-110 ${loaded || imageCache.has(imageSrc)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                        alt={`Room ${room.room_number}`}
                    />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ${getStatusBadgeStyle(room.status)} backdrop-blur-sm bg-opacity-90 shadow-sm`}>
                            {room.status?.charAt(0).toUpperCase() + room.status?.slice(1) || "Unknown"}
                        </span>
                    </div>

                    {/* Eye Icon Button - Click to view 360 panorama */}
                    <div className="absolute bottom-3 right-3">
                        <button
                            onClick={handleEyeClick}
                            className={`bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 ${hasPanorama ? 'hover:border-green-400' : 'cursor-not-allowed opacity-70'
                                }`}
                            title={hasPanorama ? "View 360° Room Tour" : "360° view not available"}
                            disabled={!hasPanorama}
                        >
                            <div className="relative">
                                <svg
                                    className={`w-5 h-5 transition-colors duration-200 ${hasPanorama ? 'text-gray-700 hover:text-green-600' : 'text-gray-400'
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {/* 360 Badge */}
                                {hasPanorama && (
                                    <span className="absolute -top-1 -right-2 text-[10px] font-bold bg-green-500 text-white rounded-full px-1 min-w-[18px] text-center">
                                        360
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* CONTENT SECTION */}
                <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-2">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">
                            {room.room_type?.type_name || "Standard Room"}
                        </h3>
                        <div className="mt-1">
                            <span className="text-xs text-gray-500">Room {room.room_number}</span>
                        </div>
                    </div>

                    {/* Price with status-based color */}
                    <div className="mt-2">
                        <span className={`text-2xl font-bold ${priceColorClass}`}>{formattedPrice}</span>
                        <span className="text-xs text-gray-500 ml-1">/ night</span>
                    </div>

                    {/* Last Updated */}
                    {room.updated_at && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Updated {new Date(room.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                            onClick={() => onEdit(room)}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 ${editButtonClass} rounded-xl transition-all text-sm font-medium`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(room.id)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 rounded-xl transition-all text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
});

export default RoomCard;