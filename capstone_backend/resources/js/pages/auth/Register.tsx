import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
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
    UserPlus,
    MailCheck,
    ArrowLeft,
} from "lucide-react";
import login from "../../../images/login.png";
import login1 from "../../../images/login1.png";
import loginLogo from "../../../images/loginLogo.png";

// ---- Config ---------------------------------------------------------------
const OTP_LENGTH = 6;
// Must match ->addSeconds(100) in AuthController::sendOtpEmail
const OTP_SECONDS = 100;
// Where a guest lands after verifying. Login.tsx uses "/guest-dashboard" after
// login but "/guest" in its session check — change this to whichever is right.
const GUEST_HOME = "/guest-dashboard";
// Change if your login route is different.
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

// seconds left until the server's expires_at (clamped to 0..OTP_SECONDS)
const secondsUntil = (iso?: string): number => {
    if (!iso) return OTP_SECONDS;
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 1000);
    if (Number.isNaN(diff)) return OTP_SECONDS;
    return Math.min(Math.max(diff, 0), OTP_SECONDS);
};

const formatTime = (s: number): string =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Laravel 422 → { field: ["msg", ...] }  →  { field: "msg" }
const mapServerErrors = (errors: Record<string, string[]>): FieldErrors => {
    const out: FieldErrors = {};
    (Object.keys(errors) as Array<keyof RegisterForm>).forEach((k) => {
        out[k] = errors[k]?.[0];
    });
    return out;
};

