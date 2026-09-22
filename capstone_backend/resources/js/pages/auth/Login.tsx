import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck,
    Loader2,
} from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";

interface AuthUser {
    role: "admin" | "staff" | "cashier" | "guest" | string;
    [key: string]: unknown;
}

interface LoginResponse {
    user: AuthUser;
    token: string;
}

export default function Login() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [remember, setRemember] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // --- Slideshow state ---
    const slides: string[] = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev: number) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    // check kung may existing session, redirect base sa role
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;

        const user: AuthUser = JSON.parse(storedUser);
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
        if (user.role === "guest" && currentPath !== "/guest") {
            window.location.replace("/guest");
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post<LoginResponse>("/auth/login", {
                email,
                password,
            });
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
                window.location.replace("/staff");
            } else if (user.role === "cashier") {
                window.location.replace("/restaurant");
            } else if (user.role === "guest") {
                window.location.replace("/guest-dashboard");
            } else {
                setError("Access denied.");
                localStorage.clear();
            }
        } catch (err: any) {
            if (err.response?.data?.needs_verification) {
                window.location.replace(
                    `/register?verify=${encodeURIComponent(
                        err.response.data.email,
                    )}`,
                );
                return;
            }
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-dvh flex flex-col bg-[#F7F4EF] text-[#1B2B27] antialiased"
            style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}
        >
            <style>{`
                .font-display { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
                .font-script { font-family: Georgia, 'Times New Roman', serif; font-style: italic; }
                @keyframes panLTR {
                    from { object-position: left center; }
                    to   { object-position: right center; }
                }
                @keyframes panRTL {
                    from { object-position: right center; }
                    to   { object-position: left center; }
                }
                .pan-ltr { animation: panLTR ${SLIDE_DURATION}ms linear forwards; }
                .pan-rtl { animation: panRTL ${SLIDE_DURATION}ms linear forwards; }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up { animation: fadeUp 0.7s ease-out both; }
            `}</style>

            {/* MAIN */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-6">
                <div className="w-full max-w-6xl bg-white rounded-2xl overflow-hidden grid md:grid-cols-2 shadow-xl shadow-[#1B2B27]/5 border border-[#1B2B27]/6">
                    {/* LEFT: HERO PANEL */}
                    <div className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden">
                        {slides.map((src: string, i: number) => (
                            <img
                                key={`${i}-${slideIndex === i}`}
                                src={src}
                                alt=""
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                                    i === slideIndex
                                        ? "opacity-100"
                                        : "opacity-0"
                                } ${i % 2 === 0 ? "pan-ltr" : "pan-rtl"}`}
                                style={{
                                    animationPlayState:
                                        i === slideIndex ? "running" : "paused",
                                }}
                            />
                        ))}

                        {/* Warm ink overlay — matches landing hero */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1B2B27]/90 via-[#1B2B27]/55 to-[#1B2B27]/15" />

                        {/* Slide indicator dots */}
                        <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                            {slides.map((_: string, i: number) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSlideIndex(i)}
                                    aria-label={`Go to slide ${i + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i === slideIndex
                                            ? "w-6 bg-[#C89B5A]"
                                            : "w-1.5 bg-white/40 hover:bg-white/70"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Eyebrow */}
                        <div className="relative z-10 flex items-center gap-3">
                            <span className="h-px w-10 bg-[#C89B5A]" />
                            <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                Est. 2019 · Alubijid
                            </span>
                        </div>

                        {/* Copy */}
                        <div className="relative z-10 space-y-5">
                            <h1 className="font-display text-4xl lg:text-5xl leading-[1.05] text-white">
                                Welcome
                                <br />
                                back to{" "}
                                <em className="italic font-normal text-[#C89B5A]">
                                    comfort
                                </em>
                                .
                            </h1>
                            <p className="font-script text-lg text-[#F7F4EF]/85 leading-snug max-w-xs">
                                "More than just a place to stay —
                                <br />
                                it's a home for every traveler."
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                                <span className="h-px w-6 bg-[#C89B5A]" />
                                <span className="text-[10px] tracking-[0.2em] uppercase text-white/60">
                                    Travelers Inn
                                </span>
                            </div>
                        </div>

                        {/* Security badge */}
                        <div className="relative z-10 flex items-center gap-4 w-fit bg-white/8 backdrop-blur-md border border-white/15 rounded-xl px-5 py-3">
                            <div className="h-9 w-9 rounded-lg bg-[#C89B5A]/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-[#C89B5A]" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold leading-snug">
                                    Secure access
                                </p>
                                <p className="text-[10px] text-white/60 leading-snug">
                                    Your data is protected with
                                    <br />
                                    enterprise-grade security.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12 lg:p-14">
                        <form
                            onSubmit={handleLogin}
                            className="w-full max-w-sm space-y-7 animate-fade-up"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="h-px w-8 bg-[#C89B5A]" />
                                    <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                        Sign in
                                    </span>
                                </div>
                                <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                    Login to your
                                    <br />
                                    account.
                                </h2>
                                <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                    Enter your email below to continue.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-2 border-red-400 text-red-700 p-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-5">
                                {/* Email — floating label */}
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1B2B27]/40 peer-focus:text-[#C89B5A] z-10 transition-colors" />
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder=" "
                                        value={email}
                                        onChange={(
                                            e: React.ChangeEvent<HTMLInputElement>,
                                        ) => setEmail(e.target.value)}
                                        className="peer w-full h-12 pl-9 pr-3 rounded-lg border border-[#1B2B27]/12 bg-white text-[#1B2B27] outline-none transition-colors focus:border-[#C89B5A] focus:ring-0"
                                        required
                                    />
                                    <label
                                        htmlFor="email"
                                        className="absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-[#1B2B27]/45 text-sm transition-all duration-150 pointer-events-none
                                            peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-[#C89B5A]
                                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#1B2B27]/45"
                                    >
                                        Email address
                                    </label>
                                </div>

                                {/* Password — floating label */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1B2B27]/40 peer-focus:text-[#C89B5A] z-10 transition-colors" />
                                    <input
                                        id="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder=" "
                                        value={password}
                                        onChange={(
                                            e: React.ChangeEvent<HTMLInputElement>,
                                        ) => setPassword(e.target.value)}
                                        className="peer w-full h-12 pl-9 pr-9 rounded-lg border border-[#1B2B27]/12 bg-white text-[#1B2B27] outline-none transition-colors focus:border-[#C89B5A] focus:ring-0"
                                        required
                                    />
                                    <label
                                        htmlFor="password"
                                        className="absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-[#1B2B27]/45 text-sm transition-all duration-150 pointer-events-none
                                            peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-[#C89B5A]
                                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#1B2B27]/45"
                                    >
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((s: boolean) => !s)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B2B27]/40 hover:text-[#1B2B27] z-10 transition-colors"
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
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
                                            onCheckedChange={(
                                                v: boolean | "indeterminate",
                                            ) => setRemember(!!v)}
                                            className="border-[#C89B5A] focus:ring-0 focus-visible:ring-0 data-[state=checked]:bg-[#C89B5A] data-[state=checked]:border-[#C89B5A] data-[state=checked]:text-white"
                                        />
                                        <label
                                            htmlFor="remember"
                                            className="text-[13px] text-[#1B2B27]/70 cursor-pointer"
                                        >
                                            Remember me
                                        </label>
                                    </div>
                                    <a
                                        href="/forgot-password"
                                        className="text-[13px] font-medium text-[#1B2B27]/70 hover:text-[#C89B5A] transition-colors"
                                    >
                                        Forgot password?
                                    </a>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Logging in...
                                        </>
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                            <p className="text-center text-[13px] text-[#1B2B27]/60">
                                Don't have an account?{" "}
                                <a
                                    href="/register"
                                    className="font-medium text-[#1B2B27] underline decoration-[#C89B5A] decoration-2 underline-offset-4 hover:text-[#C89B5A] transition-colors"
                                >
                                    Sign up
                                </a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* Footer
            <footer
                className="py-6 text-center"
                style={{
                    paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
                }}
            >
                <p className="text-[12px] text-[#1B2B27]/40">
                    © {new Date().getFullYear()} Travelers Inn. All rights
                    reserved.
                </p>
            </footer> */}
        </div>
    );
}