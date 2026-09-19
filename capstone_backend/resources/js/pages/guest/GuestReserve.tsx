import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Home,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Users,
    Maximize2,
    Wifi,
    Snowflake,
    Bath,
    Tv,
    Droplet,
    Sparkles,
    ChevronDown,
    Info,
    Loader2,
    Bed,
    MapPin,
    Star,
    Camera,
    View,
    Lock,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";

import api from "../../services/api";
import PanoramaModal from "../../components/AdminComponents/room/PanoramaModal";
import CustomDatePicker from "./CustomDatePicker";

interface RoomImage {
    id: number;
    image_path: string;
    image_type?: "normal" | "360" | string;
}

interface RoomType {
    id?: number;
    type_name: string;
    description?: string;
    base_price: number;
    max_occupancy: number;
    size?: number;
    amenities?: string[] | string | null;
}

interface RoomData {
    id: number;
    room_number: string;
    image_url: string | null;
    images?: RoomImage[];
    panorama_url?: string | null;
    room_type: RoomType;
}

interface ConflictRecord {
    id: number;
    check_in_date: string;
    check_out_date: string;
    stay_type: string;
    status: string;
}

const getAmenityIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("wifi")) return Wifi;
    if (l.includes("air") || l.includes("aircon")) return Snowflake;
    if (l.includes("bathroom")) return Bath;
    if (l.includes("tv") || l.includes("television")) return Tv;
    if (l.includes("shower") || l.includes("hot") || l.includes("water"))
        return Droplet;
    return Sparkles;
};

const DEFAULT_AMENITIES = [
    "Free WiFi",
    "Air Conditioning",
    "Private Bathroom",
    "TV",
    "Hot & Cold Shower",
];

