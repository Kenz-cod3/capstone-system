import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Home,
    ChevronRight,
    Calendar,
    Users,
    Maximize2,
    Wifi,
    Clock,
    Info,
    ShieldCheck,
    Headphones,
    QrCode,
    Loader2,
    Check,
    Phone,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

// Same axios instance used across the guest pages.
import api from "../../services/api";
import {
    createQrPayment,
    checkQrPaymentStatus,
} from "../../services/paymentService";

// ── Types ──────────────────────────────────────────────────────────
type StayType = "overnight" | "short_stay";

interface RoomType {
    id?: number;
    type_name: string;
    description?: string;
    base_price: number;
    max_occupancy: number;
    size?: number;
    short_stay_price?: number | null;
    short_stay_hours?: number | null;
}

interface RoomData {
    id: number;
    room_number: string;
    image_url: string | null;
    room_type: RoomType;
}

interface DraftRoom {
    id: number;
    room_number: string;
    room_type_name: string;
    image_url?: string | null;
    stay_type: StayType;
    check_in_date: string;
    check_out_date: string;
    short_stay_hours?: number;
    guests: number;
    nights: number;
    subtotal: number;
}

interface ReservationDraft {
    rooms?: DraftRoom[];
    bookingId: number; // required to create the QR payment
    checkIn: string;
    checkOut: string;
    guests: number;
    total?: number;
    phone?: string;
    stayType?: StayType;
}

interface AuthUser {
    first_name?: string;
    last_name?: string;
    email?: string;
    contact_number?: string;
}

const STEPS = [
    { id: 1, label: "Room Details" },
    { id: 2, label: "Guest Information" },
    { id: 3, label: "Payment" },
    { id: 4, label: "Confirmation" },
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
        minimumFractionDigits: 2,
    }).format(price || 0);

