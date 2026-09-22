import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
    Wifi,
    Waves,
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
} from "lucide-react";
import loginLogo from "../../../images/logo.png";
import heroImage from "../../../images/login.png";

interface Room {
    id: string | number;
    name: string;
    type: string;
    pricePerNight: number;
    capacity: number;
    beds: number;
    description: string;
    imageUrl: string;
}

const AMENITIES = [
    { icon: Wifi, title: "Free WiFi", subtitle: "Stay connected everywhere" },
    { icon: Waves, title: "Swimming Pool", subtitle: "Relax and unwind" },
    {
        icon: Coffee,
        title: "Breakfast Included",
        subtitle: "Start your day right",
    },
    { icon: Car, title: "Free Parking", subtitle: "Safe and convenient" },
];

const NAV_LINKS = [
    { label: "Home", href: "#home", id: "home" },
    { label: "Rooms", href: "#rooms", id: "rooms" },
    { label: "Amenities", href: "#amenities", id: "amenities" },
    { label: "About", href: "#about", id: "about" },
    { label: "Contact", href: "#contact", id: "contact" },
];

const peso = (n: number) => `\u20B1${n.toLocaleString()}`;

export default function LandingPage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [scrolled, setScrolled] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>("home");
    const scrollRef = React.useRef<HTMLDivElement>(null);

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

    // Fetch available rooms
    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await api.get<Room[]>("/rooms/available");
                setRooms(res.data);
            } catch (err: any) {
                setError(
                    err.response?.data?.message ||
                        "Unable to load rooms right now.",
                );
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
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
                .animate-fade-up { animation: fadeUp 0.7s ease-out both; }
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
                        <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                            <img
                                src={loginLogo}
                                alt="Travelers Inn"
                                className="h-[72px] w-[72px] max-w-none object-cover"
                            />
                        </div>
                        <div className="leading-none">
                            <p className="font-display text-[15px] font-bold tracking-wide text-[#1B2B27]">
                                Travelers Inn
                            </p>
                            <p className="text-[10px] tracking-[0.18em] text-[#1B2B27]/50 mt-0.5 uppercase">
                                Comfort · Stay · Enjoy
                            </p>
                        </div>
                    </a>

                    <nav className="hidden lg:flex items-center gap-10 text-[13px] font-medium tracking-wide text-[#1B2B27]/70">
                        {NAV_LINKS.map((link) => {
                            const isActive = activeSection === link.id;
                            return (
                                <a
                                    key={link.label}
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
                            className="h-10 px-5 rounded-full bg-[#1B2B27] text-[#F7F4EF] text-[13px] font-medium hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center gap-1.5"
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
                                    Est. 2024 · Alubijid
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
                                    className="h-12 px-7 rounded-full bg-[#1B2B27] text-[#F7F4EF] text-sm font-medium hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center gap-2"
                                >
                                    Reserve your stay
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <a
                                    href="#rooms"
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
                                        7/24
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
                                        className="w-full h-full object-cover"
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

                    {/* SEARCH BAR — floating card overlapping into next section */}
                    <div className="relative -mb-10 z-20">
                        <div className="bg-white rounded-2xl shadow-xl shadow-[#1B2B27]/8 border border-[#1B2B27]/6 p-2 flex flex-col md:flex-row items-stretch gap-1">
                            <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl hover:bg-[#F7F4EF]/60 transition-colors">
                                <MapPin className="h-4 w-4 text-[#C89B5A] shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                        Destination
                                    </p>
                                    <input
                                        placeholder="Where are you going?"
                                        className="w-full bg-transparent outline-none text-sm text-[#1B2B27] placeholder:text-[#1B2B27]/40 mt-0.5"
                                    />
                                </div>
                            </div>
                            <span className="hidden md:block w-px bg-[#1B2B27]/8 my-2" />
                            <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl hover:bg-[#F7F4EF]/60 transition-colors cursor-pointer">
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
                            <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl hover:bg-[#F7F4EF]/60 transition-colors cursor-pointer">
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
                            <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl hover:bg-[#F7F4EF]/60 transition-colors cursor-pointer">
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
                            <button className="h-14 md:h-auto md:w-16 rounded-xl bg-[#C89B5A] hover:bg-[#1B2B27] text-[#1B2B27] hover:text-[#F7F4EF] transition-all duration-300 flex items-center justify-center gap-2 md:gap-0">
                                <Search className="h-4 w-4" />
                                <span className="md:hidden text-sm font-medium">
                                    Search
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* AMENITIES — editorial numbered strip */}
            <section id="amenities" className="pt-32 pb-24 bg-[#F7F4EF]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="grid lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-4">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="h-px w-8 bg-[#C89B5A]" />
                                <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                    What we offer
                                </span>
                            </div>
                            <h2 className="font-display text-4xl lg:text-5xl leading-tight text-[#1B2B27]">
                                Everything you need,
                                <br />
                                nothing you don't.
                            </h2>
                            <p className="mt-5 text-[15px] text-[#1B2B27]/60 leading-relaxed max-w-sm">
                                Thoughtful amenities designed to make your stay
                                effortless — so you can focus on what brought
                                you here.
                            </p>
                        </div>

                        <div className="lg:col-span-8">
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
                        </div>
                    </div>
                </div>
            </section>

            {/* ROOMS — card grid */}
            <section id="rooms" className="py-24 bg-white">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="h-px w-8 bg-[#C89B5A]" />
                                <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                    Available now
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
                    </div>

                    {loading && (
                        <div className="flex justify-center py-24">
                            <Loader2 className="h-6 w-6 animate-spin text-[#C89B5A]" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="max-w-md bg-red-50 border-l-2 border-red-400 text-red-700 p-4 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="group bg-[#F7F4EF] rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1B2B27]/8"
                                >
                                    {/* Image */}
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <img
                                            src={room.imageUrl}
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                        />
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
                                        <p className="text-[13px] text-[#1B2B27]/55 leading-relaxed mt-2 line-clamp-2">
                                            {room.description}
                                        </p>

                                        <div className="flex items-center gap-5 mt-4 text-[12px] text-[#1B2B27]/60">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-[#C89B5A]" />
                                                {room.capacity} Guests
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <BedDouble className="h-3.5 w-3.5 text-[#C89B5A]" />
                                                {room.beds} Bed
                                                {room.beds > 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        {/* Price + CTA pinned to bottom */}
                                        <div className="mt-5 pt-4 border-t border-[#1B2B27]/8 flex items-end justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] tracking-[0.15em] uppercase text-[#1B2B27]/40">
                                                    From
                                                </p>
                                                <p className="font-display text-lg text-[#1B2B27] mt-0.5">
                                                    {peso(room.pricePerNight)}
                                                    <span className="text-[11px] font-sans text-[#1B2B27]/40 font-normal ml-1">
                                                        / night
                                                    </span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    navigate("/register")
                                                }
                                                className="h-9 px-4 rounded-full bg-[#1B2B27] text-[#F7F4EF] text-[12px] font-medium hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center gap-1.5 shrink-0"
                                            >
                                                Book
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ABOUT — asymmetric mosaic */}
            <section id="about" className="py-24 bg-[#F7F4EF]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                        {/* Mosaic */}
                        <div className="lg:col-span-7 order-2 lg:order-1">
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
                        </div>

                        {/* Copy */}
                        <div className="lg:col-span-5 order-1 lg:order-2">
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
                            <button className="mt-9 h-12 px-6 rounded-full border border-[#1B2B27]/20 text-[#1B2B27] text-sm font-medium hover:bg-[#1B2B27] hover:text-[#F7F4EF] transition-all duration-300 flex items-center gap-2">
                                Learn more
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER — dark ink */}
            <footer id="contact" className="bg-[#1B2B27] text-[#F7F4EF]">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-20 pb-12">
                    {/* Top: big CTA */}
                    <div className="grid lg:grid-cols-12 gap-10 pb-16 border-b border-[#F7F4EF]/10">
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
                                    className="h-12 px-7 rounded-full bg-[#C89B5A] text-[#1B2B27] text-sm font-medium hover:bg-[#F7F4EF] transition-colors duration-300 flex items-center gap-2"
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
                    </div>

                    {/* Middle: columns */}
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 py-14">
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
                                        <a
                                            href={link.href}
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
                                    +63 912 345 6789
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
                                {[Facebook, Instagram, Twitter].map(
                                    (Icon, i) => (
                                        <a
                                            key={i}
                                            href="#"
                                            className="h-9 w-9 rounded-full border border-[#F7F4EF]/15 flex items-center justify-center hover:bg-[#C89B5A] hover:border-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300"
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </a>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="pt-8 border-t border-[#F7F4EF]/10 flex flex-col sm:flex-row justify-between gap-3 text-[12px] text-[#F7F4EF]/35">
                        <p>
                            © {new Date().getFullYear()} Travelers Inn. All
                            rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <a
                                href="#"
                                className="hover:text-[#C89B5A] transition-colors"
                            >
                                Privacy Policy
                            </a>
                            <a
                                href="#"
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