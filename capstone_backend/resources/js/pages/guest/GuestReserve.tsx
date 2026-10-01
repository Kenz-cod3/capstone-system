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
    Plus,
    Trash2,
    Pencil,
    X,
    Search,
} from "lucide-react";

import api from "../../services/api";
import PanoramaModal from "../../components/AdminComponents/room/modal/PanoramaModal";
import CustomDatePicker from "./CustomDatePicker";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
interface RoomImage {
    id: number;
    image_path: string;
    image_type?: "normal" | "360" | string;
}

interface RoomAmenity {
    id: number;
    name: string;
}

interface RoomType {
    id?: number;
    type_name: string;
    description?: string;
    base_price: number;
    max_occupancy: number;
    size?: number;
    short_stay_price?: number | null;
    short_stay_hours?: number | null;
    amenities?: (string | RoomAmenity)[] | string | null;
}

interface RoomData {
    id: number;
    room_number: string;
    image_url: string | null;
    images?: RoomImage[];
    panorama_url?: string | null;
    room_type: RoomType;
    amenities?: (string | RoomAmenity)[] | null;
    status?: string;
}

interface ConflictRecord {
    id: number;
    check_in_date: string;
    check_out_date: string;
    stay_type: string;
    status: string;
}

interface BookingRange {
    check_in_date: string;
    check_out_date: string;
    stay_type?: string;
}

interface SelectedBookingRoom {
    id: number;
    room_type_id?: number;
    room_number: string;
    room_type_name: string;
    image_url?: string | null;
    base_price: number;
    short_stay_price: number;
    short_stay_hours?: number;
    max_occupancy?: number;
    stay_type: StayType;
    check_in_date: string;
    check_out_date: string;
    guests: number;
    nights: number;
    subtotal: number;
}

type StayType = "overnight" | "short_stay";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const getAmenityIcon = (label: string) => {
    const l = label.toLowerCase().trim();
    if (l.includes("wifi")) return Wifi;
    if (l.includes("air") || l.includes("aircon")) return Snowflake;
    if (l.includes("bathroom")) return Bath;
    if (l.includes("tv") || l.includes("television")) return Tv;
    if (l.includes("shower") || l.includes("hot") || l.includes("water"))
        return Droplet;
    return Sparkles;
};

const getAmenityLabel = (name: string) => {
    const key = name.toLowerCase().trim();
    if (key === "television") return "TV";
    return name;
};

const toAmenityNames = (list: unknown): string[] => {
    if (!Array.isArray(list)) return [];
    return list
        .map((a) =>
            typeof a === "string"
                ? a
                : a && typeof a === "object" && "name" in a
                  ? String((a as RoomAmenity).name)
                  : "",
        )
        .map((n) => n.trim())
        .filter(Boolean);
};

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

