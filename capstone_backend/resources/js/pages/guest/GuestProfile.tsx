import React, { useEffect, useRef, useState } from "react";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Edit2,
    Save,
    X,
    Camera,
    Shield,
    Lock,
    Loader2,
    Settings,
    Bell,
    ChevronRight,
    Headphones,
    Check,
    Mail as MailIcon,
} from "lucide-react";

// Same axios instance the rest of the web app uses (mirrors the mobile
// app's "@/services/api"). Adjust the relative path if your api.ts lives
// somewhere else in this project.
import api from "../../services/api";

interface AuthUser {
    id: number;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    contact_number?: string;
    address?: string;
    role?: string;
    profile_image?: string | null;
    // Appended automatically by the Laravel model ($appends = ['avatar_url']).
    // Already resolves to a full URL (asset('storage/...') or the raw value
    // if profile_image was already a full URL) — no need to build it manually.
    avatar_url?: string | null;
}

// Laravel validation errors come back as { field: string[] }. Type it
// explicitly so TS doesn't collapse the `|| {}` fallback down to `{}`
// (which has no index signature and throws TS7053 on `Object.values(...)[0]`).
type LaravelValidationErrors = Record<string, string[]>;

const getFirstValidationError = (err: any): string | null => {
    const errors: LaravelValidationErrors | undefined =
        err?.response?.data?.errors;
    if (!errors) return null;
    const firstField = Object.values(errors)[0];
    return firstField?.[0] ?? null;
};

// Mirrors mobile's formatPHNumber — 09XXXXXXXXX -> +63 XXX XXX XXXX
const formatPHNumber = (num?: string | null) => {
    if (!num) return "N/A";
    const clean = num.replace(/\D/g, "");
    if (clean.length !== 11 || !clean.startsWith("09")) return num;
    const formatted = clean.replace(/^0/, "+63");
    return formatted.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
};

// TODO: point these at wherever your notification-preferences and
// privacy-settings screens/modals actually live. Left as simple
// placeholders since neither existed in the original component.
const NOOP = () => {};