const API_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
const buildImageUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${API_ORIGIN}/storage/${path}`;
};

const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
    }).format(price || 0);

const toISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const todayPlus = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toISODate(d);
};

const formatDateLong = (value: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export default function GuestReserve() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [room, setRoom] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState(0);

    const [checkIn, setCheckIn] = useState(todayPlus(1));
    const [checkOut, setCheckOut] = useState(todayPlus(2));
    const [guests, setGuests] = useState(2);
    const [continueError, setContinueError] = useState<string | null>(null);
    const [panoramaOpen, setPanoramaOpen] = useState(false);

    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availability, setAvailability] = useState<{
        available: boolean;
        conflicts: ConflictRecord[];
        reason?: string | null;
    } | null>(null);

    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

    const availabilityRequestRef = useRef(0);

    useEffect(() => {
        if (!id) return;

        const fetchBookedDates = async () => {
            try {
                const res = await api.get(`/rooms/${id}/booked-dates`);
                const ranges: { check_in_date: string; check_out_date: string }[] =
                    res.data?.data ?? res.data ?? [];

                const set = new Set<string>();

                ranges.forEach((range) => {
                    const cursor = new Date(`${range.check_in_date}T00:00:00`);
                    const end = new Date(`${range.check_out_date}T00:00:00`);

                    // check_out_date is exclusive — the checkout day itself
                    // is free for the next guest to check in.
                    while (cursor < end) {
                        const y = cursor.getFullYear();
                        const m = String(cursor.getMonth() + 1).padStart(2, "0");
                        const d = String(cursor.getDate()).padStart(2, "0");
                        set.add(`${y}-${m}-${d}`);
                        cursor.setDate(cursor.getDate() + 1);
                    }
                });

                setBookedDates(set);
            } catch (err) {
                console.log("BOOKED DATES ERROR:", err);
            }
        };

        fetchBookedDates();
    }, [id]);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/rooms/${id}`);
                setRoom(res.data?.data ?? res.data);
            } catch (err) {
                console.log("ROOM DETAILS ERROR:", err);
                setError("Failed to load room details.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchRoom();
    }, [id]);

    useEffect(() => {
        if (!id || !checkIn || !checkOut) {
            setAvailability(null);
            return;
        }

        const nights = Math.max(
            0,
            Math.round(
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                    (1000 * 60 * 60 * 24),
            ),
        );

        if (nights <= 0) {
            setAvailability(null);
            return;
        }

        const requestId = ++availabilityRequestRef.current;
        const controller = new AbortController();

        const checkAvail = async () => {
            setCheckingAvailability(true);
            try {
                // ✅ FIXED: /availability → /check-availability
                const res = await api.get(`/rooms/${id}/check-availability`, {
                    params: {
                        check_in_date: checkIn,
                        check_out_date: checkOut,
                        stay_type: "overnight",
                    },
                    signal: controller.signal,
                });

                if (requestId !== availabilityRequestRef.current) return;

                const payload = res.data?.data ?? res.data;
                setAvailability({
                    available: payload?.available ?? false,
                    conflicts: payload?.conflicts ?? [],
                    reason: payload?.reason ?? null,
                });
            } catch (err: any) {
                if (
                    err?.name === "CanceledError" ||
                    err?.code === "ERR_CANCELED"
                )
                    return;
                if (requestId !== availabilityRequestRef.current) return;

                console.log("CHECK AVAILABILITY ERROR:", err);
                setAvailability(null);
            } finally {
                if (requestId === availabilityRequestRef.current) {
                    setCheckingAvailability(false);
                }
            }
        };

        const t = setTimeout(checkAvail, 350);

        return () => {
            clearTimeout(t);
            controller.abort();
        };
    }, [id, checkIn, checkOut]);

    const minCheckOut = useMemo(() => {
        if (!checkIn) return todayPlus(1);
        const next = new Date(checkIn);
        next.setDate(next.getDate() + 1);
        return toISODate(next);
    }, [checkIn]);

    const conflictMessage = useMemo(() => {
        if (!availability || availability.available) return null;

        if (availability.reason) {
            return availability.reason;
        }

        const [first] = availability.conflicts;

        if (!first) {
            return "This room is not available for the selected dates.";
        }

        return `This room is already booked from ${formatDateLong(
            first.check_in_date,
        )} to ${formatDateLong(
            first.check_out_date,
        )}. Please choose different dates.`;
    }, [availability]);

    // Handles a new check-in date chosen from the calendar, keeping
    // check-out valid (bumping it to the next day when needed).
    const handleCheckInChange = (newCheckIn: string) => {
        setCheckIn(newCheckIn);
        setContinueError(null);

        if (!newCheckIn) return;

        const newCheckInDate = new Date(`${newCheckIn}T00:00:00`);
        const currentCheckOutDate = checkOut
            ? new Date(`${checkOut}T00:00:00`)
            : null;

        if (!currentCheckOutDate || currentCheckOutDate <= newCheckInDate) {
            const nextDay = new Date(newCheckInDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setCheckOut(toISODate(nextDay));
        }
    };

    // Handles a new check-out date chosen from the calendar, guarding
    // against a check-out on or before the check-in date.
    const handleCheckOutChange = (newCheckOut: string) => {
        if (!newCheckOut) {
            setCheckOut(minCheckOut);
            setContinueError(null);
            return;
        }

        const selectedCheckOut = new Date(`${newCheckOut}T00:00:00`);
        const selectedCheckIn = new Date(`${checkIn}T00:00:00`);

        if (selectedCheckOut <= selectedCheckIn) {
            setCheckOut(minCheckOut);
        } else {
            setCheckOut(newCheckOut);
        }

        setContinueError(null);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-4" />
                <p className="text-[#1a4a35]/60 text-sm">
                    Loading room details…
                </p>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <p className="text-gray-500">{error || "Room not found."}</p>
                <Link
                    to="/guest-dashboard"
                    className="inline-block mt-4 px-6 py-2.5 bg-[#c9a96e] text-[#0d2e1f] rounded-full font-medium hover:bg-[#d9bb84] transition-colors"
                >
                    Back to Rooms
                </Link>
            </div>
        );
    }

    const roomType = room.room_type;

    const amenities: string[] = (() => {
        const raw = roomType?.amenities;
        if (!raw || (Array.isArray(raw) && raw.length === 0))
            return DEFAULT_AMENITIES;
        if (Array.isArray(raw)) return raw;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            /* not JSON — fall through */
        }
        return raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    })();

    const images: string[] = (() => {
        if (room.images && room.images.length > 0) {
            const normalOnly = room.images.filter(
                (img) => (img.image_type ?? "normal") !== "360",
            );
            const list = (normalOnly.length > 0 ? normalOnly : room.images)
                .map((img) => buildImageUrl(img.image_path))
                .filter((u): u is string => Boolean(u));
            return list;
        }
        if (room.image_url) return [room.image_url];
        return [];
    })();

    const has360 = Boolean(room.panorama_url);
    const thumbnails = images.filter((_, i) => i !== activeImage).slice(0, 3);
    const remainingCount = Math.max(0, images.length - 1 - thumbnails.length);

    const goPrev = () =>
        setActiveImage((i) =>
            images.length ? (i - 1 + images.length) % images.length : 0,
        );
    const goNext = () =>
        setActiveImage((i) => (images.length ? (i + 1) % images.length : 0));

    const nights = (() => {
        if (!checkIn || !checkOut) return 0;
        const diff =
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round(diff));
    })();

    const basePrice = roomType?.base_price ?? 0;
    const subtotal = basePrice * (nights || 0);
    const total = subtotal;

    const isAvailable = availability?.available ?? true;

    const handleContinue = () => {
        if (!nights) {
            setContinueError(
                "Please select a valid check-in and check-out date.",
            );
            return;
        }
        if (availability && !availability.available) {
            setContinueError(
                conflictMessage ||
                    "This room is not available for the selected dates.",
            );
            return;
        }
        if (!availability) {
            setContinueError(
                "Still checking availability. Please wait a moment and try again.",
            );
            return;
        }
        setContinueError(null);
        navigate(`/guest/rooms/${room.id}/confirm`, {
            state: { checkIn, checkOut, guests },
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Home className="w-4 h-4" />
                <Link
                    to="/guest-dashboard"
                    className="hover:text-[#1a4a35] transition-colors"
                >
                    Home
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-700">Room {room.room_number}</span>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1
                        className="text-3xl font-bold text-[#0d2e1f]"
                        style={{ fontFamily: "Georgia" }}
                    >
                        Room {room.room_number}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf3ea] text-[#1a4a35] text-xs font-semibold">
                        <Bed className="w-3.5 h-3.5" />
                        {roomType?.type_name || "Standard"}
                    </span>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Rooms
                </button>
            </div>

            <p className="text-gray-500 mb-6">
                {roomType?.description ||
                    "A cozy and comfortable room perfect for relaxation. Ideal for couples, families, or business travelers."}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-2 flex flex-col gap-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1 h-[460px] rounded-2xl overflow-hidden bg-gray-100">
                            {images.length > 0 ? (
                                <img
                                    src={images[activeImage]}
                                    alt={`Room ${room.room_number}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Camera className="w-10 h-10 text-gray-300" />
                                </div>
                            )}

                            {has360 && (
                                <button
                                    onClick={() => setPanoramaOpen(true)}
                                    className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d2e1f]/85 hover:bg-[#0d2e1f] text-white text-xs font-medium transition-colors"
                                >
                                    <View className="w-3.5 h-3.5" />
                                    360° View
                                </button>
                            )}

                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={goPrev}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                                        aria-label="Previous photo"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        onClick={goNext}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                                        aria-label="Next photo"
                                    >
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </button>
                                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] flex items-center gap-1">
                                        <Camera className="w-3 h-3" />
                                        {activeImage + 1} / {images.length}
                                    </span>
                                </>
                            )}
                        </div>

                        {thumbnails.length > 0 && (
                            <div className="flex flex-col gap-3 w-32 shrink-0">
                                {thumbnails.map((src, i) => {
                                    const isLast = i === thumbnails.length - 1;
                                    const realIndex = images.indexOf(src);
                                    return (
                                        <button
                                            key={src + i}
                                            onClick={() =>
                                                setActiveImage(realIndex)
                                            }
                                            className={`relative flex-1 rounded-xl overflow-hidden bg-gray-100 ${
                                                i === 0
                                                    ? "ring-2 ring-[#1a4a35]"
                                                    : ""
                                            }`}
                                        >
                                            <img
                                                src={src}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            {isLast && remainingCount > 0 && (
                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white font-semibold text-sm">
                                                    <span className="text-lg leading-none">
                                                        +{remainingCount}
                                                    </span>
                                                    <span className="text-[10px] font-normal mt-0.5">
                                                        More Photos
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 -mt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            <Users className="w-3.5 h-3.5" />
                            {roomType?.max_occupancy || 2} guests
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            <Maximize2 className="w-3.5 h-3.5" />
                            {roomType?.size || 22} m²
                        </span>
                        {amenities.map((label) => {
                            const Icon = getAmenityIcon(label);
                            return (
                                <span
                                    key={label}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </span>
                            );
                        })}
                    </div>

                    <div className="border-t border-gray-100" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                <Bed className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <p className="text-[#0d2e1f] font-semibold text-sm">
                                    Comfort
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    High-quality bed with fresh linens
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <p className="text-[#0d2e1f] font-semibold text-sm">
                                    Convenience
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    Near restaurant and main facilities
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                <Star className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <p className="text-[#0d2e1f] font-semibold text-sm">
                                    Great Value
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    Perfect for short or long stays
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    <div>
                        <h2
                            className="text-xl font-bold text-[#0d2e1f] mb-2"
                            style={{ fontFamily: "Georgia" }}
                        >
                            About This Room
                        </h2>
                        <p className="text-gray-500 leading-relaxed">
                            {roomType?.description ||
                                `Room ${room.room_number} is a ${(
                                    roomType?.type_name || "standard"
                                ).toLowerCase()} room designed for a relaxing and hassle-free stay.`}
                        </p>
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Reserve card ── */}
                <div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <h3
                            className="text-xl font-bold text-[#0d2e1f]"
                            style={{ fontFamily: "Georgia" }}
                        >
                            Reserve This Room
                        </h3>
                        <p className="text-gray-500 text-sm mt-1 mb-5">
                            Select your dates and guest details.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <CustomDatePicker
                                label="Check-in Date"
                                value={checkIn}
                                onChange={handleCheckInChange}
                                minDate={todayPlus(0)}
                                disabledDates={bookedDates}
                            />
                            <CustomDatePicker
                                label="Check-out Date"
                                value={checkOut}
                                onChange={handleCheckOutChange}
                                minDate={minCheckOut}
                                disabledDates={bookedDates}
                            />
                        </div>

                        {nights > 0 && (
                            <div className="mb-4">
                                {checkingAvailability ? (
                                    <div className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-4 py-3">
                                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                                        <p className="text-xs text-gray-500">
                                            Checking availability…
                                        </p>
                                    </div>
                                ) : availability?.available ? (
                                    <div className="flex items-start gap-2.5 rounded-2xl bg-green-50 border border-green-200 px-4 py-3">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-green-700">
                                                Room is available
                                            </p>
                                            <p className="text-xs text-green-600/80 mt-0.5">
                                                Your selected dates are open for
                                                booking.
                                            </p>
                                        </div>
                                    </div>
                                ) : availability && !availability.available ? (
                                    <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-red-700">
                                                Not available for these dates
                                            </p>
                                            <p className="text-xs text-red-600/80 mt-0.5">
                                                {conflictMessage}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="mb-5">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Guests
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <select
                                    value={guests}
                                    onChange={(e) =>
                                        setGuests(Number(e.target.value))
                                    }
                                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all appearance-none"
                                >
                                    {Array.from(
                                        {
                                            length:
                                                roomType?.max_occupancy || 6,
                                        },
                                        (_, i) => i + 1,
                                    ).map((n) => (
                                        <option key={n} value={n}>
                                            {n} guest{n > 1 ? "s" : ""}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[#eaf3ea] px-4 py-3.5 mb-5">
                            <p className="text-xs text-[#1a4a35]/70 mb-1">
                                Room Price
                            </p>
                            <p className="flex items-baseline gap-1.5">
                                <span
                                    className="text-2xl font-bold text-[#0d2e1f]"
                                    style={{ fontFamily: "Georgia" }}
                                >
                                    {formatPrice(basePrice)}
                                </span>
                                <span className="text-sm text-[#1a4a35]/70">
                                    / night
                                </span>
                            </p>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-semibold text-[#0d2e1f] mb-3">
                                Price Breakdown
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">
                                        {formatPrice(basePrice)} × {nights || 0}{" "}
                                        night
                                        {nights === 1 ? "" : "s"}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {formatPrice(subtotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mb-4 flex items-center justify-between">
                            <span className="font-semibold text-[#0d2e1f]">
                                Total Amount
                            </span>
                            <span
                                className="text-2xl font-bold text-[#0d2e1f]"
                                style={{ fontFamily: "Georgia" }}
                            >
                                {formatPrice(total)}
                            </span>
                        </div>

                        <div className="flex items-start gap-2.5 rounded-2xl bg-blue-50 px-4 py-3 mb-5">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Free cancellation up to 24 hours before
                                check-in.
                            </p>
                        </div>

                        {continueError && (
                            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                                {continueError}
                            </div>
                        )}

                        <button
                            onClick={handleContinue}
                            disabled={
                                checkingAvailability ||
                                (availability !== null && !isAvailable)
                            }
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d2e1f] text-white font-medium hover:bg-[#1a4a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {checkingAvailability ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Checking availability…
                                </>
                            ) : (
                                <>
                                    Continue to Guest Details
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 mt-3">
                            <Lock className="w-3.5 h-3.5" />
                            Your booking information is secure.
                        </p>
                    </div>
                </div>
            </div>

            {panoramaOpen && room.panorama_url && (
                <PanoramaModal
                    data={{
                        panoramaSrc: room.panorama_url,
                        room: {
                            room_type: roomType,
                            room_number: room.room_number,
                        },
                    }}
                    onClose={() => setPanoramaOpen(false)}
                />
            )}
        </div>
    );
}