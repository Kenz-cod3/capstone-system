import { memo, useState, useEffect, useMemo, useRef } from "react";

const imageCache = new Set<string>();

const DEFAULT_IMAGE = "/images/default-room.jpg";

/* ───────────────────────── Style helpers ───────────────────────── */

const getStatusBadgeStyle = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "available":
            return "bg-green-100 text-green-800 ring-green-600/20";
        case "reserved":
            return "bg-yellow-100 text-yellow-800 ring-yellow-600/20";
        case "occupied":
            return "bg-blue-100 text-blue-800 ring-blue-600/20";
        case "maintenance":
            return "bg-red-100 text-red-800 ring-red-600/20";
        case "preparing":
            return "bg-purple-100 text-purple-800 ring-purple-600/20";
        case "ongoing":
            return "bg-amber-100 text-amber-800 ring-amber-600/20";
        default:
            return "bg-gray-100 text-gray-800 ring-gray-600/20";
    }
};

const getCardBgColor = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "available":
            return "bg-gradient-to-br from-white to-green-50 border-green-200 hover:border-green-300";
        case "reserved":
            return "bg-gradient-to-br from-white to-yellow-50 border-yellow-200 hover:border-yellow-300";
        case "occupied":
            return "bg-gradient-to-br from-white to-blue-50 border-blue-200 hover:border-blue-300";
        case "maintenance":
            return "bg-gradient-to-br from-white to-red-50 border-red-200 hover:border-red-300";
        case "preparing":
            return "bg-gradient-to-br from-white to-purple-50 border-purple-200 hover:border-purple-300";
        case "ongoing":
            return "bg-gradient-to-br from-white to-amber-50 border-amber-200 hover:border-amber-300";
        default:
            return "bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300";
    }
};

const getPriceColor = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "available":
            return "text-green-600";
        case "reserved":
            return "text-yellow-600";
        case "occupied":
            return "text-blue-600";
        case "maintenance":
            return "text-red-600";
        case "preparing":
            return "text-purple-600";
        case "ongoing":
            return "text-amber-600";
        default:
            return "text-gray-600";
    }
};

const capitalize = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";

const statusLabel = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "preparing":
            return "Queued";
        case "ongoing":
            return "Cleaning";
        default:
            return capitalize(status);
    }
};

const imageUrl = (img: any): string =>
    img?.url ?? img?.image_url ?? img?.path ?? "";

/* ───────────────────────── Component ───────────────────────── */

