import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoomDetails } from "@/services/roomService";

interface PanoramaPayload {
    panoramaSrc: string;
    room: {
        room_number: string;
        room_type: any;
    };
}

interface Props {
    roomId: number;
    onClose: () => void;
    onViewPanorama?: (data: PanoramaPayload) => void;
}

/* ───────────────────────── Icons (inline, no extra deps) ───────────────────────── */

function Icon({ className = "w-4 h-4", children }: { className?: string; children: ReactNode }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

const I = {
    close: (c?: string) => (
        <Icon className={c}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
    ),
    left: (c?: string) => (
        <Icon className={c}><path d="m15 18-6-6 6-6" /></Icon>
    ),
    right: (c?: string) => (
        <Icon className={c}><path d="m9 18 6-6-6-6" /></Icon>
    ),
    scan: (c?: string) => (
        <Icon className={c}>
            <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="3" />
        </Icon>
    ),
    brush: (c?: string) => (
        <Icon className={c}>
            <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
            <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
        </Icon>
    ),
    file: (c?: string) => (
        <Icon className={c}>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
        </Icon>
    ),
    details: (c?: string) => (
        <Icon className={c}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 8h4" /><path d="M7 12h4" /><path d="M7 16h4" />
            <path d="M15 8h2" /><path d="M15 12h2" /><path d="M15 16h2" />
        </Icon>
    ),
    star: (c?: string) => (
        <Icon className={c}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Icon>
    ),
    users: (c?: string) => (
        <Icon className={c}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Icon>
    ),
    tag: (c?: string) => (
        <Icon className={c}>
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
            <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
        </Icon>
    ),
    clock: (c?: string) => (
        <Icon className={c}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>
    ),
    calendar: (c?: string) => (
        <Icon className={c}>
            <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
        </Icon>
    ),
    checkout: (c?: string) => (
        <Icon className={c}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
        </Icon>
    ),
    cash: (c?: string) => (
        <Icon className={c}>
            <rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01" /><path d="M18 12h.01" />
        </Icon>
    ),
    snow: (c?: string) => (
        <Icon className={c}>
            <path d="M12 2v20" /><path d="M2 12h20" /><path d="m4.93 4.93 14.14 14.14" /><path d="m19.07 4.93-14.14 14.14" />
        </Icon>
    ),
    tv: (c?: string) => (
        <Icon className={c}>
            <rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
        </Icon>
    ),
    wifi: (c?: string) => (
        <Icon className={c}>
            <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><path d="M12 20h.01" />
        </Icon>
    ),
    check: (c?: string) => (
        <Icon className={c}><path d="M20 6 9 17l-5-5" /></Icon>
    ),
};

function amenityIcon(name: string) {
    const n = (name || "").toLowerCase();
    if (n.includes("air") || n.includes("aircon") || n.includes("cool")) return I.snow("w-3.5 h-3.5");
    if (n.includes("tv") || n.includes("television")) return I.tv("w-3.5 h-3.5");
    if (n.includes("wifi") || n.includes("wi-fi") || n.includes("internet")) return I.wifi("w-3.5 h-3.5");
    return I.check("w-3.5 h-3.5");
}

/* ───────────────────────── Helpers ───────────────────────── */

const STATUS_STYLES: Record<string, string> = {
    available:   "bg-green-100 text-green-700",
    reserved:    "bg-yellow-100 text-yellow-700",
    occupied:    "bg-blue-100 text-blue-700",
    maintenance: "bg-red-100 text-red-700",
    dirty:       "bg-purple-100 text-purple-700",
    cleaning:    "bg-amber-100 text-amber-700",
};

const statusStyle = (status?: string) =>
    STATUS_STYLES[status?.toLowerCase() ?? ""] ?? "bg-gray-100 text-gray-700";

const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const fmtPrice = (n?: number) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n ?? 0);

const fmtDate = (d?: string) =>
    d
        ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

