import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Home,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Copy,
    Check,
    Calendar,
    Moon,
    Users,
    Maximize2,
    Wifi,
    Snowflake,
    Bath,
    Tv,
    Droplet,
    Sparkles,
    CreditCard,
    User,
    Mail,
    Phone,
    Headphones,
    Mail as MailIcon,
    Edit2,
    Loader2,
    Info,
    Camera,
} from "lucide-react";

// Same axios instance used elsewhere in the app.
// Adjust the relative path if your api.ts lives somewhere else.
import api from "../../services/api";

// ── Types ──────────────────────────────────────────────────────────
// NOTE: shaped from BookingController@show (Booking::with([user, walkInGuest,
// createdBy, histories.user, payments.receiver, payments.shift,
// bookedRooms.bookingAddOns.addOn, bookedRooms.room.roomType/images])).
// Field names for Payment / RoomType are best-effort guesses — adjust to
// match your actual models if they differ.

interface RoomImage {
    id: number;
    image_path: string;
    image_type?: "normal" | "360" | string;
}

interface RoomType {
    id: number;
    name?: string;
    description?: string;
    max_guests?: number;
    size_sqm?: number;
    // TODO: confirm this is how amenities are stored on your RoomType model —
    // could be a JSON column, a comma-separated string, or a related table.
    amenities?: string[] | string | null;
}

interface RoomData {
    id: number;
    room_number?: string;
    image_url?: string | null;
    images?: RoomImage[];
    // NOTE: Eloquent converts relation keys to snake_case when serializing
    // to JSON, so the `roomType()` relation comes back as `room_type`.
    room_type?: RoomType;
}

interface BookedRoomData {
    id: number;
    status?: string;
    stay_type?: string;
    check_in_date?: string;
    check_out_date?: string;
    price_at_time_of_booking?: number;
    subtotal?: number;
    room?: RoomData;
}

interface GuestUser {
    first_name?: string;
    last_name?: string;
    email?: string;
    contact_number?: string;
}

interface PaymentData {
    id: number;
    payment_method?: string;
    // TODO: confirm the actual column name — could be reference_number,
    // gcash_reference, bank_reference, etc.
    reference_number?: string;
    payment_status?: string;
    payment_date?: string;
    amount?: number;
}

interface BookingData {
    id: number;
    booking_reference: string;
    total_price: number;
    created_at?: string;
    user?: GuestUser | null;
    walk_in_guest?: GuestUser | null;
    booked_rooms?: BookedRoomData[];
    payments?: PaymentData[];
}

// ── Status chip config (mirrors GuestBookings' STATUS_CONFIG) ──────
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending" },
    confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Confirmed" },
    checked_in: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Checked In" },
    checked_out: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Checked Out" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Cancelled" },
    refunded: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", label: "Refunded" },
};

// ── Amenity → icon mapping. Falls back to a generic sparkle icon for
// anything not recognized, so new amenity strings never break the UI. ──
const getAmenityIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("wifi")) return Wifi;
    if (l.includes("air") || l.includes("aircon")) return Snowflake;
    if (l.includes("bathroom")) return Bath;
    if (l.includes("tv") || l.includes("television")) return Tv;
    if (l.includes("shower") || l.includes("hot") || l.includes("water")) return Droplet;
    return Sparkles;
};

// TODO: this assumes images are served from the same host as the API, under
// /storage/<path> (matching Storage::disk('public') + asset('storage/...')
// used elsewhere in your backend). Adjust if your setup differs.
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

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const NOOP = () => {};

