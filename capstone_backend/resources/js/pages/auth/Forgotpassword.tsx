// Save in: resources/js/pages/auth/ForgotPassword.tsx  (same folder as Login.tsx)
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import AuthLayout from "./Authlayout";
import FloatingInput from "./Floatinginput";
import {
    Mail,
    KeyRound,
    Loader2,
    MailCheck,
    ArrowLeft,
    Send,
} from "lucide-react";

const LOGIN_PATH = "/login";
// Must match the 60-second cooldown in AuthController::forgotPassword
const RESEND_SECONDS = 60;

export default function ForgotPassword() {
    const [email, setEmail] = useState<string>("");
    const [emailError, setEmailError] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [sent, setSent] = useState<boolean>(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);

    // resend cooldown
    useEffect(() => {
        if (secondsLeft <= 0) return;
        const t = setTimeout(() => setSecondsLeft((s: number) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [secondsLeft]);

    const requestLink = async () => {
        setError("");
        setEmailError("");

        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setEmailError("Enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email: email.trim() });
            setSent(true);
            setSecondsLeft(RESEND_SECONDS);
        } catch (err: any) {
            const status: number | undefined = err.response?.status;
            if (status === 422 && err.response?.data?.errors?.email) {
                setEmailError(err.response.data.errors.email[0]);
            } else if (status === 429) {
                setError("Too many attempts. Please wait a minute and try again.");
            } else {
                setError(
                    err.response?.data?.message ||
                        "Something went wrong. Please try again.",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        requestLink();
    };

    return (
        <AuthLayout
            heading={
                <>
                    Forgot
                    <br />
                    Password?
                </>
            }
            description="No worries. Enter your email and we'll send you a link to set a new password."
        >
            <div className="w-full max-w-sm space-y-7">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center">
                        {sent ? (
                            <MailCheck className="h-7 w-7 text-teal-600" />
                        ) : (
                            <KeyRound className="h-7 w-7 text-teal-600" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {sent ? "Check your email" : "Reset your password"}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {sent ? (
                                <>
                                    If an account exists for
                                    <br />
                                    <span className="font-medium text-gray-700 break-all">
                                        {email.trim()}
                                    </span>
                                    <br />
                                    we sent a reset link. It expires in 30
                                    minutes.
                                </>
                            ) : (
                                "Enter the email you used to register."
                            )}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {!sent ? (
                    <form onSubmit={handleSubmit} noValidate className="space-y-6">
                        <FloatingInput
                            id="email"
                            label="Email Address"
                            type="email"
                            required
                            autoComplete="email"
                            icon={<Mail className="h-4 w-4" />}
                            value={email}
                            onChange={(v: string) => {
                                setEmail(v);
                                setEmailError("");
                            }}
                            error={emailError}
                        />

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Send className="h-4 w-4" />
                                    Send reset link
                                </span>
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="text-center text-sm text-gray-600 space-y-3">
                        <p className="text-xs text-gray-500">
                            Can't find it? Check your spam folder.
                        </p>
                        {secondsLeft > 0 ? (
                            <p>
                                You can request another link in{" "}
                                <span className="font-semibold text-gray-800 tabular-nums">
                                    {secondsLeft}s
                                </span>
                            </p>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={loading}
                                onClick={requestLink}
                                className="w-full h-11 border-teal-400 text-teal-700 hover:bg-teal-50"
                            >
                                {loading ? "Sending..." : "Resend link"}
                            </Button>
                        )}
                    </div>
                )}

                <div className="text-center">
                    <a
                        href={LOGIN_PATH}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to sign in
                    </a>
                </div>
            </div>
        </AuthLayout>
    );
}