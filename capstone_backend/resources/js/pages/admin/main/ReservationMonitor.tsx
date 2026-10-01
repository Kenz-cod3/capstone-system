import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Eye,
    Filter,
    Search,
    User2,
} from "lucide-react";
import api from "@/services/api";

/// ===============================
// TYPES
// ===============================
interface Person {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
}

interface RoomType {
    id: number;
    type_name: string;
}

interface RoomInfo {
    id: number;
    room_number: string;
    room_type?: RoomType;
    roomType?: RoomType;
}

interface BookedRoom {
    id: number; // booked_rooms.id
    room: RoomInfo;
    status?: string;
    stay_type?: string;
    subtotal?: number;
}

type BookingStatus = "pending" | "confirmed" | "checked_in";

interface Booking {
    id: number; // booked_rooms.id
    booking_id: number; // bookings.id

    booking_reference: string;
    booking_status: BookingStatus;

    check_in_date: string;
    check_out_date: string;

    check_in_time: string | null;
    check_out_time: string | null;

    subtotal: number;

    guests_adults?: number;
    guests_children?: number;

    user: Person | null;
    walkInGuest: Person | null;

    room: RoomInfo;
}

// ===============================
// CONSTANTS
// ===============================
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type StatusMeta = { badge: string; dot: string; label: string };

const STATUS_STYLES: Record<BookingStatus, StatusMeta> = {
    confirmed: {
        badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
        dot: "bg-amber-500",
        label: "Confirmed",
    },
    pending: {
        badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
        dot: "bg-violet-500",
        label: "Pending",
    },
    checked_in: {
        badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
        dot: "bg-sky-500",
        label: "Checked In",
    },
};

// ===============================
// HELPERS
// ===============================
function fullName(p: Person | null | undefined): string {
    if (!p) return "Guest";
    return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

function initial(p: Person | null | undefined): string {
    const name = fullName(p);
    return name.charAt(0).toUpperCase() || "G";
}

function guestOf(b: Booking): Person | null {
    return b.user ?? b.walkInGuest ?? null;
}

function roomLabel(b: Booking): string {
    return b.room?.room_number ?? "—";
}

function roomTypeLabel(b: Booking): string {
    const rt = b.room?.room_type ?? b.room?.roomType;
    return rt?.type_name ?? "—";
}

function toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
    return new Date(d.getTime() + n * DAY_MS);
}

function nightsBetween(start: string, end: string): number {
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((e - s) / DAY_MS));
}

