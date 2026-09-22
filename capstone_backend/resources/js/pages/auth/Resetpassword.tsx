// Save in: resources/js/pages/auth/ResetPassword.tsx
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
    Lock,
    Eye,
    EyeOff,
    Loader2,
    KeyRound,
    ArrowRight,
} from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";

const LOGIN_PATH = "/login";
const FORGOT_PATH = "/forgot-password";

interface ResetForm {
    password: string;
    password_confirmation: string;
}

type FieldErrors = Partial<Record<keyof ResetForm, string>>;

// ---- Floating-label input (matches Login / Register) ---------------------
interface FloatingInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    type?: string;
    required?: boolean;
    autoComplete?: string;
    error?: string;
    trailing?: React.ReactNode;
    className?: string;
}

function FloatingInput({
    id,
    label,
    value,
    onChange,
    icon,
    type = "text",
    required = false,
    autoComplete,
    error,
    trailing,
    className = "",
}: FloatingInputProps) {
    return (
        <div className={className}>
            <div className="relative">
                <input
                    id={id}
                    type={type}
                    placeholder=" "
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange(e.target.value)
                    }
                    className={`peer w-full h-12 pl-9 ${
                        trailing ? "pr-9" : "pr-3"
                    } rounded-lg border bg-white text-[#1B2B27] outline-none transition-colors focus:ring-0 ${
                        error
                            ? "border-red-400 focus:border-red-500"
                            : "border-[#1B2B27]/12 focus:border-[#C89B5A]"
                    }`}
                />
                <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${
                        error
                            ? "text-red-400"
                            : "text-[#1B2B27]/40 peer-focus:text-[#C89B5A]"
                    }`}
                >
                    {icon}
                </span>
                <label
                    htmlFor={id}
                    className={`absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-sm transition-all duration-150 pointer-events-none
                        peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs
                        ${
                            error
                                ? "text-red-400 peer-focus:text-red-500 peer-[:not(:placeholder-shown)]:text-red-400"
                                : "text-[#1B2B27]/45 peer-focus:text-[#C89B5A] peer-[:not(:placeholder-shown)]:text-[#1B2B27]/45"
                        }`}
                >
                    {label}
                    {required && " *"}
                </label>
                {trailing && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                        {trailing}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1.5 text-[11px] text-red-600">{error}</p>
            )}
        </div>
    );
}

// ---- Page -----------------------------------------------------------------
export default function ResetPassword() {
    // The emailed link looks like /reset-password?token=...&email=...
    const [{ token, email }] = useState(() => {
        const q = new URLSearchParams(window.location.search);
        return { token: q.get("token") ?? "", email: q.get("email") ?? "" };
    });

    const [form, setForm] = useState<ResetForm>({
        password: "",
        password_confirmation: "",
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [linkInvalid, setLinkInvalid] = useState<boolean>(!token || !email);
    const [done, setDone] = useState<boolean>(false);

    // --- Slideshow state (same as Login / Register) ---
    const slides: string[] = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev: number) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    const setField = (key: keyof ResetForm) => (value: string) => {
        setForm((p: ResetForm) => ({ ...p, [key]: value }));
        if (fieldErrors[key]) {
            setFieldErrors((p: FieldErrors) => ({ ...p, [key]: undefined }));
        }
    };

    const validate = (): FieldErrors => {
        const e: FieldErrors = {};
        if (form.password.length < 8)
            e.password = "Password must be at least 8 characters.";
        if (form.password !== form.password_confirmation)
            e.password_confirmation = "Passwords do not match.";
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const errs = validate();
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setLoading(true);
        try {
            await api.post("/auth/reset-password", {
                email,
                token,
                password: form.password,
                password_confirmation: form.password_confirmation,
            });
            setDone(true);
        } catch (err: any) {
            const status: number | undefined = err.response?.status;
            const data = err.response?.data;

            if (status === 400) {
                setLinkInvalid(true);
            } else if (status === 422 && data?.errors) {
                setFieldErrors({
                    password: data.errors.password?.[0],
                    password_confirmation:
                        data.errors.password_confirmation?.[0],
                });
                setError("Please fix the highlighted fields.");
            } else if (status === 429) {
                setError(
                    "Too many attempts. Please wait a minute and try again.",
                );
            } else {
                setError(data?.message || "Could not reset your password.");
            }
        } finally {
            setLoading(false);
        }
    };

    const eyeButton = (visible: boolean, toggle: () => void) => (
        <button
            type="button"
            onClick={toggle}
            className="text-[#1B2B27]/40 hover:text-[#1B2B27] transition-colors"
            aria-label={visible ? "Hide password" : "Show password"}
        >
            {visible ? (
                <EyeOff className="h-4 w-4" />
            ) : (
                <Eye className="h-4 w-4" />
            )}
        </button>
    );

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
                                Est. 2019 · Alubijid
                            </span>
                        </div>

                        <div className="relative z-10 space-y-5">
                            <h1 className="font-display text-4xl lg:text-5xl leading-[1.05] text-white">
                                A fresh
                                <br />
                                start,{" "}
                                <em className="italic font-normal text-[#C89B5A]">
                                    renewed
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

                        <div className="relative z-10 flex items-center gap-4 w-fit bg-white/8 backdrop-blur-md border border-white/15 rounded-xl px-5 py-3">
                            <div className="h-9 w-9 rounded-lg bg-[#C89B5A]/20 flex items-center justify-center shrink-0">
                                <KeyRound className="h-5 w-5 text-[#C89B5A]" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold leading-snug">
                                    Secure reset
                                </p>
                                <p className="text-[10px] text-white/60 leading-snug">
                                    Links work once and expire
                                    <br />
                                    after 30 minutes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12 lg:p-14">
                        <div className="w-full max-w-sm space-y-6 animate-fade-up">
                            {/* ---- Heading: swaps on state ---- */}
                            {done ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-[#C89B5A]" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                            Success
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Password
                                        <br />
                                        updated.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        You've been signed out on all devices.
                                        Sign in with your new password.
                                    </p>
                                </div>
                            ) : linkInvalid ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-red-400" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-red-500 font-medium">
                                            Link invalid
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Link expired
                                        <br />
                                        or invalid.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        Reset links work once and expire after
                                        30 minutes.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-[#C89B5A]" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                            Reset password
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Set a new
                                        <br />
                                        password.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        Choose a new password for{" "}
                                        <span className="font-medium text-[#1B2B27] break-all">
                                            {email}
                                        </span>
                                    </p>
                                </div>
                            )}

                            {/* ---- Body ---- */}
                            {done ? (
                                <a href={LOGIN_PATH} className="block pt-2">
                                    <button
                                        type="button"
                                        className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        Go to sign in
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </a>
                            ) : linkInvalid ? (
                                <a href={FORGOT_PATH} className="block pt-2">
                                    <button
                                        type="button"
                                        className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        Request a new link
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </a>
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

                                    <FloatingInput
                                        id="password"
                                        label="New Password"
                                        required
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        autoComplete="new-password"
                                        icon={<Lock className="h-4 w-4" />}
                                        value={form.password}
                                        onChange={setField("password")}
                                        error={fieldErrors.password}
                                        trailing={eyeButton(
                                            showPassword,
                                            () =>
                                                setShowPassword(
                                                    (s: boolean) => !s,
                                                ),
                                        )}
                                    />

                                    <FloatingInput
                                        id="password_confirmation"
                                        label="Confirm New Password"
                                        required
                                        type={showConfirm ? "text" : "password"}
                                        autoComplete="new-password"
                                        icon={<Lock className="h-4 w-4" />}
                                        value={form.password_confirmation}
                                        onChange={setField(
                                            "password_confirmation",
                                        )}
                                        error={
                                            fieldErrors.password_confirmation
                                        }
                                        trailing={eyeButton(
                                            showConfirm,
                                            () =>
                                                setShowConfirm(
                                                    (s: boolean) => !s,
                                                ),
                                        )}
                                    />

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                Reset password
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
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