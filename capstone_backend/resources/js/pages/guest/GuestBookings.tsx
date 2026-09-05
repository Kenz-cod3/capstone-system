import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Calendar,
    Clock,
    Eye,
    X,
    CheckCircle,
    RefreshCw,
    Loader2,
    ChevronRight,
    Moon,
    Users,
    Wifi,
    Snowflake,
    Tv,
    Droplet,
    Briefcase,
    ArrowRight,
} from "lucide-react";

// Same service the mobile app calls (services/bookingService.ts).
// NOTE: adjust this relative path to match this file's actual folder depth.
import {
    getBookings,
    getBookingHistory,
    updateBooking,
} from "../../services/bookingService";

interface BookedRoom {
    status?: string;
    room?: {
        room_number?: string;
        image_url?: string | null;
        // Optional — wire these to your RoomType relation if available.
        amenities?: string[];
        max_guests?: number;
        room_type?: {
            type_name?: string;
        };
    };
}

interface BookingRecord {
    id: number;
    booking_reference?: string;
    booking_status?: string;
    total_price: number;
    check_in_date: string;
    check_out_date: string;
    booked_rooms?: BookedRoom[];
    rooms?: { room_number?: string; image_url?: string | null }[];
}

// Same status set as the mobile app's STATUS_CONFIG.
const STATUS_CONFIG: Record<
    string,
    { bg: string; text: string; dot: string; label: string }
> = {
    pending: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        dot: "bg-amber-500",
        label: "Pending",
    },
    checked_in: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-500",
        label: "Checked In",
    },
    checked_out: {
        bg: "bg-green-100",
        text: "text-green-700",
        dot: "bg-green-500",
        label: "Checked Out",
    },
    cancelled: {
        bg: "bg-red-100",
        text: "text-red-700",
        dot: "bg-red-500",
        label: "Cancelled",
    },
    refunded: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        dot: "bg-purple-500",
        label: "Refunded",
    },
};

const STATUS_ICON: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    pending: Clock,
    checked_in: Calendar,
    checked_out: CheckCircle,
    cancelled: X,
    refunded: RefreshCw,
};

// Default amenity set shown when the room record doesn't carry its own list
// (mirrors what's shown in the target design for every room card).
const DEFAULT_AMENITIES = [
    "Free WiFi",
    "Air Conditioning",
    "TV",
    "Hot & Cold Shower",
];

const AMENITY_ICON: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    "free wifi": Wifi,
    wifi: Wifi,
    "air conditioning": Snowflake,
    tv: Tv,
    "hot & cold shower": Droplet,
};

const getAmenityIcon = (label: string) =>
    AMENITY_ICON[label.toLowerCase()] || Wifi;

// Banner background — swap for your own hotel-room asset.
// e.g. import bannerImg from '../../images/bookingsBanner.jpg';
const BANNER_IMAGE =
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop";