const RoomCard = memo(({ room, onEdit, onDelete, onView, onViewInfo }: any) => {
    const [loaded, setLoaded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeImage, setActiveImage] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close the 3-dot menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen]);

    const panoramaSrc = room.panorama_url || room.image_360_url;
    const hasPanorama = !!panoramaSrc;

    // All normal room photos. The cover (first uploaded image) always comes first.
    const gallery: string[] = useMemo(() => {
        const urls: string[] = (room.images ?? [])
            .filter((img: any) => img?.image_type !== "360")
            .map(imageUrl)
            .filter(Boolean);

        const cover: string | null = room.image_url ?? null;
        if (!cover) return urls;

        return [cover, ...urls.filter((u) => u !== cover)];
    }, [room.images, room.image_url]);

    const total = gallery.length;
    const safeIndex = Math.min(activeImage, Math.max(0, total - 1));
    const currentUrl = gallery[safeIndex];

    const imageSrc = currentUrl
        ? `${currentUrl}?t=${room.updated_at || ""}`
        : DEFAULT_IMAGE;

    // Go back to the cover when the room data changes
    useEffect(() => {
        setActiveImage(0);
    }, [room.id, room.updated_at]);

    useEffect(() => {
        setLoaded(imageCache.has(imageSrc));
    }, [imageSrc]);

    const formattedPrice = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(room.room_type?.base_price ?? 0);

    const handleEyeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasPanorama) return;
        onView({
            panoramaSrc,
            room: {
                room_number: room.room_number,
                room_type: room.room_type,
            },
        });
    };

    const goPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveImage((i) => (Math.min(i, total - 1) - 1 + total) % total);
    };

    const goNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveImage((i) => (Math.min(i, total - 1) + 1) % total);
    };

    const handleMenuAction = (action: "view" | "edit" | "delete") => {
        setMenuOpen(false);
        if (action === "view") onViewInfo?.(room.id);
        if (action === "edit") onEdit(room);
        if (action === "delete") onDelete(room.id);
    };

    return (
        <div
            className={`group relative ${menuOpen ? "z-30" : ""} ${getCardBgColor(room.status)} rounded-lg shadow-sm hover:shadow-2xl transition-all duration-300 ease-out border flex flex-col h-full hover:-translate-y-2 hover:scale-[1.02] will-change-transform`}
        >
            {/* ── IMAGE ── */}
            <div className="relative w-full h-44 overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-100 to-gray-200">
                {!loaded && (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
                )}

                <img
                    key={imageSrc}
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
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                        loaded || imageCache.has(imageSrc)
                            ? "opacity-100"
                            : "opacity-0"
                    }`}
                    alt={`Room ${room.room_number}`}
                />

                {/* Status badge */}
                <span
                    className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 shadow-sm backdrop-blur-sm ${getStatusBadgeStyle(room.status)}`}
                >
                    {statusLabel(room.status)}
                </span>

                {/* 360° button (only when a panorama exists) */}
                {hasPanorama && (
                    <button
                        onClick={handleEyeClick}
                        title="View 360° Room Tour"
                        className="absolute top-3 right-3 inline-flex items-center gap-1 pl-2 pr-2.5 py-1 text-xs font-semibold rounded-full bg-black/55 hover:bg-black/70 text-white backdrop-blur-sm transition"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        360°
                    </button>
                )}

                {/* Multiple photos: arrows (on hover) + counter */}
                {total > 1 && (
                    <>
                        <button
                            onClick={goPrev}
                            aria-label="Previous photo"
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                        >
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>
                        <button
                            onClick={goNext}
                            aria-label="Next photo"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                        >
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </button>

                        <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[11px] font-medium rounded-full bg-black/55 text-white backdrop-blur-sm">
                            {safeIndex + 1}/{total}
                        </span>
                    </>
                )}
            </div>

            {/* ── CONTENT ── */}
            <div className="px-4 pt-2.5 pb-3 flex-1 flex flex-col">
                {/* Title + 3-dot menu */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 text-base leading-tight truncate">
                            {room.room_type?.type_name || "Standard Room"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Room {room.room_number}
                        </p>
                    </div>

                    <div
                        className="relative flex-shrink-0 -mr-1.5 -mt-0.5"
                        ref={menuRef}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen((v) => !v);
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
                            title="More options"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <circle cx="12" cy="5" r="1.8" />
                                <circle cx="12" cy="12" r="1.8" />
                                <circle cx="12" cy="19" r="1.8" />
                            </svg>
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-20"
                            >
                                <button
                                    role="menuitem"
                                    onClick={() => handleMenuAction("view")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    </svg>
                                    View Info
                                </button>
                                <button
                                    role="menuitem"
                                    onClick={() => handleMenuAction("edit")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                    Edit Room
                                </button>
                                <div className="my-1 border-t border-gray-100" />
                                <button
                                    role="menuitem"
                                    onClick={() => handleMenuAction("delete")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description (max 2 lines) */}
                {room.room_type?.description && (
                    <p
                        className="mt-1.5 text-xs text-gray-500 leading-relaxed"
                        title={room.room_type.description}
                        style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {room.room_type.description}
                    </p>
                )}

                {/* Footer: price (left) + last updated (right) */}
                <div className="mt-auto pt-2">
                    <div className="pt-2 border-t border-gray-100 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                            <span
                                className={`text-xl font-bold ${getPriceColor(room.status)}`}
                            >
                                {formattedPrice}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                                / night
                            </span>
                        </div>

                        {room.updated_at && (
                            <span
                                className="flex items-center gap-1 text-[11px] text-gray-400 flex-shrink-0"
                                title="Last updated"
                            >
                                <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                {new Date(room.updated_at).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    },
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default RoomCard;