const formatDate = (value: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatCountdown = (totalSeconds: number) => {
    const clamped = Math.max(0, totalSeconds);
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// PayMongo QR Ph payment intents expire after ~30 minutes by default.
const PAYMENT_WINDOW_SECONDS = 30 * 60;
const POLL_INTERVAL_MS = 5000;

export default function GuestPayment() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation() as { state?: ReservationDraft };

    const [room, setRoom] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const bookingId = location.state?.bookingId;
    const [checkIn] = useState(location.state?.checkIn || "");
    const [checkOut] = useState(location.state?.checkOut || "");
    const [guests] = useState(location.state?.guests || 2);
    const stayType: StayType = location.state?.stayType || "overnight";
    const isShort = stayType === "short_stay";
    const [bookingRooms, setBookingRooms] = useState<DraftRoom[]>([]);
    const stateRooms: DraftRoom[] = location.state?.rooms ?? [];
    const draftRooms: DraftRoom[] =
        bookingRooms.length > 0 ? bookingRooms : stateRooms;
    const isMultiple = draftRooms.length > 1;

    // Load the rooms that were actually saved in the booking.
    useEffect(() => {
        if (!bookingId) return;
        let cancelled = false;
        const loadBookingRooms = async () => {
            try {
                const res = await api.get(`/bookings/${bookingId}`);
                const b = res.data?.data ?? res.data;
                const list: any[] = b?.booked_rooms ?? b?.bookedRooms ?? [];
                const mapped: DraftRoom[] = list
                    .filter(
                        (r) => !["cancelled", "refunded"].includes(r.status),
                    )
                    .map((r) => {
                        const ci = r.check_in_date;
                        const co = r.check_out_date;
                        const diff = Math.round(
                            (new Date(co).getTime() - new Date(ci).getTime()) /
                                86400000,
                        );
                        return {
                            id: r.room_id ?? r.room?.id,
                            room_number: r.room?.room_number ?? "",
                            room_type_name:
                                r.room?.room_type?.type_name ?? "Standard",
                            image_url: r.room?.image_url ?? null,
                            stay_type: r.stay_type,
                            check_in_date: ci,
                            check_out_date: co,
                            short_stay_hours:
                                r.room?.room_type?.short_stay_hours ?? 3,
                            guests: 0,
                            nights: Math.max(1, diff),
                            subtotal: Number(r.subtotal || 0),
                        };
                    });
                if (!cancelled) setBookingRooms(mapped);
            } catch (err) {
                console.log("FETCH BOOKING ROOMS ERROR:", err);
            }
        };
        loadBookingRooms();
        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    const currentUser: AuthUser | null = JSON.parse(
        localStorage.getItem("user") || "null",
    );
    const guestPhone =
        location.state?.phone || currentUser?.contact_number || "";

    const [secondsLeft, setSecondsLeft] = useState(PAYMENT_WINDOW_SECONDS);

    const [status, setStatus] = useState<
        "loading_qr" | "waiting" | "confirmed" | "expired" | "error"
    >("loading_qr");

    const [statusError, setStatusError] = useState<string | null>(null);

    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [clientKey, setClientKey] = useState<string | null>(null);
    // Test-mode simulation link (only populated by PayMongo in test mode)
    const [testUrl, setTestUrl] = useState<string | null>(null);

    // Bumping this regenerates the QR (used by the "Generate new QR" button).
    const [qrAttempt, setQrAttempt] = useState(0);

    // Booking reference fetched once payment is confirmed, for the success screen.
    const [confirmedBookingRef, setConfirmedBookingRef] = useState<
        string | null
    >(null);
    const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

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

    const basePrice = room?.room_type?.base_price ?? 0;
    const shortPrice = room?.room_type?.short_stay_price ?? basePrice;
    const shortHours = room?.room_type?.short_stay_hours ?? 3;

    const nights = useMemo(() => {
        if (isShort) return checkIn ? 1 : 0;
        if (!checkIn || !checkOut) return 0;
        const diff =
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round(diff));
    }, [isShort, checkIn, checkOut]);

    const roomSubtotal = isMultiple
        ? draftRooms.reduce((sum, r) => sum + Number(r.subtotal || 0), 0)
        : isShort
          ? shortPrice
          : basePrice * (nights || 0);
    const taxesAndFees = 0;
    const total = location.state?.total ?? roomSubtotal + taxesAndFees;

    // Create the actual QR Ph payment intent once we know the booking + total.
    useEffect(() => {
        if (!bookingId || !total) return;

        let cancelled = false;

        const createQr = async () => {
            setStatus("loading_qr");
            setStatusError(null);
            try {
                const res = await createQrPayment(bookingId, total);
                if (cancelled) return;
                setQrImageUrl(res.data.qr_image_url);
                setPaymentIntentId(res.data.payment_intent_id);
                setClientKey(res.data.client_key);
                setTestUrl(res.data.test_url || null);
                setSecondsLeft(PAYMENT_WINDOW_SECONDS);
                setStatus("waiting");
            } catch (err) {
                console.log("CREATE QR PAYMENT ERROR:", err);
                if (!cancelled) {
                    setStatusError(
                        "Failed to generate QR code. Please try again.",
                    );
                    setStatus("error");
                }
            }
        };

        createQr();

        return () => {
            cancelled = true;
        };
    }, [bookingId, total, qrAttempt]);

    // Countdown timer for the payment window.
    useEffect(() => {
        if (status !== "waiting") return;
        if (secondsLeft <= 0) {
            setStatus("expired");
            return;
        }
        const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft, status]);

    // Poll the backend for payment confirmation using the real payment intent.
    useEffect(() => {
        if (status !== "waiting" || !paymentIntentId || !clientKey) return;

        const interval = setInterval(async () => {
            try {
                const res = await checkQrPaymentStatus(
                    paymentIntentId,
                    clientKey,
                );
                if (res.data.status === "succeeded") {
                    setStatus("confirmed");
                }
            } catch (err) {
                console.log("PAYMENT STATUS CHECK ERROR:", err);
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [status, paymentIntentId, clientKey]);

    // Once confirmed, fetch the booking reference so the success screen can show it.
    useEffect(() => {
        if (status !== "confirmed" || !bookingId) return;

        let cancelled = false;

        const fetchBookingRef = async () => {
            try {
                const res = await api.get(`/bookings/${bookingId}`);
                const bookingData = res.data?.data ?? res.data;
                if (cancelled) return;
                setConfirmedBookingRef(bookingData?.booking_reference ?? null);
                setConfirmedEmail(bookingData?.user?.email ?? null);
            } catch (err) {
                console.log("FETCH CONFIRMED BOOKING ERROR:", err);
            }
        };

        fetchBookingRef();

        return () => {
            cancelled = true;
        };
    }, [status, bookingId]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-4" />
                <p className="text-[#1a4a35]/60 text-sm">
                    Loading payment details…
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

    if (!bookingId) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <p className="text-gray-500">
                    Missing booking reference. Please go back and confirm your
                    reservation again.
                </p>
                <Link
                    to={`/guest/rooms/${room.id}`}
                    className="inline-block mt-4 px-6 py-2.5 bg-[#c9a96e] text-[#0d2e1f] rounded-full font-medium hover:bg-[#d9bb84] transition-colors"
                >
                    Back to Reservation
                </Link>
            </div>
        );
    }

    const roomType = room.room_type;

    // ── PAYMENT SUCCESSFUL SCREEN ──
    if (status === "confirmed") {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
                    <Home className="w-4 h-4" />
                    <Link
                        to="/guest-dashboard"
                        className="hover:text-[#1a4a35] transition-colors"
                    >
                        Home
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link
                        to={`/guest/rooms/${room.id}`}
                        className="hover:text-[#1a4a35] transition-colors"
                    >
                        Room {room.room_number}
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-gray-700 font-medium">
                        Payment Successful
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── LEFT COLUMN ── */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-[#eaf3ea] flex items-center justify-center mb-5">
                                <Check className="w-10 h-10 text-[#1a4a35]" />
                            </div>
                            <h1 className="text-3xl font-bold text-[#0d2e1f] font-['Playfair_Display'] mb-2">
                                Payment Successful!
                            </h1>
                            <p className="text-gray-500 mb-6 max-w-md">
                                Thank you for choosing Lyn Enia's Traveler's
                                Inn. Your payment has been received and your
                                reservation is now confirmed.
                                {confirmedEmail && (
                                    <>
                                        {" "}
                                        A confirmation email has been sent to{" "}
                                        {confirmedEmail}.
                                    </>
                                )}
                            </p>

                            <div className="w-full max-w-md rounded-2xl bg-[#eaf3ea] px-6 py-5 mb-6">
                                <p className="text-xs text-[#1a4a35]/70 mb-1">
                                    Booking Reference
                                </p>
                                <p className="text-2xl font-bold text-[#0d2e1f] font-['Playfair_Display'] tracking-wide">
                                    {confirmedBookingRef || "—"}
                                </p>
                                <p className="text-xs text-[#1a4a35]/60 mt-1">
                                    Please keep this reference for your records.
                                </p>
                            </div>

                            <div className="w-full max-w-md rounded-2xl bg-gray-50 px-5 py-4 mb-6 flex items-start gap-2.5 text-left">
                                <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    You're all set — no need to pay again at
                                    check-in. Please present your booking
                                    reference and a valid ID upon arrival.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full max-w-md">
                                <Link
                                    to="/guest-dashboard"
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Back to Home
                                </Link>
                                <button
                                    onClick={() => navigate("/guest/bookings")}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                    style={{
                                        background:
                                            "linear-gradient(to right, #1a4a35, #0d2e1f)",
                                    }}
                                >
                                    View My Booking
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: Room Summary ── */}
                    <div>
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24 flex flex-col gap-5">
                            <h3 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                Room Summary
                            </h3>

                            <div className="flex items-start gap-3">
                                <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                    <img
                                        src={
                                            buildImageUrl(room.image_url) ||
                                            "https://picsum.photos/seed/room/200/160"
                                        }
                                        alt={`Room ${room.room_number}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className="text-[#0d2e1f] font-bold font-['Playfair_Display']">
                                            Room {room.room_number}
                                        </p>
                                        <span className="px-2 py-0.5 rounded-full bg-[#eaf3ea] text-[#1a4a35] text-[10px] font-semibold">
                                            {roomType?.type_name || "Standard"}
                                        </span>
                                        {isShort && (
                                            <span className="px-2 py-0.5 rounded-full bg-[#0d2e1f] text-white text-[10px] font-semibold">
                                                Short Stay
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[11px] text-gray-500">
                                            {isShort ? "Date" : "Check-in"}
                                        </p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {formatDate(checkIn)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[11px] text-gray-500">
                                            Check-out
                                        </p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {isShort
                                                ? "Same day"
                                                : formatDate(checkOut)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">
                                        Payment Method
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        QR Ph
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Status
                                    </span>
                                    <span className="font-medium text-[#1a4a35]">
                                        Paid
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-[#eaf3ea] px-4 py-3.5 flex items-center justify-between">
                                <span className="font-semibold text-[#0d2e1f] text-sm">
                                    Total Amount
                                </span>
                                <span className="text-2xl font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                    {formatPrice(total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
                <Home className="w-4 h-4" />
                <Link
                    to="/guest-dashboard"
                    className="hover:text-[#1a4a35] transition-colors"
                >
                    Home
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link
                    to="/guest-dashboard"
                    className="hover:text-[#1a4a35] transition-colors"
                >
                    Rooms
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link
                    to={`/guest/rooms/${room.id}`}
                    className="hover:text-[#1a4a35] transition-colors"
                >
                    Room {room.room_number}
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-700 font-medium">Payment</span>
            </div>

            {/* ── Step indicator ── */}
            <div className="flex items-center justify-center mb-8">
                {STEPS.map((step, i) => {
                    const stepStatus =
                        step.id < 3
                            ? "done"
                            : step.id === 3
                              ? "active"
                              : "upcoming";
                    return (
                        <div
                            key={step.id}
                            className="flex items-center last:flex-none"
                        >
                            <div className="flex flex-col items-center gap-1.5">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                        stepStatus === "upcoming"
                                            ? "bg-gray-200 text-gray-400"
                                            : "bg-[#0d2e1f] text-white"
                                    }`}
                                >
                                    {stepStatus === "done" ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                <span
                                    className={`text-sm whitespace-nowrap ${
                                        stepStatus === "upcoming"
                                            ? "text-gray-400"
                                            : "text-[#0d2e1f] font-medium"
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div
                                    className={`w-28 sm:w-40 h-px mx-3 mb-5 ${
                                        step.id < 3
                                            ? "bg-[#0d2e1f]"
                                            : "bg-gray-200"
                                    }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT COLUMN (sticky: QR + waiting status stay in place) ── */}
                <div className="lg:col-span-2 flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
                    <div>
                        <h1 className="text-3xl font-bold text-[#0d2e1f] font-['Playfair_Display']">
                            Complete Your Payment
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Please complete your payment to confirm your
                            reservation. Your booking will be confirmed once the
                            payment is successfully verified.
                        </p>
                    </div>

                    {/* QR Ph panel */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display'] mb-3">
                            Scan QR Ph to Pay
                        </h3>

                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* QR code */}
                            <div className="w-full sm:w-64 shrink-0">
                                <div className="aspect-square rounded-2xl bg-[#eaf3ea] p-4 flex items-center justify-center">
                                    {status === "loading_qr" ? (
                                        <div className="flex flex-col items-center gap-2 text-[#1a4a35]/60">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                            <p className="text-xs">
                                                Generating QR code…
                                            </p>
                                        </div>
                                    ) : status === "error" ? (
                                        <div className="flex flex-col items-center gap-2 text-red-500 text-center px-2">
                                            <AlertCircle className="w-8 h-8" />
                                            <p className="text-xs">
                                                Couldn't load QR code
                                            </p>
                                        </div>
                                    ) : status === "expired" ? (
                                        <div className="flex flex-col items-center gap-2 text-amber-600 text-center px-2">
                                            <Clock className="w-8 h-8" />
                                            <p className="text-xs">
                                                QR code expired
                                            </p>
                                        </div>
                                    ) : qrImageUrl ? (
                                        <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                                            <img
                                                src={qrImageUrl}
                                                alt="Scan to pay with QR Ph"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                                            <QrCode className="w-4/5 h-4/5 text-[#0d2e1f]" />
                                        </div>
                                    )}
                                </div>

                                {/* Test-mode simulation link — only shows when PayMongo returns a test_url */}
                                {testUrl && status === "waiting" && (
                                    <a
                                        href={testUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 block text-center w-full px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200 transition-colors"
                                    >
                                        🧪 Simulate Payment (Test Mode Only)
                                    </a>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">
                                            Total Amount
                                        </p>
                                        <p className="text-3xl font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                            {formatPrice(total)}
                                        </p>
                                    </div>

                                    {status === "waiting" && (
                                        <div className="flex items-center gap-2.5 rounded-2xl bg-[#eaf3ea] px-4 py-2.5">
                                            <Clock className="w-4 h-4 text-[#1a4a35]" />
                                            <div>
                                                <p className="text-[11px] text-[#1a4a35]/70">
                                                    Payment expires in
                                                </p>
                                                <p className="text-sm font-bold text-[#0d2e1f]">
                                                    {formatCountdown(
                                                        secondsLeft,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <ol className="flex flex-col gap-2.5">
                                    {[
                                        "Open your preferred banking app (GCash, BPI, Maya, etc.)",
                                        "Scan the QR Ph code",
                                        "Complete the payment and wait for verification",
                                    ].map((text, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2.5"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-[#0d2e1f] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                {text}
                                            </span>
                                        </li>
                                    ))}
                                </ol>

                                <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-4 py-3">
                                    <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        After payment, your reservation will be
                                        automatically confirmed within a few
                                        minutes. You will receive a confirmation
                                        email.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {statusError && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            {statusError}
                        </div>
                    )}

                    {status === "expired" && (
                        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                            This payment window has expired. Generate a new QR
                            code to continue.
                        </div>
                    )}

                    {/* Status / retry */}
                    <div className="flex items-center justify-end">
                        {status === "expired" || status === "error" ? (
                            <button
                                onClick={() => setQrAttempt((n) => n + 1)}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                style={{
                                    background:
                                        "linear-gradient(to right, #1a4a35, #0d2e1f)",
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                                Generate new QR
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[#eaf3ea] text-[#1a4a35]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {status === "loading_qr"
                                    ? "Preparing payment..."
                                    : "Waiting for payment..."}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Booking Summary (scrolls normally) ── */}
                <div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
                        <div>
                            <h3 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                Booking Summary
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Please review your booking details.
                                {isMultiple && ` (${draftRooms.length} rooms)`}
                            </p>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                <img
                                    src={
                                        buildImageUrl(room.image_url) ||
                                        "https://picsum.photos/seed/room/200/160"
                                    }
                                    alt={`Room ${room.room_number}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <p className="text-[#0d2e1f] font-bold font-['Playfair_Display']">
                                        Room {room.room_number}
                                    </p>
                                    <span className="px-2 py-0.5 rounded-full bg-[#eaf3ea] text-[#1a4a35] text-[10px] font-semibold">
                                        {roomType?.type_name || "Standard"}
                                    </span>
                                    {isShort && (
                                        <span className="px-2 py-0.5 rounded-full bg-[#0d2e1f] text-white text-[10px] font-semibold">
                                            Short Stay
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                                    {roomType?.description ||
                                        "A cozy and comfortable room perfect for relaxation. Ideal for couples, families, or business travelers."}
                                </p>
                            </div>
                        </div>

                        {isMultiple && (
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-semibold text-[#0d2e1f]">
                                    Your Rooms ({draftRooms.length})
                                </p>
                                {draftRooms.map((r, i) => (
                                    <div
                                        key={`${r.id}-${i}`}
                                        className="flex items-center gap-3 rounded-2xl bg-gray-50 p-2.5"
                                    >
                                        <div className="w-16 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                            <img
                                                src={
                                                    buildImageUrl(
                                                        r.image_url,
                                                    ) ||
                                                    "https://picsum.photos/seed/room/200/160"
                                                }
                                                alt={`Room ${r.room_number}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-[#0d2e1f]">
                                                Room {r.room_number}
                                                <span className="ml-1.5 text-[10px] font-semibold text-[#1a4a35] bg-[#eaf3ea] px-2 py-0.5 rounded-full">
                                                    {r.room_type_name}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {r.stay_type === "short_stay"
                                                    ? `${formatDate(r.check_in_date)} · Short stay`
                                                    : `${formatDate(r.check_in_date)} → ${formatDate(r.check_out_date)}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-gray-500 text-sm flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                {guests} guest{guests > 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Maximize2 className="w-4 h-4" />
                                {roomType?.size || 22} m²
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Wifi className="w-4 h-4" />
                                Free WiFi
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        {isShort ? "Date" : "Check-in"}
                                    </p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {formatDate(checkIn)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Check-out
                                    </p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {isShort
                                            ? "Same day"
                                            : formatDate(checkOut)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {guestPhone && (
                            <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Contact Number
                                    </p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {guestPhone}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-sm font-semibold text-[#0d2e1f] mb-3">
                                Price Breakdown
                            </p>
                            <div className="space-y-2 text-sm">
                                {isMultiple ? (
                                    draftRooms.map((r, i) => (
                                        <div
                                            key={`${r.id}-${i}`}
                                            className="flex justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-gray-700 font-medium">
                                                    Room {r.room_number}
                                                    <span className="text-gray-400 font-normal">
                                                        {" "}
                                                        · {r.room_type_name}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {r.stay_type ===
                                                    "short_stay"
                                                        ? `${formatDate(r.check_in_date)} · Short stay (${r.short_stay_hours ?? 3}h)`
                                                        : `${formatDate(r.check_in_date)} → ${formatDate(r.check_out_date)} · ${r.nights} night${r.nights === 1 ? "" : "s"}`}
                                                </p>
                                            </div>
                                            <span className="font-medium text-gray-900 shrink-0">
                                                {formatPrice(r.subtotal)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">
                                            {isShort
                                                ? `Short stay (${shortHours} hours)`
                                                : `Room Price (${nights || 0} night${nights === 1 ? "" : "s"})`}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {formatPrice(roomSubtotal)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">
                                        Taxes &amp; Fees (0%)
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {formatPrice(taxesAndFees)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[#eaf3ea] px-4 py-3.5 flex items-center justify-between">
                            <span className="font-semibold text-[#0d2e1f] text-sm">
                                Total Amount
                            </span>
                            <span className="text-2xl font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                {formatPrice(total)}
                            </span>
                        </div>

                        <div className="flex items-start gap-2.5 rounded-2xl bg-[#eaf3ea] px-4 py-3.5">
                            <ShieldCheck className="w-4 h-4 text-[#1a4a35] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-[#0d2e1f]">
                                    Secure Payment
                                </p>
                                <p className="text-xs text-[#1a4a35]/80 leading-relaxed mt-0.5">
                                    Your payment is securely processed via
                                    PayMongo. We do not store your banking
                                    details.
                                </p>
                            </div>
                        </div>

                        <p className="text-center text-xs text-gray-400">
                            Powered by{" "}
                            <span className="font-semibold text-gray-500">
                                PayMongo
                            </span>{" "}
                            &middot;{" "}
                            <span className="font-semibold text-gray-500">
                                QR Ph
                            </span>
                        </p>

                        <div className="border-t border-gray-100 pt-4 flex items-start gap-2.5">
                            <Headphones className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    Need Help?
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Contact our support team if you encounter
                                    any issues.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}