function formatTime(time: string | null, fallbackDate?: string): string {
    if (!time) return "—";
    const raw = time.includes("T")
        ? time
        : `${fallbackDate ?? "1970-01-01"}T${time}`;
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return time;
    return parsed.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatShort(d: string | Date): string {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLong(d: string | Date): string {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatCurrency(n: number): string {
    return `₱${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n)}`;
}

function formatMoney(amount: number) {
    return formatCurrency(amount);
}

// ===============================
// MAIN COMPONENT
// ===============================
export default function ReservationMonitor() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>(
        "all",
    );
    const [roomTypeFilter, setRoomTypeFilter] = useState("all");

    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [view, setView] = useState<"month" | "week" | "day">("month");

    const loadBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/reservation-monitor");
            const data = res.data;
            const list: Booking[] = Array.isArray(data)
                ? data
                : (data.data ?? []);
            setBookings(list);
            if (list.length && selectedId === null) {
                setSelectedId(list[0]!.id);
                setCalendarMonth(new Date(list[0]!.check_in_date));
            }
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to load reservations",
            );
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const roomTypes = useMemo(() => {
        const names = new Set<string>();
        bookings.forEach((b) => {
            const rt = roomTypeLabel(b);
            if (rt !== "—") names.add(rt);
        });
        return Array.from(names);
    }, [bookings]);

    const filteredList = useMemo(() => {
        const q = search.trim().toLowerCase();
        return bookings.filter((b) => {
            if (statusFilter !== "all" && b.booking_status !== statusFilter)
                return false;
            if (roomTypeFilter !== "all" && roomTypeLabel(b) !== roomTypeFilter)
                return false;
            if (!q) return true;
            const guest = fullName(guestOf(b)).toLowerCase();
            const ref = b.booking_reference.toLowerCase();
            return guest.includes(q) || ref.includes(q);
        });
    }, [bookings, search, statusFilter, roomTypeFilter]);

    const selected = useMemo(
        () => bookings.find((b) => b.id === selectedId) ?? null,
        [bookings, selectedId],
    );

    const handleSelect = (b: Booking) => {
        setSelectedId(b.id);
        setCalendarMonth(new Date(b.check_in_date));
    };

    const handleExport = () => {
        const header = [
            "Reference",
            "Guest",
            "Room",
            "Check-in",
            "Check-out",
            "Status",
        ];
        const rows = bookings.map((b) => [
            b.booking_reference,
            fullName(guestOf(b)),
            roomLabel(b),
            b.check_in_date,
            b.check_out_date,
            b.booking_status,
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((c) => `"${c}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reservations-${toDateOnly(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const goPrevMonth = () =>
        setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const goNextMonth = () =>
        setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const goToday = () => setCalendarMonth(new Date());

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-50 text-slate-900">
            <style>
                {`
                    /* Slim scrollbar */
                    .slim-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: #cbd5e1 transparent;
                    }
                    .slim-scroll::-webkit-scrollbar {
                        width: 5px;
                        height: 5px;
                    }
                    .slim-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .slim-scroll::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 9999px;
                    }
                    .slim-scroll::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}
            </style>

            {/* SIDEBAR - Hidden on small screens, shown on medium and up */}
            <aside className="hidden md:flex h-full w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
                {/* HEADER (fixed, same height as breadcrumb bar) */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5">
                    <h2 className="text-sm font-semibold text-slate-900">
                        Users Reservation
                    </h2>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                        {bookings.length}
                    </span>
                </div>

                {/* LIST (only this area scrolls) */}
                <div className="slim-scroll min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                    {loading ? (
                        <div className="px-4 py-10 text-center text-sm text-slate-400">
                            Loading reservations…
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-slate-400">
                            No reservations found.
                        </div>
                    ) : (
                        filteredList.map((b) => {
                            const isActive = b.id === selectedId;
                            return (
                                <button
                                    key={b.id}
                                    onClick={() => handleSelect(b)}
                                    className={`relative flex w-full items-start gap-3 px-5 py-3 text-left transition ${
                                        isActive
                                            ? "bg-emerald-50"
                                            : "hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                                        {initial(guestOf(b))}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                                            {fullName(guestOf(b))}
                                        </p>
                                        <p className="truncate text-xs leading-tight text-slate-400">
                                            REF# {b.booking_reference}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* FOOTER (fixed) */}
                <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
                    Showing {filteredList.length === 0 ? 0 : 1} to{" "}
                    {filteredList.length} of {bookings.length} reservations
                </div>
            </aside>

            {/* MAIN COLUMN (does NOT scroll itself) */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {/* MOBILE BAR - shown on small screens only */}
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
                    <h2 className="text-sm font-semibold text-slate-900">
                        Reservations
                    </h2>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                        {bookings.length}
                    </span>
                </div>

                {/* BREADCRUMB (fixed, same height as sidebar header) */}
                <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 text-sm text-slate-400 md:px-6">
                    <span className="hidden sm:inline">Reservations</span>
                    <span className="sm:hidden">Bookings</span>
                    {selected && (
                        <>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 truncate font-medium text-slate-700">
                                {fullName(guestOf(selected))}
                            </span>
                        </>
                    )}
                </div>

                {/* ERROR (fixed) */}
                {error && (
                    <div className="mx-3 mt-3 shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:mx-6">
                        {error}{" "}
                        <button
                            onClick={loadBookings}
                            className="font-semibold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {selected ? (
                    /* ONLY THIS AREA SCROLLS */
                    <div className="scrollbar-mint min-h-0 flex-1 overflow-y-auto">
                        {/* GUEST HEADER */}
                        <div className="flex flex-col items-start justify-between gap-3 px-3 py-4 sm:flex-row sm:items-center md:px-6 md:py-5">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="min-w-0 space-y-0.5">
                                    <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl">
                                        {fullName(guestOf(selected))}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] font-medium leading-tight text-slate-400">
                                            REF# {selected.booking_reference}
                                        </span>
                                    </div>
                                    <p className="truncate text-[10px] font-medium leading-tight text-slate-500">
                                        {formatShort(selected.check_in_date)} –{" "}
                                        {formatShort(selected.check_out_date)},{" "}
                                        {new Date(
                                            selected.check_out_date,
                                        ).getFullYear()}
                                        <span className="mx-1 text-slate-300">
                                            •
                                        </span>
                                        {nightsBetween(
                                            selected.check_in_date,
                                            selected.check_out_date,
                                        )}{" "}
                                        {nightsBetween(
                                            selected.check_in_date,
                                            selected.check_out_date,
                                        ) === 1
                                            ? "Night"
                                            : "Nights"}
                                        <span className="mx-1 text-slate-300">
                                            •
                                        </span>
                                        Room {roomLabel(selected)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
                                <button className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:flex-none sm:px-4 sm:text-sm">
                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">
                                        {formatShort(selected.check_in_date)} –{" "}
                                        {formatLong(selected.check_out_date)}
                                    </span>
                                    <span className="sm:hidden">
                                        {formatShort(selected.check_in_date)}
                                    </span>
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:flex-none sm:px-4 sm:text-sm"
                                >
                                    <Download className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">
                                        Export
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* SEARCH / FILTERS */}
                        <div className="flex flex-col flex-wrap items-stretch gap-2 px-3 sm:flex-row sm:items-center sm:gap-3 md:px-6">
                            <div className="relative min-w-[140px] flex-1 sm:min-w-[220px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search guest or reference…"
                                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value as "all" | BookingStatus,
                                    )
                                }
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 focus:border-emerald-500 focus:outline-none sm:flex-none"
                            >
                                <option value="all">All Status</option>
                                {Object.entries(STATUS_STYLES).map(
                                    ([key, meta]) => (
                                        <option key={key} value={key}>
                                            {meta.label}
                                        </option>
                                    ),
                                )}
                            </select>
                            <select
                                value={roomTypeFilter}
                                onChange={(e) =>
                                    setRoomTypeFilter(e.target.value)
                                }
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 focus:border-emerald-500 focus:outline-none sm:flex-none"
                            >
                                <option value="all">All Room Types</option>
                                {roomTypes.map((rt) => (
                                    <option key={rt} value={rt}>
                                        {rt}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CALENDAR + DETAILS */}
                        <div className="mt-3 flex flex-col gap-3 px-3 pb-6 md:px-6 lg:grid lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px]">
                            <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-3">
                                    <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                                        Reservation Calendar
                                    </h2>
                                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                        <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />

                                        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                                            {formatLong(selected.check_in_date)}
                                        </span>

                                        <span className="text-slate-400">
                                            —
                                        </span>

                                        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                                            {formatLong(
                                                selected.check_out_date,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <MonthGrid
                                    key={selected.id}
                                    month={calendarMonth}
                                    booking={selected}
                                />

                                <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500 sm:px-4 sm:py-2.5 sm:text-sm">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-100 sm:h-2 sm:w-2" />
                                    <span className="truncate">
                                        {fullName(guestOf(selected))}&apos;s
                                        Reservation
                                    </span>
                                </div>
                            </div>

                            <div className="min-w-0">
                                <DetailsPanel booking={selected} />
                            </div>
                        </div>
                    </div>
                ) : (
                    !loading && (
                        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                            Select a reservation to view details.
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

// ===============================
// MONTH GRID
// ===============================
function MonthGrid({ month, booking }: { month: Date; booking: Booking }) {
    const cells = useMemo(() => {
        const year = month.getFullYear();
        const m = month.getMonth();
        const firstOfMonth = new Date(year, m, 1);
        const startDate = addDays(firstOfMonth, -firstOfMonth.getDay());
        const totalDays =
            new Date(year, m + 1, 0).getDate() + firstOfMonth.getDay();

        const rows = totalDays > 35 ? 6 : 5;

        return Array.from({ length: rows * 7 }, (_, i) =>
            addDays(startDate, i),
        );
    }, [month]);

    const checkIn = toDateOnly(new Date(booking.check_in_date));
    const checkOut = toDateOnly(new Date(booking.check_out_date));

    return (
        <div className="flex flex-col">
            <div className="grid shrink-0 grid-cols-7 border-b border-slate-200 bg-slate-100">
                {WEEKDAY_LABELS.map((w) => (
                    <div
                        key={w}
                        className="border-r border-slate-200 py-2 text-center text-[10px] font-semibold tracking-wide text-slate-600 last:border-r-0 sm:text-xs"
                    >
                        {w.slice(0, 3)}
                    </div>
                ))}
            </div>
            <div
                className="grid grid-cols-7"
                style={{
                    gridTemplateRows: `repeat(${cells.length / 7}, minmax(64px, 1fr))`,
                }}
            >
                {cells.map((d) => {
                    const key = toDateOnly(d);
                    const inMonth = d.getMonth() === month.getMonth();
                    const inStay = key >= checkIn && key <= checkOut;
                    const isCheckIn = key === checkIn;
                    const isCheckOut = key === checkOut;

                    return (
                        <div
                            key={key}
                            className={`flex flex-col items-center gap-0.5 overflow-hidden border-b border-l border-slate-100 pt-1 first:border-l-0 sm:gap-1 sm:pt-2 ${
                                inStay ? "bg-emerald-50/60" : ""
                            }`}
                        >
                            <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-sm ${
                                    isCheckIn || isCheckOut
                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400"
                                        : inMonth
                                          ? "text-slate-700"
                                          : "text-slate-300"
                                }`}
                            >
                                {d.getDate()}
                            </span>
                            {isCheckIn && (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-[1px] text-[8px] font-medium leading-tight text-emerald-700 ring-1 ring-emerald-200 sm:text-[10px]">
                                    Check-in
                                </span>
                            )}
                            {isCheckOut && (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-[1px] text-[8px] font-medium leading-tight text-emerald-700 ring-1 ring-emerald-200 sm:text-[10px]">
                                    Check-out
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===============================
// DETAILS PANEL
// ===============================
function DetailsPanel({ booking }: { booking: Booking }) {
    const style =
        STATUS_STYLES[booking.booking_status] ?? STATUS_STYLES.pending;
    const nights = nightsBetween(booking.check_in_date, booking.check_out_date);
    const adults = booking.guests_adults ?? 2;
    const children = booking.guests_children ?? 0;
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const copyRef = async () => {
        try {
            await navigator.clipboard.writeText(booking.booking_reference);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);

            // Fallback for older browsers / HTTP
            const textarea = document.createElement("textarea");
            textarea.value = booking.booking_reference;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        }
    };

    return (
        <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <h2 className="min-w-0 truncate text-base font-semibold text-slate-900">
                    Reservation Details
                </h2>

                <button
                    onClick={() => {
                        navigate("/booking-management", {
                            state: {
                                bookingId: booking.booking_id,
                                bookedRoomId: booking.id,
                            },
                        });
                    }}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
                    title="View Booking"
                >
                    <Eye className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-3 space-y-2.5 text-sm">
                <Field label="Booking Reference">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                            {booking.booking_reference}
                        </span>
                        <button
                            onClick={copyRef}
                            className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
                            title={
                                copied ? "Copied!" : "Copy booking reference"
                            }
                            aria-label="Copy booking reference"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                        {copied && (
                            <span className="shrink-0 text-[11px] font-medium text-emerald-600">
                                Copied!
                            </span>
                        )}
                    </div>
                </Field>

                <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-400">
                        Status:
                    </span>

                    <span className="text-sm font-semibold text-slate-800">
                        {style.label}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:gap-x-5">
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                            Check-in
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                            {formatLong(booking.check_in_date)}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                            Check-out
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                            {formatLong(booking.check_out_date)}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                            Duration
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                            {nights} {nights === 1 ? "Night" : "Nights"}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                            Room
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                            Room {roomLabel(booking)}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                            Room Type
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                            {roomTypeLabel(booking)}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">
                            Guests
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                            {adults + children}
                        </p>
                    </div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-[11px] font-medium text-slate-400">
                        Reservation Amount
                    </p>

                    <p className="mt-1 break-words text-2xl font-bold leading-tight text-slate-900">
                        {formatMoney(booking.subtotal)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400">{label}</p>
            <div className="mt-0.5">{children}</div>
        </div>
    );
}