// ---- Floating-label input (same look as Login.tsx) --------------------------
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
                {/* input comes first so peer-* classes on siblings work */}
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
                    } rounded-lg border bg-white text-gray-900 outline-none transition-colors focus:ring-0 ${
                        error
                            ? "border-red-400 focus:border-red-500"
                            : "border-gray-300 focus:border-teal-400"
                    }`}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-teal-500 z-10 pointer-events-none">
                    {icon}
                </span>
                <label
                    htmlFor={id}
                    className="absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-gray-400 text-sm transition-all duration-150 pointer-events-none
                        peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-teal-500
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
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
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

// ---- Page -------------------------------------------------------------------
export default function Register() {
    // Login.tsx sends unverified guests here as /register?verify=<email>
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

    // OTP state
    const [otp, setOtp] = useState<string[]>(emptyOtp());
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    // --- Slideshow state (same as Login.tsx) ---
    const slides: string[] = [login, login1];
    const SLIDE_DURATION = 20000;
    const [slideIndex, setSlideIndex] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSlideIndex((prev: number) => (prev + 1) % slides.length);
        }, SLIDE_DURATION);
        return () => clearInterval(interval);
    }, [slides.length]);

    // OTP countdown (also the resend lock — the backend refuses a resend
    // until the current code has expired)
    useEffect(() => {
        if (step !== "otp" || secondsLeft <= 0) return;
        const t = setTimeout(() => setSecondsLeft((s: number) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [step, secondsLeft]);

    // focus the first OTP box when the step opens
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

    // --- Step 1: register ---------------------------------------------------
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
                // unverified account with a code that's still valid
                goToOtp(
                    secondsUntil(data.expires_at),
                    "A code was already sent to this email. Enter it below.",
                );
            } else if (status === 502 && data?.email) {
                // account saved, email failed → let them resend right away
                goToOtp(0, data.message, true);
            } else {
                setError(data?.message || "Registration failed");
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Step 2: verify OTP -------------------------------------------------
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

            // same storage shape as Login.tsx
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
                // current code still active
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

    // ---- UI ----------------------------------------------------------------
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
                                Welcome,
                                <br />
                                Guest!
                            </h1>
                            <div className="w-28 h-1 rounded-full bg-white/25 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[#7FFFD4]"
                                    style={{ width: "80%" }}
                                />
                            </div>
                            <p className="text-sm text-teal-50/90 leading-relaxed max-w-xs">
                                Create a guest account to manage your stays with
                                Travelers Inn. It only takes a minute.
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-4 w-fit bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-3">
                            <div className="h-9 w-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-teal-300" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold leading-snug">
                                    Verified Accounts
                                </p>
                                <p className="text-[10px] text-teal-50/70 leading-snug">
                                    We confirm your email with
                                    <br />a one-time code.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FORM PANEL */}
                    <div className="flex items-center justify-center p-8 sm:p-12">
                        {step === "form" ? (
                            /* ---------- STEP 1: REGISTER FORM ---------- */
                            <form
                                onSubmit={handleRegister}
                                noValidate
                                className="w-full max-w-md space-y-6"
                            >
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center">
                                        <UserPlus className="h-7 w-7 text-teal-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            Create your account
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Register as a guest to get started
                                        </p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
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
                                        type={showPassword ? "text" : "password"}
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
                                                className="text-gray-400 hover:text-gray-600"
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
                                        type={showConfirm ? "text" : "password"}
                                        autoComplete="new-password"
                                        icon={<Lock className="h-4 w-4" />}
                                        value={form.password_confirmation}
                                        onChange={setField(
                                            "password_confirmation",
                                        )}
                                        error={fieldErrors.password_confirmation}
                                        trailing={
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowConfirm(
                                                        (s: boolean) => !s,
                                                    )
                                                }
                                                className="text-gray-400 hover:text-gray-600"
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

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Creating account...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <UserPlus className="h-4 w-4" />
                                            Create Account
                                        </span>
                                    )}
                                </Button>

                                <p className="text-center text-sm text-gray-600">
                                    Already have an account?{" "}
                                    <a
                                        href={LOGIN_PATH}
                                        className="font-semibold text-teal-600 hover:text-teal-700"
                                    >
                                        Sign in
                                    </a>
                                </p>
                            </form>
                        ) : (
                            /* ---------- STEP 2: VERIFY OTP ---------- */
                            <form
                                onSubmit={handleVerify}
                                className="w-full max-w-sm space-y-7"
                            >
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center">
                                        <MailCheck className="h-7 w-7 text-teal-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            Verify your email
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Enter the {OTP_LENGTH}-digit code
                                            sent to
                                            <br />
                                            <span className="font-medium text-gray-700 break-all">
                                                {form.email}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                                        {error}
                                    </div>
                                )}
                                {info && (
                                    <div className="bg-teal-50 border-l-4 border-teal-500 text-teal-800 p-3 rounded-md text-sm">
                                        {info}
                                    </div>
                                )}

                                <div className="flex justify-center gap-2 sm:gap-3">
                                    {otp.map((digit: string, i: number) => (
                                        <input
                                            key={i}
                                            ref={(el: HTMLInputElement | null) => {
                                                otpRefs.current[i] = el;
                                            }}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete={
                                                i === 0 ? "one-time-code" : "off"
                                            }
                                            maxLength={1}
                                            value={digit}
                                            aria-label={`Digit ${i + 1}`}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(
                                                e: React.KeyboardEvent<HTMLInputElement>,
                                            ) => handleOtpKeyDown(i, e)}
                                            onPaste={handleOtpPaste}
                                            onFocus={(
                                                e: React.FocusEvent<HTMLInputElement>,
                                            ) => e.target.select()}
                                            className="h-12 w-10 sm:h-14 sm:w-12 text-center text-xl font-semibold rounded-lg border border-gray-300 bg-white text-gray-900 outline-none transition-colors focus:border-teal-400 focus:ring-0"
                                        />
                                    ))}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || code.length < OTP_LENGTH}
                                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Verifying...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <ShieldCheck className="h-4 w-4" />
                                            Verify Email
                                        </span>
                                    )}
                                </Button>

                                <div className="text-center text-sm text-gray-600 space-y-3">
                                    {secondsLeft > 0 ? (
                                        <p>
                                            Code expires in{" "}
                                            <span className="font-semibold text-gray-800 tabular-nums">
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
                                                className="font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-60"
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
                                        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
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