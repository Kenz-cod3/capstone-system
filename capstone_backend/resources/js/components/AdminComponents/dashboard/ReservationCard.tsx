import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Info,
    User2,
} from "lucide-react";
import api from "@/services/api";

// ===============================
// TYPES
// ===============================
interface Person {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
}

interface RoomType {
    id: number;
    name: string;
}

interface RoomInfo {
    id: number;
    room_number: string;
    room_type?: RoomType;
    roomType?: RoomType;
}

type BookingStatus =
    | "pending"
    | "confirmed"
    | "checked_in"
    | "checked_out"
    | "cancelled"
    | "refunded";

interface Booking {
    id: number;
    booking_reference: string;
    booking_status: BookingStatus;
    check_in_date: string;
    check_out_date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    total_price: number;
    user: Person | null;
    walkInGuest: Person | null;
    rooms: RoomInfo[];
}

// ===============================
// CONSTANTS
// ===============================
const DAY_MS = 24 * 60 * 60 * 1000;

type StatusMeta = {
    badge: string;
    dot: string;
    label: string;
};

const STATUS_STYLES: Record<BookingStatus, StatusMeta> = {
    confirmed: {
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        dot: "bg-emerald-500",
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
    checked_out: {
        badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
        dot: "bg-blue-500",
        label: "Checked Out",
    },
    cancelled: {
        badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
        dot: "bg-rose-500",
        label: "Cancelled",
    },
    refunded: {
        badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
        dot: "bg-slate-400",
        label: "Refunded",
    },
};

const DAY_EVENT_STYLES: Record<string, string> = {
    0: "bg-emerald-50 text-emerald-800 border-emerald-200",
    1: "bg-sky-50 text-sky-800 border-sky-200",
    2: "bg-amber-50 text-amber-800 border-amber-200",
    3: "bg-violet-50 text-violet-800 border-violet-200",
    4: "bg-teal-50 text-teal-800 border-teal-200",
    5: "bg-rose-50 text-rose-800 border-rose-200",
    6: "bg-indigo-50 text-indigo-800 border-indigo-200",
};

// ===============================
// HELPERS
// ===============================
function fullName(p: Person | null | undefined): string {
    if (!p) return "Guest";
    return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

function guestOf(b: Booking): Person | null {
    return b.user ?? b.walkInGuest ?? null;
}

function roomLabel(b: Booking): string {
    if (!b.rooms?.length) return "—";

    return b.rooms.length === 1
        ? (b.rooms[0]?.room_number ?? "—")
        : `${b.rooms[0]?.room_number ?? "—"} +${b.rooms.length - 1}`;
}

function toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    const day = copy.getDay(); // 0 = Sunday
    copy.setDate(copy.getDate() - day);
    return copy;
}

function addDays(d: Date, n: number): Date {
    return new Date(d.getTime() + n * DAY_MS);
}

function formatTime(time: string | null, fallbackDate?: string): string {
    if (!time) return "—";
    // time may come back as "HH:mm:ss" or a full ISO datetime
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

function formatDateRange(start: Date, end: Date): string {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = start.toLocaleDateString("en-US", opts);
    const endStr = end.toLocaleDateString("en-US", {
        ...opts,
        year: "numeric",
    });
    return `${startStr} - ${endStr}`;
}

function formatFullDate(d: Date): string {
    return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

// ===============================
// MAIN COMPONENT
// ===============================
export default function ReservationMonitor() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [selectedDate, setSelectedDate] = useState(() =>
        toDateOnly(new Date()),
    );
    const [view, setView] = useState<"month" | "week" | "day">("week");

    const loadBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/reservation-monitor");

            const data = res.data;
            setBookings(Array.isArray(data) ? data : (data.data ?? []));
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to load reservations",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart],
    );

    const bookingsByDate = useMemo(() => {
        const map = new Map<string, Booking[]>();

        bookings.forEach((booking) => {
            const start = new Date(booking.check_in_date);
            const end = new Date(booking.check_out_date);

            for (
                let d = new Date(start);
                d <= end;
                d.setDate(d.getDate() + 1)
            ) {
                const key = d.toISOString().slice(0, 10);

                if (!map.has(key)) {
                    map.set(key, []);
                }

                map.get(key)!.push(booking);
            }
        });

        return map;
    }, [bookings]);

    // ===== STATS =====
    const stats = useMemo(() => {
        const today = toDateOnly(new Date());
        const weekEnd = toDateOnly(addDays(weekStart, 6));

        const inWeek = bookings.filter((b) => {
            const ci = b.check_in_date?.slice(0, 10);
            return ci && ci >= toDateOnly(weekStart) && ci <= weekEnd;
        });

        const todays = bookings.filter(
            (b) => b.check_in_date?.slice(0, 10) === today,
        );

        const upcomingEnd = toDateOnly(addDays(new Date(), 7));
        const upcoming = bookings.filter((b) => {
            const ci = b.check_in_date?.slice(0, 10);
            return (
                ci &&
                ci > today &&
                ci <= upcomingEnd &&
                b.booking_status !== "cancelled"
            );
        });

        const checkedInToday = bookings.filter(
            (b) =>
                b.booking_status === "checked_in" &&
                b.check_in_date?.slice(0, 10) === today,
        );

        return {
            total: inWeek.length,
            today: todays.length,
            upcoming: upcoming.length,
            checkedInToday: checkedInToday.length,
        };
    }, [bookings, weekStart]);

    const selectedDateObj = useMemo(
        () => new Date(`${selectedDate}T00:00:00`),
        [selectedDate],
    );
    const selectedReservations = bookingsByDate.get(selectedDate) ?? [];

    const goToday = () => {
        const now = new Date();
        setWeekStart(startOfWeek(now));
        setSelectedDate(toDateOnly(now));
    };
    const goPrevWeek = () => setWeekStart((w) => addDays(w, -7));
    const goNextWeek = () => setWeekStart((w) => addDays(w, 7));

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
        a.download = `reservations-${toDateOnly(weekStart)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-full bg-slate-50">
            {/* HEADER */}
            <div className="flex flex-wrap items-start justify-between gap-4 px-8 pt-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Reservation Monitor
                    </h1>
                    <p className="mt-1 text-slate-500">
                        View and monitor all reservations by date
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={goToday}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDateRange(weekStart, addDays(weekStart, 6))}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-8 mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}{" "}
                    <button
                        onClick={loadBookings}
                        className="font-semibold underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* STAT CARDS */}
            <div className="mt-6 grid grid-cols-1 gap-4 px-8 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Reservations"
                    value={stats.total}
                    sub={formatDateRange(weekStart, addDays(weekStart, 6))}
                    color="emerald"
                    icon={<Calendar className="h-6 w-6" />}
                />
                <StatCard
                    label="Today's Reservations"
                    value={stats.today}
                    sub={formatFullDate(new Date())}
                    color="sky"
                    icon={<Calendar className="h-6 w-6" />}
                />
                <StatCard
                    label="Upcoming (Next 7 Days)"
                    value={stats.upcoming}
                    sub={formatDateRange(
                        addDays(new Date(), 1),
                        addDays(new Date(), 7),
                    )}
                    color="amber"
                    icon={<Calendar className="h-6 w-6" />}
                />
                <StatCard
                    label="Checked In Today"
                    value={stats.checkedInToday}
                    sub="As of now"
                    color="violet"
                    icon={<User2 className="h-6 w-6" />}
                />
            </div>

            {/* CALENDAR + SIDE PANEL */}
            <div className="mt-6 grid grid-cols-1 gap-4 px-8 pb-4 xl:grid-cols-[1fr_380px]">
                {/* CALENDAR */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Reservation Calendar
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={goPrevWeek}
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                                aria-label="Previous week"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={goToday}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Today
                            </button>
                            <span className="mx-1 text-sm font-semibold text-slate-700">
                                {weekStart.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                            <button
                                onClick={goNextWeek}
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                                aria-label="Next week"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <div className="ml-2 flex rounded-lg border border-slate-200 p-0.5">
                                {(["month", "week", "day"] as const).map(
                                    (v) => (
                                        <button
                                            key={v}
                                            onClick={() => setView(v)}
                                            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                                                view === v
                                                    ? "bg-emerald-600 text-white"
                                                    : "text-slate-500 hover:bg-slate-50"
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center text-slate-400">
                            Loading reservations…
                        </div>
                    ) : view === "week" ? (
                        <WeekGrid
                            days={weekDays}
                            bookingsByDate={bookingsByDate}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                    ) : (
                        <DayList
                            date={selectedDateObj}
                            reservations={selectedReservations}
                        />
                    )}

                    {/* LEGEND */}
                    <div className="flex flex-wrap items-center gap-5 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                        <LegendDot color="bg-emerald-500" label="Check-in" />
                        <LegendDot color="bg-sky-500" label="Check-out" />
                        <LegendDot color="bg-amber-500" label="Confirmed" />
                        <LegendDot color="bg-violet-500" label="Pending" />
                        <LegendDot color="bg-rose-500" label="Cancelled" />
                    </div>
                </div>

                {/* SIDE PANEL */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Reservations on {formatFullDate(selectedDateObj)}
                        </h2>
                        <span className="text-sm text-slate-400">
                            {selectedReservations.length} reservations
                        </span>
                    </div>

                    <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                        {selectedReservations.length === 0 ? (
                            <div className="px-5 py-10 text-center text-sm text-slate-400">
                                No reservations for this date.
                            </div>
                        ) : (
                            selectedReservations.map((b) => (
                                <ReservationRow key={b.id} booking={b} />
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-100 px-5 py-4">
                        <a
                            href="/reservations"
                            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                            View All Reservations →
                        </a>
                    </div>
                </div>
            </div>

            {/* FOOTER NOTE */}
            <div className="mx-8 mb-8 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <Info className="h-4 w-4 shrink-0" />
                Click on any reservation in the calendar to view details or make
                changes.
            </div>
        </div>
    );
}

// ===============================
// SUBCOMPONENTS
// ===============================
function StatCard({
    label,
    value,
    sub,
    color,
    icon,
}: {
    label: string;
    value: number;
    sub: string;
    color: "emerald" | "sky" | "amber" | "violet";
    icon: React.ReactNode;
}) {
    const colorMap = {
        emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
        sky: { text: "text-sky-600", bg: "bg-sky-50" },
        amber: { text: "text-amber-600", bg: "bg-amber-50" },
        violet: { text: "text-violet-600", bg: "bg-violet-50" },
    }[color];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm font-semibold ${colorMap.text}`}>
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {value}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{sub}</p>
                </div>
                <div
                    className={`rounded-full ${colorMap.bg} ${colorMap.text} p-3`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
        </span>
    );
}

