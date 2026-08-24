import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    Shield,
    ShieldCheck,
    User,
    Loader2,
} from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";
import loginLogo from "../../../images/loginLogo.png";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // --- Slideshow state ---
    const slides = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState(0);

    // change slide every SLIDE_DURATION ms
    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    // check kung may existing session, redirect base sa role
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        const currentPath = window.location.pathname;

        if (user.role === "admin" && currentPath !== "/dashboard") {
            window.location.replace("/dashboard");
        }
        if (user.role === "staff" && currentPath !== "/staff") {
            window.location.replace("/staff");
        }
        if (user.role === "cashier" && currentPath !== "/restaurant") {
            window.location.replace("/restaurant");
        }
    }, []);

    // login request
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post("/auth/login", { email, password });
            const user = res.data.user;
            const token = res.data.token;

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);
            localStorage.setItem("role", user.role);

            if (user.role === "admin") {
                window.location.replace("/dashboard");
            } else if (user.role === "staff") {
                window.location.replace("/staff"); // hotel staff
            } else if (user.role === "cashier") {
                window.location.replace("/restaurant"); // cashier
            } else {
                setError("Access denied.");
                localStorage.clear();
            }
        } catch (err: any) {
            // error message from backend
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50 via-white to-teal-100 px-4 sm:px-6 lg:px-8">
            {/* pan animation para sa slideshow */}
            <style>{`
                @keyframes panLTR {
                    from { object-position: left center; }
                    to   { object-position: right center; }
                }
                @keyframes panRTL {
                    from { object-position: right center; }
                    to   { object-position: left center; }
                }
                .pan-ltr {
                    animation: panLTR ${SLIDE_DURATION}ms linear forwards;
                }
                .pan-rtl {
                    animation: panRTL ${SLIDE_DURATION}ms linear forwards;
                }
            `}</style>

            <div className="flex-1 flex items-center justify-center py-10">
                <div className="w-full max-w-7xl min-h-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2">
                    {/* LEFT: HERO PANEL — panning slideshow, gradient overlay only on top of it */}
                    <div className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden">
                        {/* slideshow images */}
                        {slides.map((src, i) => (
                            <img
                                key={`${i}-${slideIndex === i}`}
                                src={src}
                                alt=""
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                                    i === slideIndex ? "opacity-100" : "opacity-0"
                                } ${i % 2 === 0 ? "pan-ltr" : "pan-rtl"}`}
                                style={{
                                    animationPlayState:
                                        i === slideIndex ? "running" : "paused",
                                }}
                            />
                        ))}

                        {/* Gradient overlay lives ONLY on this image, dark on the left fading to the right */}
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/90 via-teal-950/40 to-teal-950/10" />

                        {/* Slide indicator dots */}
                        <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSlideIndex(i)}
                                    aria-label={`Go to slide ${i + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i === slideIndex
                                            ? "w-6 bg-teal-300"
                                            : "w-1.5 bg-white/40 hover:bg-white/60"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Logo — upper left, larger mark with text floating over it */}
                        <div className="relatives -top-4 -ml-5 relative z-10 flex flex-col items-start">
                            <img
                                src={loginLogo}
                                alt="Travelers Inn logo"
                                className="h-20 w-20 object-contain -mb-4 ml-5 drop-shadow-md"
                            />
                            <p className="font-serif tracking-widest text-sm relative z-10">
                                TRAVELERS INN
                            </p>
                            <p className="px-3 relatives bottom-3 text-[6.8px] uppercase tracking-[0.2em] text-teal-100/80 relative z-10">
                                Comfort. Stay. Enjoy.
                            </p>
                        </div>

                        {/* Copy */}
                        <div className="relative z-10 space-y-4">
                            <h1 className="text-4xl font-bold leading-tight drop-shadow-sm">
                                Welcome
                                <br />
                                Back!
                            </h1>
                            {/* progress bar, 80% mint green */}
                            <div className="w-28 h-1 rounded-full bg-white/25 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[#7FFFD4]"
                                    style={{ width: "80%" }}
                                />
                            </div>
                            <p className="text-sm text-teal-50/90 leading-relaxed max-w-xs">
                                Sign in to access your dashboard as an Admin, Staff,
                                or Cashier and manage your system efficiently.
                            </p>
                        </div>

                        {/* Security badge */}
                        <div className="relative z-10 flex items-center gap-4 w-fit bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl pl-6 pr-8 py-2">
                            <div className="h-9 w-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-teal-300" />
                            </div>
                            <div className="space-y-0 leading-none mb-2">
                                <p className="text-xs font-semibold leading-tight translate-y-2">Secure Access</p>
                                <p className="text-[10px] text-teal-50/70 leading-tight">
                                    Your data is protected with
                                    <br />
                                    enterprise-grade security.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12 md:p-16">
                        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-7">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="h-20 w-20 rounded-full bg-teal-100 flex items-center justify-center">
                                    <div className="relative h-11 w-11 flex items-center justify-center">
                                        <Shield
                                            className="absolute inset-0 h-11 w-11 text-teal-600 fill-teal-600"
                                            strokeWidth={1.5}
                                        />
                                        <User
                                            className="relative h-5 w-5 text-white"
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Login to your account
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Enter your email below to login to your account
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Email — floating label, notched on the border */}
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 peer-focus:text-teal-500 z-10" />
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder=" "
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="peer w-full h-12 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-gray-900 outline-none transition-colors focus:border-teal-400 focus:ring-0"
                                        required
                                    />
                                    <label
                                        htmlFor="email"
                                        className="absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-gray-400 text-sm transition-all duration-150 pointer-events-none
                                            peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-teal-500
                                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                                    >
                                        Email Address
                                    </label>
                                </div>

                                {/* Password — floating label, notched on the border */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 peer-focus:text-teal-500 z-10" />
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder=" "
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="peer w-full h-12 pl-9 pr-9 rounded-lg border border-gray-300 bg-white text-gray-900 outline-none transition-colors focus:border-teal-400 focus:ring-0"
                                        required
                                    />
                                    <label
                                        htmlFor="password"
                                        className="absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-gray-400 text-sm transition-all duration-150 pointer-events-none
                                            peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-teal-500
                                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                                    >
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                                        aria-label={
                                            showPassword ? "Hide password" : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Remember + Forgot */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="remember"
                                            checked={remember}
                                            onCheckedChange={(v) => setRemember(!!v)}
                                            className="border-teal-400 focus:ring-0 focus-visible:ring-0 data-[state=checked]:bg-teal-400 data-[state=checked]:border-teal-400 data-[state=checked]:text-white"
                                        />
                                        <label
                                            htmlFor="remember"
                                            className="text-sm font-normal text-gray-600 cursor-pointer"
                                        >
                                            Remember me
                                        </label>
                                    </div>
                                    <a
                                        href="/forgot-password"
                                        className="text-sm font-medium text-teal-600 hover:text-teal-700"
                                    >
                                        Forgot password?
                                    </a>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Logging in...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <LogIn className="h-4 w-4" />
                                            Sign In
                                        </span>
                                    )}
                                </Button>
                            </div>

                            <p className="text-center text-xs text-gray-500">
                                Trouble logging in?{" "}
                                <a
                                    href="/contact"
                                    className="font-medium text-teal-600 hover:text-teal-700"
                                >
                                    Contact your system administrator.
                                </a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* Copyright footer */}
            <footer className="pb-6 text-center">
                <p className="text-xs text-gray-400">
                    © {new Date().getFullYear()} Travelers Inn. All rights reserved.
                </p>
            </footer>
        </div>
    );
}