import React, { useState, useEffect } from "react";
import {
    Settings,
    User,
    Lock,
    Bell,
    Shield,
    HelpCircle,
    X,
    Camera,
    CheckCircle2,
    Calendar,
    ChevronRight,
    Save,
    Mail,
    Phone,
    MapPin,
    Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import api, { API_BASE } from "@/services/api";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!user) {
        alert("Session expired. Please login again.");
        window.location.replace("/");
        return null;
    }

    type SectionId =
        | "account"
        | "notifications"
        | "security"
        | "privacy"
        | "help";
    const [activeSection, setActiveSection] = useState<SectionId>("account");
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState(user);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImage(file);

        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        setCurrentUser((prev: any) => ({
            ...prev,
            profile_image: previewUrl,
        }));
    };

    // Profile form state - populated from auth (matches your users table)
    const [profile, setProfile] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        contact_number: user?.contact_number || "",
        address: user?.address || "",
        profile_image: user?.profile_image || "",
    });

    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get("/users/" + user.id);
                const freshUser = res.data.data || res.data.user || res.data;

                setCurrentUser(freshUser);
                localStorage.setItem("user", JSON.stringify(freshUser));
            } catch (error) {
                console.error("Failed to fetch user", error);
            }
        };

        fetchUser();
    }, []);

    // Sidebar sections - matches the reference design
    const sections: { id: SectionId; name: string; icon: typeof User }[] = [
        { id: "account", name: "Profile", icon: User },
        { id: "notifications", name: "General", icon: Settings },
        { id: "security", name: "Security", icon: Lock },
        { id: "privacy", name: "Preferences", icon: Bell },
        { id: "help", name: "About", icon: Info },
    ];

    const sectionMeta: Record<
        SectionId,
        { title: string; description: string }
    > = {
        account: {
            title: "Account Settings",
            description:
                "Update your personal information and manage your account.",
        },
        security: {
            title: "Change Password",
            description: "Update your password to keep your account secure.",
        },
        notifications: {
            title: "Notification Settings",
            description: "Choose how you want to be notified.",
        },
        privacy: {
            title: "Privacy & Security",
            description: "Manage your privacy and security preferences.",
        },
        help: {
            title: "Help & Support",
            description: "Find answers or get in touch with our team.",
        },
    };

    const handleSave = async () => {
        const isChanged =
            profile.first_name !== user.first_name ||
            profile.last_name !== user.last_name ||
            profile.email !== user.email ||
            profile.contact_number !== user.contact_number ||
            profile.address !== user.address ||
            image !== null;

        if (!isChanged) {
            alert("No changes detected");
            setIsSaving(false);
            return;
        }

        setIsSaving(true);

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                alert("Session expired. Please login again.");
                window.location.replace("/");
                return;
            }

            const formData = new FormData();

            formData.append("first_name", profile.first_name);
            formData.append("last_name", profile.last_name);
            formData.append("email", profile.email);
            formData.append("contact_number", profile.contact_number);
            formData.append("address", profile.address);

            if (image) {
                formData.append("profile_image", image);
            }

            formData.append("_method", "PUT");

            const res = await api.post("/users/" + user.id, formData);

            const updatedUser = res.data.data || res.data.user || res.data;

            localStorage.setItem("user", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            alert("Profile updated successfully!");
            onClose();
        } catch (error: any) {
            console.error(error);

            if (error.response) {
                alert(error.response.data.message || "Update failed");
            } else {
                alert("Network error");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            if (passwordData.new_password !== passwordData.confirm_password) {
                alert("Passwords do not match");
                return;
            }

            if (passwordData.new_password.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }

            await api.post("/change-password", passwordData);

            alert("Password updated successfully!");

            setPasswordData({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || "Failed to update password");
        }
    };

    const handleProfileChange = (field: string, value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
    };

    const fallback = `https://ui-avatars.com/api/?name=${profile.first_name}+${profile.last_name}&background=10b981&color=fff`;

    const getImageUrl = (img?: string | null) => {
        if (!img) return null;
        if (img.startsWith("http")) return img;
        return `${API_BASE}/storage/${img}`;
    };

    const memberSince = currentUser?.created_at
        ? new Date(currentUser.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : "—";

    const isVerified = !!(
        currentUser?.email_verified_at || currentUser?.is_verified
    );

    return (
        <>
            <style>{`
                .scrollbar-mint::-webkit-scrollbar { width: 6px; height: 6px; }
                .scrollbar-mint::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                .scrollbar-mint::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
                .scrollbar-mint::-webkit-scrollbar-thumb:hover { background: #059669; }
                .scrollbar-mint { scrollbar-width: thin; scrollbar-color: #10b981 #f1f1f1; }
            `}</style>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Settings className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <h1 className="text-base font-semibold text-gray-900">
                                        Settings
                                    </h1>
                                    <p className="text-xs text-gray-500">
                                        Manage your account and preferences
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row h-[70vh] overflow-hidden">
                        {/* Sidebar */}
                        <div className="md:w-64 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto scrollbar-mint">
                            <div className="p-3 space-y-1">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    const isActive =
                                        activeSection === section.id;

                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() =>
                                                setActiveSection(section.id)
                                            }
                                            className={`
                        w-full flex items-center gap-4
                        px-4 py-3
                        rounded-lg
                        text-left
                        transition-all duration-150
                        ${
                            isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-gray-600 hover:bg-gray-50"
                        }
                    `}
                                        >
                                            <Icon
                                                className={`
                            h-5 w-5 flex-shrink-0
                            ${isActive ? "text-emerald-600" : "text-gray-400"}
                        `}
                                            />

                                            <span
                                                className={`
                            text-[15px]
                            font-medium
                            flex-1
                            ${isActive ? "text-emerald-700" : "text-gray-600"}
                        `}
                                            >
                                                {section.name}
                                            </span>

                                            {isActive && (
                                                <ChevronRight className="h-4 w-4 text-emerald-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 overflow-y-auto scrollbar-mint bg-gray-50/30">
                            <div className="p-6 space-y-5">
                                {/* Section header + verified badge */}
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {sectionMeta[activeSection].title}
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {
                                                sectionMeta[activeSection]
                                                    .description
                                            }
                                        </p>
                                    </div>
                                    {activeSection === "account" && (
                                        <div
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 ${
                                                isVerified
                                                    ? "bg-emerald-50 border border-emerald-100"
                                                    : "bg-amber-50 border border-amber-100"
                                            }`}
                                        >
                                            <CheckCircle2
                                                className={`h-4 w-4 ${
                                                    isVerified
                                                        ? "text-emerald-600"
                                                        : "text-amber-600"
                                                }`}
                                            />
                                            <div className="leading-none">
                                                <p
                                                    className={`text-xs font-semibold leading-none ${
                                                        isVerified
                                                            ? "text-emerald-700"
                                                            : "text-amber-600"
                                                    }`}
                                                >
                                                    {isVerified
                                                        ? "Verified Account"
                                                        : "Unverified Account"}
                                                </p>

                                                <p
                                                    className={`text-[10px] leading-none -mt-1 whitespace-nowrap ${
                                                        isVerified
                                                            ? "text-emerald-600"
                                                            : "text-amber-600"
                                                    }`}
                                                >
                                                    {isVerified
                                                        ? "Your account is verified and ready to use"
                                                        : "Please verify your account to access all features"}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Account Settings */}
                                {activeSection === "account" && (
                                    <>
                                        {/* Profile Information card */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                        <User className="h-5 w-5 text-emerald-600" />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 leading-none">
                                                            Profile Information
                                                        </p>

                                                        <p className="text-xs text-gray-500 leading-none -mt-1 whitespace-nowrap">
                                                            Keep your
                                                            information up to
                                                            date for a better
                                                            experience
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-emerald-500">
                                                            <img
                                                                src={
                                                                    currentUser?.profile_image?.startsWith(
                                                                        "blob:",
                                                                    )
                                                                        ? currentUser.profile_image
                                                                        : getImageUrl(
                                                                              currentUser?.profile_image,
                                                                          ) ||
                                                                          fallback
                                                                }
                                                                alt="Profile"
                                                                className="w-full h-full object-cover"
                                                                onError={(
                                                                    e,
                                                                ) => {
                                                                    e.currentTarget.src =
                                                                        fallback;
                                                                }}
                                                            />
                                                        </div>
                                                        <label className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                                                            <Camera className="h-3 w-3 text-gray-600" />
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={
                                                                    handleImageChange
                                                                }
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </div>
                                                    <div className="leading-tight">
                                                        <p className="text-xs font-medium text-gray-700">
                                                            Profile Photo
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            Upload a new photo.
                                                            JPG, PNG up to 2MB.
                                                        </p>
                                                        <label className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1 cursor-pointer transition-colors">
                                                            <Camera className="h-3 w-3" />
                                                            Change Photo
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={
                                                                    handleImageChange
                                                                }
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                        First Name
                                                    </label>
                                                    <div className="relative">
                                                        <User className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <input
                                                            type="text"
                                                            value={
                                                                profile.first_name
                                                            }
                                                            onChange={(e) =>
                                                                handleProfileChange(
                                                                    "first_name",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                        Last Name
                                                    </label>
                                                    <div className="relative">
                                                        <User className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <input
                                                            type="text"
                                                            value={
                                                                profile.last_name
                                                            }
                                                            onChange={(e) =>
                                                                handleProfileChange(
                                                                    "last_name",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                        Email Address
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <input
                                                            type="email"
                                                            value={
                                                                profile.email
                                                            }
                                                            onChange={(e) =>
                                                                handleProfileChange(
                                                                    "email",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                        Phone Number
                                                    </label>
                                                    <div className="relative">
                                                        <Phone className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <input
                                                            type="tel"
                                                            value={
                                                                profile.contact_number
                                                            }
                                                            onChange={(e) =>
                                                                handleProfileChange(
                                                                    "contact_number",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                            placeholder="+63 912 345 6789"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                    Address
                                                </label>
                                                <div className="relative">
                                                    <MapPin className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-3" />
                                                    <input
                                                        type="text"
                                                        value={profile.address}
                                                        onChange={(e) =>
                                                            handleProfileChange(
                                                                "address",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                        placeholder="Enter your address"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Account Information card */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                                            {/* Account Information Header */}
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                    <Shield className="h-5 w-5 text-emerald-600" />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 leading-none">
                                                        Account Information
                                                    </p>

                                                    <p className="text-xs text-gray-500 leading-none -mt-1">
                                                        View your account
                                                        details and status
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Account Information Details */}
                                            <div className="grid grid-cols-3 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                                {/* Account Status */}
                                                <div className="p-4">
                                                    <p className="text-[11px] font-medium text-gray-400 mb-2">
                                                        Account Status
                                                    </p>

                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2
                                                            className={`h-4 w-4 ${
                                                                isVerified
                                                                    ? "text-emerald-600"
                                                                    : "text-amber-500"
                                                            }`}
                                                        />

                                                        <span
                                                            className={`text-sm font-medium ${
                                                                isVerified
                                                                    ? "text-emerald-700"
                                                                    : "text-amber-600"
                                                            }`}
                                                        >
                                                            {isVerified
                                                                ? "Verified"
                                                                : "Unverified"}
                                                        </span>
                                                    </div>

                                                    <p className="text-[10px] text-gray-400 mt-1.5 whitespace-nowrap">
                                                        Your account is verified
                                                        and ready to use
                                                    </p>
                                                </div>

                                                {/* Member Since */}
                                                <div className="p-4 border-l border-gray-200">
                                                    <p className="text-[11px] font-medium text-gray-400 mb-2">
                                                        Member Since
                                                    </p>

                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-gray-400" />

                                                        <span className="text-sm font-medium text-gray-700">
                                                            {memberSince}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Account Type */}
                                                <div className="p-4 border-l border-gray-200">
                                                    <p className="text-[11px] font-medium text-gray-400 mb-2">
                                                        Account Type
                                                    </p>

                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-gray-400" />

                                                        <span className="text-sm font-medium text-gray-700">
                                                            {user?.role
                                                                ? user.role
                                                                      .charAt(0)
                                                                      .toUpperCase() +
                                                                  user.role.slice(
                                                                      1,
                                                                  )
                                                                : "Guest"}
                                                        </span>
                                                    </div>

                                                    <p className="text-[10px] text-gray-400 mt-1.5">
                                                        Regular user
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Change Password */}
                                {activeSection === "security" && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                Current Password
                                            </label>
                                            <input
                                                type="password"
                                                value={
                                                    passwordData.current_password
                                                }
                                                onChange={(e) =>
                                                    setPasswordData({
                                                        ...passwordData,
                                                        current_password:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={
                                                    passwordData.new_password
                                                }
                                                onChange={(e) =>
                                                    setPasswordData({
                                                        ...passwordData,
                                                        new_password:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                Confirm New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={
                                                    passwordData.confirm_password
                                                }
                                                onChange={(e) =>
                                                    setPasswordData({
                                                        ...passwordData,
                                                        confirm_password:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleChangePassword}
                                            disabled={
                                                !passwordData.current_password ||
                                                !passwordData.new_password ||
                                                !passwordData.confirm_password
                                            }
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full disabled:opacity-50"
                                        >
                                            Change Password
                                        </Button>
                                    </div>
                                )}

                                {/* Notification Settings */}
                                {activeSection === "notifications" && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    Email Notifications
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Receive updates via email
                                                </p>
                                            </div>
                                            <Switch
                                                checked={emailNotifications}
                                                onCheckedChange={
                                                    setEmailNotifications
                                                }
                                                className="data-[state=checked]:bg-emerald-600"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    Push Notifications
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Get real-time alerts
                                                </p>
                                            </div>
                                            <Switch
                                                checked={pushNotifications}
                                                onCheckedChange={
                                                    setPushNotifications
                                                }
                                                className="data-[state=checked]:bg-emerald-600"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Privacy & Security */}
                                {activeSection === "privacy" && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                        <p className="text-sm text-gray-600">
                                            Your data is protected. Contact
                                            support to request a data export or
                                            account deletion.
                                        </p>
                                    </div>
                                )}

                                {/* Help & Support */}
                                {activeSection === "help" && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                            <HelpCircle className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    Support
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Get help from our team
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                            <Shield className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    Privacy Policy
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Read our privacy policy
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                        onClick={onClose}
                                        variant="outline"
                                        size="sm"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-1" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
