// Save in: resources/js/pages/auth/ForgotPassword.tsx
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
    Mail,
    Loader2,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
} from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";

const LOGIN_PATH = "/login";

export default function ForgotPassword() {
    const [email, setEmail] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [info, setInfo] = useState<string>("");
    const [sent, setSent] = useState<boolean>(false);

    // --- Slideshow state (same as Login / Register / ResetPassword) ---
    const slides: string[] = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev: number) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");

        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/forgot-password", {
                email: email.trim(),
            });
            setSent(true);
            setInfo(
                "If an account exists for that email, we've sent a reset link.",
            );
        } catch (err: any) {
            const status: number | undefined = err.response?.status;
            const data = err.response?.data;

            if (status === 429) {
                setError(
                    "Too many attempts. Please wait a minute and try again.",
                );
            } else {
                setError(
                    data?.message ||
                        "Could not send the reset link. Please try again.",
                );
            }
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
                                        i === slideIndex
                                            ? "running"
                                            : "paused",
                                }}
                            />
                        ))}

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

                        <div className="relative z-10 flex items-center gap-3">
                            <span className="h-px w-10 bg-[#C89B5A]" />
                            <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                Est. 2024 · Alubijid
                            </span>
                        </div>

                        <div className="relative z-10 space-y-5">
                            <h1 className="font-display text-4xl lg:text-5xl leading-[1.05] text-white">
                                Trouble
                                <br />
                                signing{" "}
                                <em className="italic font-normal text-[#C89B5A]">
                                    in?
                                </em>
                            </h1>
                            <p className="font-script text-lg text-[#F7F4EF]/85 leading-snug max-w-xs">
                                "No worries — we'll help you
                                <br />
                                find your way back home."
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                                <span className="h-px w-6 bg-[#C89B5A]" />
                                <span className="text-[10px] tracking-[0.2em] uppercase text-white/60">
                                    Travelers Inn
                                </span>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-4 w-fit bg-white/8 backdrop-blur-md border border-white/15 rounded-xl px-5 py-3">
                            <div className="h-9 w-9 rounded-lg bg-[#C89B5A]/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-[#C89B5A]" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold leading-snug">
                                    Secure access
                                </p>
                                <p className="text-[10px] text-white/60 leading-snug">
                                    Reset links work once and
                                    <br />
                                    expire after 30 minutes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12 lg:p-14">
                        <div className="w-full max-w-sm space-y-6 animate-fade-up">
                            {/* Heading — swaps on success */}
                            {sent ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-[#C89B5A]" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                            Check your inbox
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Reset link
                                        <br />
                                        sent.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        If an account exists for{" "}
                                        <span className="font-medium text-[#1B2B27] break-all">
                                            {email}
                                        </span>
                                        , you'll receive an email shortly.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-[#C89B5A]" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                            Forgot password
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Reset your
                                        <br />
                                        password.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        Enter the email you used to register
                                        and we'll send you a reset link.
                                    </p>
                                </div>
                            )}

                            {/* Body */}
                            {sent ? (
                                <>
                                    {info && (
                                        <div className="bg-[#C89B5A]/10 border-l-2 border-[#C89B5A] text-[#1B2B27] p-3 rounded-md text-sm">
                                            {info}
                                        </div>
                                    )}
                                    <a href={LOGIN_PATH} className="block pt-2">
                                        <button
                                            type="button"
                                            className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            Back to sign in
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </a>
                                    <p className="text-center text-[13px] text-[#1B2B27]/60">
                                        Didn't get an email?{" "}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSent(false);
                                                setInfo("");
                                            }}
                                            className="font-medium text-[#1B2B27] underline decoration-[#C89B5A] decoration-2 underline-offset-4 hover:text-[#C89B5A] transition-colors"
                                        >
                                            Try a different email
                                        </button>
                                    </p>
                                </>
                            ) : (
                                <form
                                    onSubmit={handleSubmit}
                                    noValidate
                                    className="space-y-5"
                                >
                                    {error && (
                                        <div className="bg-red-50 border-l-2 border-red-400 text-red-700 p-3 rounded-md text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {/* Email — floating label */}
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1B2B27]/40 peer-focus:text-[#C89B5A] z-10 transition-colors" />
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder=" "
                                            value={email}
                                            autoComplete="email"
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

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                Send reset link
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>

                                    <p className="text-center text-[13px] text-[#1B2B27]/60">
                                        Remember it now?{" "}
                                        <a
                                            href={LOGIN_PATH}
                                            className="inline-flex items-center gap-1 font-medium text-[#1B2B27] underline decoration-[#C89B5A] decoration-2 underline-offset-4 hover:text-[#C89B5A] transition-colors"
                                        >
                                            <ArrowLeft className="h-3 w-3" />
                                            Back to sign in
                                        </a>
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
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
            </footer>
        </div>
    );
}