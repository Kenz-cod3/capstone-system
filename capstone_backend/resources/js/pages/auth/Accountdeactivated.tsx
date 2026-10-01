import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Phone, LogOut, ArrowRight } from "lucide-react";

interface DeactivatedState {
    email?: string;
}

// ====== Travelers Inn support contact ======
const SUPPORT_EMAIL = "lyeniatravellersinn@gmail.com";
const SUPPORT_PHONE = "09177045341";

/**
 * Shown when a login attempt succeeds on credentials but the account has
 * `is_active = false` (AuthController::adminLogin / mobileLogin return
 * 403 "Account inactive"), OR when the guest is forced out mid-session by
 * the realtime UserStatusChanged Pusher event (see GuestLayout.tsx).
 *
 * Route here with: navigate("/account-deactivated", { state: { email } })
 * Register "/account-deactivated" as a public route in App.tsx and add it
 * to AUTH_PATHS so it renders without the splash screen / offline takeover.
 */
export default function AccountDeactivated() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as DeactivatedState)?.email;

    const handleContactSupport = () => {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Account%20Access%20Question${
            email
                ? `&body=Account%20email%3A%20${encodeURIComponent(email)}`
                : ""
        }`;
    };

    const handleCallSupport = () => {
        window.location.href = `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`;
    };

    const handleBackToLogin = () => {
        localStorage.clear();
        navigate("/login", { replace: true });
    };

    return (
        <div
            className="min-h-dvh flex items-center justify-center bg-[#F7F4EF] text-[#1B2B27] antialiased px-4 sm:px-6"
            style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}
        >
            <style>{`
                .font-display { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
            `}</style>

            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl shadow-[#1B2B27]/5 border border-[#1B2B27]/6">
                <div className="p-8 sm:p-10 text-center">
                    <h1 className="font-display text-2xl sm:text-3xl leading-tight text-[#c60505] mb-3">
                        Your account is on hold
                    </h1>

                    <p className="text-[14px] text-[#1B2B27]/60 leading-relaxed mb-6 max-w-sm mx-auto">
                        Sign-in and bookings are paused for now. This is
                        usually set by our team — send us a message and
                        we'll take a look and get back to you.
                    </p>

                    {email && (
                        <p className="text-[13px] text-[#c60505]/50 mb-6">
                            Account:{" "}
                            <span className="font-medium text-[#c60505]/80">
                                {email}
                            </span>
                        </p>
                    )}

                    {/* Contact options — tappable */}
                    <div className="space-y-2.5 mb-8 text-left">
                        {/* Email row */}
                        <a
                            href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Access%20Question${
                                email
                                    ? `&body=Account%20email%3A%20${encodeURIComponent(email)}`
                                    : ""
                            }`}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#F7F4EF] border border-[#1B2B27]/8 hover:bg-white hover:border-[#1B2B27]/15 transition-colors group"
                        >
                            <div className="h-9 w-9 rounded-lg bg-white border border-[#1B2B27]/8 flex items-center justify-center flex-shrink-0 group-hover:border-[#C89B5A]/40">
                                <Mail className="h-4 w-4 text-[#1B2B27]/50 group-hover:text-[#C89B5A] transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-[#1B2B27]/40 leading-none mb-0.5">
                                    Email
                                </p>
                                <p className="text-sm font-medium text-[#1B2B27]/85 truncate">
                                    {SUPPORT_EMAIL}
                                </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#1B2B27]/25 group-hover:text-[#1B2B27]/60 transition-colors" />
                        </a>

                        {/* Phone row */}
                        <a
                            href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#F7F4EF] border border-[#1B2B27]/8 hover:bg-white hover:border-[#1B2B27]/15 transition-colors group"
                        >
                            <div className="h-9 w-9 rounded-lg bg-white border border-[#1B2B27]/8 flex items-center justify-center flex-shrink-0 group-hover:border-[#C89B5A]/40">
                                <Phone className="h-4 w-4 text-[#1B2B27]/50 group-hover:text-[#C89B5A] transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-[#1B2B27]/40 leading-none mb-0.5">
                                    Phone
                                </p>
                                <p className="text-sm font-medium text-[#1B2B27]/85 truncate">
                                    {SUPPORT_PHONE}
                                </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#1B2B27]/25 group-hover:text-[#1B2B27]/60 transition-colors" />
                        </a>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            type="button"
                            onClick={handleContactSupport}
                            className="w-full h-12 rounded-full bg-[#1B2B27] text-[#F7F4EF] font-medium text-sm hover:bg-[#C89B5A] hover:text-[#1B2B27] transition-colors duration-300 flex items-center justify-center gap-2"
                        >
                            Message Support
                            <ArrowRight className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={handleBackToLogin}
                            className="w-full h-12 rounded-full border border-[#1B2B27]/12 text-[#1B2B27]/70 font-medium text-sm hover:bg-[#F7F4EF] transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}