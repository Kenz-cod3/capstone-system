import { useEffect, useMemo, useState, useRef } from "react";
import type { ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Search,
    Bed,
    Gem,
    Crown,
    Home as HomeIcon,
    Users,
    Ruler,
    Wifi,
    Snowflake,
    Bath,
    Tv,
    Droplets,
    Heart,
    Ban,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Calendar,
    ArrowRight,
    ShieldCheck,
    MapPin,
    Sparkles,
    Star,
    Loader2,
    MousePointer2,
    Hand,
} from "lucide-react";

import { getRooms } from "../../services/roomService";

interface RoomAmenity {
    id: number;
    name: string;
}

interface Room {
    id: number;
    room_number: string;
    status:
        | "available"
        | "reserved"
        | "occupied"
        | "maintenance"
        | "dirty"
        | "cleaning"
        | string;
    is_deleted?: boolean;
    image_url: string | null;
    panorama_url?: string | null;
    room_type_id?: number;
    room_type: {
        id?: number;
        type_name: string;
        description?: string;
        base_price: number;
        short_stay_price?: number;
        max_occupancy: number;
        size?: number;
    };
    amenities?: RoomAmenity[];
}

const STATUS_CONFIG: Record<
    string,
    { bg: string; dot: string; label: string }
> = {
    available: { bg: "#16a34a", dot: "#fff", label: "Available" },
    reserved: { bg: "#7c3aed", dot: "#fff", label: "Reserved" },
    occupied: { bg: "#2563eb", dot: "#fff", label: "Occupied" },
    maintenance: { bg: "#dc2626", dot: "#fff", label: "Maintenance" },
    dirty: { bg: "#b45309", dot: "#fff", label: "Dirty" },
    cleaning: { bg: "#0891b2", dot: "#fff", label: "Cleaning" },
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    Standard: Bed,
    Deluxe: Gem,
    Suite: Crown,
    Family: Users,
    Others: HomeIcon,
};

const getTypeIcon = (type: string) => TYPE_ICON[type] ?? HomeIcon;

const AMENITY_ICON: Record<string, ComponentType<{ className?: string }>> = {
    "Air Conditioning": Snowflake,
    "Private Bathroom": Bath,
};
interface AuthUser {
    first_name?: string;
}