// "14:00:00" -> "2:00 PM"
const fmtTime = (t?: string | null) => {
    if (!t) return "—";
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t));
    if (!m) return String(t);
    const h = Number(m[1]);
    const min = m[2];
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${min} ${period}`;
};

const THUMBS_VISIBLE = 4;

// Slim, subtle scrollbar (WebKit/Blink + Firefox)
const SLIM_SCROLL =
    "[scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] " +
    "[&::-webkit-scrollbar]:w-1 " +
    "[&::-webkit-scrollbar-track]:bg-transparent " +
    "[&::-webkit-scrollbar-thumb]:rounded-full " +
    "[&::-webkit-scrollbar-thumb]:bg-gray-300 " +
    "hover:[&::-webkit-scrollbar-thumb]:bg-gray-400";

/* ───────────────────────── Component ───────────────────────── */

export default function ViewRoomModal({ roomId, onClose, onViewPanorama }: Props) {
    const { data, isLoading } = useQuery({
        queryKey: ["room-details", roomId],
        queryFn: async () => {
            const res = await getRoomDetails(roomId);
            return res.data;
        },
    });

    const [activeImage, setActiveImage] = useState(0);

    const images: { id?: number; url: string }[] = data?.images ?? [];
    const total = images.length;

    const goPrev = () => setActiveImage((i) => (i - 1 + total) % total);
    const goNext = () => setActiveImage((i) => (i + 1) % total);

    useEffect(() => { setActiveImage(0); }, [roomId]);

    // Close on Escape, navigate gallery with arrow keys
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (total > 1 && e.key === "ArrowLeft") setActiveImage((i) => (i - 1 + total) % total);
            if (total > 1 && e.key === "ArrowRight") setActiveImage((i) => (i + 1) % total);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, total]);

    // Lock background scroll while the modal is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    const mainImage = total > 0 ? images[activeImage]?.url : data?.image_url;
    const rt = data?.room_type;

    // Thumbnails never scroll: show a window of 4 that always contains the active image
    const thumbStart = Math.min(
        Math.max(0, activeImage - (THUMBS_VISIBLE - 1)),
        Math.max(0, total - THUMBS_VISIBLE)
    );
    const visibleThumbs = images
        .map((img, i) => ({ img, i }))
        .slice(thumbStart, thumbStart + THUMBS_VISIBLE);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Room information"
        >
            <div
                className="bg-slate-50 w-full max-w-5xl max-h-[92vh] md:h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── HEADER ── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Room Information</h2>
                        <p className="text-xs text-gray-500">
                            {isLoading ? "Loading…" : `Room ${data?.room_number ?? ""}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/70 hover:bg-gray-200 text-gray-800 transition"
                    >
                        {I.close("w-4 h-4")}
                    </button>
                </div>

                {/* ── BODY (scrolls only on mobile; on desktop the image column is fixed) ── */}
                <div className={`flex-1 min-h-0 overflow-y-auto md:overflow-hidden ${SLIM_SCROLL}`}>
                    {isLoading || !data ? (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="aspect-[3/2] bg-gray-200 rounded-xl animate-pulse" />
                                <div className="grid grid-cols-4 gap-2">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="aspect-[4/3] bg-gray-200 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-16 bg-gray-200 rounded-xl animate-pulse" />
                                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                                <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                                <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 md:grid-rows-1 gap-4 md:h-full">
                            {/* ── LEFT: GALLERY (fixed, never scrolls) ── */}
                            <div className="flex flex-col gap-2 min-w-0 md:min-h-0 md:overflow-hidden">
                                <div className="relative w-full aspect-[3/2] md:aspect-auto md:flex-1 md:min-h-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                                    {mainImage ? (
                                        <img
                                            src={mainImage}
                                            alt={`Room ${data.room_number}`}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                            No image available
                                        </div>
                                    )}

                                    {/* Status pill (top-left) */}
                                    {data.status && (
                                        <span
                                            className={`absolute top-3 left-3 inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${statusStyle(data.status)}`}
                                        >
                                            {capitalize(data.status)}
                                        </span>
                                    )}

                                    {/* 360° pill (top-right) — opens the panorama viewer */}
                                    {data.panorama_url && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onViewPanorama?.({
                                                    panoramaSrc: data.panorama_url,
                                                    room: {
                                                        room_number: data.room_number,
                                                        room_type: data.room_type,
                                                    },
                                                })
                                            }
                                            className="absolute top-3 right-3 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1 text-xs font-semibold rounded-full bg-black/55 hover:bg-black/70 text-white backdrop-blur-sm transition"
                                            title="View 360° panorama"
                                        >
                                            {I.scan("w-3.5 h-3.5")}
                                            360°
                                        </button>
                                    )}

                                    {/* Prev / Next (bottom-right) */}
                                    {total > 1 && (
                                        <div className="absolute bottom-3 right-3 flex gap-1.5">
                                            <button
                                                onClick={goPrev}
                                                aria-label="Previous image"
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 shadow transition"
                                            >
                                                {I.left("w-4 h-4")}
                                            </button>
                                            <button
                                                onClick={goNext}
                                                aria-label="Next image"
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 shadow transition"
                                            >
                                                {I.right("w-4 h-4")}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnails (no scrolling — always 4 slots) */}
                                {total > 1 && (
                                    <div className="grid grid-cols-4 gap-2 flex-shrink-0">
                                        {visibleThumbs.map(({ img, i }) => (
                                            <button
                                                key={img.id ?? i}
                                                onClick={() => setActiveImage(i)}
                                                aria-label={`Show image ${i + 1}`}
                                                className={`aspect-[4/3] rounded-lg overflow-hidden transition ${
                                                    activeImage === i
                                                        ? "ring-2 ring-emerald-500"
                                                        : "opacity-80 hover:opacity-100"
                                                }`}
                                            >
                                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── RIGHT: DETAILS (scrolls only if content is taller than the modal) ── */}
                            <div className={`min-w-0 md:min-h-0 md:overflow-y-auto space-y-3 md:pr-2 ${SLIM_SCROLL}`}>
                                {/* Name + price card */}
                                <div className="flex items-center justify-between gap-3 bg-slate-100 rounded-xl px-4 py-3">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 truncate leading-tight">
                                            {rt?.type_name || "Standard Room"}
                                        </h3>
                                        <p className="text-xs text-gray-500">Room {data.room_number}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-2xl font-extrabold text-emerald-700 leading-none">
                                            {fmtPrice(rt?.base_price)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">per night</p>
                                    </div>
                                </div>

                                {/* Description */}
                                {rt?.description && (
                                    <Section icon={I.file("w-4 h-4")} title="Description">
                                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line pl-6">
                                            {rt.description}
                                        </p>
                                    </Section>
                                )}

                                {/* Room details */}
                                <Section icon={I.details("w-4 h-4")} title="Room Details" divider>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 bg-slate-100 rounded-xl p-2">
                                        <InfoRow icon={I.users("w-4 h-4")}    label="Max Occupancy"       value={rt?.max_occupancy ?? "—"} />
                                        <InfoRow icon={I.tag("w-4 h-4")}      label="Short Stay Price"    value={fmtPrice(rt?.short_stay_price)} />
                                        <InfoRow icon={I.clock("w-4 h-4")}    label="Short Stay Hours"    value={rt?.short_stay_hours ? `${rt.short_stay_hours} hrs` : "—"} />
                                        <InfoRow icon={I.calendar("w-4 h-4")} label="Standard Check-in"   value={fmtTime(rt?.standard_checkin_time)} />
                                        <InfoRow icon={I.checkout("w-4 h-4")} label="Overnight Check-out" value={fmtTime(rt?.overnight_checkout_time)} />
                                        <InfoRow icon={I.cash("w-4 h-4")}     label="Early Check-in Fee"  value={fmtPrice(rt?.early_checkin_fee)} />
                                        <InfoRow icon={I.cash("w-4 h-4")}     label="Late Check-out Fee"  value={fmtPrice(rt?.late_checkout_fee)} />
                                        <InfoRow icon={I.calendar("w-4 h-4")} label="Last Updated"        value={fmtDate(data.updated_at)} />
                                    </div>
                                </Section>

                                {/* Amenities */}
                                <Section icon={I.star("w-4 h-4")} title="Amenities" divider>
                                    {data.amenities?.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {data.amenities.map((a: any) => (
                                                <span
                                                    key={a.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-slate-100 text-gray-700 rounded-full"
                                                >
                                                    <span className="text-gray-500">{amenityIcon(a.name)}</span>
                                                    {a.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 pl-6">No amenities listed</p>
                                    )}
                                </Section>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function Section({
    icon,
    title,
    divider = false,
    children,
}: {
    icon: ReactNode;
    title: string;
    divider?: boolean;
    children: ReactNode;
}) {
    return (
        <section className={divider ? "border-t border-gray-200 pt-3" : ""}>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="text-gray-700">{icon}</span>
                {title}
            </h4>
            {children}
        </section>
    );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
            <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-200/80 text-gray-700">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
                <p className="text-sm font-medium text-gray-900 leading-snug">{value}</p>
            </div>
        </div>
    );
}