const calculateNights = (startISO: string, endISO: string) => {
    if (!startISO || !endISO) return 0;
    const s = new Date(`${startISO}T00:00:00`).getTime();
    const e = new Date(`${endISO}T00:00:00`).getTime();
    return Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24)));
};

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────
export default function GuestReserve() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [room, setRoom] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState(0);

    // ── MAIN room reservation state ─────────────────────────────
    const [checkIn, setCheckIn] = useState(todayPlus(1));
    const [checkOut, setCheckOut] = useState(todayPlus(2));
    const [guests, setGuests] = useState(2);
    const [stayType, setStayType] = useState<StayType>("overnight");
    const isShort = stayType === "short_stay";
    const [continueError, setContinueError] = useState<string | null>(null);
    const [panoramaOpen, setPanoramaOpen] = useState(false);

    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availability, setAvailability] = useState<{
        available: boolean;
        conflicts: ConflictRecord[];
        reason?: string | null;
    } | null>(null);

    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
    const [bookedRanges, setBookedRanges] = useState<BookingRange[]>([]);

    const availabilityRequestRef = useRef(0);

    // ── MULTI-ROOM state ─────────────────────────────────────────
    const [selectedRooms, setSelectedRooms] = useState<SelectedBookingRoom[]>(
        [],
    );
    const [availableRooms, setAvailableRooms] = useState<RoomData[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [addingRoom, setAddingRoom] = useState(false);

    const [showAddRoomModal, setShowAddRoomModal] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

    // Room picker search & filter
    const [roomSearch, setRoomSearch] = useState("");
    const [roomFilter, setRoomFilter] = useState<"all" | "available">(
        "available",
    );

    // Draft (room currently being configured)
    const [draftRoom, setDraftRoom] = useState<RoomData | null>(null);
    const [draftCheckIn, setDraftCheckIn] = useState("");
    const [draftCheckOut, setDraftCheckOut] = useState("");
    const [draftGuests, setDraftGuests] = useState(2);
    const [draftStayType, setDraftStayType] = useState<StayType>("overnight");
    const [draftBookedDates, setDraftBookedDates] = useState<Set<string>>(
        new Set(),
    );
    const [draftBookedRanges, setDraftBookedRanges] = useState<BookingRange[]>(
        [],
    );
    const [draftLoading, setDraftLoading] = useState(false);
    const [draftAvailability, setDraftAvailability] = useState<{
        available: boolean;
        conflicts: ConflictRecord[];
        reason?: string | null;
    } | null>(null);
    const [draftCheckingAvailability, setDraftCheckingAvailability] =
        useState(false);
    const [draftError, setDraftError] = useState<string | null>(null);

    const draftAvailabilityRequestRef = useRef(0);

    // ── Load booked dates (main) ─────────────────────────────────
    useEffect(() => {
        if (!id) return;
        const fetchBookedDates = async () => {
            try {
                const res = await api.get(`/rooms/${id}/booked-dates`);
                const ranges: BookingRange[] = res.data?.data ?? res.data ?? [];
                setBookedRanges(ranges);

                const set = new Set<string>();
                ranges.forEach((range) => {
                    const cursor = new Date(`${range.check_in_date}T00:00:00`);
                    let end = new Date(`${range.check_out_date}T00:00:00`);
                    if (range.stay_type === "short_stay" || end <= cursor) {
                        end = new Date(cursor);
                        end.setDate(end.getDate() + 1);
                    }
                    while (cursor < end) {
                        set.add(toISODate(cursor));
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

    // ── Load room details (main) ─────────────────────────────────
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

    // ── Check availability (main) ────────────────────────────────
    useEffect(() => {
        if (!id || !checkIn || (!isShort && !checkOut)) {
            setAvailability(null);
            return;
        }
        const effectiveCheckOut = isShort ? checkIn : checkOut;
        const nights = isShort ? 1 : calculateNights(checkIn, checkOut);
        if (nights <= 0) {
            setAvailability(null);
            return;
        }
        const requestId = ++availabilityRequestRef.current;
        const controller = new AbortController();
        const checkAvail = async () => {
            setCheckingAvailability(true);
            try {
                const res = await api.get(`/rooms/${id}/check-availability`, {
                    params: {
                        check_in_date: checkIn,
                        check_out_date: effectiveCheckOut,
                        stay_type: stayType,
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
    }, [id, checkIn, checkOut, stayType]);

    // ── Check availability (draft) ───────────────────────────────
    useEffect(() => {
        if (
            !draftRoom?.id ||
            !draftCheckIn ||
            (draftStayType === "overnight" && !draftCheckOut)
        ) {
            setDraftAvailability(null);
            return;
        }
        const effectiveCheckOut =
            draftStayType === "short_stay" ? draftCheckIn : draftCheckOut;
        const nights =
            draftStayType === "short_stay"
                ? 1
                : calculateNights(draftCheckIn, draftCheckOut);
        if (nights <= 0) {
            setDraftAvailability(null);
            return;
        }
        const requestId = ++draftAvailabilityRequestRef.current;
        const controller = new AbortController();
        const checkAvail = async () => {
            setDraftCheckingAvailability(true);
            try {
                const res = await api.get(
                    `/rooms/${draftRoom.id}/check-availability`,
                    {
                        params: {
                            check_in_date: draftCheckIn,
                            check_out_date: effectiveCheckOut,
                            stay_type: draftStayType,
                        },
                        signal: controller.signal,
                    },
                );
                if (requestId !== draftAvailabilityRequestRef.current) return;
                const payload = res.data?.data ?? res.data;
                setDraftAvailability({
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
                if (requestId !== draftAvailabilityRequestRef.current) return;
                console.log("DRAFT CHECK AVAILABILITY ERROR:", err);
                setDraftAvailability(null);
            } finally {
                if (requestId === draftAvailabilityRequestRef.current) {
                    setDraftCheckingAvailability(false);
                }
            }
        };
        const t = setTimeout(checkAvail, 350);
        return () => {
            clearTimeout(t);
            controller.abort();
        };
    }, [draftRoom?.id, draftCheckIn, draftCheckOut, draftStayType]);

    // ── Derived values ───────────────────────────────────────────
    const minCheckOut = useMemo(() => {
        if (!checkIn) return todayPlus(1);
        const next = new Date(checkIn);
        next.setDate(next.getDate() + 1);
        return toISODate(next);
    }, [checkIn]);

    const minDraftCheckOut = useMemo(() => {
        if (!draftCheckIn) return todayPlus(1);
        const next = new Date(draftCheckIn);
        next.setDate(next.getDate() + 1);
        return toISODate(next);
    }, [draftCheckIn]);

    const conflictMessage = useMemo(() => {
        if (!availability || availability.available) return null;
        if (availability.reason) return availability.reason;
        const [first] = availability.conflicts;
        if (!first) return "This room is not available for the selected dates.";
        return `This room is already booked from ${formatDateLong(
            first.check_in_date,
        )} to ${formatDateLong(first.check_out_date)}. Please choose different dates.`;
    }, [availability]);

    const draftConflictMessage = useMemo(() => {
        if (!draftAvailability || draftAvailability.available) return null;
        if (draftAvailability.reason) return draftAvailability.reason;
        const [first] = draftAvailability.conflicts;
        if (!first) return "This room is not available for the selected dates.";
        return `This room is already booked from ${formatDateLong(
            first.check_in_date,
        )} to ${formatDateLong(first.check_out_date)}. Please choose different dates.`;
    }, [draftAvailability]);

    // ── Handlers ──────────────────────────────────────────────────
    const handleCheckInChange = (newCheckIn: string) => {
        setCheckIn(newCheckIn);
        setContinueError(null);
        if (!newCheckIn) return;
        const newCI = new Date(`${newCheckIn}T00:00:00`);
        const currentCO = checkOut ? new Date(`${checkOut}T00:00:00`) : null;
        if (!currentCO || currentCO <= newCI) {
            const next = new Date(newCI);
            next.setDate(next.getDate() + 1);
            setCheckOut(toISODate(next));
        }
    };

    const handleCheckOutChange = (newCheckOut: string) => {
        if (!newCheckOut) {
            setCheckOut(minCheckOut);
            setContinueError(null);
            return;
        }
        const co = new Date(`${newCheckOut}T00:00:00`);
        const ci = new Date(`${checkIn}T00:00:00`);
        setCheckOut(co <= ci ? minCheckOut : newCheckOut);
        setContinueError(null);
    };

    const handleStayTypeChange = (type: StayType) => {
        setStayType(type);
        setContinueError(null);
        setAvailability(null);
    };

    const handleDraftCheckInChange = (newCheckIn: string) => {
        setDraftCheckIn(newCheckIn);
        setDraftError(null);
        if (!newCheckIn) return;
        const newCI = new Date(`${newCheckIn}T00:00:00`);
        const currentCO = draftCheckOut
            ? new Date(`${draftCheckOut}T00:00:00`)
            : null;
        if (!currentCO || currentCO <= newCI) {
            const next = new Date(newCI);
            next.setDate(next.getDate() + 1);
            setDraftCheckOut(toISODate(next));
        }
    };

    const handleDraftCheckOutChange = (newCheckOut: string) => {
        if (!newCheckOut) {
            setDraftCheckOut(minDraftCheckOut);
            setDraftError(null);
            return;
        }
        const co = new Date(`${newCheckOut}T00:00:00`);
        const ci = new Date(`${draftCheckIn}T00:00:00`);
        setDraftCheckOut(co <= ci ? minDraftCheckOut : newCheckOut);
        setDraftError(null);
    };

    const handleDraftStayTypeChange = (type: StayType) => {
        setDraftStayType(type);
        setDraftError(null);
        setDraftAvailability(null);
    };

    // ── Build SelectedBookingRoom ────────────────────────────────
    const buildSelectedRoom = (
        r: RoomData,
        type: StayType,
        ci: string,
        co: string,
        g: number,
    ): SelectedBookingRoom => {
        const rt = r.room_type;
        const base = Number(rt?.base_price || 0);
        const short = Number(rt?.short_stay_price ?? base);
        const nights = type === "overnight" ? calculateNights(ci, co) : 1;
        const subtotal = type === "overnight" ? base * nights : short;

        return {
            id: r.id,
            room_type_id: rt?.id,
            room_number: r.room_number,
            room_type_name: rt?.type_name || "Standard",
            image_url: r.image_url,
            base_price: base,
            short_stay_price: short,
            short_stay_hours: rt?.short_stay_hours ?? 3,
            max_occupancy: rt?.max_occupancy,
            stay_type: type,
            check_in_date: ci,
            check_out_date: type === "short_stay" ? ci : co,
            guests: g,
            nights,
            subtotal,
        };
    };

    // ── Fetch rooms list ──────────────────────────────────────────
    const fetchAvailableRooms = async () => {
        try {
            setLoadingRooms(true);
            const res = await api.get("/rooms");
            const payload = res.data;
            let list: RoomData[] = [];
            if (Array.isArray(payload?.data?.data)) list = payload.data.data;
            else if (Array.isArray(payload?.data)) list = payload.data;
            else if (Array.isArray(payload?.rooms)) list = payload.rooms;
            else if (Array.isArray(payload)) list = payload;
            setAvailableRooms(list);
        } catch (err) {
            console.log("Failed to load rooms:", err);
            setAvailableRooms([]);
        } finally {
            setLoadingRooms(false);
        }
    };

    // ── Add another room (open picker) ────────────────────────────
    const handleAddAnotherRoom = async () => {
        if (!checkIn) {
            setContinueError("Please select a check-in date first.");
            return;
        }
        if (!isShort && !checkOut) {
            setContinueError("Please select a check-out date first.");
            return;
        }
        if (availability && !availability.available) {
            setContinueError(
                conflictMessage ||
                    "Current room is not available for these dates.",
            );
            return;
        }
        if (!availability) {
            setContinueError(
                "Still checking availability. Please wait a moment.",
            );
            return;
        }

        setContinueError(null);
        setDraftRoom(null);
        setDraftCheckIn("");
        setDraftCheckOut("");
        setDraftBookedDates(new Set());
        setDraftBookedRanges([]);
        setDraftAvailability(null);
        setDraftError(null);
        setEditingRoomId(null);
        setRoomSearch("");
        setRoomFilter("available");

        await fetchAvailableRooms();
        setShowAddRoomModal(true);
    };

    // ── Open room config ──────────────────────────────────────────
    const openRoomConfiguration = async (target: RoomData) => {
        try {
            setAddingRoom(true);
            setEditingRoomId(null);
            setDraftRoom(target);
            setDraftStayType("overnight");
            setDraftGuests(Math.min(2, target.room_type?.max_occupancy || 2));
            setDraftLoading(true);
            setDraftError(null);

            const res = await api.get(`/rooms/${target.id}/booked-dates`);
            const ranges: BookingRange[] = res.data?.data ?? res.data ?? [];
            setDraftBookedRanges(ranges);

            const set = new Set<string>();
            ranges.forEach((range) => {
                const cursor = new Date(`${range.check_in_date}T00:00:00`);
                let end = new Date(`${range.check_out_date}T00:00:00`);
                if (range.stay_type === "short_stay" || end <= cursor) {
                    end = new Date(cursor);
                    end.setDate(end.getDate() + 1);
                }
                while (cursor < end) {
                    set.add(toISODate(cursor));
                    cursor.setDate(cursor.getDate() + 1);
                }
            });
            setDraftBookedDates(set);

            const auto = findFirstAvailableRange(ranges, 3);
            setDraftCheckIn(auto.checkIn);
            setDraftCheckOut(auto.checkOut);
        } catch (err) {
            console.log("Failed to load room dates:", err);
            setDraftBookedDates(new Set());
            setDraftBookedRanges([]);
            setDraftCheckIn(todayPlus(1));
            setDraftCheckOut(todayPlus(2));
        } finally {
            setDraftLoading(false);
            setAddingRoom(false);
        }
    };

    // ── Open selected room for edit ──────────────────────────────
    const openSelectedRoomForEdit = async (sr: SelectedBookingRoom) => {
        try {
            setAddingRoom(true);
            setEditingRoomId(sr.id);

            let fullRoom: RoomData | undefined = availableRooms.find(
                (r) => r.id === sr.id,
            );
            if (!fullRoom) {
                const res = await api.get(`/rooms/${sr.id}`);
                fullRoom = res.data?.data ?? res.data;
            }

            setDraftRoom(fullRoom ?? null);
            setDraftStayType(sr.stay_type);
            setDraftGuests(sr.guests);
            setDraftCheckIn(sr.check_in_date);
            setDraftCheckOut(sr.check_out_date);
            setDraftLoading(true);
            setDraftError(null);

            const res = await api.get(`/rooms/${sr.id}/booked-dates`);
            const ranges: BookingRange[] = res.data?.data ?? res.data ?? [];
            const filtered = ranges.filter(
                (r) =>
                    !(
                        r.check_in_date === sr.check_in_date &&
                        r.check_out_date === sr.check_out_date
                    ),
            );
            setDraftBookedRanges(filtered);

            const set = new Set<string>();
            filtered.forEach((range) => {
                const cursor = new Date(`${range.check_in_date}T00:00:00`);
                let end = new Date(`${range.check_out_date}T00:00:00`);
                if (range.stay_type === "short_stay" || end <= cursor) {
                    end = new Date(cursor);
                    end.setDate(end.getDate() + 1);
                }
                while (cursor < end) {
                    set.add(toISODate(cursor));
                    cursor.setDate(cursor.getDate() + 1);
                }
            });
            setDraftBookedDates(set);
            setShowAddRoomModal(true);
        } catch (err) {
            console.log("Failed to load room for editing:", err);
            setDraftBookedDates(new Set());
            setDraftBookedRanges([]);
            setShowAddRoomModal(true);
        } finally {
            setDraftLoading(false);
            setAddingRoom(false);
        }
    };

    // ── Find first available range ────────────────────────────────
    const findFirstAvailableRange = (
        ranges: BookingRange[],
        nights = 1,
    ): { checkIn: string; checkOut: string } => {
        const isBooked = (date: Date) => {
            const t = date.getTime();
            return ranges.some((r) => {
                const s = new Date(`${r.check_in_date}T00:00:00`).getTime();
                let e = new Date(`${r.check_out_date}T00:00:00`).getTime();
                if (r.stay_type === "short_stay" || e <= s) {
                    e = s + 24 * 60 * 60 * 1000;
                }
                return t >= s && t < e;
            });
        };

        let cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        cursor.setDate(cursor.getDate() + 1);

        for (let i = 0; i < 365; i++) {
            let ok = true;
            for (let d = 0; d < nights; d++) {
                const test = new Date(cursor);
                test.setDate(test.getDate() + d);
                if (isBooked(test)) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                const out = new Date(cursor);
                out.setDate(out.getDate() + nights);
                return { checkIn: toISODate(cursor), checkOut: toISODate(out) };
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return { checkIn: todayPlus(1), checkOut: todayPlus(1 + nights) };
    };

    // ── Select room from list ─────────────────────────────────────
    const selectAnotherRoom = async (target: RoomData) => {
        if (addingRoom) return;
        await openRoomConfiguration(target);
    };

    // ── Add / update draft room ───────────────────────────────────
    const addDraftRoom = () => {
        if (!draftRoom) return;
        if (!draftCheckIn) return;
        if (draftStayType === "overnight" && !draftCheckOut) return;

        if (draftAvailability && !draftAvailability.available) {
            setDraftError(draftConflictMessage || "Room not available.");
            return;
        }

        const updated = buildSelectedRoom(
            draftRoom,
            draftStayType,
            draftCheckIn,
            draftStayType === "short_stay" ? draftCheckIn : draftCheckOut,
            draftGuests,
        );

        if (editingRoomId !== null) {
            setSelectedRooms((prev) =>
                prev.map((r) => (r.id === editingRoomId ? updated : r)),
            );
        } else {
            setSelectedRooms((prev) => {
                if (prev.some((r) => r.id === updated.id)) {
                    return prev.map((r) => (r.id === updated.id ? updated : r));
                }
                return [...prev, updated];
            });
        }

        setEditingRoomId(null);
        setDraftRoom(null);
        setDraftCheckIn("");
        setDraftCheckOut("");
        setDraftBookedDates(new Set());
        setDraftBookedRanges([]);
        setRoomSearch("");
        setRoomFilter("available");
        setShowAddRoomModal(false);
    };

    // ── Remove room ───────────────────────────────────────────────
    const removeSelectedRoom = (roomId: number) => {
        if (roomId === room?.id) return;
        setSelectedRooms((prev) => prev.filter((r) => r.id !== roomId));
    };

    // ── Room list filter ──────────────────────────────────────────
    const roomsForSelection = useMemo(() => {
        let list = availableRooms.filter((r) => {
            const status = String(r.status || "").toLowerCase();
            if (status === "maintenance") return false;
            if (r.id === room?.id) return false;
            if (editingRoomId !== null && r.id === editingRoomId) return false;
            if (
                editingRoomId === null &&
                selectedRooms.some((s) => s.id === r.id)
            )
                return false;
            return true;
        });

        if (roomFilter === "available") {
            list = list.filter((r) => {
                const status = String(r.status || "").toLowerCase();
                return status !== "maintenance" && status !== "unavailable";
            });
        }

        const q = roomSearch.trim().toLowerCase();
        if (q) {
            list = list.filter((r) => {
                const num = String(r.room_number || "").toLowerCase();
                const type = String(r.room_type?.type_name || "").toLowerCase();
                return num.includes(q) || type.includes(q);
            });
        }

        return list;
    }, [
        availableRooms,
        editingRoomId,
        selectedRooms,
        roomFilter,
        roomSearch,
        room?.id,
    ]);

    // ── Loading / error ───────────────────────────────────────────
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

    // ── Amenities ─────────────────────────────────────────────────
    const amenities: string[] = (() => {
        const fromRoom = toAmenityNames(room.amenities);
        let fromType: string[] = [];
        const raw = roomType?.amenities;
        if (Array.isArray(raw)) {
            fromType = toAmenityNames(raw);
        } else if (typeof raw === "string" && raw) {
            try {
                const parsed = JSON.parse(raw);
                fromType = Array.isArray(parsed) ? toAmenityNames(parsed) : [];
            } catch {
                fromType = raw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
            }
        }
        const merged = fromRoom.length > 0 ? fromRoom : fromType;
        const seen = new Set<string>();
        return merged.filter((name) => {
            const key = name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
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
        if (isShort) return checkIn ? 1 : 0;
        if (!checkIn || !checkOut) return 0;
        const diff =
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round(diff));
    })();

    const basePrice = roomType?.base_price ?? 0;
    const shortPrice = roomType?.short_stay_price ?? basePrice;
    const shortHours = roomType?.short_stay_hours ?? 3;
    const subtotal = isShort ? shortPrice : basePrice * (nights || 0);
    const total = subtotal;

    const isAvailable = availability?.available ?? true;

    const currentRoomAsSelected = buildSelectedRoom(
        room,
        stayType,
        checkIn,
        isShort ? checkIn : checkOut,
        guests,
    );

    const allRoomsForTotal = [currentRoomAsSelected, ...selectedRooms];

    const grandTotal = allRoomsForTotal.reduce(
        (sum, r) => sum + Number(r.subtotal || 0),
        0,
    );

    // ── Continue handler ────────────────────────────────────────
    const handleContinue = () => {
        if (!nights) {
            setContinueError(
                isShort
                    ? "Please select a valid date."
                    : "Please select a valid check-in and check-out date.",
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

        const finalRooms = [currentRoomAsSelected, ...selectedRooms];

        navigate(`/guest/rooms/${room.id}/confirm`, {
            state: {
                checkIn,
                checkOut: isShort ? checkIn : checkOut,
                guests,
                stayType,
                multiple: finalRooms.length > 1,
                rooms: finalRooms,
            },
        });
    };

    // ── Back from picker ──────────────────────────────────────────
    const handleBackFromPicker = () => {
        if (draftRoom) {
            setDraftRoom(null);
            setDraftCheckIn("");
            setDraftCheckOut("");
            setDraftBookedDates(new Set());
            setDraftBookedRanges([]);
            setDraftError(null);
            setEditingRoomId(null);
            return;
        }
        setShowAddRoomModal(false);
        setRoomSearch("");
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hide scrollbar but keep scrolling */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Breadcrumb */}
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

            {/* Title */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1
                        className="text-3xl font-bold text-[#0d2e1f]"
                        style={{ fontFamily: "Georgia" }}
                    >
                        {allRoomsForTotal.length > 1
                            ? "Reserve Your Stay"
                            : `Room ${room.room_number}`}
                    </h1>
                    {roomType?.type_name && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf3ea] text-[#1a4a35] text-xs font-semibold">
                            <Bed className="w-3.5 h-3.5" />
                            {roomType.type_name}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Rooms
                </button>
            </div>

            {roomType?.description && (
                <p className="text-gray-500 mb-6">{roomType.description}</p>
            )}

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
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        onClick={goNext}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
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

                    {(roomType?.max_occupancy ||
                        roomType?.size ||
                        amenities.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2.5 -mt-2">
                            {roomType?.max_occupancy && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                    <Users className="w-3.5 h-3.5" />
                                    {roomType.max_occupancy} guests
                                </span>
                            )}
                            {roomType?.size && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    {roomType.size} m²
                                </span>
                            )}
                            {amenities.map((label) => {
                                const Icon = getAmenityIcon(label);
                                return (
                                    <span
                                        key={label}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {getAmenityLabel(label)}
                                    </span>
                                );
                            })}
                        </div>
                    )}

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

                    {roomType?.description && (
                        <div>
                            <h2
                                className="text-xl font-bold text-[#0d2e1f] mb-2"
                                style={{ fontFamily: "Georgia" }}
                            >
                                About This Room
                            </h2>
                            <p className="text-gray-500 leading-relaxed">
                                {roomType.description}
                            </p>
                        </div>
                    )}

                    {amenities.length > 0 && (
                        <div>
                            <h2
                                className="text-xl font-bold text-[#0d2e1f] mb-3"
                                style={{ fontFamily: "Georgia" }}
                            >
                                Amenities
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {amenities.map((label) => {
                                    const Icon = getAmenityIcon(label);
                                    return (
                                        <div
                                            key={label}
                                            className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-[#eaf3ea] flex items-center justify-center shrink-0">
                                                <Icon className="w-4 h-4 text-[#1a4a35]" />
                                            </div>
                                            <span className="text-sm font-medium text-[#0d2e1f]">
                                                {getAmenityLabel(label)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto hide-scrollbar">
                    <div className="flex flex-col gap-6 pb-4">
                        {/* ── RESERVE THIS ROOM (simple - just date picker + guests) ── */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h3
                                className="text-xl font-bold text-[#0d2e1f]"
                                style={{ fontFamily: "Georgia" }}
                            >
                                Reserve This Room
                            </h3>
                            <p className="text-gray-500 text-sm mt-1 mb-5">
                                Select your dates and guest details.
                            </p>

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    Stay Type
                                </label>
                                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100">
                                    {(
                                        [
                                            ["overnight", "Overnight"],
                                            [
                                                "short_stay",
                                                `Short Stay (${shortHours}h)`,
                                            ],
                                        ] as const
                                    ).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                                handleStayTypeChange(value)
                                            }
                                            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                                                stayType === value
                                                    ? "bg-[#0d2e1f] text-white shadow-sm"
                                                    : "text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isShort ? (
                                <div className="mb-4">
                                    <CustomDatePicker
                                        label="Date"
                                        value={checkIn}
                                        onChange={handleCheckInChange}
                                        minDate={todayPlus(0)}
                                        disabledDates={bookedDates}
                                    />
                                </div>
                            ) : (
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
                            )}

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
                                                    Your selected dates are open
                                                    for booking.
                                                </p>
                                            </div>
                                        </div>
                                    ) : availability &&
                                      !availability.available ? (
                                        <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-red-700">
                                                    Not available for these
                                                    dates
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
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="rounded-2xl bg-[#eaf3ea] px-4 py-3.5">
                                <p className="text-xs text-[#1a4a35]/70 mb-1">
                                    Room Price
                                </p>
                                <p className="flex items-baseline gap-1.5">
                                    <span
                                        className="text-2xl font-bold text-[#0d2e1f]"
                                        style={{ fontFamily: "Georgia" }}
                                    >
                                        {formatPrice(
                                            isShort ? shortPrice : basePrice,
                                        )}
                                    </span>
                                    <span className="text-sm text-[#1a4a35]/70">
                                        {isShort
                                            ? `/ ${shortHours} hours`
                                            : "/ night"}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* ── SELECTED ROOMS PANEL — with continue button ── */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center mb-5">
                                <div className="w-1 h-8 rounded-full bg-[#c9a96e] mr-3" />
                                <div className="flex-1">
                                    <h3
                                        className="text-[#0d2e1f] text-lg font-bold"
                                        style={{ fontFamily: "Georgia" }}
                                    >
                                        Selected Rooms (
                                        {allRoomsForTotal.length})
                                    </h3>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        Each room can have different dates
                                    </p>
                                </div>
                            </div>

                            {allRoomsForTotal.map((item, index) => {
                                const isMainRoom = index === 0;
                                return (
                                    <div
                                        key={`${item.id}-${index}`}
                                        className="bg-[#faf8f3] rounded-2xl border border-[#1a4a35]/10 p-4 mb-3"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                                                    <Bed className="w-4 h-4 text-[#1a4a35]" />
                                                </div>
                                                <p
                                                    className="text-[#0d2e1f] font-bold truncate"
                                                    style={{
                                                        fontFamily: "Georgia",
                                                    }}
                                                >
                                                    Room {item.room_number}
                                                </p>
                                                {isMainRoom && (
                                                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#c9a96e] bg-[#faf1de] px-1.5 py-0.5 rounded-full shrink-0">
                                                        Main
                                                    </span>
                                                )}
                                            </div>
                                            {!isMainRoom && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() =>
                                                            openSelectedRoomForEdit(
                                                                item,
                                                            )
                                                        }
                                                        className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-gray-100"
                                                        aria-label="Edit room"
                                                    >
                                                        <Pencil className="w-3 h-3 text-[#1a4a35]" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            removeSelectedRoom(
                                                                item.id,
                                                            )
                                                        }
                                                        className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-gray-100"
                                                        aria-label="Remove room"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-gray-400 text-xs mb-3 ml-10">
                                            {item.room_type_name}
                                        </p>

                                        <div className="h-px bg-[#1a4a35]/10 mb-3" />

                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-400 text-xs">
                                                Stay Type
                                            </span>
                                            <span className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                                                {item.stay_type === "overnight"
                                                    ? `Overnight (${item.nights} ${
                                                          item.nights === 1
                                                              ? "night"
                                                              : "nights"
                                                      })`
                                                    : "Short Stay"}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-gray-400 text-xs">
                                                Dates
                                            </span>
                                            <span className="text-[#0d2e1f] text-xs font-semibold text-right">
                                                {formatDateLong(
                                                    item.check_in_date,
                                                )}{" "}
                                                →{" "}
                                                {formatDateLong(
                                                    item.check_out_date,
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-xs">
                                                Subtotal
                                            </span>
                                            <span
                                                className="text-[#c9a96e] text-sm font-bold"
                                                style={{
                                                    fontFamily: "Georgia",
                                                }}
                                            >
                                                {formatPrice(item.subtotal)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                onClick={handleAddAnotherRoom}
                                className="w-full bg-[#1a4a35] text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-[#0d2e1f] transition-colors mt-2"
                            >
                                <Plus className="w-5 h-5 text-[#c9a96e]" />
                                <span className="text-sm font-semibold">
                                    Add Another Room
                                </span>
                            </button>

                            {allRoomsForTotal.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-[#1a4a35]/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <span
                                            className="text-[#0d2e1f] text-base font-bold"
                                            style={{ fontFamily: "Georgia" }}
                                        >
                                            Grand Total
                                        </span>
                                        <span
                                            className="text-[#c9a96e] text-2xl font-bold"
                                            style={{ fontFamily: "Georgia" }}
                                        >
                                            {formatPrice(grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {continueError && (
                                <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                                    {continueError}
                                </div>
                            )}

                            <button
                                onClick={handleContinue}
                                disabled={
                                    checkingAvailability ||
                                    (availability !== null && !isAvailable)
                                }
                                className="w-full mt-3 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d2e1f] text-white font-medium hover:bg-[#1a4a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>

            {/* ── ADD / EDIT ROOM MODAL ── */}
            {showAddRoomModal && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex justify-end">
                    <div className="bg-[#faf8f3] w-full max-w-2xl h-full overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 pt-5 pb-4 border-b border-[#1a4a35]/10 flex items-start gap-3">
                            <button
                                onClick={handleBackFromPicker}
                                className="w-10 h-10 rounded-full bg-[#1a4a35]/10 flex items-center justify-center shrink-0 hover:bg-[#1a4a35]/20 transition-colors"
                                aria-label="Back"
                            >
                                <ArrowLeft className="w-5 h-5 text-[#1a4a35]" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-[#1a4a35]/40 text-[10px] uppercase tracking-[3px]">
                                    {editingRoomId !== null
                                        ? "Edit Room"
                                        : draftRoom
                                          ? "Configure Room"
                                          : "Add Another Room"}
                                </p>
                                <h3
                                    className="text-[#1a4a35] text-2xl mt-1 truncate"
                                    style={{ fontFamily: "Georgia" }}
                                >
                                    {draftRoom
                                        ? `Room ${draftRoom.room_number}`
                                        : "Choose a Room"}
                                </h3>
                                <p className="text-[#1a4a35]/40 text-xs mt-1">
                                    {draftRoom
                                        ? editingRoomId !== null
                                            ? "Edit stay details"
                                            : "Select dates for this room"
                                        : "Pick another room to add to your booking"}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddRoomModal(false);
                                    setDraftRoom(null);
                                    setEditingRoomId(null);
                                    setRoomSearch("");
                                }}
                                className="w-10 h-10 rounded-full bg-[#1a4a35]/10 flex items-center justify-center shrink-0 hover:bg-[#1a4a35]/20"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-[#1a4a35]" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {!draftRoom ? (
                                <>
                                    <div className="px-6 pt-5 pb-3 space-y-3 bg-white border-b border-[#1a4a35]/08">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a4a35]/40" />
                                            <input
                                                type="text"
                                                placeholder="Search by room number or type…"
                                                value={roomSearch}
                                                onChange={(e) =>
                                                    setRoomSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1a4a35]/15 text-sm text-[#0d2e1f] placeholder:text-[#1a4a35]/30 outline-none focus:border-[#1a4a35] focus:ring-2 focus:ring-[#1a4a35]/15 transition-all"
                                            />
                                        </div>

                                        <div className="flex gap-1 p-1 rounded-xl bg-[#eef1ee]">
                                            <button
                                                onClick={() =>
                                                    setRoomFilter("available")
                                                }
                                                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                                    roomFilter === "available"
                                                        ? "bg-[#0d2e1f] text-white shadow-sm"
                                                        : "text-[#1a4a35]/60 hover:bg-white/60"
                                                }`}
                                            >
                                                Available
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setRoomFilter("all")
                                                }
                                                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                                    roomFilter === "all"
                                                        ? "bg-[#0d2e1f] text-white shadow-sm"
                                                        : "text-[#1a4a35]/60 hover:bg-white/60"
                                                }`}
                                            >
                                                All Rooms
                                            </button>
                                        </div>
                                    </div>

                                    <div className="px-6 py-5">
                                        {loadingRooms ? (
                                            <div className="py-12 flex flex-col items-center">
                                                <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-3" />
                                                <p className="text-[#1a4a35]/40 text-sm">
                                                    Loading rooms…
                                                </p>
                                            </div>
                                        ) : roomsForSelection.length === 0 ? (
                                            <div className="py-12 flex flex-col items-center text-center">
                                                <div className="w-16 h-16 rounded-full bg-[#eef1ee] flex items-center justify-center mb-3">
                                                    <Bed className="w-8 h-8 text-[#1a4a35]/30" />
                                                </div>
                                                <p className="text-[#1a4a35]/60 text-sm font-semibold">
                                                    No rooms found
                                                </p>
                                                <p className="text-[#1a4a35]/40 text-xs mt-1 max-w-xs">
                                                    {roomSearch
                                                        ? "Try a different search term."
                                                        : "All available rooms are already in your booking."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {roomsForSelection.map(
                                                    (item) => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() =>
                                                                selectAnotherRoom(
                                                                    item,
                                                                )
                                                            }
                                                            disabled={
                                                                addingRoom
                                                            }
                                                            className="group w-full bg-white rounded-2xl border border-[#1a4a35]/10 p-3 text-left hover:border-[#1a4a35]/40 hover:shadow-md transition-all disabled:opacity-50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative w-20 h-20 rounded-xl bg-[#1a4a35]/05 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {item.image_url ? (
                                                                        <img
                                                                            src={
                                                                                buildImageUrl(
                                                                                    item.image_url,
                                                                                ) ||
                                                                                ""
                                                                            }
                                                                            alt=""
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                        />
                                                                    ) : (
                                                                        <Bed className="w-8 h-8 text-[#1a4a35]/40" />
                                                                    )}
                                                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-[#0d2e1f]/85 text-white text-[9px] font-bold">
                                                                        {item
                                                                            .room_type
                                                                            ?.type_name ||
                                                                            "STD"}
                                                                    </span>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p
                                                                            className="text-[#0d2e1f] text-base font-bold truncate"
                                                                            style={{
                                                                                fontFamily:
                                                                                    "Georgia",
                                                                            }}
                                                                        >
                                                                            Room{" "}
                                                                            {
                                                                                item.room_number
                                                                            }
                                                                        </p>
                                                                        {item.status && (
                                                                            <span className="text-[9px] uppercase font-semibold tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                                                                                {
                                                                                    item.status
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[#1a4a35]/50 text-xs mt-0.5 truncate">
                                                                        {item
                                                                            .room_type
                                                                            ?.type_name ||
                                                                            "Standard Room"}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 mt-1.5">
                                                                        <p className="text-[#c9a96e] text-sm font-bold">
                                                                            {formatPrice(
                                                                                Number(
                                                                                    item
                                                                                        .room_type
                                                                                        ?.base_price ||
                                                                                        0,
                                                                                ),
                                                                            )}
                                                                            <span className="text-[10px] font-medium text-[#1a4a35]/50 ml-0.5">
                                                                                /night
                                                                            </span>
                                                                        </p>
                                                                        {item
                                                                            .room_type
                                                                            ?.max_occupancy && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] text-[#1a4a35]/50">
                                                                                <Users className="w-3 h-3" />
                                                                                {
                                                                                    item
                                                                                        .room_type
                                                                                        .max_occupancy
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="w-8 h-8 rounded-full bg-[#1a4a35]/05 flex items-center justify-center shrink-0 group-hover:bg-[#1a4a35] transition-colors">
                                                                    <ChevronRight className="w-4 h-4 text-[#1a4a35] group-hover:text-white transition-colors" />
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="px-6 py-5">
                                    <div className="bg-gradient-to-br from-[#eaf3ea] to-white rounded-2xl border border-[#1a4a35]/10 p-4 mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                {draftRoom.image_url ? (
                                                    <img
                                                        src={
                                                            buildImageUrl(
                                                                draftRoom.image_url,
                                                            ) || ""
                                                        }
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Bed className="w-7 h-7 text-[#1a4a35]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="text-[#0d2e1f] text-lg font-bold truncate"
                                                    style={{
                                                        fontFamily: "Georgia",
                                                    }}
                                                >
                                                    Room {draftRoom.room_number}
                                                </p>
                                                <p className="text-[#1a4a35]/50 text-xs truncate">
                                                    {draftRoom.room_type
                                                        ?.type_name ||
                                                        "Standard"}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[#c9a96e] font-bold text-lg">
                                                    {formatPrice(
                                                        draftStayType ===
                                                            "short_stay"
                                                            ? Number(
                                                                  draftRoom
                                                                      .room_type
                                                                      ?.short_stay_price ??
                                                                      draftRoom
                                                                          .room_type
                                                                          ?.base_price ??
                                                                      0,
                                                              )
                                                            : Number(
                                                                  draftRoom
                                                                      .room_type
                                                                      ?.base_price ||
                                                                      0,
                                                              ),
                                                    )}
                                                </p>
                                                <p className="text-[#1a4a35]/40 text-[10px]">
                                                    {draftStayType ===
                                                    "overnight"
                                                        ? "/night"
                                                        : "short stay"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[#1a4a35]/40 text-[10px] uppercase tracking-[3px] mb-3">
                                        Stay Type
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        <button
                                            onClick={() =>
                                                handleDraftStayTypeChange(
                                                    "overnight",
                                                )
                                            }
                                            className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                                                draftStayType === "overnight"
                                                    ? "bg-[#1a4a35] text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            Overnight
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDraftStayTypeChange(
                                                    "short_stay",
                                                )
                                            }
                                            className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                                                draftStayType === "short_stay"
                                                    ? "bg-[#1a4a35] text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            Short Stay
                                        </button>
                                    </div>

                                    {draftStayType === "short_stay" ? (
                                        <div className="mb-4">
                                            <CustomDatePicker
                                                label="Date"
                                                value={draftCheckIn}
                                                onChange={
                                                    handleDraftCheckInChange
                                                }
                                                minDate={todayPlus(0)}
                                                disabledDates={draftBookedDates}
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <CustomDatePicker
                                                label="Check-in Date"
                                                value={draftCheckIn}
                                                onChange={
                                                    handleDraftCheckInChange
                                                }
                                                minDate={todayPlus(0)}
                                                disabledDates={draftBookedDates}
                                            />
                                            <CustomDatePicker
                                                label="Check-out Date"
                                                value={draftCheckOut}
                                                onChange={
                                                    handleDraftCheckOutChange
                                                }
                                                minDate={minDraftCheckOut}
                                                disabledDates={draftBookedDates}
                                            />
                                        </div>
                                    )}

                                    {draftLoading ? (
                                        <div className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 mb-4 border border-[#1a4a35]/08">
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            <p className="text-xs text-gray-500">
                                                Loading room availability…
                                            </p>
                                        </div>
                                    ) : draftCheckingAvailability ? (
                                        <div className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 mb-4 border border-[#1a4a35]/08">
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            <p className="text-xs text-gray-500">
                                                Checking availability…
                                            </p>
                                        </div>
                                    ) : draftAvailability?.available ? (
                                        <div className="flex items-start gap-2.5 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 mb-4">
                                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-green-700 font-semibold">
                                                Room is available for these
                                                dates.
                                            </p>
                                        </div>
                                    ) : draftAvailability &&
                                      !draftAvailability.available ? (
                                        <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 mb-4">
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-red-700">
                                                    Not available
                                                </p>
                                                <p className="text-xs text-red-600/80 mt-0.5">
                                                    {draftConflictMessage}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="mb-5">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                            Guests
                                        </label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            <select
                                                value={draftGuests}
                                                onChange={(e) =>
                                                    setDraftGuests(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all appearance-none bg-white"
                                            >
                                                {Array.from(
                                                    {
                                                        length:
                                                            draftRoom.room_type
                                                                ?.max_occupancy ||
                                                            6,
                                                    },
                                                    (_, i) => i + 1,
                                                ).map((n) => (
                                                    <option key={n} value={n}>
                                                        {n} guest
                                                        {n > 1 ? "s" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-[#1a4a35]/10 p-4">
                                        <p className="text-[#1a4a35]/40 text-[10px] uppercase tracking-[3px] mb-3">
                                            Room Summary
                                        </p>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[#1a4a35]/50 text-sm">
                                                Stay Type
                                            </span>
                                            <span className="text-[#1a4a35] text-sm font-semibold">
                                                {draftStayType === "overnight"
                                                    ? "Overnight"
                                                    : "Short Stay"}
                                            </span>
                                        </div>
                                        {draftStayType === "overnight" && (
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[#1a4a35]/50 text-sm">
                                                    Nights
                                                </span>
                                                <span className="text-[#1a4a35] text-sm font-semibold">
                                                    {calculateNights(
                                                        draftCheckIn,
                                                        draftCheckOut,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#1a4a35]/10">
                                            <span
                                                className="text-[#0d2e1f] text-base"
                                                style={{
                                                    fontFamily: "Georgia",
                                                }}
                                            >
                                                Subtotal
                                            </span>
                                            <span
                                                className="text-[#c9a96e] text-xl font-semibold"
                                                style={{
                                                    fontFamily: "Georgia",
                                                }}
                                            >
                                                {formatPrice(
                                                    draftStayType ===
                                                        "overnight"
                                                        ? Number(
                                                              draftRoom
                                                                  .room_type
                                                                  ?.base_price ||
                                                                  0,
                                                          ) *
                                                              calculateNights(
                                                                  draftCheckIn,
                                                                  draftCheckOut,
                                                              )
                                                        : Number(
                                                              draftRoom
                                                                  .room_type
                                                                  ?.short_stay_price ??
                                                                  draftRoom
                                                                      .room_type
                                                                      ?.base_price ??
                                                                  0,
                                                          ),
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {draftError && (
                                        <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                                            {draftError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {draftRoom && (
                            <div className="px-6 py-4 border-t border-[#1a4a35]/10 bg-white">
                                <button
                                    onClick={addDraftRoom}
                                    disabled={
                                        draftLoading ||
                                        draftCheckingAvailability ||
                                        (draftAvailability !== null &&
                                            !draftAvailability.available)
                                    }
                                    className="w-full rounded-2xl py-4 text-center text-sm font-semibold tracking-widest uppercase text-white bg-[#1a4a35] hover:bg-[#0d2e1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingRoomId !== null
                                        ? "Update Room"
                                        : "Add Room"}
                                </button>
                                <button
                                    onClick={() => {
                                        setDraftRoom(null);
                                        setDraftCheckIn("");
                                        setDraftCheckOut("");
                                        setDraftBookedDates(new Set());
                                        setDraftBookedRanges([]);
                                        setEditingRoomId(null);
                                    }}
                                    className="w-full py-3 text-center text-[#1a4a35]/50 text-xs mt-1 hover:text-[#1a4a35]"
                                >
                                    ← Choose another room
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
