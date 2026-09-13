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
} from "lucide-react";
import loginLogo from "../../../images/loginLogo.png";
import heroImage from "../../../images/login.png";
// Gallery photos not shot yet — using CSS placeholders below.
// Once you have real photos, add them to /images and swap the placeholder
// <div>s in the "GALLERY / ABOUT MOSAIC" section for <img> tags.

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
    { icon: Coffee, title: "Breakfast Included", subtitle: "Start your day right" },
    { icon: Car, title: "Free Parking", subtitle: "Safe and convenient" },
];

const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Rooms", href: "#rooms" },
    { label: "Amenities", href: "#amenities" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
];

const peso = (n: number) => `\u20B1${n.toLocaleString()}`;

export default function LandingPage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Bounce logged-in users straight to their dashboard, same pattern as Login.tsx
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

    // Fetch available rooms — public endpoint, no auth header needed
    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await api.get<Room[]>("/rooms/available");
                setRooms(res.data);
            } catch (err: any) {
                setError(err.response?.data?.message || "Unable to load rooms right now.");
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, []);

    return (
        <div className="min-h-dvh bg-white text-gray-900">
            <style>{`
                .script { font-family: Georgia, 'Times New Roman', serif; font-style: italic; }
            `}</style>

            {/* NAVBAR */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                            <img src={loginLogo} alt="" className="h-6 w-6 object-contain" />
                        </div>
                        <div className="leading-tight">
                            <p className="font-serif font-bold tracking-wide text-teal-950 text-sm">
                                TRAVELERS INN
                            </p>
                            <p className="text-[11px] text-gray-400">Comfort. Stay. Enjoy.</p>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="hover:text-teal-700 transition-colors first:text-teal-700"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/login")}
                            className="h-10 px-5 rounded-lg border border-teal-600 text-teal-700 text-sm font-medium hover:bg-teal-50 transition-colors"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => navigate("/register")}
                            className="h-10 px-5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 transition-colors"
                        >
                            Register
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="relative">
                <div className="relative h-[520px] overflow-hidden">
                    <img src={heroImage} alt="Travelers Inn" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-950/85 via-teal-950/45 to-transparent" />

                    <div className="absolute top-8 right-10 script text-2xl text-white leading-tight text-right hidden md:block">
                        Good Stays
                        <br />
                        Brighter Journeys
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
                        <p className="text-xs tracking-[0.2em] text-teal-200 mb-3">
                            WELCOME TO TRAVELERS INN
                        </p>
                        <h1 className="text-5xl font-bold text-white leading-tight max-w-xl">
                            Comfort. Stay. Enjoy.
                        </h1>
                        <p className="text-teal-50/90 max-w-md mt-4 leading-relaxed">
                            Discover your perfect room and book a stay that feels like
                            home, wherever your journey takes you.
                        </p>
                        <p className="script text-xl text-white/90 mt-8">
                            'More than just a place to stay,
                            <br />
                            it's a home for every traveler.'
                        </p>
                        <div className="w-10 h-px bg-white/40 mt-3" />
                    </div>
                </div>

                {/* SEARCH BAR — overlaps hero bottom edge */}
                <div className="max-w-6xl mx-auto px-6 relative -mt-10 z-20">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-2">
                        <div className="flex items-center gap-2 flex-1 px-3 border-b md:border-b-0 md:border-r border-gray-100 py-2 md:py-0">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                            <input
                                placeholder="Where are you going?"
                                className="w-full outline-none text-sm placeholder:text-gray-400"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-1 px-3 border-b md:border-b-0 md:border-r border-gray-100 py-2 md:py-0">
                            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-400">Check In</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 px-3 border-b md:border-b-0 md:border-r border-gray-100 py-2 md:py-0">
                            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-400">Check Out</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 px-3 py-2 md:py-0">
                            <Users className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-600">2 Guests</span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <button className="h-11 px-6 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                            <Search className="h-4 w-4" />
                            Search
                        </button>
                    </div>
                </div>
            </section>

            {/* AMENITIES */}
            <section id="amenities" className="bg-teal-50/60 mt-14">
                <div className="max-w-6xl mx-auto px-6 py-14">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {AMENITIES.map(({ icon: Icon, title, subtitle }) => (
                            <div key={title} className="flex flex-col items-center text-center gap-2">
                                <Icon className="h-7 w-7 text-teal-700" strokeWidth={1.75} />
                                <p className="font-semibold text-gray-900 text-sm mt-1">{title}</p>
                                <p className="text-xs text-gray-500">{subtitle}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AVAILABLE ROOMS */}
            <section id="rooms" className="max-w-6xl mx-auto px-6 py-16">
                <div className="flex items-end justify-between mb-2">
                    <h2 className="text-3xl font-bold text-gray-900">Available Rooms</h2>
                    <a
                        href="#rooms"
                        className="hidden sm:flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
                    >
                        View All Rooms
                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                </div>
                <p className="text-gray-500 mb-10">
                    Explore our comfortable and affordable rooms. Sign in or create an
                    account to book your stay.
                </p>

                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    </div>
                )}

                {!loading && error && (
                    <div className="max-w-md bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white"
                            >
                                <div className="relative h-40">
                                    <img
                                        src={room.imageUrl}
                                        alt={room.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <span className="absolute top-3 left-3 bg-teal-50 text-teal-700 text-[11px] font-semibold px-3 py-1 rounded-full">
                                        Available
                                    </span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="font-bold text-gray-900">{room.name}</h3>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {room.capacity} Guests
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BedDouble className="h-3.5 w-3.5" />
                                            {room.beds} Bed{room.beds > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                        {room.description}
                                    </p>
                                    <p className="text-sm pt-1">
                                        <span className="font-bold text-gray-900">
                                            {peso(room.pricePerNight)}
                                        </span>
                                        <span className="text-gray-400"> / night</span>
                                    </p>
                                    <button
                                        onClick={() => navigate("/register")}
                                        className="w-full mt-2 h-10 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        Check Availability
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* GALLERY / ABOUT MOSAIC */}
            <section id="about" className="max-w-6xl mx-auto px-6 pb-20">
                <div className="grid md:grid-cols-[1.1fr_1fr_0.7fr] gap-4 h-[380px]">
                    {/* Placeholder — swap for a real pool photo when available */}
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-700 to-teal-900 flex items-end">
                        <p className="script absolute bottom-6 left-6 text-white text-2xl leading-tight drop-shadow">
                            Relax
                            <br />
                            Unwind
                            <br />
                            Belong
                        </p>
                    </div>

                    <div className="bg-teal-50/60 rounded-2xl p-8 flex flex-col justify-center gap-4">
                        <h3 className="text-2xl font-bold text-gray-900 leading-snug">
                            A Better Place
                            <br />
                            to Create Memories
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Whether you're here for business, leisure, or a quick
                            getaway, Travelers Inn offers a comfortable and relaxing
                            stay with modern amenities and warm hospitality.
                        </p>
                        <button className="w-fit h-10 px-5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium flex items-center gap-1.5 transition-colors">
                            Learn More
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="grid grid-rows-2 gap-4">
                        {/* Placeholder — swap for a real breakfast/coffee photo when available */}
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-700 to-amber-900 flex items-start justify-end p-4">
                            <p className="script text-white text-lg leading-tight drop-shadow text-right">
                                Good Food
                                <br />
                                Good Mood
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Placeholder — swap for a real reception photo when available */}
                            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-stone-500 to-stone-700" />
                            <div className="rounded-2xl bg-teal-800 text-white flex items-center justify-center p-4 text-center">
                                <p className="text-sm font-medium leading-snug">
                                    Same Comfort.
                                    <br />
                                    New Adventures.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer id="contact" className="bg-teal-50/60 border-t border-teal-100/60">
                <div className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <img src={loginLogo} alt="" className="h-8 w-8 object-contain" />
                            <div className="leading-tight">
                                <p className="font-serif font-bold text-teal-950 text-sm">
                                    TRAVELERS INN
                                </p>
                                <p className="text-[11px] text-gray-400">Comfort. Stay. Enjoy.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="font-semibold text-gray-900 text-sm mb-3">Quick Links</p>
                        <ul className="space-y-2 text-sm text-gray-500">
                            {NAV_LINKS.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="hover:text-teal-700">
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="font-semibold text-gray-900 text-sm mb-3">Contact Us</p>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" />
                                +63 912 345 6789
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" />
                                info@travelersinn.com
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                Opol, Misamis Oriental, Philippines
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="font-semibold text-gray-900 text-sm mb-3">Follow Us</p>
                        <div className="flex items-center gap-3 mb-4">
                            <Facebook className="h-4 w-4 text-teal-700" />
                            <Instagram className="h-4 w-4 text-teal-700" />
                            <Twitter className="h-4 w-4 text-teal-700" />
                        </div>
                        <p className="script text-teal-800 text-lg leading-tight">
                            Thank you for being part
                            <br />
                            of our journey.
                        </p>
                    </div>
                </div>

                <div className="border-t border-teal-100/60">
                    <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-gray-400">
                        <p>© {new Date().getFullYear()} Travelers Inn. All rights reserved.</p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-teal-700">Privacy Policy</a>
                            <a href="#" className="hover:text-teal-700">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}