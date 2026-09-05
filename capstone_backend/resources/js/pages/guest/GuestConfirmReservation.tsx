import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Home,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Users,
    Moon,
    User,
    Mail,
    Phone,
    ClipboardList,
    MessageSquare,
    ShieldCheck,
    CreditCard,
    Info,
    Lock,
    Loader2,
    Check,
} from "lucide-react";

// Same axios instance / room shape used across the guest pages.
import api from "../../services/api";
import { createBooking } from "../../services/bookingService";

// ── Types ──────────────────────────────────────────────────────────
interface RoomType {
    id?: number;
    type_name: string;
    description?: string;
    base_price: number;
    max_occupancy: number;
    size?: number;
}

interface RoomData {
    id: number;
    room_number: string;
    image_url: string | null;
    room_type: RoomType;
}

interface AuthUser {
    first_name?: string;
    last_name?: string;
    email?: string;
    contact_number?: string;
}

interface ReservationDraft {
    checkIn: string;
    checkOut: string;
    guests: number;
}

// Shape passed forward to GuestPayment via navigate(...).
interface PaymentNavState {
    bookingId: number; // NEW — required so GuestPayment can create the QR payment
    checkIn: string;
    checkOut: string;
    guests: number;
    total: number;
    phone: string;
}

const STEPS = [
    { id: 1, label: "Room Details" },
    { id: 2, label: "Guest Information" },
    { id: 3, label: "Payment" },
    { id: 4, label: "Confirm" },
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

const formatDate = (value: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export default function GuestConfirmReservation() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation() as { state?: ReservationDraft };

    const [room, setRoom] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [checkIn] = useState(location.state?.checkIn || "");
    const [checkOut] = useState(location.state?.checkOut || "");
    const [guests, setGuests] = useState(location.state?.guests || 2);

    const currentUser: AuthUser | null = JSON.parse(
        localStorage.getItem("user") || "null",
    );

    const [fullName, setFullName] = useState(
        [currentUser?.first_name, currentUser?.last_name]
            .filter(Boolean)
            .join(" "),
    );
    const [email, setEmail] = useState(currentUser?.email || "");
    const [phone, setPhone] = useState(currentUser?.contact_number || "");
    const [specialRequests, setSpecialRequests] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<
        "pay_at_hotel" | "online"
    >("pay_at_hotel");

    const [confirming, setConfirming] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

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

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-4" />
                <p className="text-[#1a4a35]/60 text-sm">
                    Loading reservation details…
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
    const basePrice = roomType?.base_price ?? 0;

    const nights = (() => {
        if (!checkIn || !checkOut) return 0;
        const diff =
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round(diff));
    })();

    const roomSubtotal = basePrice * (nights || 0);
    const taxesAndFees = 0;
    const total = roomSubtotal + taxesAndFees;

    const isValid =
        fullName.trim().length > 0 &&
        email.trim().length > 0 &&
        phone.trim().length > 0 &&
        nights > 0;

    const handleConfirm = async () => {
        if (!isValid) {
            setConfirmError(
                "Please fill in all required guest details before confirming.",
            );
            return;
        }
        setConfirming(true);
        setConfirmError(null);
        try {
            const bookingRes = await createBooking({
                rooms: [
                    {
                        room_id: room.id,
                        stay_type: "overnight",
                        check_in_date: checkIn,
                        check_out_date: checkOut,
                    },
                ],
                payment_method:
                    paymentMethod === "online" ? "gcash" : "pay_at_hotel",
            });

            // TEMP: keep this log until we confirm the real shape, then remove it.
            console.log("CREATE BOOKING RESPONSE:", bookingRes);

            // Tries the most common Laravel response shapes in order:
            // { data: { id } }, { data: { data: { id } } }, { id }, { booking: { id } }
            const newBookingId: number | undefined =
                bookingRes?.data?.data?.id ??
                bookingRes?.data?.booking?.id ??
                bookingRes?.data?.id;

            if (!newBookingId) {
                console.log(
                    "Could not find booking id in response — check the CREATE BOOKING RESPONSE log above and adjust newBookingId accordingly.",
                );
                setConfirmError(
                    "Booking was created, but we couldn't read its reference. Please check My Bookings.",
                );
                return;
            }

            if (paymentMethod === "online") {
                const paymentState: PaymentNavState = {
                    bookingId: newBookingId,
                    checkIn,
                    checkOut,
                    guests,
                    total,
                    phone,
                };
                navigate(`/guest/rooms/${room.id}/payment`, {
                    state: paymentState,
                });
            } else {
                navigate("/guest/bookings");
            }
        } catch (err: any) {
            console.log("CONFIRM RESERVATION ERROR:", err);
            setConfirmError(
                err?.response?.data?.message ||
                    "Failed to confirm reservation. Please try again.",
            );
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
            {/* ── Breadcrumb + Step indicator ── */}
            <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
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
                        <span className="text-gray-700">
                            Confirm Reservation
                        </span>
                    </div>

                    <h1 className="text-3xl font-bold text-[#0d2e1f] font-['Playfair_Display']">
                        Confirm Your Reservation
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Review your booking details and provide the necessary
                        information.
                    </p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center pt-2">
                    {STEPS.map((step, i) => {
                        const status =
                            step.id < 2
                                ? "done"
                                : step.id === 2
                                  ? "active"
                                  : "upcoming";
                        return (
                            <div
                                key={step.id}
                                className="flex items-center last:flex-none"
                            >
                                <div className="flex flex-col items-center gap-1.5">
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                            status === "upcoming"
                                                ? "bg-gray-200 text-gray-400"
                                                : "bg-[#0d2e1f] text-white"
                                        }`}
                                    >
                                        {status === "done" ? (
                                            <Check className="w-3.5 h-3.5" />
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <span
                                        className={`text-xs whitespace-nowrap ${
                                            status === "upcoming"
                                                ? "text-gray-400"
                                                : "text-gray-700 font-medium"
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div
                                        className={`w-16 h-px mx-2 mb-5 ${
                                            step.id < 2
                                                ? "bg-[#0d2e1f]"
                                                : "bg-gray-200"
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT COLUMN: Form ── */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Guest Information */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                    Guest Information
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Please provide the guest details for this
                                    reservation.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Full Name{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) =>
                                            setFullName(e.target.value)
                                        }
                                        placeholder="Enter your full name"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder="you@example.com"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Phone Number{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        placeholder="+63 9XX XXX XXXX"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Number of Guests{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <select
                                        value={guests}
                                        onChange={(e) =>
                                            setGuests(Number(e.target.value))
                                        }
                                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all appearance-none"
                                    >
                                        {Array.from(
                                            {
                                                length:
                                                    roomType?.max_occupancy ||
                                                    6,
                                            },
                                            (_, i) => i + 1,
                                        ).map((n) => (
                                            <option key={n} value={n}>
                                                {n} guest{n > 1 ? "s" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                    Additional Information
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Let us know if you have any special
                                    requests.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            <textarea
                                value={specialRequests}
                                onChange={(e) =>
                                    setSpecialRequests(e.target.value)
                                }
                                placeholder="Special requests (optional)&#10;e.g. late check-in, extra pillows, high floor, etc."
                                rows={3}
                                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display']">
                                    Payment Method
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Choose your preferred payment method.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("pay_at_hotel")}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-colors ${
                                    paymentMethod === "pay_at_hotel"
                                        ? "border-[#1a4a35] bg-[#eaf3ea]/60"
                                        : "border-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                <span
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        paymentMethod === "pay_at_hotel"
                                            ? "border-[#1a4a35]"
                                            : "border-gray-300"
                                    }`}
                                >
                                    {paymentMethod === "pay_at_hotel" && (
                                        <span className="w-2 h-2 rounded-full bg-[#1a4a35]" />
                                    )}
                                </span>
                                <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                                <span>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Pay at Hotel
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Pay upon check-in
                                    </p>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod("online")}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-colors ${
                                    paymentMethod === "online"
                                        ? "border-[#1a4a35] bg-[#eaf3ea]/60"
                                        : "border-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                <span
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        paymentMethod === "online"
                                            ? "border-[#1a4a35]"
                                            : "border-gray-300"
                                    }`}
                                >
                                    {paymentMethod === "online" && (
                                        <span className="w-2 h-2 rounded-full bg-[#1a4a35]" />
                                    )}
                                </span>
                                <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                                <span>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Online Payment
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Pay now via PayMongo
                                    </p>
                                </span>
                            </button>
                        </div>

                        <div className="flex items-start gap-2.5 rounded-2xl bg-[#eaf3ea] px-4 py-3">
                            <Info className="w-4 h-4 text-[#1a4a35] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#1a4a35] leading-relaxed">
                                You can also pay at the hotel during check-in.
                            </p>
                        </div>
                    </div>

                    {confirmError && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            {confirmError}
                        </div>
                    )}

                    {/* Back / Confirm actions */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>

                        <button
                            onClick={handleConfirm}
                            disabled={confirming}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                            style={{
                                background:
                                    "linear-gradient(to right, #1a4a35, #0d2e1f)",
                            }}
                        >
                            {confirming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Calendar className="w-4 h-4" />
                            )}
                            {confirming ? "Confirming..." : "Confirm Reservation"}
                            {!confirming && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-gray-400 -mt-3">
                        <Lock className="w-3.5 h-3.5" />
                        Your information is secure and encrypted.
                    </p>
                </div>

                {/* ── RIGHT COLUMN: Booking Summary ── */}
                <div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <h3 className="text-lg font-bold text-[#0d2e1f] font-['Playfair_Display']">
                            Booking Summary
                        </h3>
                        <p className="text-gray-500 text-sm mt-1 mb-5">
                            Please review your booking details before
                            confirming.
                        </p>

                        <div className="flex items-start gap-3 mb-5">
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
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                                    {roomType?.description ||
                                        "A cozy and comfortable room perfect for relaxation. Ideal for couples, families, or business travelers."}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Check-in
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
                                        {formatDate(checkOut)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Guests
                                    </p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {guests} guest{guests > 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3">
                                <Moon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Nights
                                    </p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {nights} night{nights === 1 ? "" : "s"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mb-4">
                            <p className="text-sm font-semibold text-[#0d2e1f] mb-3">
                                Price Breakdown
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">
                                        Room Price ({nights || 0} night
                                        {nights === 1 ? "" : "s"})
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {formatPrice(roomSubtotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[#eaf3ea] px-4 py-3.5 mb-5 flex items-center justify-between">
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
                                    Free Cancellation
                                </p>
                                <p className="text-xs text-[#1a4a35]/80 leading-relaxed mt-0.5">
                                    You can cancel your booking up to 24 hours
                                    before check-in without any charges.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}