export default function GuestProfile() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        contact_number: "",
        address: "",
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Change password (separate section — different endpoint) ──
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const passwordSectionRef = useRef<HTMLDivElement>(null);
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
    });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // ── Fetch logged-in user: GET /user ──
    const fetchUser = async () => {
        try {
            setLoading(true);
            const res = await api.get("/user");
            const data: AuthUser = res.data;
            setUser(data);
            setFormData({
                first_name: data.first_name || "",
                middle_name: data.middle_name || "",
                last_name: data.last_name || "",
                email: data.email || "",
                contact_number: data.contact_number || "",
                address: data.address || "",
            });
        } catch (err) {
            console.log("PROFILE ERROR:", err);
            setError("Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleCancel = () => {
        if (!user) return;
        setFormData({
            first_name: user.first_name || "",
            middle_name: user.middle_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            contact_number: user.contact_number || "",
            address: user.address || "",
        });
        setImageFile(null);
        setImagePreview(null);
        setError(null);
        setIsEditing(false);
    };

    // ── Save profile: PUT /users/{id} (method-spoofed via POST + _method) ──
    // Method spoofing is required because Laravel doesn't parse multipart
    // form-data on true PUT requests.
    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setError(null);

        try {
            const payload = new FormData();
            payload.append("first_name", formData.first_name);
            payload.append("middle_name", formData.middle_name);
            payload.append("last_name", formData.last_name);
            payload.append("email", formData.email);
            payload.append("contact_number", formData.contact_number);
            // NOTE: only persists once 'address' => 'nullable|string|max:500'
            // is added to UserController@update's validate() array — right
            // now the controller silently drops any field not in $validated.
            payload.append("address", formData.address);
            if (imageFile) payload.append("profile_image", imageFile);
            payload.append("_method", "PUT");

            const res = await api.post(`/users/${user.id}`, payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setUser(res.data.data);
            setImageFile(null);
            setImagePreview(null);
            setIsEditing(false);
        } catch (err: any) {
            console.log("SAVE PROFILE ERROR:", err);
            const message =
                getFirstValidationError(err) ||
                err?.response?.data?.message ||
                "Failed to update profile.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    // ── Change password: POST /change-password ──
    const handlePasswordChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handlePasswordSave = async () => {
        setPasswordError(null);
        setPasswordSuccess(false);

        if (passwordData.new_password !== passwordData.new_password_confirmation) {
            setPasswordError("New password confirmation does not match.");
            return;
        }
        if (passwordData.new_password.length < 8) {
            setPasswordError("New password must be at least 8 characters.");
            return;
        }

        setPasswordSaving(true);
        try {
            await api.post("/change-password", {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
            });
            setPasswordSuccess(true);
            setPasswordData({
                current_password: "",
                new_password: "",
                new_password_confirmation: "",
            });
            setTimeout(() => {
                setShowPasswordForm(false);
                setPasswordSuccess(false);
            }, 1500);
        } catch (err: any) {
            console.log("CHANGE PASSWORD ERROR:", err);
            setPasswordError(
                err?.response?.data?.message || "Failed to change password.",
            );
        } finally {
            setPasswordSaving(false);
        }
    };

    const openPasswordForm = () => {
        setShowPasswordForm(true);
        // Scroll the (now-visible) password section into view since it's
        // opened from the sidebar, which may be far from the card itself.
        setTimeout(
            () =>
                passwordSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                }),
            50,
        );
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1a4a35] animate-spin mb-4" />
                <p className="text-[#1a4a35]/60 text-sm">Loading profile…</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <p className="text-gray-500">Unable to load profile.</p>
            </div>
        );
    }

    const fullName =
        user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
    const role = user.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Guest";
    const avatarSrc = imagePreview ? imagePreview : user.avatar_url || null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1
                        className="text-3xl font-bold text-[#0d2e1f]"
                        style={{ fontFamily: "Georgia" }}
                    >
                        My Profile
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage your personal information
                    </p>
                </div>
                {/* Decorative quote — purely visual, mirrors the mockup's
                    top-right tagline on wide screens. */}
                <p
                    className="hidden xl:block text-right text-[#1a4a35]/70 text-lg italic max-w-xs"
                    style={{ fontFamily: "Georgia" }}
                >
                    "A more comfortable you, every stay."
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT: MAIN PROFILE CARD ── */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {error && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Cover Photo — actual interior shot with the inn's
                            logo overlaid, like the reference mockup. Swap the
                            backgroundImage URL for your own hotel photo asset
                            (e.g. import coverPhoto from "../../images/..."). */}
                        <div
                            className="h-32 relative bg-cover bg-center"
                            style={{
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(13,46,31,0.55) 0%, rgba(13,46,31,0.75) 100%), url('https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=1200&auto=format&fit=crop')",
                            }}
                        >
                            {/* Logo + brand wordmark overlay */}
                            <div className="absolute inset-0 flex items-center justify-end pr-10">
                                <div className="hidden sm:flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full border-2 border-[#c9a96e]/60 flex items-center justify-center shrink-0">
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="w-6 h-6 text-[#c9a96e]"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <path
                                                d="M3 11.5 12 4l9 7.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="text-right leading-tight">
                                        <p
                                            className="text-[#c9a96e] font-bold text-sm"
                                            style={{
                                                fontFamily:
                                                    "Playfair Display, Georgia",
                                            }}
                                        >
                                            Lyn Enia's Traveler's Inn
                                        </p>
                                        <p className="text-white/70 text-[10px] uppercase tracking-widest">
                                            Your Home Away From Home
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -bottom-12 left-8">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-[#c9a96e]/20 border-4 border-white flex items-center justify-center overflow-hidden">
                                        {avatarSrc ? (
                                            <img
                                                src={avatarSrc}
                                                alt={fullName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-12 h-12 text-[#c9a96e]" />
                                        )}
                                    </div>
                                    {isEditing && (
                                        <>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png"
                                                onChange={handleImagePick}
                                                className="hidden"
                                            />
                                            <button
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                className="absolute bottom-0 right-0 p-1.5 bg-[#c9a96e] rounded-full border-2 border-white hover:bg-[#d9bb84] transition-colors"
                                            >
                                                <Camera className="w-3 h-3 text-[#0d2e1f]" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Profile Content */}
                        <div className="pt-16 px-8 pb-8">
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2
                                            className="text-2xl font-bold text-[#0d2e1f] leading-none"
                                            style={{ fontFamily: "Georgia" }}
                                        >
                                            {fullName || "No Name"}
                                        </h2>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium whitespace-nowrap">
                                            <Shield className="w-3 h-3" />
                                            Verified Account
                                        </span>
                                    </div>
                                    <p className="text-gray-500 mt-1">{role}</p>
                                </div>
                                <button
                                    onClick={() =>
                                        isEditing
                                            ? handleCancel()
                                            : setIsEditing(true)
                                    }
                                    disabled={saving}
                                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                                        isEditing
                                            ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                                            : "bg-[#c9a96e] text-[#0d2e1f] hover:bg-[#d9bb84]"
                                    }`}
                                >
                                    {isEditing ? (
                                        <>
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </>
                                    ) : (
                                        <>
                                            <Edit2 className="w-4 h-4" />
                                            Edit Profile
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Section label */}
                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                                <div className="w-9 h-9 rounded-full bg-[#c9a96e]/15 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-[#c9a96e]" />
                                </div>
                                <div>
                                    <p className="text-[#0d2e1f] font-semibold text-sm">
                                        Personal Information
                                    </p>
                                    <p className="text-gray-400 text-xs italic">
                                        Keep your information up to date for a
                                        better experience.
                                    </p>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        First Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                                                isEditing
                                                    ? "border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
                                                    : "border-gray-200 bg-gray-50"
                                            } outline-none transition-all`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Last Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                                                isEditing
                                                    ? "border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
                                                    : "border-gray-200 bg-gray-50"
                                            } outline-none transition-all`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                                                isEditing
                                                    ? "border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
                                                    : "border-gray-200 bg-gray-50"
                                            } outline-none transition-all`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="tel"
                                            name="contact_number"
                                            placeholder="09XXXXXXXXX"
                                            value={
                                                isEditing
                                                    ? formData.contact_number
                                                    : formatPHNumber(
                                                          user.contact_number,
                                                      )
                                            }
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                                                isEditing
                                                    ? "border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
                                                    : "border-gray-200 bg-gray-50"
                                            } outline-none transition-all`}
                                        />
                                    </div>
                                    {isEditing && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Format: 11 digits starting with 09
                                        </p>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Address
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                                                isEditing
                                                    ? "border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
                                                    : "border-gray-200 bg-gray-50"
                                            } outline-none transition-all`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            {isEditing && (
                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#c9a96e] text-[#0d2e1f] rounded-xl font-medium hover:bg-[#d9bb84] transition-colors disabled:opacity-60"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── CHANGE PASSWORD (opened via sidebar Quick Action) ── */}
                    {showPasswordForm && (
                        <div
                            ref={passwordSectionRef}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#1a4a35]/10 flex items-center justify-center">
                                        <Lock className="w-4 h-4 text-[#1a4a35]" />
                                    </div>
                                    <span className="text-[#0d2e1f] font-medium">
                                        Change Password
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowPasswordForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="px-8 pb-8 pt-6">
                                {passwordError && (
                                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                        {passwordError}
                                    </div>
                                )}
                                {passwordSuccess && (
                                    <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm">
                                        Password updated successfully.
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            name="current_password"
                                            value={
                                                passwordData.current_password
                                            }
                                            onChange={handlePasswordChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="new_password"
                                            value={passwordData.new_password}
                                            onChange={handlePasswordChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="new_password_confirmation"
                                            value={
                                                passwordData.new_password_confirmation
                                            }
                                            onChange={handlePasswordChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={handlePasswordSave}
                                        disabled={passwordSaving}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a4a35] text-white rounded-xl font-medium hover:bg-[#0d2e1f] transition-colors disabled:opacity-60"
                                    >
                                        {passwordSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Lock className="w-4 h-4" />
                                        )}
                                        {passwordSaving
                                            ? "Updating..."
                                            : "Update Password"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PROMO BANNER — real bed/room photo behind the copy,
                        like the reference mockup. Swap the URL for your own
                        room photo asset. ── */}
                    <div className="relative rounded-3xl overflow-hidden h-40 flex items-center px-8">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(13,46,31,0.88) 0%, rgba(13,46,31,0.25) 100%), url('https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1200&auto=format&fit=crop')",
                            }}
                        />
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <h3
                                    className="text-2xl font-bold text-[#c9a96e] leading-tight"
                                    style={{ fontFamily: "Georgia" }}
                                >
                                    More Stays,
                                    <br />
                                    More Memories
                                </h3>
                                <p className="text-white/70 text-sm mt-2">
                                    We are glad to have you with us.
                                </p>
                            </div>
                            <p
                                className="hidden sm:block text-white/80 italic text-lg text-right"
                                style={{ fontFamily: "Georgia" }}
                            >
                                See you
                                <br />
                                on your next stay!
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: SIDEBAR ── */}
                <div className="flex flex-col gap-6">
                    {/* Account Status */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <Shield className="w-3.5 h-3.5 text-[#0d2e1f]" />
                            </div>
                            <p className="text-[#0d2e1f] font-semibold">
                                Account Status
                            </p>
                        </div>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    Verified Account
                                </p>
                                <p className="text-xs text-gray-400">
                                    Your account is verified and ready to use.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl bg-[#eaf3ea] px-4 py-3">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#0d2e1f]">
                                    Thank you for being a valued guest!
                                </p>
                                <p className="text-xs text-[#1a4a35]/70 mt-0.5">
                                    Enjoy a more personalized and seamless
                                    booking experience.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Settings className="w-4 h-4 text-[#0d2e1f]" />
                            <p className="text-[#0d2e1f] font-semibold">
                                Quick Actions
                            </p>
                        </div>
                        <div className="flex flex-col">
                            <button
                                onClick={openPasswordForm}
                                className="flex items-center justify-between py-3 border-b border-gray-50 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors"
                            >
                                <span className="flex items-center gap-3 text-sm text-gray-700">
                                    <Lock className="w-4 h-4 text-gray-500" />
                                    Change Password
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                            <button
                                onClick={NOOP}
                                className="flex items-center justify-between py-3 border-b border-gray-50 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors"
                            >
                                <span className="flex items-center gap-3 text-sm text-gray-700">
                                    <Bell className="w-4 h-4 text-gray-500" />
                                    Notification Settings
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                            <button
                                onClick={NOOP}
                                className="flex items-center justify-between py-3 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors"
                            >
                                <span className="flex items-center gap-3 text-sm text-gray-700">
                                    <Shield className="w-4 h-4 text-gray-500" />
                                    Privacy Settings
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                        </div>
                    </div>

                    {/* Need Help */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Headphones className="w-4 h-4 text-[#0d2e1f]" />
                            <p className="text-[#0d2e1f] font-semibold">
                                Need Help?
                            </p>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            If you have any questions, feel free to contact our
                            support team.
                        </p>
                        <button
                            onClick={NOOP}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#0d2e1f] hover:bg-gray-50 transition-colors"
                        >
                            <MailIcon className="w-4 h-4" />
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}