function WeekGrid({
    days,
    bookingsByDate,
    selectedDate,
    onSelectDate,
}: {
    days: Date[];
    bookingsByDate: Map<string, Booking[]>;
    selectedDate: string;
    onSelectDate: (d: string) => void;
}) {
    const todayStr = toDateOnly(new Date());

    return (
        <div className="overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7 border-b border-slate-100">
                {days.map((d) => {
                    const key = toDateOnly(d);
                    const isToday = key === todayStr;
                    const isSelected = key === selectedDate;
                    return (
                        <button
                            key={key}
                            onClick={() => onSelectDate(key)}
                            className={`flex flex-col items-center gap-1 border-l border-slate-100 py-3 first:border-l-0 ${
                                isSelected
                                    ? "bg-emerald-50/60"
                                    : "hover:bg-slate-50"
                            }`}
                        >
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                {d.toLocaleDateString("en-US", {
                                    weekday: "short",
                                })}
                            </span>
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                                    isToday
                                        ? "bg-emerald-600 text-white"
                                        : "text-slate-700"
                                }`}
                            >
                                {d.getDate()}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="grid min-w-[760px] grid-cols-7">
                {days.map((d, i) => {
                    const key = toDateOnly(d);
                    const dayBookings = bookingsByDate.get(key) ?? [];
                    return (
                        <div
                            key={key}
                            className="min-h-[280px] space-y-1.5 border-l border-slate-100 p-2 first:border-l-0"
                        >
                            {dayBookings.length === 0 ? (
                                <div className="pt-6 text-center text-xs text-slate-300">
                                    —
                                </div>
                            ) : (
                                dayBookings.slice(0, 5).map((b) => {
                                    const style = DAY_EVENT_STYLES[i % 7];
                                    const guest = fullName(guestOf(b));
                                    return (
                                        <button
                                            key={b.id}
                                            onClick={() => onSelectDate(key)}
                                            className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${style}`}
                                            title={`${guest} — Room ${roomLabel(b)}`}
                                        >
                                            {/* line-clamp instead of truncate so the
                                                full name wraps onto a 2nd line rather
                                                than getting chopped to a couple chars */}
                                            <div className="line-clamp-2 break-words font-semibold leading-snug">
                                                {guest}
                                            </div>
                                            <div className="mt-0.5 truncate opacity-80">
                                                Rm. {roomLabel(b)}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                            {dayBookings.length > 5 && (
                                <button
                                    onClick={() => onSelectDate(key)}
                                    className="w-full pt-1 text-center text-xs font-medium text-emerald-700 hover:underline"
                                >
                                    +{dayBookings.length - 5} more
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DayList({
    date,
    reservations,
}: {
    date: Date;
    reservations: Booking[];
}) {
    return (
        <div className="p-5">
            <p className="mb-4 text-sm font-semibold text-slate-700">
                {formatFullDate(date)}
            </p>
            {reservations.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                    No reservations for this date.
                </div>
            ) : (
                <div className="space-y-2">
                    {reservations.map((b) => (
                        <ReservationRow key={b.id} booking={b} bordered />
                    ))}
                </div>
            )}
        </div>
    );
}

// Redesigned as two stacked rows so the guest name gets the
// full width of the card instead of being squeezed between
// several fixed-width columns (which was clipping names to
// just 1-2 characters, e.g. "K...").
function ReservationRow({
    booking,
    bordered = false,
}: {
    booking: Booking;
    bordered?: boolean;
}) {
    const guest = guestOf(booking);
    const style =
        STATUS_STYLES[booking.booking_status] ?? STATUS_STYLES.pending;
    const isCheckedOut = booking.booking_status === "checked_out";

    return (
        <div
            className={`flex items-start gap-3 px-5 py-4 ${bordered ? "rounded-lg border border-slate-100" : ""}`}
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <User2 className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <p
                        className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900"
                        title={fullName(guest)}
                    >
                        {fullName(guest)}
                    </p>
                    <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
                    >
                        {style.label}
                    </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="truncate">REF# {booking.booking_reference}</span>
                    <span>Rm. {roomLabel(booking)}</span>
                    <span>
                        {isCheckedOut
                            ? formatTime(booking.check_out_time, booking.check_out_date)
                            : formatTime(booking.check_in_time, booking.check_in_date)}{" "}
                        {isCheckedOut ? "Check-out" : "Check-in"}
                    </span>
                </div>
            </div>
        </div>
    );
}