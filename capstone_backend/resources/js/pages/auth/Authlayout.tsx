// Save in: resources/js/pages/auth/AuthLayout.tsx  (same folder as Login.tsx)
// Same split design as Login/Register: hero slideshow on the left, your form on the right.
import React, { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";
import loginLogo from "../../../images/loginLogo.png";

interface AuthLayoutProps {
    heading: React.ReactNode; // e.g. <>Forgot<br />Password?</>
    description: string;
    children: React.ReactNode; // right-side content
}

export default function AuthLayout({
    heading,
    description,
    children,
}: AuthLayoutProps) {
    const slides: string[] = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev: number) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    return (
        <div className="min-h-dvh flex flex-col bg-gradient-to-br from-teal-50 via-white to-teal-100 px-4 sm:px-6 lg:px-8">
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

                        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/90 via-teal-950/40 to-teal-950/10" />

                        <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                            {slides.map((_: string, i: number) => (
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

                        <div className="relative z-10 flex flex-col items-start gap-1.5">
                            <img
                                src={loginLogo}
                                alt="Travelers Inn logo"
                                className="h-16 w-16 object-contain drop-shadow-md"
                            />
                            <p className="font-serif tracking-widest text-sm leading-tight">
                                TRAVELERS INN
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-100/80 leading-tight">
                                Comfort. Stay. Enjoy.
                            </p>
                        </div>

                        <div className="relative z-10 space-y-4">
                            <h1 className="text-4xl font-bold leading-tight drop-shadow-sm">
                                {heading}
                            </h1>
                            <div className="w-28 h-1 rounded-full bg-white/25 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[#7FFFD4]"
                                    style={{ width: "80%" }}
                                />
                            </div>
                            <p className="text-sm text-teal-50/90 leading-relaxed max-w-xs">
                                {description}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-4 w-fit bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-3">
                            <div className="h-9 w-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-teal-300" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold leading-snug">
                                    Secure Access
                                </p>
                                <p className="text-[10px] text-teal-50/70 leading-snug">
                                    Reset links work once and
                                    <br />
                                    expire after 30 minutes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12 md:p-16">
                        {children}
                    </div>
                </div>
            </div>

            <footer
                className="pb-6 text-center"
                style={{
                    paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
                }}
            >
                <p className="text-xs text-gray-400">
                    © {new Date().getFullYear()} Travelers Inn. All rights
                    reserved.
                </p>
            </footer>
        </div>
    );
}