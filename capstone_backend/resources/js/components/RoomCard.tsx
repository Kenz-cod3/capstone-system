import { memo, useState, useEffect } from "react";

const imageCache = new Set<string>();

const RoomCard = memo(({ room, onEdit, onDelete }: any) => {
    const [loaded, setLoaded] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available":
                return "bg-green-500";
            case "occupied":
                return "bg-red-500";
            case "maintenance":
                return "bg-yellow-500";
            default:
                return "bg-gray-500";
        }
    };

    const DEFAULT_IMAGE = "/images/default-room.jpg";
    const imageSrc = room.image_url
        ? `${room.image_url}?t=${room.updated_at || ""}`
        : DEFAULT_IMAGE;

    // useEffect(() => {
    //     if (imageCache.has(imageSrc)) {
    //         setLoaded(true);
    //     } else {
    //         setLoaded(false);
    //     }
    // }, [imageSrc]);

    useEffect(() => {
        setLoaded(imageCache.has(imageSrc));
    }, [imageSrc]);


    return (
        <div className="bg-white shadow rounded p-4 flex flex-col justify-between">
            {/* ✅ OPTIMIZED IMAGE */}
            <div className="relative w-full h-40 mb-2">
                {/* 🔥 BLUR PLACEHOLDER */}
                {!loaded && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
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
                    className={`w-full h-40 object-cover rounded transition-opacity duration-300 ${loaded || imageCache.has(imageSrc)
                        ? "opacity-100"
                        : "opacity-0"
                        }`}
                />
            </div>

            <div>
                <h2 className="text-xl font-bold">
                    Room {room.room_number}
                </h2>

                <p className="text-sm text-gray-500">
                    {room.room_type?.type_name || "N/A"}
                </p>

                <p className="text-lg font-bold text-emerald-600 mb-2">
                    ₱{room.room_type?.base_price ?? 0}
                </p>

                <span
                    className={`inline-block px-3 py-1 text-white text-sm rounded ${getStatusColor(
                        room.status
                    )}`}
                >
                    {room.status}
                </span>
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={() => onEdit(room)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                    Edit
                </button>

                <button
                    onClick={() => onDelete(room.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                >
                    Delete
                </button>
            </div>
        </div>
    );
});

export default RoomCard;