export default function GuestBookings() {
    const [filter, setFilter] = useState<"active" | "history">("active");
    const [data, setData] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const fetchBookings = async (currentPage = 1, isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);

            if (filter === "history") {
                const res = await getBookingHistory(currentPage, 10);
                setData(res.data.data ?? []);
                setLastPage(res.data.last_page ?? 1);
            } else {
                const res = await getBookings();
                const result = (res as any)?.data ?? res;
                setData(Array.isArray(result) ? result : []);
            }
        } catch (e) {
            console.log("Error fetching bookings:", e);
            setData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBookings(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, page]);

    const getStatus = (item: BookingRecord) =>
        (item.booked_rooms?.[0]?.status || item.booking_status || "pending")
            .toLowerCase()
            .replace("-", "_");

    const activeBookings = data.filter(
        (item) => !["checked_out", "refunded"].includes(getStatus(item)),
    );
    const historyBookings = data.filter((item) =>
        ["checked_out", "refunded"].includes(getStatus(item)),
    );
    const filteredBookings =
        filter === "active" ? activeBookings : historyBookings;

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
        }).format(price);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const handleCancel = async (id: number) => {
        try {
            setCancellingId(id);
            await updateBooking(id, { status: "cancelled" });
            fetchBookings(page);
        } catch (e) {
            console.log("Error cancelling booking:", e);
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="w-full">
            {/* ── HERO BANNER (full-bleed: no top gap, no side margins) ── */}
            <div className="relative overflow-hidden h-64 sm:h-72 w-full">
                {/* ── HERO BANNER (full-bleed: no top gap, no side margins) ── */}
                <div className="relative overflow-hidden h-64 sm:h-72 w-screen left-1/2 right-1/2 -mx-[50vw]">
                    <img
                        src={BANNER_IMAGE}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f7f8f5] via-[#f7f8f5]/85 to-transparent" />

                    <button
                        onClick={() => fetchBookings(page, true)}
                        className="absolute top-5 right-5 sm:right-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
                        aria-label="Refresh bookings"
                    >
                        <RefreshCw
                            className={`w-4 h-4 text-[#1a4a35] ${refreshing ? "animate-spin" : ""}`}
                        />
                    </button>

                    <div className="absolute top-6 right-16 sm:right-24 text-right hidden sm:block max-w-[220px] z-10">
                        <p
                            className="italic text-white/90 leading-snug"
                            style={{ fontFamily: "Georgia" }}
                        >
                            More
                            <br />
                            than a Stay
                            <br />
                            <span className="text-[#c9a96e]">
                                A Better Tomorrow
                            </span>
                        </p>
                    </div>

                    <div className="relative h-full flex flex-col justify-center px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
                        <h1
                            className="text-4xl sm:text-5xl font-bold text-[#0d2e1f]"
                            style={{ fontFamily: "Georgia" }}
                        >
                            My Bookings
                        </h1>
                        <p className="text-gray-600 mt-1 mb-5">
                            Manage all your reservations
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPage(1);
                                    setFilter("active");
                                }}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                                    filter === "active"
                                        ? "bg-[#0d2e1f] text-white shadow-lg"
                                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                                }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => {
                                    setPage(1);
                                    setFilter("history");
                                }}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                                    filter === "history"
                                        ? "bg-[#0d2e1f] text-white shadow-lg"
                                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                                }`}
                            >
                                History
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PAGE CONTENT (normal padding resumes here) ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Bookings List */}
                {loading ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">
                            Loading bookings…
                        </p>
                    </div>
                ) : filteredBookings.length > 0 ? (
                    <div className="space-y-4">
                        {filteredBookings.map((item) => {
                            const status = getStatus(item);
                            const s = STATUS_CONFIG[status] ?? {
                                bg: "bg-gray-100",
                                text: "text-gray-700",
                                dot: "bg-gray-400",
                                label: status,
                            };
                            const room =
                                item.booked_rooms?.[0]?.room || item.rooms?.[0];
                            const roomTypeName =
                                item.booked_rooms?.[0]?.room?.room_type
                                    ?.type_name || "Room";
                            const amenities = (
                                item.booked_rooms?.[0]?.room?.amenities?.length
                                    ? item.booked_rooms[0].room!.amenities
                                    : DEFAULT_AMENITIES
                            ) as string[];
                            const guests =
                                item.booked_rooms?.[0]?.room?.max_guests ?? 2;

                            const nights = (() => {
                                if (!item.check_in_date || !item.check_out_date)
                                    return null;
                                const diff =
                                    (new Date(item.check_out_date).getTime() -
                                        new Date(
                                            item.check_in_date,
                                        ).getTime()) /
                                    (1000 * 60 * 60 * 24);
                                return Math.max(1, Math.round(diff));
                            })();

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-5">
                                        {/* Thumbnail — fixed small size, never stretches the card */}
                                        <div className="relative w-40 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                            {room?.image_url ? (
                                                <img
                                                    src={room.image_url}
                                                    alt={`Room ${room?.room_number ?? ""}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Calendar className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                            <span className="absolute bottom-1.5 left-1.5 px-2.5 py-1 rounded-full bg-[#c9a96e] text-[#0d2e1f] text-[11px] font-semibold whitespace-nowrap">
                                                {roomTypeName}
                                            </span>
                                        </div>

                                        {/* Middle info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                                <h3
                                                    className="text-lg font-bold text-[#0d2e1f]"
                                                    style={{
                                                        fontFamily: "Georgia",
                                                    }}
                                                >
                                                    Room{" "}
                                                    {room?.room_number ?? "N/A"}
                                                </h3>
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${s.dot}`}
                                                    />
                                                    {s.label}
                                                </span>
                                            </div>

                                            {item.booking_reference && (
                                                <p className="text-xs text-gray-400 mb-2.5">
                                                    Booking Ref: #
                                                    {item.booking_reference}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-gray-600 mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span>
                                                        Check-in{" "}
                                                        {formatDate(
                                                            item.check_in_date,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span>
                                                        Check-out{" "}
                                                        {formatDate(
                                                            item.check_out_date,
                                                        )}
                                                    </span>
                                                </div>
                                                {nights !== null && (
                                                    <div className="flex items-center gap-2">
                                                        <Moon className="w-4 h-4 text-gray-400" />
                                                        <span>
                                                            {nights} night
                                                            {nights > 1
                                                                ? "s"
                                                                : ""}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span>{guests} guests</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 bg-gray-50 rounded-lg px-4 py-2">
                                                {amenities.map((label) => {
                                                    const Icon =
                                                        getAmenityIcon(label);
                                                    return (
                                                        <div
                                                            key={label}
                                                            className="flex items-center gap-1.5 text-xs text-gray-500"
                                                        >
                                                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                                                            {label}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="w-px self-stretch bg-gray-100 shrink-0" />

                                        {/* Right: price + action */}
                                        <div className="flex flex-col items-end gap-3 shrink-0 w-44">
                                            <div className="text-right">
                                                <p
                                                    className="text-2xl font-bold text-[#c9a96e] leading-tight"
                                                    style={{
                                                        fontFamily: "Georgia",
                                                    }}
                                                >
                                                    {formatPrice(
                                                        item.total_price,
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Total Amount
                                                </p>
                                            </div>

                                            {status === "pending" && (
                                                <button
                                                    onClick={() =>
                                                        handleCancel(item.id)
                                                    }
                                                    disabled={
                                                        cancellingId === item.id
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm w-full hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {cancellingId ===
                                                    item.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <X className="w-4 h-4" />
                                                    )}
                                                    Cancel
                                                </button>
                                            )}
                                            <Link
                                                to={`/guest/bookings/${item.id}`}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0d2e1f] text-white rounded-xl text-sm font-medium w-full hover:bg-[#1a4a35] transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View Details
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* End-of-list card (active tab only) */}
                        {filter === "active" && (
                            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                                <div className="w-16 h-16 rounded-full bg-[#faf1de] flex items-center justify-center mx-auto mb-4">
                                    <Briefcase className="w-7 h-7 text-[#c9a96e]" />
                                </div>
                                <h3
                                    className="text-lg font-semibold text-gray-700"
                                    style={{ fontFamily: "Georgia" }}
                                >
                                    No more active bookings
                                </h3>
                                <p className="text-gray-500 mt-1">
                                    Your upcoming reservations will appear here.
                                </p>
                                <Link
                                    to="/guest-dashboard"
                                    className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-full border border-[#0d2e1f] text-[#0d2e1f] font-medium hover:bg-[#0d2e1f] hover:text-white transition-colors"
                                >
                                    Browse Rooms
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3
                            className="text-lg font-semibold text-gray-700"
                            style={{ fontFamily: "Georgia" }}
                        >
                            {filter === "active"
                                ? "No active bookings"
                                : "No booking history"}
                        </h3>
                        <p className="text-gray-500 mt-1">
                            {filter === "active"
                                ? "Start your first booking today"
                                : "Your past bookings will appear here"}
                        </p>
                        {filter === "active" && (
                            <Link
                                to="/guest-dashboard"
                                className="inline-block mt-4 px-6 py-2.5 bg-[#c9a96e] text-[#0d2e1f] rounded-full font-medium hover:bg-[#d9bb84] transition-colors"
                            >
                                Browse Rooms
                            </Link>
                        )}
                    </div>
                )}

                {/* Pagination — only relevant for the paginated history endpoint */}
                {filter === "history" && lastPage > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 rounded-full text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">
                            Page {page} of {lastPage}
                        </span>
                        <button
                            onClick={() =>
                                setPage((p) => Math.min(lastPage, p + 1))
                            }
                            disabled={page >= lastPage}
                            className="px-4 py-2 rounded-full text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
