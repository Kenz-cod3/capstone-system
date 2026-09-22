import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    Phone,
    MapPin,
    ShieldCheck,
    Loader2,
    MailCheck,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";

// ---- Config ---------------------------------------------------------------
const OTP_LENGTH = 6;
const OTP_SECONDS = 100;
const GUEST_HOME = "/guest-dashboard";
const LOGIN_PATH = "/login";

// ---- Types ----------------------------------------------------------------
type Step = "form" | "otp";

interface RegisterForm {
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    contact_number: string;
    address: string;
    password: string;
    password_confirmation: string;
}

type FieldErrors = Partial<Record<keyof RegisterForm, string>>;

interface VerifyResponse {
    message: string;
    user: { role: string; [key: string]: unknown };
    token: string;
}

const emptyForm: RegisterForm = {
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    address: "",
    password: "",
    password_confirmation: "",
};

const emptyOtp = (): string[] => Array(OTP_LENGTH).fill("");

const secondsUntil = (iso?: string): number => {
    if (!iso) return OTP_SECONDS;
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 1000);
    if (Number.isNaN(diff)) return OTP_SECONDS;
    return Math.min(Math.max(diff, 0), OTP_SECONDS);
};

const formatTime = (s: number): string =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const mapServerErrors = (errors: Record<string, string[]>): FieldErrors => {
    const out: FieldErrors = {};
    (Object.keys(errors) as Array<keyof RegisterForm>).forEach((k) => {
        out[k] = errors[k]?.[0];
    });
    return out;
};

// ---- Floating-label input (editorial style) ------------------------------
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