export default function GuestDashboard() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState("All Rooms");
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [guests, setGuests] = useState(1);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);

    // ── The single source of truth for the text search: the ?q= param
    // set by the header search bar in GuestLayout. ──
    const [searchParams] = useSearchParams();
    const search = searchParams.get("q") || "";

    // ── Hero search-bar "auto demo" animation state — plays only while
    // there's no active search, and now just reflects the header's
    // search value instead of owning its own text. ──
    const [demoActive, setDemoActive] = useState(true);
    const [demoTypedText, setDemoTypedText] = useState("");
    const [highlightField, setHighlightField] = useState<
        "search" | "checkin" | "checkout" | "guests" | "button" | null
    >(null);
    const [cursorPos, setCursorPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const [cursorClick, setCursorClick] = useState(false);

    const demoContainerRef = useRef<HTMLDivElement>(null);
    const demoSearchRef = useRef<HTMLDivElement>(null);
    const demoCheckInRef = useRef<HTMLLabelElement>(null);
    const demoCheckOutRef = useRef<HTMLLabelElement>(null);
    const demoGuestsRef = useRef<HTMLDivElement>(null);
    const demoButtonRef = useRef<HTMLButtonElement>(null);

    // ── Ref for the available rooms section (for scrolling) ──
    const availableRoomsRef = useRef<HTMLDivElement>(null);

    const DEMO_PHRASES = ["Room 204", "Deluxe", "Ocean view", "Family suite"];
    const sleep = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

    // Stop the auto-demo the moment the guest actually searches something
    // from the header, so the fake typing doesn't fight the real value.
    useEffect(() => {
        if (search) {
            setDemoActive(false);
        }
    }, [search]);

    // ── Scroll to available rooms when search changes ──
    useEffect(() => {
        if (search && availableRoomsRef.current) {
            // Small delay to allow the filtered results to render
            setTimeout(() => {
                availableRoomsRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 300);
        }
    }, [search]);

    // ── Filter row horizontal-scroll state/refs ──
    const filterScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const user: AuthUser | null = JSON.parse(
        localStorage.getItem("user") || "null",
    );

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const res = await getRooms();
            const result = (res as any)?.data ?? res;
            const data = Array.isArray(result) ? result : [];
            setRooms(data);
        } catch (e) {
            console.log("Error fetching rooms:", e);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
        }).format(price);

    const typeFilters = useMemo(() => {
        const types = Array.from(
            new Set(rooms.map((r) => r.room_type?.type_name || "Others")),
        );
        return ["All Rooms", ...types];
    }, [rooms]);

    const filteredRooms = useMemo(() => {
        return rooms.filter((room) => {
            const matchesSearch =
                room.room_number.toString().includes(search) ||
                room.room_type?.type_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase());
            const roomType = room.room_type?.type_name || "Others";
            const matchesType =
                activeType === "All Rooms" || roomType === activeType;
            const matchesAvailability =
                !showAvailableOnly || room.status === "available";
            return matchesSearch && matchesType && matchesAvailability;
        });
    }, [rooms, search, activeType, showAvailableOnly]);

    // ── Update arrow visibility based on scroll position ──
    const updateFilterScrollButtons = () => {
        const el = filterScrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    useEffect(() => {
        updateFilterScrollButtons();
        window.addEventListener("resize", updateFilterScrollButtons);
        return () =>
            window.removeEventListener("resize", updateFilterScrollButtons);
    }, [typeFilters]);

    const scrollFilters = (dir: "left" | "right") => {
        const el = filterScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    };

    // Select a filter pill and bring it to the center of the scroll row
    const handleSelectType = (label: string, el: HTMLButtonElement | null) => {
        setActiveType(label);
        if (el) {
            el.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
            });
        }
    };

    // Move the fake demo cursor to sit centered over a given element,
    // positioned relative to the search-bar container.
    const moveCursorTo = (el: HTMLElement | null) => {
        const container = demoContainerRef.current;
        if (!el || !container) return;
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setCursorPos({
            left: elRect.left - containerRect.left + elRect.width / 2,
            top: elRect.top - containerRect.top + elRect.height / 2,
        });
    };

    // Cursor position stays relative to the search-bar container.

    // Auto-playing demo: types a sample query, then "clicks" through
    // check-in, check-out, and guests before pressing Search — on loop —
    // until the real user searches from the header (see the effect above).
    useEffect(() => {
        if (!demoActive) return;
        let cancelled = false;

        const typeText = async (text: string) => {
            for (let i = 0; i <= text.length; i++) {
                if (cancelled) return;
                setDemoTypedText(text.slice(0, i));
                await sleep(80);
            }
        };

        const eraseText = async (text: string) => {
            for (let i = text.length; i >= 0; i--) {
                if (cancelled) return;
                setDemoTypedText(text.slice(0, i));
                await sleep(40);
            }
        };

        const clickPulse = async () => {
            setCursorClick(true);
            await sleep(160);
            if (cancelled) return;
            setCursorClick(false);
        };

        const runLoop = async () => {
            let phraseIndex = 0;
            while (!cancelled) {
                const phrase: string =
                    DEMO_PHRASES[phraseIndex % DEMO_PHRASES.length] ??
                    "Room 204";
                phraseIndex++;

                // 1. Type a sample search query
                moveCursorTo(demoSearchRef.current);
                setHighlightField("search");
                await sleep(450);
                if (cancelled) return;
                await clickPulse();
                await typeText(phrase);
                await sleep(650);
                if (cancelled) return;
                await eraseText(phrase);
                setHighlightField(null);
                await sleep(300);

                // 2. Click check-in
                if (cancelled) return;
                moveCursorTo(demoCheckInRef.current);
                await sleep(400);
                if (cancelled) return;
                setHighlightField("checkin");
                await clickPulse();
                await sleep(650);
                setHighlightField(null);

                // 3. Click check-out
                if (cancelled) return;
                moveCursorTo(demoCheckOutRef.current);
                await sleep(400);
                if (cancelled) return;
                setHighlightField("checkout");
                await clickPulse();
                await sleep(650);
                setHighlightField(null);

                // 4. Click guests
                if (cancelled) return;
                moveCursorTo(demoGuestsRef.current);
                await sleep(400);
                if (cancelled) return;
                setHighlightField("guests");
                await clickPulse();
                await sleep(650);
                setHighlightField(null);

                // 5. Click Search Rooms
                if (cancelled) return;
                moveCursorTo(demoButtonRef.current);
                await sleep(400);
                if (cancelled) return;
                setHighlightField("button");
                await clickPulse();
                await sleep(850);
                setHighlightField(null);

                await sleep(500);
            }
        };

        runLoop();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [demoActive]);

    return (
        <div className="bg-[#f7f8f5] min-h-screen pb-16 font-['Inter']">
            {/* Hide native scrollbar on the filter row (Chrome/Safari/Edge) */}
            <style>{`
                .filter-scroll::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="max-w-[100rem] mx-auto px-6 lg:px-8 pt-6">
                {/* ── HERO ── */}
                <div
                    className="relative overflow-hidden rounded-3xl mb-10"
                    style={{ minHeight: 420 }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(90deg, #0d2e1f 0%, #0d2e1f 45%, transparent 75%)",
                        }}
                    />
                    <img
                        src="https://images.unsplash.com/photo-1702255489644-392758161f1f?auto=format&fit=crop&w=1600&q=80"
                        alt="Featured hotel room"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(90deg, #0d2e1f 0%, rgba(13,46,31,0.75) 40%, rgba(13,46,31,0.15) 65%, rgba(13,46,31,0.55) 100%)",
                        }}
                    />

                    <div
                        className="relative flex flex-col h-full px-8 pt-10 pb-8"
                        style={{ minHeight: 420 }}
                    >
                        <div className="flex-1">
                            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase mb-2">
                                Welcome back
                            </p>
                            <h1 className="text-white text-4xl font-bold leading-tight mb-3 font-['Playfair_Display']">
                                {user?.first_name || "Guest"} 👋
                            </h1>
                            <p className="text-white text-lg mb-1">
                                Find your perfect stay at Lyn Enia's Traveler's
                                Inn
                            </p>
                            <p className="text-white/60 text-sm">
                                Comfortable rooms. Great location. Unforgettable
                                experience.
                            </p>
                        </div>

                        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 text-right">
                            <p className="text-white/90 italic text-2xl leading-snug font-['Playfair_Display']">
                                Relax
                                <br />
                                Stay
                                <br />
                                Explore
                            </p>
                            <div className="w-10 h-px bg-[#c9a96e] my-2 ml-auto" />
                            <p className="text-[#c9a96e] text-[10px] tracking-widest uppercase">
                                Good Rooms
                                <br />
                                Great Memories
                            </p>
                        </div>

                        {/* Decorative search-preview bar. Read-only display —
                            the real search box lives in the header now, so
                            this just mirrors whatever's typed there (or runs
                            the auto-demo while nothing's been searched). */}
                        <div
                            ref={demoContainerRef}
                            className="relative mt-6 bg-white rounded-2xl shadow-xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-0 pointer-events-none select-none"
                        >
                            <div
                                ref={demoSearchRef}
                                className={`flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0 rounded-xl transition-shadow ${
                                    highlightField === "search"
                                        ? "ring-2 ring-[#c9a96e]"
                                        : ""
                                }`}
                            >
                                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    value={
                                        search
                                            ? search
                                            : demoActive
                                              ? demoTypedText
                                              : ""
                                    }
                                    readOnly
                                    tabIndex={-1}
                                    placeholder="Search by room number, type, or keyword..."
                                    className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full"
                                />
                            </div>

                            <div className="hidden md:block w-px h-8 bg-gray-200" />

                            <label
                                ref={demoCheckInRef}
                                className={`flex items-center gap-2 px-4 py-2.5 shrink-0 rounded-xl transition-shadow ${
                                    highlightField === "checkin"
                                        ? "ring-2 ring-[#c9a96e]"
                                        : ""
                                }`}
                            >
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <div className="text-left">
                                    <p className="text-xs text-gray-500">
                                        Check-in
                                    </p>
                                    <input
                                        type="date"
                                        value={checkIn}
                                        readOnly
                                        tabIndex={-1}
                                        className="text-sm text-gray-700 outline-none bg-transparent -ml-px"
                                    />
                                </div>
                            </label>

                            <div className="hidden md:block w-px h-8 bg-gray-200" />

                            <label
                                ref={demoCheckOutRef}
                                className={`flex items-center gap-2 px-4 py-2.5 shrink-0 rounded-xl transition-shadow ${
                                    highlightField === "checkout"
                                        ? "ring-2 ring-[#c9a96e]"
                                        : ""
                                }`}
                            >
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <div className="text-left">
                                    <p className="text-xs text-gray-500">
                                        Check-out
                                    </p>
                                    <input
                                        type="date"
                                        value={checkOut}
                                        readOnly
                                        tabIndex={-1}
                                        className="text-sm text-gray-700 outline-none bg-transparent -ml-px"
                                    />
                                </div>
                            </label>

                            <div className="hidden md:block w-px h-8 bg-gray-200" />

                            <div
                                ref={demoGuestsRef}
                                className={`flex items-center gap-2 px-4 py-2.5 shrink-0 rounded-xl transition-shadow ${
                                    highlightField === "guests"
                                        ? "ring-2 ring-[#c9a96e]"
                                        : ""
                                }`}
                            >
                                <Users className="w-4 h-4 text-gray-400" />
                                <div className="text-left">
                                    <p className="text-xs text-gray-500">
                                        Guests
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <select
                                            value={guests}
                                            tabIndex={-1}
                                            disabled
                                            className="text-sm text-gray-700 outline-none bg-transparent appearance-none pr-1 disabled:opacity-100"
                                        >
                                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                                <option key={n} value={n}>
                                                    {n} guest{n > 1 ? "s" : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <button
                                ref={demoButtonRef}
                                tabIndex={-1}
                                className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white text-sm font-medium shrink-0 ring-1 ring-[#c9a96e]/40 ring-offset-2 ring-offset-white transition-transform ${
                                    highlightField === "button" && cursorClick
                                        ? "scale-95"
                                        : ""
                                }`}
                                style={{
                                    background:
                                        "linear-gradient(to right, #1a4a35, #0d2e1f)",
                                }}
                            >
                                Search Rooms
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            {/* Fake animated cursor for the auto-demo */}
                            {demoActive && !search && cursorPos && (
                                <div
                                    className="pointer-events-none absolute z-30 transition-all duration-500 ease-in-out"
                                    style={{
                                        left: cursorPos.left,
                                        top: cursorPos.top,
                                        transform:
                                            highlightField === "button"
                                                ? "translate(-30%, -20%)"
                                                : "translate(-10%, -10%)",
                                    }}
                                >
                                    <div className="relative flex items-center justify-center">
                                        {highlightField === "button" ? (
                                            <Hand
                                                className="w-6 h-6 text-[#c9a96e] drop-shadow-md"
                                                fill="#f7f8f5"
                                                strokeWidth={1.75}
                                            />
                                        ) : (
                                            <MousePointer2
                                                className="w-5 h-5 text-[#c9a96e] drop-shadow-md"
                                                fill="#c9a96e"
                                                strokeWidth={1.5}
                                            />
                                        )}
                                        {cursorClick && (
                                            <span className="absolute w-3 h-3 rounded-full border-2 border-[#c9a96e] animate-ping" />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[100rem] mx-auto px-10 lg:px-24">
                {/* ── SECTION HEADER + FILTERS ── */}
                <div
                    ref={availableRoomsRef}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
                >
                    <div>
                        <h2 className="text-[#0d2e1f] text-2xl font-bold font-['Playfair_Display']">
                            Available Rooms
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Choose from our comfortable and well-equipped rooms
                        </p>
                    </div>

                    {/* Availability toggle + scrollable type filter row */}
                    <div className="flex items-center gap-3 min-w-0 md:max-w-[70%]">
                        {/* Available-only switch */}
                        <label className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 shrink-0 cursor-pointer select-none">
                            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
                                <input
                                    type="checkbox"
                                    checked={showAvailableOnly}
                                    onChange={(e) =>
                                        setShowAvailableOnly(e.target.checked)
                                    }
                                    className="peer sr-only"
                                />
                                <span
                                    className={`absolute inset-0 rounded-full transition-colors ${
                                        showAvailableOnly
                                            ? "bg-[#16a34a]"
                                            : "bg-gray-300"
                                    }`}
                                />
                                <span
                                    className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                        showAvailableOnly
                                            ? "translate-x-4"
                                            : "translate-x-0"
                                    }`}
                                />
                            </span>
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                Available only
                            </span>
                        </label>

                        {/* Scrollable filter row with edge arrows + fade hint */}
                        <div className="relative flex items-center min-w-0 flex-1">
                            {/* Left fade — shown only while scrolled away from the start */}
                            {canScrollLeft && (
                                <div
                                    className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-[5]"
                                    style={{
                                        background:
                                            "linear-gradient(to right, #f7f8f5 20%, transparent)",
                                        backdropFilter: "blur(2px)",
                                        WebkitBackdropFilter: "blur(2px)",
                                    }}
                                />
                            )}

                            {canScrollLeft && (
                                <button
                                    type="button"
                                    onClick={() => scrollFilters("left")}
                                    aria-label="Scroll filters left"
                                    className="absolute left-0 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center shrink-0"
                                >
                                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                                </button>
                            )}

                            <div
                                ref={filterScrollRef}
                                onScroll={updateFilterScrollButtons}
                                className={`filter-scroll flex items-center gap-2 overflow-x-auto scroll-smooth ${
                                    canScrollLeft ? "pl-9" : "pl-1"
                                } ${canScrollRight ? "pr-9" : "pr-1"}`}
                                style={{
                                    scrollbarWidth: "none",
                                    msOverflowStyle: "none",
                                }}
                            >
                                {typeFilters.map((label) => {
                                    const active = activeType === label;
                                    const Icon = getTypeIcon(label);
                                    return (
                                        <button
                                            key={label}
                                            onClick={(e) =>
                                                handleSelectType(
                                                    label,
                                                    e.currentTarget,
                                                )
                                            }
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
                                                active
                                                    ? "bg-[#0d2e1f] text-white ring-1 ring-[#c9a96e]/40 ring-offset-2 ring-offset-[#f7f8f5]"
                                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right fade — shown while there's more content to scroll to */}
                            {canScrollRight && (
                                <div
                                    className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-[5]"
                                    style={{
                                        background:
                                            "linear-gradient(to left, #f7f8f5 20%, transparent)",
                                        backdropFilter: "blur(2px)",
                                        WebkitBackdropFilter: "blur(2px)",
                                    }}
                                />
                            )}

                            {canScrollRight && (
                                <button
                                    type="button"
                                    onClick={() => scrollFilters("right")}
                                    aria-label="Scroll filters right"
                                    className="absolute right-0 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center shrink-0"
                                >
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── ROOM CARDS ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 bg-white rounded-3xl border border-gray-100">
                        <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-4" />
                        <p className="text-[#1a4a35]/60 text-sm">
                            Loading rooms…
                        </p>
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 bg-white rounded-3xl border border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-[#1a4a35]/[0.08] border border-[#1a4a35]/10 flex items-center justify-center mb-5">
                            <Bed className="w-8 h-8 text-[#1a4a35]" />
                        </div>
                        <p className="text-[#1a4a35] text-lg mb-2">
                            No rooms found
                        </p>
                        <p className="text-[#1a4a35]/40 text-sm text-center leading-5">
                            Try a different room number or filter
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                        {filteredRooms.map((item) => {
                            const s = STATUS_CONFIG[item.status] ?? {
                                bg: "#6b7280",
                                dot: "#fff",
                                label: item.status,
                            };
                            const isAvailable = item.status === "available";

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 h-[300px] sm:h-[300px]"
                                >
                                    {/* Image - fills the fixed card height */}
                                    <div className="relative sm:w-[42%] shrink-0 h-48 sm:h-full rounded-2xl overflow-hidden">
                                        <img
                                            src={
                                                item.image_url ||
                                                "https://picsum.photos/seed/room/400/300"
                                            }
                                            alt={`Room ${item.room_number}`}
                                            className="w-full h-full object-cover"
                                        />

                                        <div
                                            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: s.bg }}
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{
                                                    backgroundColor: s.dot,
                                                }}
                                            />
                                            <span className="text-white text-[9px] tracking-widest uppercase font-medium">
                                                {s.label}
                                            </span>
                                        </div>

                                        <button className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors">
                                            <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
                                        </button>
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors">
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
                                        </button>

                                        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
                                            {[0, 1, 2, 3, 4].map((dot) => (
                                                <span
                                                    key={dot}
                                                    className={`rounded-full ${dot === 0 ? "w-1.5 h-1.5 bg-white" : "w-1 h-1 bg-white/50"}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Info - constrained to fixed card height */}
                                    <div className="flex-1 py-0.5 flex flex-col h-full overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-[#0d2e1f] text-xl font-bold font-['Playfair_Display']">
                                                Room {item.room_number}
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full bg-[#1a4a35]/10 text-[#1a4a35] text-[10px] font-medium">
                                                {item.room_type?.type_name ??
                                                    "Room"}
                                            </span>
                                        </div>

                                        <p className="mb-2">
                                            <span className="text-[#1a4a35] text-2xl font-bold">
                                                {formatPrice(
                                                    item.room_type
                                                        ?.base_price ?? 0,
                                                )}
                                            </span>
                                            <span className="text-gray-400 text-sm">
                                                {" "}
                                                / night
                                            </span>
                                        </p>

                                        <div className="flex items-center gap-4 text-gray-500 text-sm mb-2 flex-wrap">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" />
                                                {item.room_type
                                                    ?.max_occupancy || 2}{" "}
                                                guests
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Ruler className="w-4 h-4" />
                                                {item.room_type?.size || 25} m²
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Wifi className="w-4 h-4" />
                                                Free WiFi
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2 flex-wrap min-h-[32px]">
                                            {(item.amenities?.length
                                                ? item.amenities
                                                : [
                                                      {
                                                          id: -1,
                                                          name: "Air Conditioning",
                                                      },
                                                      {
                                                          id: -2,
                                                          name: "Private Bathroom",
                                                      },
                                                  ]
                                            )
                                                .slice(0, 2)
                                                .map((amenity) => {
                                                    const AmenityIcon =
                                                        AMENITY_ICON[
                                                            amenity.name
                                                        ] ?? Sparkles;
                                                    return (
                                                        <span
                                                            key={amenity.id}
                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px]"
                                                        >
                                                            <AmenityIcon className="w-3 h-3" />
                                                            {amenity.name}
                                                        </span>
                                                    );
                                                })}
                                            {(item.amenities?.length || 0) >
                                                2 && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    +
                                                    {item.amenities!.length - 2}{" "}
                                                    more
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-gray-500 text-sm mb-3 flex-wrap">
                                            <span className="flex items-center gap-1.5">
                                                <Tv className="w-4 h-4" />
                                                TV
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Droplets className="w-4 h-4" />
                                                Hot &amp; Cold Shower
                                            </span>
                                        </div>

                                        {/* Buttons - Balanced */}
                                        <div className="mt-auto flex items-center gap-2 pt-1">
                                            {isAvailable ? (
                                                <Link
                                                    to={`/guest/rooms/${item.id}`}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium ring-1 ring-[#c9a96e]/40 ring-offset-2 ring-offset-white"
                                                    style={{
                                                        background:
                                                            "linear-gradient(to right, #1a4a35, #0d2e1f)",
                                                    }}
                                                >
                                                    Reserve Room
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                    Currently {s.label}
                                                </button>
                                            )}
                                            <button
                                                aria-label="Save room"
                                                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <Heart className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── FEATURES STRIP ── */}
                <div className="bg-[#eaf3ea] rounded-3xl px-8 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            icon: ShieldCheck,
                            title: "Secure Booking",
                            subtitle: "Your information is safe with us",
                        },
                        {
                            icon: MapPin,
                            title: "Prime Location",
                            subtitle: "Accessible to key destinations",
                        },
                        {
                            icon: Sparkles,
                            title: "Excellent Service",
                            subtitle: "We are always here to help",
                        },
                        {
                            icon: Star,
                            title: "Great Value",
                            subtitle: "Comfort and quality at the best price",
                        },
                    ].map((feature) => (
                        <div
                            key={feature.title}
                            className="flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                                <feature.icon className="w-5 h-5 text-[#1a4a35]" />
                            </div>
                            <div>
                                <p className="text-[#0d2e1f] text-sm font-semibold">
                                    {feature.title}
                                </p>
                                <p className="text-gray-500 text-xs">
                                    {feature.subtitle}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}