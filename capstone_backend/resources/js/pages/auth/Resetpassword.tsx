// Save in: resources/js/pages/auth/ResetPassword.tsx  (same folder as Login.tsx)
import React, { useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import AuthLayout from "./Authlayout";
import FloatingInput from "./Floatinginput";
import {
    Lock,
    Eye,
    EyeOff,
    Loader2,
    KeyRound,
    CheckCircle2,
    ShieldCheck,
    Link2Off,
} from "lucide-react";

const LOGIN_PATH = "/login";
const FORGOT_PATH = "/forgot-password";

interface ResetForm {
    password: string;
    password_confirmation: string;
}

type FieldErrors = Partial<Record<keyof ResetForm, string>>;

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
                // invalid / expired / already-used link
                setLinkInvalid(true);
            } else if (status === 422 && data?.errors) {
                setFieldErrors({
                    password: data.errors.password?.[0],
                    password_confirmation: data.errors.password_confirmation?.[0],
                });
                setError("Please fix the highlighted fields.");
            } else if (status === 429) {
                setError("Too many attempts. Please wait a minute and try again.");
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
            className="text-gray-400 hover:text-gray-600"
            aria-label={visible ? "Hide password" : "Show password"}
        >
            {visible ? (
                <EyeOff className="h-4 w-4" />
            ) : (
                <Eye className="h-4 w-4" />
            )}
        </button>
    );

    // ---- which state to show: form / success / invalid link ----
    let icon = <KeyRound className="h-7 w-7 text-teal-600" />;
    let iconBg = "bg-teal-100";
    let title = "Set a new password";
    let subtitle: React.ReactNode = (
        <>
            Choose a new password for
            <br />
            <span className="font-medium text-gray-700 break-all">{email}</span>
        </>
    );

    if (done) {
        icon = <CheckCircle2 className="h-7 w-7 text-teal-600" />;
        title = "Password updated";
        subtitle = "You've been signed out on all devices. Sign in with your new password.";
    } else if (linkInvalid) {
        icon = <Link2Off className="h-7 w-7 text-red-500" />;
        iconBg = "bg-red-50";
        title = "Link expired or invalid";
        subtitle = "Reset links work once and expire after 30 minutes.";
    }

    return (
        <AuthLayout
            heading={
                <>
                    Reset
                    <br />
                    Password
                </>
            }
            description="Choose a new password to get back into your Travelers Inn account."
        >
            <div className="w-full max-w-sm space-y-7">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div
                        className={`h-16 w-16 rounded-full flex items-center justify-center ${iconBg}`}
                    >
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {title}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    </div>
                </div>

                {done ? (
                    <a href={LOGIN_PATH} className="block">
                        <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md">
                            Go to sign in
                        </Button>
                    </a>
                ) : linkInvalid ? (
                    <a href={FORGOT_PATH} className="block">
                        <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md">
                            Request a new link
                        </Button>
                    </a>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <FloatingInput
                            id="password"
                            label="New Password"
                            required
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            icon={<Lock className="h-4 w-4" />}
                            value={form.password}
                            onChange={setField("password")}
                            error={fieldErrors.password}
                            trailing={eyeButton(showPassword, () =>
                                setShowPassword((s: boolean) => !s),
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
                            onChange={setField("password_confirmation")}
                            error={fieldErrors.password_confirmation}
                            trailing={eyeButton(showConfirm, () =>
                                setShowConfirm((s: boolean) => !s),
                            )}
                        />

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Reset password
                                </span>
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}