// ---- Page -------------------------------------------------------------------
export default function Register() {
    const [verifyEmail] = useState<string | null>(() =>
        new URLSearchParams(window.location.search).get("verify"),
    );

    const [step, setStep] = useState<Step>(verifyEmail ? "otp" : "form");
    const [form, setForm] = useState<RegisterForm>({
        ...emptyForm,
        email: verifyEmail ?? "",
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [resending, setResending] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [info, setInfo] = useState<string>("");

    const [otp, setOtp] = useState<string[]>(emptyOtp());
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    // Slideshow
    const slides: string[] = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev: number) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    useEffect(() => {
        if (step !== "otp" || secondsLeft <= 0) return;
        const t = setTimeout(() => setSecondsLeft((s: number) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [step, secondsLeft]);

    useEffect(() => {
        if (step === "otp") otpRefs.current[0]?.focus();
    }, [step]);

    const setField = (key: keyof RegisterForm) => (value: string) => {
        setForm((p: RegisterForm) => ({ ...p, [key]: value }));
        if (fieldErrors[key]) {
            setFieldErrors((p: FieldErrors) => ({ ...p, [key]: undefined }));
        }
    };

    const validate = (): FieldErrors => {
        const e: FieldErrors = {};
        if (!form.first_name.trim()) e.first_name = "First name is required.";
        if (!form.last_name.trim()) e.last_name = "Last name is required.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
            e.email = "Enter a valid email address.";
        if (form.password.length < 8)
            e.password = "Password must be at least 8 characters.";
        if (form.password !== form.password_confirmation)
            e.password_confirmation = "Passwords do not match.";
        return e;
    };

    const goToOtp = (seconds: number, message?: string, isError = false) => {
        setOtp(emptyOtp());
        setSecondsLeft(seconds);
        setStep("otp");
        setError(isError && message ? message : "");
        setInfo(!isError && message ? message : "");
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");

        const errs = validate();
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setLoading(true);
        try {
            await api.post("/auth/register", {
                first_name: form.first_name.trim(),
                middle_name: form.middle_name.trim() || null,
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                contact_number: form.contact_number.trim() || null,
                address: form.address.trim() || null,
                password: form.password,
                password_confirmation: form.password_confirmation,
            });
            goToOtp(OTP_SECONDS, "We sent a 6-digit code to your email.");
        } catch (err: any) {
            const status: number | undefined = err.response?.status;
            const data = err.response?.data;

            if (status === 422 && data?.errors) {
                setFieldErrors(mapServerErrors(data.errors));
                setError("Please fix the highlighted fields.");
            } else if (status === 429 && data?.email) {
                goToOtp(
                    secondsUntil(data.expires_at),
                    "A code was already sent to this email. Enter it below.",
                );
            } else if (status === 502 && data?.email) {
                goToOtp(0, data.message, true);
            } else {
                setError(data?.message || "Registration failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (i: number, raw: string) => {
        const d = raw.replace(/\D/g, "").slice(-1);
        setOtp((prev: string[]) => {
            const next = [...prev];
            next[i] = d;
            return next;
        });
        if (d && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
    };

    const handleOtpKeyDown = (
        i: number,
        e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) {
            otpRefs.current[i - 1]?.focus();
        } else if (e.key === "ArrowLeft" && i > 0) {
            otpRefs.current[i - 1]?.focus();
        } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
            otpRefs.current[i + 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const digits = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH);
        if (!digits) return;
        const next = emptyOtp();
        digits.split("").forEach((d: string, k: number) => {
            next[k] = d;
        });
        setOtp(next);
        otpRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
    };

    const code = otp.join("");

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length < OTP_LENGTH) {
            setError(`Enter the ${OTP_LENGTH}-digit code.`);
            return;
        }

        setLoading(true);
        setError("");
        setInfo("");

        try {
            const res = await api.post<VerifyResponse>("/auth/verify-otp", {
                email: form.email.trim(),
                otp: code,
            });

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.setItem("user", JSON.stringify(res.data.user));
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("role", res.data.user.role);

            window.location.replace(GUEST_HOME);
        } catch (err: any) {
            setError(err.response?.data?.message || "Verification failed");
            setOtp(emptyOtp());
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError("");
        setInfo("");

        try {
            await api.post("/auth/resend-otp", { email: form.email.trim() });
            setOtp(emptyOtp());
            setSecondsLeft(OTP_SECONDS);
            setInfo("A new code has been sent to your email.");
            otpRefs.current[0]?.focus();
        } catch (err: any) {
            const status: number | undefined = err.response?.status;
            const data = err.response?.data;

            if (status === 429 && data?.expires_at) {
                setSecondsLeft(secondsUntil(data.expires_at));
                setInfo("Your current code is still valid.");
            } else if (status === 502) {
                setSecondsLeft(0);
                setError(data?.message || "Could not send the email.");
            } else {
                setError(
                    data?.message ||
                        "Could not resend the code. Please try again.",
                );
            }
        } finally {
            setResending(false);
        }
    };

    // ---- UI -----------------------------------------------------------------
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
                                Join us for
                                <br />
                                your next{" "}
                                <em className="italic font-normal text-[#C89B5A]">
                                    stay
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
                                <ShieldCheck className="h-5 w-5 text-[#C89B5A]" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold leading-snug">
                                    Verified accounts
                                </p>
                                <p className="text-[10px] text-white/60 leading-snug">
                                    We confirm your email with
                                    <br />a one-time code.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12 lg:p-14">
                        {step === "form" ? (
                            <form
                                onSubmit={handleRegister}
                                noValidate
                                className="w-full max-w-md space-y-6 animate-fade-up"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-[#C89B5A]" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                            Create account
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Start your
                                        <br />
                                        journey with us.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        Register as a guest to manage your
                                        stays with Travelers Inn.
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-l-2 border-red-400 text-red-700 p-3 rounded-md text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                                    <FloatingInput
                                        id="first_name"
                                        label="First Name"
                                        required
                                        autoComplete="given-name"
                                        icon={<User className="h-4 w-4" />}
                                        value={form.first_name}
                                        onChange={setField("first_name")}
                                        error={fieldErrors.first_name}
                                    />
                                    <FloatingInput
                                        id="last_name"
                                        label="Last Name"
                                        required
                                        autoComplete="family-name"
                                        icon={<User className="h-4 w-4" />}
                                        value={form.last_name}
                                        onChange={setField("last_name")}
                                        error={fieldErrors.last_name}
                                    />
                                    <FloatingInput
                                        id="middle_name"
                                        label="Middle Name (optional)"
                                        autoComplete="additional-name"
                                        icon={<User className="h-4 w-4" />}
                                        value={form.middle_name}
                                        onChange={setField("middle_name")}
                                        error={fieldErrors.middle_name}
                                    />
                                    <FloatingInput
                                        id="contact_number"
                                        label="Contact Number (optional)"
                                        type="tel"
                                        autoComplete="tel"
                                        icon={<Phone className="h-4 w-4" />}
                                        value={form.contact_number}
                                        onChange={setField("contact_number")}
                                        error={fieldErrors.contact_number}
                                    />
                                    <FloatingInput
                                        id="email"
                                        label="Email Address"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        icon={<Mail className="h-4 w-4" />}
                                        value={form.email}
                                        onChange={setField("email")}
                                        error={fieldErrors.email}
                                        className="sm:col-span-2"
                                    />
                                    <FloatingInput
                                        id="address"
                                        label="Address (optional)"
                                        autoComplete="street-address"
                                        icon={<MapPin className="h-4 w-4" />}
                                        value={form.address}
                                        onChange={setField("address")}
                                        error={fieldErrors.address}
                                        className="sm:col-span-2"
                                    />
                                    <FloatingInput
                                        id="password"
                                        label="Password"
                                        required
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        autoComplete="new-password"
                                        icon={<Lock className="h-4 w-4" />}
                                        value={form.password}
                                        onChange={setField("password")}
                                        error={fieldErrors.password}
                                        trailing={
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (s: boolean) => !s,
                                                    )
                                                }
                                                className="text-[#1B2B27]/40 hover:text-[#1B2B27] transition-colors"
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
                                        }
                                    />
                                    <FloatingInput
                                        id="password_confirmation"
                                        label="Confirm Password"
                                        required
                                        type={
                                            showConfirm ? "text" : "password"
                                        }
                                        autoComplete="new-password"
                                        icon={<Lock className="h-4 w-4" />}
                                        value={form.password_confirmation}
                                        onChange={setField(
                                            "password_confirmation",
                                        )}
                                        error={
                                            fieldErrors.password_confirmation
                                        }
                                        trailing={
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowConfirm(
                                                        (s: boolean) => !s,
                                                    )
                                                }
                                                className="text-[#1B2B27]/40 hover:text-[#1B2B27] transition-colors"
                                                aria-label={
                                                    showConfirm
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showConfirm ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        }
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        <>
                                            Create account
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-[13px] text-[#1B2B27]/60">
                                    Already have an account?{" "}
                                    <a
                                        href={LOGIN_PATH}
                                        className="font-medium text-[#1B2B27] underline decoration-[#C89B5A] decoration-2 underline-offset-4 hover:text-[#C89B5A] transition-colors"
                                    >
                                        Sign in
                                    </a>
                                </p>
                            </form>
                        ) : (
                            <form
                                onSubmit={handleVerify}
                                className="w-full max-w-sm space-y-6 animate-fade-up"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-px w-8 bg-[#C89B5A]" />
                                        <span className="text-[11px] tracking-[0.24em] uppercase text-[#C89B5A] font-medium">
                                            Verify email
                                        </span>
                                    </div>
                                    <h2 className="font-display text-3xl lg:text-4xl leading-tight text-[#1B2B27]">
                                        Check your
                                        <br />
                                        inbox.
                                    </h2>
                                    <p className="text-[14px] text-[#1B2B27]/55 leading-relaxed">
                                        Enter the {OTP_LENGTH}-digit code sent
                                        to{" "}
                                        <span className="font-medium text-[#1B2B27] break-all">
                                            {form.email}
                                        </span>
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-l-2 border-red-400 text-red-700 p-3 rounded-md text-sm">
                                        {error}
                                    </div>
                                )}
                                {info && (
                                    <div className="bg-[#C89B5A]/10 border-l-2 border-[#C89B5A] text-[#1B2B27] p-3 rounded-md text-sm">
                                        {info}
                                    </div>
                                )}

                                <div className="flex justify-center gap-2 sm:gap-2.5">
                                    {otp.map((digit: string, i: number) => (
                                        <input
                                            key={i}
                                            ref={(
                                                el: HTMLInputElement | null,
                                            ) => {
                                                otpRefs.current[i] = el;
                                            }}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete={
                                                i === 0
                                                    ? "one-time-code"
                                                    : "off"
                                            }
                                            maxLength={1}
                                            value={digit}
                                            aria-label={`Digit ${i + 1}`}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) =>
                                                handleOtpChange(
                                                    i,
                                                    e.target.value,
                                                )
                                            }
                                            onKeyDown={(
                                                e: React.KeyboardEvent<HTMLInputElement>,
                                            ) => handleOtpKeyDown(i, e)}
                                            onPaste={handleOtpPaste}
                                            onFocus={(
                                                e: React.FocusEvent<HTMLInputElement>,
                                            ) => e.target.select()}
                                            className="h-12 w-10 sm:h-14 sm:w-11 text-center text-xl font-semibold rounded-lg border border-[#1B2B27]/12 bg-white text-[#1B2B27] outline-none transition-colors focus:border-[#C89B5A] focus:ring-0"
                                        />
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        loading || code.length < OTP_LENGTH
                                    }
                                    className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Verify email
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>

                                <div className="text-center text-[13px] text-[#1B2B27]/60 space-y-3">
                                    {secondsLeft > 0 ? (
                                        <p>
                                            Code expires in{" "}
                                            <span className="font-semibold text-[#1B2B27] tabular-nums">
                                                {formatTime(secondsLeft)}
                                            </span>
                                        </p>
                                    ) : (
                                        <p>
                                            Didn't get a code, or it expired?{" "}
                                            <button
                                                type="button"
                                                onClick={handleResend}
                                                disabled={resending}
                                                className="font-medium text-[#1B2B27] underline decoration-[#C89B5A] decoration-2 underline-offset-4 hover:text-[#C89B5A] disabled:opacity-60 transition-colors"
                                            >
                                                {resending
                                                    ? "Sending..."
                                                    : "Resend code"}
                                            </button>
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setInfo("");
                                            setStep("form");
                                        }}
                                        className="inline-flex items-center gap-1 text-[#1B2B27]/60 hover:text-[#1B2B27] transition-colors"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        Back to registration
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* <footer
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