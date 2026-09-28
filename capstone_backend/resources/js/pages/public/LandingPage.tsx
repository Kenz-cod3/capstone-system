import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
    Wifi,
    Coffee,
    Car,
    MapPin,
    Calendar,
    Users,
    Search,
    ChevronDown,
    BedDouble,
    ArrowRight,
    Phone,
    Mail,
    Facebook,
    Instagram,
    Twitter,
    Loader2,
    ArrowUpRight,
    MousePointer2,
    Hand,
    Dribbble,
    Sparkles,
} from "lucide-react";
import loginLogo from "../../../images/logo.png";
import heroImage from "../../../images/login.png";

interface Room {
    id: string | number;
    name: string;
    type: string;
    pricePerNight: number;
    capacity: number;
    beds?: number;
    description?: string;
    imageUrl: string | null;
}

// Shape of the paginated /rooms/available response
interface RoomsPage {
    data: Room[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

const AMENITIES = [
    {
        icon: Coffee,
        title: "Free Kapihan",
        subtitle: "Enjoy complimentary coffee and a relaxing break.",
    },
    {
        icon: Car,
        title: "Free Parking",
        subtitle: "Safe and convenient parking for our guests.",
    },
    {
        icon: Wifi,
        title: "WiFi Vendo Access",
        subtitle: "Stay connected whenever you need it.",
    },
    {
        icon: Dribbble,
        title: "Basketball Court",
        subtitle: "Enjoy an active game during your stay.",
    },
    {
        icon: BedDouble,
        title: "Comfortable Accommodation",
        subtitle: "Relax in a welcoming and comfortable space.",
    },
    {
        icon: Sparkles,
        title: "Essential Amenities",
        subtitle: "Everything you need for a convenient stay.",
    },
];

const NAV_LINKS = [
    { label: "Home", href: "#home", id: "home" },
    { label: "Rooms", href: "#rooms", id: "rooms" },
    { label: "Amenities", href: "#amenities", id: "amenities" },
    { label: "About", href: "#about", id: "about" },
    { label: "Contact", href: "#contact", id: "contact" },
];

// Footer social links. Replace each href with your real page URL.
const SOCIALS = [
    {
        icon: Facebook,
        label: "Facebook",
        href: "https://www.facebook.com/lyneniatravelersinn",
    },
    {
        icon: Instagram,
        label: "Instagram",
        href: "https://www.instagram.com/lyneniatravelersinn",
    },
    { icon: Twitter, label: "Twitter", href: "#" },
];

// Hero search-bar auto demo: sample searches typed by the fake cursor
const DEMO_PHRASES = ["Room 204", "Deluxe room", "Family suite", "Standard"];

type DemoField = "search" | "checkin" | "checkout" | "guests" | "button" | null;

// Rooms are loaded from the API this many at a time ("View more rooms" loads the next page)
const ROOMS_PER_PAGE = 6;

// Every room the API returns is shown as Available (maintenance rooms are
// already filtered out by the backend), because guests can still book future dates.


const peso = (n: number) => `\u20B1${n.toLocaleString()}`;

// Fades and lifts its children in the first time they scroll into view.
// Shows content immediately if the visitor prefers reduced motion.
function Reveal({
    children,
    delay = 0,
    className = "",
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState<boolean>(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const reduceMotion = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (reduceMotion || !("IntersectionObserver" in window)) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={`reveal ${visible ? "is-visible" : ""} ${className}`}
        >
            {children}
        </div>
    );
}

export default function LandingPage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [scrolled, setScrolled] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>("home");
    const [page, setPage] = useState<number>(1);
    const [lastPage, setLastPage] = useState<number>(1);
    const [totalRooms, setTotalRooms] = useState<number>(0);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [loadMoreError, setLoadMoreError] = useState<string>("");
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // ── Hero search-bar auto demo (typing + fake cursor) ──
    const [demoTypedText, setDemoTypedText] = useState<string>("");
    const [highlightField, setHighlightField] = useState<DemoField>(null);
    const [cursorPos, setCursorPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const [cursorClick, setCursorClick] = useState<boolean>(false);

    const demoContainerRef = React.useRef<HTMLDivElement>(null);
    const demoSearchRef = React.useRef<HTMLDivElement>(null);
    const demoCheckInRef = React.useRef<HTMLDivElement>(null);
    const demoCheckOutRef = React.useRef<HTMLDivElement>(null);
    const demoGuestsRef = React.useRef<HTMLDivElement>(null);
    const demoButtonRef = React.useRef<HTMLButtonElement>(null);

    // Bounce logged-in users to their dashboard
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;
        try {
            const user = JSON.parse(storedUser);
            if (user.role === "admin") navigate("/dashboard");
            else if (user.role === "staff") navigate("/staff");
            else if (user.role === "cashier") navigate("/restaurant");
            else if (user.role === "guest") navigate("/guest-dashboard");
        } catch {
            localStorage.clear();
        }
    }, [navigate]);

    // Rooms are loaded one page at a time to keep each request light.
    // Page 1 replaces the list, later pages are appended. Times out after 15s.
    const fetchRooms = React.useCallback(
        async (pageToLoad: number = 1, signal?: AbortSignal) => {
            const isFirstPage = pageToLoad === 1;

            if (isFirstPage) {
                setLoading(true);
                setError("");
            } else {
                setLoadingMore(true);
                setLoadMoreError("");
            }

            try {
                const res = await api.get<RoomsPage | Room[]>(
                    "/rooms/available",
                    {
                        params: { page: pageToLoad, per_page: ROOMS_PER_PAGE },
                        timeout: 15000,
                        signal,
                    },
                );
                const payload: any = res.data;

                // Works with the paginated response and with a plain array
                const items: Room[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                      ? payload.data
                      : [];

                setRooms((prev) => {
                    if (isFirstPage) return items;
                    const seen = new Set(prev.map((r) => r.id));
                    return [...prev, ...items.filter((r) => !seen.has(r.id))];
                });
                setPage(payload?.current_page ?? pageToLoad);
                setLastPage(payload?.last_page ?? 1);
                setTotalRooms(payload?.total ?? items.length);
            } catch (err: any) {
                if (signal?.aborted) return; // unmounted / newer request
                const timedOut =
                    err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";
                if (isFirstPage) {
                    setError(
                        timedOut
                            ? "Rooms are taking too long to load."
                            : err.response?.data?.message ||
                                  "Unable to load rooms right now.",
                    );
                } else {
                    setLoadMoreError("Couldn't load more rooms.");
                }
            } finally {
                if (!signal?.aborted) {
                    if (isFirstPage) setLoading(false);
                    else setLoadingMore(false);
                }
            }
        },
        [],
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchRooms(1, controller.signal);
        return () => controller.abort();
    }, [fetchRooms]);

    const hasMoreRooms = page < lastPage;

    // Collapse back to the first page and jump to the top of the rooms section
    const handleShowFewer = () => {
        setRooms((prev) => prev.slice(0, ROOMS_PER_PAGE));
        setPage(1);
        setLoadMoreError("");
        document
            .getElementById("rooms")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Auto demo: types a sample search, then "clicks" check-in, check-out,
    // guests and Search, on a loop. Skipped if the visitor prefers reduced motion.
    useEffect(() => {
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        let cancelled = false;

        // Resolves to false if the component unmounted while waiting
        const wait = async (ms: number) => {
            await new Promise<void>((resolve) => setTimeout(resolve, ms));
            return !cancelled;
        };

        // Centers the fake cursor over an element, relative to the search card
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

        const clickPulse = async () => {
            setCursorClick(true);
            if (!(await wait(160))) return false;
            setCursorClick(false);
            return true;
        };

        const typeText = async (text: string) => {
            for (let i = 0; i <= text.length; i++) {
                setDemoTypedText(text.slice(0, i));
                if (!(await wait(80))) return false;
            }
            return true;
        };

        const eraseText = async (text: string) => {
            for (let i = text.length; i >= 0; i--) {
                setDemoTypedText(text.slice(0, i));
                if (!(await wait(40))) return false;
            }
            return true;
        };

        // Move to a field, highlight it, click, then release
        const clickField = async (
            el: HTMLElement | null,
            field: DemoField,
            holdMs = 650,
        ) => {
            moveCursorTo(el);
            if (!(await wait(400))) return false;
            setHighlightField(field);
            if (!(await clickPulse())) return false;
            if (!(await wait(holdMs))) return false;
            setHighlightField(null);
            return true;
        };

        const runLoop = async () => {
            let phraseIndex = 0;
            while (!cancelled) {
                const phrase =
                    DEMO_PHRASES[phraseIndex % DEMO_PHRASES.length] ??
                    "Room 204";
                phraseIndex++;

                // 1. Type a sample search
                moveCursorTo(demoSearchRef.current);
                setHighlightField("search");
                if (!(await wait(450))) return;
                if (!(await clickPulse())) return;
                if (!(await typeText(phrase))) return;
                if (!(await wait(650))) return;
                if (!(await eraseText(phrase))) return;
                setHighlightField(null);
                if (!(await wait(300))) return;

                // 2-4. Check in, check out, guests
                if (!(await clickField(demoCheckInRef.current, "checkin")))
                    return;
                if (!(await clickField(demoCheckOutRef.current, "checkout")))
                    return;
                if (!(await clickField(demoGuestsRef.current, "guests")))
                    return;

                // 5. Search button
                if (
                    !(await clickField(demoButtonRef.current, "button", 850))
                )
                    return;

                if (!(await wait(500))) return;
            }
        };

        runLoop();

        return () => {
            cancelled = true;
        };
    }, []);

    // Navbar background toggle on scroll
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => setScrolled(el.scrollTop > 24);
        onScroll();
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // Track active section for navbar underline
    useEffect(() => {
        const sections = NAV_LINKS.map((l) =>
            document.getElementById(l.id),
        ).filter(Boolean) as HTMLElement[];

        if (!sections.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );
                if (visible[0]?.target?.id) {
                    setActiveSection(visible[0].target.id);
                }
            },
            {
                rootMargin: "-80px 0px -60% 0px",
                threshold: 0,
            },
        );

        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={scrollRef}
            className="min-h-dvh bg-[#F7F4EF] text-[#1B2B27] overflow-y-scroll h-dvh scroll-smooth antialiased"
            style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}
        >
            <style>{`
                .font-display { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
                .font-script { font-family: Georgia, 'Times New Roman', serif; font-style: italic; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                /* One easing curve for everything: fast start, soft landing */
                .animate-fade-up { animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }

                /* Hero photo settles in once on page load */
                @keyframes heroImageIn { from { transform: scale(1.08); } to { transform: scale(1); } }
                .hero-img { animation: heroImageIn 1.6s cubic-bezier(0.22, 1, 0.36, 1) both; }

                /* Scroll reveal: fades and lifts in the first time it enters the screen */
                .reveal {
                    opacity: 0;
                    transform: translateY(24px);
                    transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
                                transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
                    will-change: opacity, transform;
                }
                .reveal.is-visible { opacity: 1; transform: none; will-change: auto; }

                /* Button arrows nudge on hover */
                .btn-nudge svg:last-child,
                .btn-nudge-up svg:last-child { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
                .btn-nudge:hover svg:last-child { transform: translateX(3px); }
                .btn-nudge-up:hover svg:last-child { transform: translate(2px, -2px); }

                @media (prefers-reduced-motion: reduce) {
                    .animate-fade-up, .hero-img { animation: none; }
                    .reveal { opacity: 1; transform: none; transition: none; }
                    .btn-nudge svg,
                    .btn-nudge-up svg { transition: none; }
                    .btn-nudge:hover svg:last-child,
                    .btn-nudge-up:hover svg:last-child { transform: none; }
                }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>

            {/* NAVBAR */}
            <header
                className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
                    scrolled
                        ? "bg-[#F7F4EF]/90 backdrop-blur-md border-b border-[#1B2B27]/8"
                        : "bg-transparent"
                }`}
            >
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
                    <a href="#home" className="flex items-center gap-3 group">
                        <div className="relative aspect-square h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white overflow-hidden shrink-0 ring-1 ring-[#1B2B27]/10">
                            <img
                                src={loginLogo}
                                alt="Travelers Inn"
                                className="absolute inset-0 h-full w-full max-w-none object-cover scale-[1.29]"
                            />
                        </div>
                        <div className="leading-none">
                            <p className="font-display text-[15px] font-bold tracking-wide text-[#1B2B27]">
                                Travelers Inn
                            </p>
                            <p className="hidden sm:block text-[10px] tracking-[0.18em] text-[#1B2B27]/50 mt-0.5 uppercase">
                                Comfort · Stay · Enjoy
                            </p>
                        </div>
                    </a>

                    <nav className="hidden lg:flex items-center gap-10 text-[13px] font-medium tracking-wide text-[#1B2B27]/70">
                        {NAV_LINKS.map((link) => {
                            const isActive = activeSection === link.id;
                            return (
                                <a key={link.label}
                                    href={link.href}
                                    className={`relative py-1 transition-colors hover:text-[#1B2B27] ${
                                        isActive ? "text-[#1B2B27]" : ""
                                    }`}
                                >
                                    {link.label}
                                    <span
                                        className={`absolute -bottom-0.5 left-0 right-0 h-px bg-[#C89B5A] transition-transform duration-300 origin-left ${
                                            isActive
                                                ? "scale-x-100"
                                                : "scale-x-0"
                                        }`}
                                    />
                                </a>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate("/login")}
                            className="hidden sm:inline-flex h-10 px-5 items-center text-[13px] font-medium text-[#1B2B27]/80 hover:text-[#1B2B27] transition-colors"
                        >
                            Sign in
                        </button>
                        <button
                            onClick={() => navigate("/register")}
                            className="btn-nudge-up h-10 px-5 rounded-full bg-[#1B2B27] text-[#F7F4EF] text-[13px] font-medium hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center gap-1.5"
                        >
                            Book now
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO — Split layout */}
            <section id="home" className="relative pt-20">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[calc(100dvh-5rem)] py-16">
                        {/* Left: copy */}
                        <div className="lg:col-span-6 animate-fade-up">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="h-px w-10 bg-[#C89B5A]" />
                                <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                    Est. 2019 · Alubijid
                                </span>
                            </div>

                            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-[#1B2B27]">
                                A quiet place
                                <br />
                                to{" "}
                                <em className="italic font-normal text-[#C89B5A]">
                                    rest
                                </em>
                                ,
                                <br />
                                a warm place
                                <br />
                                to{" "}
                                <em className="italic font-normal text-[#C89B5A]">
                                    return
                                </em>
                                .
                            </h1>

                            <p className="mt-8 text-[15px] leading-relaxed text-[#1B2B27]/60 max-w-md">
                                Discover your perfect room and book a stay that
                                feels like home — wherever your journey takes
                                you.
                            </p>

                            <div className="mt-10 flex flex-wrap items-center gap-4">
                                <button
                                    onClick={() => navigate("/register")}
                                    className="btn-nudge h-12 px-7 rounded-full bg-[#1B2B27] text-[#F7F4EF] text-sm font-medium hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center gap-2"
                                >
                                    Reserve your stay
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <a href="#rooms"
                                    className="h-12 px-2 flex items-center gap-2 text-sm font-medium text-[#1B2B27]/70 hover:text-[#1B2B27] transition-colors"
                                >
                                    <span className="h-px w-8 bg-[#1B2B27]/30" />
                                    View rooms
                                </a>
                            </div>

                            {/* Mini stats */}
                            <div className="mt-14 flex items-center gap-8 text-[13px]">
                                <div>
                                    <p className="font-display text-2xl text-[#1B2B27]">
                                        24
                                    </p>
                                    <p className="text-[#1B2B27]/50 mt-0.5">
                                        Rooms
                                    </p>
                                </div>
                                <span className="h-8 w-px bg-[#1B2B27]/10" />
                                <div>
                                    <p className="font-display text-2xl text-[#1B2B27]">
                                        4.9
                                    </p>
                                    <p className="text-[#1B2B27]/50 mt-0.5">
                                        Guest rating
                                    </p>
                                </div>
                                <span className="h-8 w-px bg-[#1B2B27]/10" />
                                <div>
                                    <p className="font-display text-2xl text-[#1B2B27]">
                                        5AM–11PM
                                    </p>
                                    <p className="text-[#1B2B27]/50 mt-0.5">
                                        Front desk
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: image with offset frame */}
                        <div
                            className="lg:col-span-6 relative animate-fade-up"
                            style={{ animationDelay: "0.15s" }}
                        >
                            <div className="relative">
                                <div className="absolute -inset-3 lg:-inset-4 border border-[#C89B5A]/30 rounded-[2rem]" />
                                <div className="relative rounded-[1.75rem] overflow-hidden aspect-[4/5] lg:aspect-[5/6] shadow-2xl shadow-[#1B2B27]/10">
                                    <img
                                        src={heroImage}
                                        alt="Travelers Inn"
                                        className="hero-img w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1B2B27]/40 via-transparent to-transparent" />

                                    {/* Floating quote card */}
                                    <div className="absolute bottom-5 left-5 right-5 bg-[#F7F4EF]/95 backdrop-blur-md rounded-2xl p-5">
                                        <p className="font-script text-lg text-[#1B2B27] leading-snug">
                                            "More than just a place to stay —
                                            it's a home for every traveler."
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="h-px w-6 bg-[#C89B5A]" />
                                            <span className="text-[10px] tracking-[0.2em] uppercase text-[#1B2B27]/50">
                                                Travelers Inn
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Vertical est. strip */}
                                <div className="hidden lg:flex absolute -right-12 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180 items-center gap-3">
                                    <span className="h-16 w-px bg-[#1B2B27]/20" />
                                    <span className="text-[10px] tracking-[0.3em] uppercase text-[#1B2B27]/40">
                                        Comfort · Stay · Enjoy
                                    </span>
                                    <span className="h-16 w-px bg-[#1B2B27]/20" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEARCH BAR — floating card with auto demo (typing + cursor) */}
                    <div className="relative -mb-10 z-20">
                        <div
                            ref={demoContainerRef}
                            className="relative bg-white rounded-2xl shadow-xl shadow-[#1B2B27]/8 border border-[#1B2B27]/6 p-2 flex flex-col md:flex-row items-stretch gap-1 select-none"
                        >
                            <div
                                ref={demoSearchRef}
                                className={`flex items-center gap-3 flex-1 min-w-0 px-4 py-3 rounded-xl transition-shadow pointer-events-none ${highlightField === "search" ? "ring-2 ring-[#C89B5A]" : ""}`}
                            >
                                <MapPin className="h-4 w-4 text-[#C89B5A] shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                        Destination
                                    </p>
                                    <input
                                        type="text"
                                        value={demoTypedText}
                                        readOnly
                                        tabIndex={-1}
                                        placeholder="Where are you going?"
                                        className="w-full bg-transparent outline-none text-sm text-[#1B2B27] placeholder:text-[#1B2B27]/40 mt-0.5"
                                    />
                                </div>
                            </div>
                            <span className="hidden md:block w-px bg-[#1B2B27]/8 my-2" />
                            <div
                                ref={demoCheckInRef}
                                className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl transition-shadow pointer-events-none ${highlightField === "checkin" ? "ring-2 ring-[#C89B5A]" : ""}`}
                            >
                                <Calendar className="h-4 w-4 text-[#C89B5A] shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                        Check in
                                    </p>
                                    <p className="text-sm text-[#1B2B27]/50 mt-0.5">
                                        Add date
                                    </p>
                                </div>
                            </div>
                            <span className="hidden md:block w-px bg-[#1B2B27]/8 my-2" />
                            <div
                                ref={demoCheckOutRef}
                                className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl transition-shadow pointer-events-none ${highlightField === "checkout" ? "ring-2 ring-[#C89B5A]" : ""}`}
                            >
                                <Calendar className="h-4 w-4 text-[#C89B5A] shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                        Check out
                                    </p>
                                    <p className="text-sm text-[#1B2B27]/50 mt-0.5">
                                        Add date
                                    </p>
                                </div>
                            </div>
                            <span className="hidden md:block w-px bg-[#1B2B27]/8 my-2" />
                            <div
                                ref={demoGuestsRef}
                                className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl transition-shadow pointer-events-none ${highlightField === "guests" ? "ring-2 ring-[#C89B5A]" : ""}`}
                            >
                                <Users className="h-4 w-4 text-[#C89B5A] shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                        Guests
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <p className="text-sm text-[#1B2B27]">
                                            2 Guests
                                        </p>
                                        <ChevronDown className="h-3 w-3 text-[#1B2B27]/40" />
                                    </div>
                                </div>
                            </div>
                            <button
                                ref={demoButtonRef}
                                type="button"
                                aria-label="Search rooms"
                                onClick={() =>
                                    document
                                        .getElementById("rooms")
                                        ?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        })
                                }
                                className={`h-14 md:h-auto md:w-16 rounded-xl bg-[#C89B5A] hover:bg-[#1B2B27] text-[#1B2B27] hover:text-[#F7F4EF] transition-all duration-300 flex items-center justify-center gap-2 md:gap-0 ${
                                    highlightField === "button"
                                        ? "ring-2 ring-[#1B2B27]/30 ring-offset-2 ring-offset-white"
                                        : ""
                                } ${
                                    highlightField === "button" && cursorClick
                                        ? "scale-95"
                                        : ""
                                }`}
                            >
                                <Search className="h-4 w-4" />
                                <span className="md:hidden text-sm font-medium">
                                    Search
                                </span>
                            </button>

                            {/* Fake animated cursor */}
                            {cursorPos && (
                                <div
                                    aria-hidden="true"
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
                                                className="h-6 w-6 text-[#C89B5A] drop-shadow-md"
                                                fill="#F7F4EF"
                                                strokeWidth={1.75}
                                            />
                                        ) : (
                                            <MousePointer2
                                                className="h-5 w-5 text-[#C89B5A] drop-shadow-md"
                                                fill="#C89B5A"
                                                strokeWidth={1.5}
                                            />
                                        )}
                                        {cursorClick && (
                                            <span className="absolute h-3 w-3 rounded-full border-2 border-[#C89B5A] animate-ping" />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* AMENITIES — editorial numbered strip */}
            <section id="amenities" className="pt-32 pb-24 bg-[#F7F4EF]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="grid lg:grid-cols-12 gap-12">
                        <Reveal className="lg:col-span-4">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="h-px w-8 bg-[#C89B5A]" />
                                <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                    What we offer
                                </span>
                            </div>
                            <h2 className="font-display text-4xl lg:text-5xl leading-tight text-[#1B2B27]">
                                Everything you need,
                                <br />
                                for a comfortable stay.
                            </h2>
                            <p className="mt-5 text-[15px] text-[#1B2B27]/60 leading-relaxed max-w-sm">
                                Thoughtful amenities and convenient facilities
                                designed to make your stay relaxing, enjoyable,
                                and hassle-free.
                            </p>
                        </Reveal>

                        <Reveal className="lg:col-span-8" delay={120}>
                            <div className="grid sm:grid-cols-2 gap-px bg-[#1B2B27]/8 rounded-2xl overflow-hidden border border-[#1B2B27]/8">
                                {AMENITIES.map(
                                    ({ icon: Icon, title, subtitle }, i) => (
                                        <div
                                            key={title}
                                            className="bg-[#F7F4EF] p-8 hover:bg-white transition-colors duration-300 group"
                                        >
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="h-11 w-11 rounded-full bg-[#1B2B27]/5 group-hover:bg-[#C89B5A]/15 flex items-center justify-center transition-colors">
                                                    <Icon
                                                        className="h-5 w-5 text-[#1B2B27] group-hover:text-[#C89B5A] transition-colors"
                                                        strokeWidth={1.5}
                                                    />
                                                </div>
                                                <span className="font-display text-sm text-[#1B2B27]/30">
                                                    0{i + 1}
                                                </span>
                                            </div>
                                            <p className="font-display text-xl text-[#1B2B27]">
                                                {title}
                                            </p>
                                            <p className="text-[13px] text-[#1B2B27]/50 mt-1.5">
                                                {subtitle}
                                            </p>
                                        </div>
                                    ),
                                )}
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ROOMS — card grid with "View all" */}
            <section id="rooms" className="py-24 bg-white">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="h-px w-8 bg-[#C89B5A]" />
                                <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                    Our rooms
                                </span>
                            </div>
                            <h2 className="font-display text-4xl lg:text-5xl leading-tight text-[#1B2B27]">
                                Rooms & suites
                            </h2>
                        </div>
                        <p className="text-[15px] text-[#1B2B27]/60 max-w-md">
                            Explore our comfortable and affordable rooms. Sign
                            in or create an account to book your stay.
                        </p>
                    </Reveal>

                    {loading && (
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                            aria-busy="true"
                            aria-label="Loading rooms"
                        >
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-[#F7F4EF] rounded-md border border-gray-200 overflow-hidden animate-pulse"
                                >
                                    <div className="aspect-[4/3] bg-[#1B2B27]/8" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-2.5 w-16 rounded bg-[#1B2B27]/10" />
                                        <div className="h-5 w-32 rounded bg-[#1B2B27]/10" />
                                        <div className="h-3 w-full rounded bg-[#1B2B27]/8" />
                                        <div className="h-3 w-2/3 rounded bg-[#1B2B27]/8" />
                                        <div className="pt-6 flex items-center justify-between">
                                            <div className="h-6 w-24 rounded bg-[#1B2B27]/10" />
                                            <div className="h-9 w-20 rounded-full bg-[#1B2B27]/10" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && error && (
                        <div className="max-w-md bg-red-50 border-l-2 border-red-400 text-red-700 p-4 rounded-md text-sm flex items-center justify-between gap-4">
                            <span>{error}</span>
                            <button
                                type="button"
                                onClick={() => fetchRooms(1)}
                                className="shrink-0 font-medium underline underline-offset-2 hover:text-red-900"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && rooms.length === 0 && (
                        <p className="py-16 text-center text-[15px] text-[#1B2B27]/50">
                            No rooms to show right now. Please check back
                            soon.
                        </p>
                    )}

                    {!loading && !error && rooms.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rooms.map((room, index) => {
                                    return (
                                        <Reveal
                                            key={room.id}
                                            className="h-full"
                                            delay={(index % 3) * 90}
                                        >
                                            <div
                                                className="group h-full bg-[#F7F4EF] rounded-md border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1B2B27]/8"
                                            >
                                                {/* Image */}
                                                <div className="relative aspect-[4/3] overflow-hidden bg-[#1B2B27]/5">
                                                    {room.imageUrl && (
                                                        <img
                                                            src={room.imageUrl}
                                                            alt={room.name}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <span className="absolute top-3 left-3 bg-[#F7F4EF]/95 backdrop-blur-sm text-[#1B2B27] text-[10px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 rounded-full">
                                                        Available
                                                    </span>
                                                </div>

                                                {/* Details */}
                                                <div className="p-5 flex flex-col flex-1">
                                                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#C89B5A] font-medium mb-1.5">
                                                        {room.type}
                                                    </p>
                                                    <h3 className="font-display text-xl text-[#1B2B27]">
                                                        {room.name}
                                                    </h3>
                                                    {room.description && (
                                                        <p className="text-[13px] text-[#1B2B27]/55 leading-relaxed mt-2 line-clamp-2">
                                                            {room.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-5 mt-4 text-[12px] text-[#1B2B27]/60">
                                                        <span className="flex items-center gap-1.5">
                                                            <Users className="h-3.5 w-3.5 text-[#C89B5A]" />
                                                            {room.capacity} Guests
                                                        </span>
                                                        {!!room.beds && (
                                                            <span className="flex items-center gap-1.5">
                                                                <BedDouble className="h-3.5 w-3.5 text-[#C89B5A]" />
                                                                {room.beds} Bed
                                                                {room.beds > 1
                                                                    ? "s"
                                                                    : ""}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Price + CTA pinned to bottom */}
                                                    <div className="mt-auto pt-5">
                                                        <div className="pt-4 border-t border-[#1B2B27]/8 flex items-end justify-between gap-3">
                                                            <div>
                                                                <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                                                    From
                                                                </p>
                                                                <p className="font-display text-lg text-[#1B2B27] mt-0.5">
                                                                    {peso(
                                                                        room.pricePerNight,
                                                                    )}
                                                                    <span className="text-[11px] font-sans text-[#1B2B27]/40 font-normal ml-1">
                                                                        / night
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    navigate(
                                                                        "/register",
                                                                    )
                                                                }
                                                                className="btn-nudge h-9 px-4 rounded-full bg-[#1B2B27] text-[#F7F4EF] text-[12px] font-medium hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center gap-1.5 shrink-0"
                                                            >
                                                                Book
                                                                <ArrowRight className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Reveal>
                                    );
                                })}
                            </div>

                            {/* Bottom bar: count on the left, View more on the right */}
                            {(hasMoreRooms || rooms.length > ROOMS_PER_PAGE) && (
                                <div className="mt-12 pt-6 border-t border-[#1B2B27]/8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <p className="text-[13px] text-[#1B2B27]/50 text-center sm:text-left">
                                        Showing {rooms.length} of {totalRooms}{" "}
                                        rooms
                                        {loadMoreError && (
                                            <span className="ml-2 text-red-600">
                                                · {loadMoreError}
                                            </span>
                                        )}
                                    </p>

                                    {hasMoreRooms ? (
                                        <button
                                            type="button"
                                            onClick={() => fetchRooms(page + 1)}
                                            disabled={loadingMore}
                                            className="h-12 px-7 rounded-full border border-[#1B2B27]/20 text-[#1B2B27] text-sm font-medium hover:bg-[#1B2B27] hover:text-[#F7F4EF] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-transparent disabled:hover:text-[#1B2B27]"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading…
                                                </>
                                            ) : (
                                                <>
                                                    {loadMoreError
                                                        ? "Try again"
                                                        : "View more rooms"}
                                                    <ChevronDown className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleShowFewer}
                                            className="h-12 px-7 rounded-full border border-[#1B2B27]/20 text-[#1B2B27] text-sm font-medium hover:bg-[#1B2B27] hover:text-[#F7F4EF] transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            Show fewer rooms
                                            <ChevronDown className="h-4 w-4 rotate-180" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* ABOUT — asymmetric mosaic */}
            <section id="about" className="py-24 bg-[#F7F4EF]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                        {/* Mosaic */}
                        <Reveal className="lg:col-span-7 order-2 lg:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Tall left tile */}
                                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1B2B27] to-[#2d4a42] row-span-2 min-h-[420px] flex items-end p-7">
                                    <div>
                                        <p className="font-display text-3xl text-[#F7F4EF] leading-tight">
                                            Relax.
                                            <br />
                                            Unwind.
                                            <br />
                                            <em className="italic text-[#C89B5A] font-normal">
                                                Belong.
                                            </em>
                                        </p>
                                    </div>
                                </div>

                                {/* Right column */}
                                <div className="space-y-4">
                                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#C89B5A] to-[#a87d3f] min-h-[200px] flex items-start justify-end p-6">
                                        <p className="font-script text-[#F7F4EF] text-xl leading-tight text-right">
                                            Good food
                                            <br />
                                            Good mood
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-3xl bg-gradient-to-br from-stone-400 to-stone-600 min-h-[200px]" />
                                        <div className="rounded-3xl bg-[#1B2B27] text-[#F7F4EF] flex items-center justify-center p-5 text-center min-h-[200px]">
                                            <p className="text-[13px] font-medium leading-snug">
                                                Same comfort.
                                                <br />
                                                New adventures.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        {/* Copy */}
                        <Reveal className="lg:col-span-5 order-1 lg:order-2" delay={120}>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="h-px w-8 bg-[#C89B5A]" />
                                <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                    About us
                                </span>
                            </div>
                            <h2 className="font-display text-4xl lg:text-5xl leading-tight text-[#1B2B27]">
                                A better place to
                                <br />
                                create memories.
                            </h2>
                            <p className="mt-6 text-[15px] text-[#1B2B27]/60 leading-relaxed">
                                Whether you're here for business, leisure, or a
                                quick getaway, Travelers Inn offers a
                                comfortable and relaxing stay with modern
                                amenities and warm hospitality.
                            </p>
                            <p className="mt-4 text-[15px] text-[#1B2B27]/60 leading-relaxed">
                                Every detail — from the linens to the lighting —
                                is chosen with one goal: to make you feel at
                                home, far from home.
                            </p>
                            <button className="btn-nudge-up mt-9 h-12 px-6 rounded-full border border-[#1B2B27]/20 text-[#1B2B27] text-sm font-medium hover:bg-[#1B2B27] hover:text-[#F7F4EF] transition-all duration-300 flex items-center gap-2">
                                Learn more
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* FOOTER — dark ink */}
            <footer id="contact" className="bg-[#1B2B27] text-[#F7F4EF]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-20 pb-12">
                    {/* Top: big CTA */}
                    <Reveal className="grid lg:grid-cols-12 gap-10 pb-16 border-b border-[#F7F4EF]/10">
                        <div className="lg:col-span-7">
                            <h2 className="font-display text-4xl lg:text-6xl leading-[1.05] text-[#F7F4EF]">
                                Ready to
                                <br />
                                <em className="italic text-[#C89B5A] font-normal">
                                    check in?
                                </em>
                            </h2>
                            <p className="mt-6 text-[15px] text-[#F7F4EF]/50 max-w-md leading-relaxed">
                                Book your stay at Travelers Inn and experience
                                comfort that feels like home.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <button
                                    onClick={() => navigate("/register")}
                                    className="btn-nudge h-12 px-7 rounded-full bg-[#C89B5A] text-[#1B2B27] text-sm font-medium hover:bg-[#F7F4EF] transition-colors duration-300 flex items-center gap-2"
                                >
                                    Book now
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => navigate("/login")}
                                    className="h-12 px-7 rounded-full border border-[#F7F4EF]/20 text-[#F7F4EF] text-sm font-medium hover:bg-[#F7F4EF]/5 transition-colors duration-300"
                                >
                                    Sign in
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-5 lg:pl-10">
                            <p className="font-script text-2xl text-[#C89B5A] leading-snug">
                                "Thank you for being part
                                <br />
                                of our journey."
                            </p>
                        </div>
                    </Reveal>

                    {/* Middle: columns */}
                    <Reveal className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 py-14" delay={100}>
                        <div>
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="h-10 w-10 rounded-full bg-[#F7F4EF] overflow-hidden shrink-0 flex items-center justify-center">
                                    <img
                                        src={loginLogo}
                                        alt="Travelers Inn"
                                        className="h-[54px] w-[54px] max-w-none object-cover"
                                    />
                                </div>
                                <p className="font-display text-sm font-bold tracking-wide">
                                    Travelers Inn
                                </p>
                            </div>
                            <p className="text-[13px] text-[#F7F4EF]/40 leading-relaxed">
                                A quiet place to rest,
                                <br />a warm place to return.
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] tracking-[0.2em] uppercase text-[#F7F4EF]/40 mb-4">
                                Explore
                            </p>
                            <ul className="space-y-3 text-[13px]">
                                {NAV_LINKS.map((link) => (
                                    <li key={link.label}>
                                        <a href={link.href}
                                            className="text-[#F7F4EF]/70 hover:text-[#C89B5A] transition-colors"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="text-[11px] tracking-[0.2em] uppercase text-[#F7F4EF]/40 mb-4">
                                Contact
                            </p>
                            <ul className="space-y-3 text-[13px] text-[#F7F4EF]/70">
                                <li className="flex items-start gap-2.5">
                                    <Phone className="h-3.5 w-3.5 mt-0.5 text-[#C89B5A] shrink-0" />
                                    09177045341
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Mail className="h-3.5 w-3.5 mt-0.5 text-[#C89B5A] shrink-0" />
                                    info@travelersinn.com
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-[#C89B5A] shrink-0" />
                                    Zone 3 Lanao, Alubijid, Mis. Or.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-[11px] tracking-[0.2em] uppercase text-[#F7F4EF]/40 mb-4">
                                Follow
                            </p>
                            <div className="flex items-center gap-3">
                                {SOCIALS.map(
                                    ({ icon: Icon, label, href }) => (
                                        <a key={label}
                                            href={href}
                                            target={
                                                href.startsWith("http")
                                                    ? "_blank"
                                                    : undefined
                                            }
                                            rel="noopener noreferrer"
                                            aria-label={label}
                                            className="group relative h-9 w-9 rounded-full border border-[#F7F4EF]/15 flex items-center justify-center hover:bg-[#C89B5A] hover:border-[#C89B5A] hover:text-[#1B2B27] focus-visible:bg-[#C89B5A] focus-visible:border-[#C89B5A] focus-visible:text-[#1B2B27] transition-all duration-300"
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            <span
                                                role="tooltip"
                                                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-[#F7F4EF] px-2.5 py-1 text-[11px] font-medium text-[#1B2B27] opacity-0 translate-y-1 shadow-lg transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
                                            >
                                                {label}
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#F7F4EF]" />
                                            </span>
                                        </a>
                                    ),
                                )}
                            </div>
                        </div>
                    </Reveal>

                    {/* Bottom bar */}
                    <div className="pt-8 border-t border-[#F7F4EF]/10 flex flex-col sm:flex-row justify-between gap-3 text-[12px] text-[#F7F4EF]/35">
                        <p>
                            © {new Date().getFullYear()} Travelers Inn. All
                            rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <a href="#"
                                className="hover:text-[#C89B5A] transition-colors"
                            >
                                Privacy Policy
                            </a>
                            <a href="#"
                                className="hover:text-[#C89B5A] transition-colors"
                            >
                                Terms of Service
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}