export default function GuestBookingDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [booking, setBooking] = useState<BookingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/bookings/${id}`);
                setBooking(res.data);
            } catch (err) {
                console.log("BOOKING DETAILS ERROR:", err);
                setError("Failed to load booking details.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchBooking();
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-4" />
                <p className="text-[#1a4a35]/60 text-sm">Loading booking details…</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <p className="text-gray-500">{error || "Booking not found."}</p>
                <Link
                    to="/guest/bookings"
                    className="inline-block mt-4 px-6 py-2.5 bg-[#c9a96e] text-[#0d2e1f] rounded-full font-medium hover:bg-[#d9bb84] transition-colors"
                >
                    Back to My Bookings
                </Link>
            </div>
        );
    }

    const bookedRoom = booking.booked_rooms?.[0];
    const room = bookedRoom?.room;
    const roomType = room?.room_type;
    const payment = booking.payments?.[0];
    const guest = booking.user || booking.walk_in_guest;

    const status = (bookedRoom?.status || "pending").toLowerCase().replace("-", "_");
    const statusCfg = STATUS_CONFIG[status] ?? {
        bg: "bg-gray-100",
        text: "text-gray-700",
        dot: "bg-gray-400",
        label: status,
    };

    const nights =
        bookedRoom?.check_in_date && bookedRoom?.check_out_date
            ? Math.max(
                  1,
                  Math.round(
                      (new Date(bookedRoom.check_out_date).getTime() -
                          new Date(bookedRoom.check_in_date).getTime()) /
                          (1000 * 60 * 60 * 24),
                  ),
              )
            : null;

    // Build the gallery image list. Falls back to the single computed
    // image_url if the raw `images` array isn't present on this response.
    const images: string[] = (() => {
        if (room?.images && room.images.length > 0) {
            return room.images
                .map((img) => buildImageUrl(img.image_path))
                .filter((u): u is string => Boolean(u));
        }
        if (room?.image_url) return [room.image_url];
        return [];
    })();

    const thumbnails = images.filter((_, i) => i !== activeImage).slice(0, 3);
    const remainingCount = Math.max(0, images.length - 1 - thumbnails.length);

    const goPrev = () =>
        setActiveImage((i) => (images.length ? (i - 1 + images.length) % images.length : 0));
    const goNext = () =>
        setActiveImage((i) => (images.length ? (i + 1) % images.length : 0));

    const handleCopyReference = async () => {
        try {
            await navigator.clipboard.writeText(booking.booking_reference);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard API unavailable — silently ignore
        }
    };

    // Normalize amenities into a flat string list regardless of whether the
    // backend sends an array, a JSON string, or a comma-separated string.
    const amenities: string[] = (() => {
        const raw = roomType?.amenities;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            /* not JSON — fall through to comma split */
        }
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
    })();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Home className="w-4 h-4" />
                <Link to="/guest/bookings" className="hover:text-[#1a4a35] transition-colors">
                    My Bookings
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-700">Booking Details</span>
            </div>

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1
                        className="text-3xl font-bold text-[#0d2e1f]"
                        style={{ fontFamily: "Georgia" }}
                    >
                        Booking Details
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Here are the details of your reservation.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/guest/bookings")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to My Bookings
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Gallery + room info */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Gallery */}
                            <div className="flex gap-3 md:w-[62%] shrink-0">
                                {/* Main image */}
                                <div className="relative flex-1 h-[380px] rounded-2xl overflow-hidden bg-gray-100">
                                    {images.length > 0 ? (
                                        <img
                                            src={images[activeImage]}
                                            alt={roomType?.name || "Room photo"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Camera className="w-10 h-10 text-gray-300" />
                                        </div>
                                    )}

                                    {roomType?.name && (
                                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 text-xs font-medium text-[#0d2e1f] flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            {roomType.name}
                                        </span>
                                    )}

                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={goPrev}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                                                aria-label="Previous photo"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={goNext}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
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

                                {/* Thumbnails */}
                                {thumbnails.length > 0 && (
                                    <div className="flex flex-col gap-3 w-24">
                                        {thumbnails.map((src, i) => {
                                            const isLast = i === thumbnails.length - 1;
                                            const realIndex = images.indexOf(src);
                                            return (
                                                <button
                                                    key={src + i}
                                                    onClick={() => setActiveImage(realIndex)}
                                                    className="relative flex-1 rounded-xl overflow-hidden bg-gray-100"
                                                >
                                                    <img
                                                        src={src}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {isLast && remainingCount > 0 && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                                                            +{remainingCount}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Room info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap mb-1">
                                    <h2
                                        className="text-xl font-bold text-[#0d2e1f]"
                                        style={{ fontFamily: "Georgia" }}
                                    >
                                        Room {room?.room_number ?? "N/A"}
                                    </h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                        {statusCfg.label}
                                    </span>
                                </div>

                                <p className="text-gray-700 font-medium mb-2">
                                    {roomType?.name || "Room"}
                                </p>

                                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                    {roomType?.description ||
                                        "A cozy and comfortable room perfect for relaxation. Ideal for couples, families, or business travelers."}
                                </p>

                                <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-600">
                                    {roomType?.max_guests && (
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            {roomType.max_guests} guests
                                        </div>
                                    )}
                                    {roomType?.size_sqm && (
                                        <div className="flex items-center gap-2">
                                            <Maximize2 className="w-4 h-4 text-gray-400" />
                                            {roomType.size_sqm} m²
                                        </div>
                                    )}
                                    {amenities.map((label) => {
                                        const Icon = getAmenityIcon(label);
                                        return (
                                            <div key={label} className="flex items-center gap-2">
                                                <Icon className="w-4 h-4 text-gray-400" />
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stay Information */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#0d2e1f]" />
                                <p className="text-[#0d2e1f] font-semibold">Stay Information</p>
                            </div>
                            <button
                                onClick={NOOP}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">Check-in Date</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatDate(bookedRoom?.check_in_date)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">Check-out Date</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatDate(bookedRoom?.check_out_date)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Moon className="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">Length of Stay</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {nights ? `${nights} night${nights > 1 ? "s" : ""}` : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700">
                                You can request changes to your booking by contacting our support
                                team.
                            </p>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="w-4 h-4 text-[#0d2e1f]" />
                            <p className="text-[#0d2e1f] font-semibold">Payment Information</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between gap-8">
                                    <span className="text-gray-500">Payment Method</span>
                                    <span className="font-medium text-gray-900 uppercase">
                                        {payment?.payment_method || "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-gray-500">Transaction ID</span>
                                    <span className="font-medium text-gray-900">
                                        {payment?.reference_number
                                            ? `#${payment.reference_number}`
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-gray-500">Payment Date</span>
                                    <span className="font-medium text-gray-900">
                                        {formatDateTime(payment?.payment_date)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-gray-500">Amount Paid</span>
                                    <span className="font-medium text-gray-900">
                                        {formatPrice(payment?.amount ?? booking.total_price)}
                                    </span>
                                </div>
                            </div>

                            {payment?.payment_status === "paid" && (
                                <div className="rounded-2xl bg-green-50 px-5 py-4 flex items-center gap-3 sm:w-64 shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-green-700">
                                            Payment Successful
                                        </p>
                                        <p className="text-xs text-green-600/80">
                                            Thank you for your payment!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="flex flex-col gap-6">
                    {/* Booking Reference */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="rounded-2xl bg-[#eaf3ea] px-4 py-3 flex items-center justify-between mb-5">
                            <div>
                                <p className="text-xs text-[#1a4a35]/70">Booking Reference</p>
                                <p className="text-sm font-bold text-[#0d2e1f]">
                                    #{booking.booking_reference}
                                </p>
                            </div>
                            <button
                                onClick={handleCopyReference}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
                                aria-label="Copy booking reference"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-[#1a4a35]" />
                                )}
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Booking Date</span>
                                <span className="font-medium text-gray-900">
                                    {formatDate(booking.created_at)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Check-in</span>
                                <span className="font-medium text-gray-900">
                                    {formatDate(bookedRoom?.check_in_date)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Check-out</span>
                                <span className="font-medium text-gray-900">
                                    {formatDate(bookedRoom?.check_out_date)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nights</span>
                                <span className="font-medium text-gray-900">
                                    {nights ? `${nights} night${nights > 1 ? "s" : ""}` : "—"}
                                </span>
                            </div>
                            {/* TODO: guest count isn't on BookedRoom in the controllers I
                                reviewed — wire this to wherever your app stores it
                                (e.g. a `guests` column, or roomType.max_guests as a stand-in). */}
                            {roomType?.max_guests && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Guests</span>
                                    <span className="font-medium text-gray-900">
                                        {roomType.max_guests} guests
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500">Total Amount</p>
                                <p
                                    className="text-2xl font-bold text-[#c9a96e]"
                                    style={{ fontFamily: "Georgia" }}
                                >
                                    {formatPrice(booking.total_price)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-gray-500">Payment Status</span>
                            {payment?.payment_status === "paid" ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                                    <Check className="w-3 h-3" strokeWidth={3} />
                                    Paid
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                    {payment?.payment_status || "Pending"}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Guest Information */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#0d2e1f]" />
                                <p className="text-[#0d2e1f] font-semibold">Guest Information</p>
                            </div>
                            <button
                                onClick={NOOP}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium text-gray-900 text-right">
                                    {guest
                                        ? `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim()
                                        : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium text-gray-900 text-right break-all">
                                    {guest?.email || "—"}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Phone</span>
                                <span className="font-medium text-gray-900 text-right">
                                    {guest?.contact_number || "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Need Help */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Headphones className="w-4 h-4 text-[#0d2e1f]" />
                            <p className="text-[#0d2e1f] font-semibold">Need Help?</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            If you have any questions about your booking, feel free to contact our
                            support team.
                        </p>
                        <button
                            onClick={NOOP}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#0d2e1f] hover:bg-gray-50 transition-colors"
                        >
                            <MailIcon className="w-4 h-4" />
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}