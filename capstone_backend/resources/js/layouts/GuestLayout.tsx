import { useState, useEffect, useRef, useCallback } from "react";
import {
    Link,
    Outlet,
    useLocation,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import {
    Home,
    Calendar,
    User,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    ChevronDown,
    Settings,
    Download,
    MessageCircle,
    RefreshCw,
} from "lucide-react";
import ChatBox from "@/components/AdminComponents/ChatBox";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import api from "@/services/api";
import Echo from "@/services/echo";

// NOTE: adjust this relative path to match GuestLayout's actual folder depth
// (it mirrors the import used in Login.tsx: "../../../images/loginLogo.png")
import loginLogo from "../../images/loginLogo.png";

interface NavTab {
    label: string;
    to: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface AuthUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    profile_image?: string | null;
    avatar_url?: string | null;
}

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const NAV_TABS: NavTab[] = [
    { label: "Home", to: "/guest-dashboard", icon: Home },
    { label: "My Bookings", to: "/guest/bookings", icon: Calendar },
    { label: "Profile", to: "/guest/profile", icon: User },
];

// TODO: replace with the actual id of the staff/support account guests should
// message. If you have a dedicated "front desk" or "support" user in your
// backend, use that id here instead of a hardcoded 1.
const SUPPORT_USER_ID = 1;
const SUPPORT_USER_NAME = "Front Desk";

export default function GuestLayout() {
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [profileOpen, setProfileOpen] = useState<boolean>(false);
    const [notifOpen, setNotifOpen] = useState<boolean>(false);
    const [chatOpen, setChatOpen] = useState<boolean>(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Hide the search bar + let the nav tabs grow and center themselves
    // whenever the guest is on the Bookings (list or detail) or Profile
    // pages. Adjust these prefixes if you add more "focused" pages later.
    const hideSearchAndCenterNav =
        location.pathname.startsWith("/guest/bookings") ||
        location.pathname.startsWith("/guest/profile");

    // ── HEADER SEARCH — reads/writes the ?q= param on the dashboard route.
    // This is the single source of truth for room search: GuestDashboard
    // reads the same param and filters its room list off of it.
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchInput, setSearchInput] = useState<string>(
        () => searchParams.get("q") || "",
    );

    // Keep the input in sync if the URL changes some other way
    // (e.g. clearing the search via a link elsewhere).
    useEffect(() => {
        setSearchInput(searchParams.get("q") || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Debounce typing → URL updates, and redirect to the dashboard if the
    // guest starts typing from a different page (e.g. from Bookings).
    useEffect(() => {
        const handle = setTimeout(() => {
            const currentQ = searchParams.get("q") || "";
            if (searchInput === currentQ) return;

            const nextParams = new URLSearchParams(searchParams);
            if (searchInput) {
                nextParams.set("q", searchInput);
            } else {
                nextParams.delete("q");
            }

            if (location.pathname !== "/guest-dashboard") {
                navigate(
                    `/guest-dashboard${
                        nextParams.toString() ? `?${nextParams}` : ""
                    }`,
                );
            } else {
                setSearchParams(nextParams, { replace: true });
            }
        }, 300);

        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const [user, setUser] = useState<AuthUser | null>(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await api.get("/user");

                const latestUser: AuthUser = res.data;

                setUser(latestUser);

                localStorage.setItem("user", JSON.stringify(latestUser));
            } catch (err) {
                console.error("Failed to fetch current user:", err);
            }
        };

        if (user?.id) {
            fetchCurrentUser();
        }
    }, []);

    // ── NOTIFICATIONS STATE ──
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [notificationsLoading, setNotificationsLoading] =
        useState<boolean>(false);
    const isFirstLoad = useRef(true);

    const timeAgo = (dateString: string): string => {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
        if (days < 30) {
            const weeks = Math.floor(days / 7);
            return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
        }
        if (days < 365) {
            const months = Math.floor(days / 30);
            return `${months} month${months > 1 ? "s" : ""} ago`;
        }
        const years = Math.floor(days / 365);
        return `${years} year${years > 1 ? "s" : ""} ago`;
    };

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;

        if (isFirstLoad.current) {
            setNotificationsLoading(true);
        }

        try {
            const res = await api.get(
                `/notifications/user/${user.id}?limit=10&offset=0`,
            );
            setNotifications(Array.isArray(res.data) ? res.data : []);

            const unreadRes = await api.get(
                `/notifications/user/${user.id}/unread-count`,
            );
            setUnreadCount(unreadRes.data?.count || 0);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            if (isFirstLoad.current) {
                setNotificationsLoading(false);
                isFirstLoad.current = false;
            }
        }
    }, [user?.id]);

    const markNotificationAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );
            setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const markAllNotificationsAsRead = async () => {
        if (!user?.id) return;
        try {
            await api.put(`/notifications/user/${user.id}/read-all`);
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all notifications as read:", err);
        }
    };

    // Initial load + realtime notifications
    useEffect(() => {
        if (!user?.id) return;

        fetchNotifications();

        Echo.private(`notifications.${user.id}`).listen(
            ".NotificationCreated",
            (e: any) => {
                const newNotification = e.notification;

                setNotifications((prev) => {
                    const exists = prev.some(
                        (n) => n.id === newNotification.id,
                    );
                    if (exists) return prev;
                    return [newNotification, ...prev].slice(0, 10);
                });

                setUnreadCount((prev) => prev + 1);
            },
        );

        return () => {
            Echo.leave(`notifications.${user.id}`);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleLogout = (): void => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/login");
    };

    const isActive = (path: string): boolean => {
        if (path === "/guest-dashboard") {
            return (
                location.pathname === "/guest-dashboard" ||
                location.pathname === "/guest" ||
                location.pathname === "/guest/" ||
                location.pathname.startsWith("/guest/rooms")
            );
        }

        if (path === "/guest/bookings") {
            return location.pathname.startsWith("/guest/bookings");
        }
        return location.pathname === path;
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (profileOpen && !target.closest(".profile-dropdown")) {
                setProfileOpen(false);
            }
            if (notifOpen && !target.closest(".notif-dropdown")) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [profileOpen, notifOpen]);

    // Show the themed scrollbar only while actively scrolling, then fade it
    // back out shortly after scrolling stops. Toggled on <html> directly since
    // that's what owns the page-level scrollbar.
    useEffect(() => {
        let hideTimer: ReturnType<typeof setTimeout>;
        const handleScroll = () => {
            document.documentElement.classList.add("is-scrolling");
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                document.documentElement.classList.remove("is-scrolling");
            }, 800);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(hideTimer);
            document.documentElement.classList.remove("is-scrolling");
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#f7f8f5] font-['Inter'] overflow-x-clip">
            {/* Loads the two site fonts. For production, move this <link> into
          index.html's <head> instead — it's kept here for portability. */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&display=swap');

        /* Themed scrollbar — Chrome, Edge, Safari */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: #eaf3ea;
        }
        ::-webkit-scrollbar-thumb {
          background: #1a4a35;
          border-radius: 9999px;
          border: 2px solid #eaf3ea;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #0d2e1f;
        }

        /* Themed scrollbar — Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #1a4a35 #eaf3ea;
        }

        .notif-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .notif-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .notif-scroll::-webkit-scrollbar-thumb {
          background: #1a4a35;
          border-radius: 10px;
        }
      `}</style>

            {/* ── HEADER ── */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
                <div className="max-w-[100rem] mx-auto pl-4 pr-6 lg:pl-6 lg:pr-8">
                    <div className="flex items-center justify-between h-20 gap-10">
                        {/* Logo + brand */}
                        <Link
                            to="/guest-dashboard"
                            className="relative right-3 flex items-center gap-3 shrink-0"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#0d2e1f] shadow-md flex items-center justify-center shrink-0">
                                <img
                                    src={loginLogo}
                                    alt="Lyn Enia's Traviler's Inn logo"
                                    className="h-9 w-9 object-contain brightness-0 invert"
                                />
                            </div>
                            <div className="hidden sm:block leading-tight mt-2">
                                <p className="m-0 text-[#0d2e1f] font-bold text-base font-['Playfair_Display']">
                                    Lyn Enia's
                                    <br />
                                    Traviler's Inn
                                </p>
                                <p className="m-0 text-gray-400 text-xs italic font-['Playfair_Display']">
                                    Your Home Away from Home
                                </p>
                            </div>
                        </Link>

                        {/*
                          Nav links.
                          IMPORTANT: `justify-center` stays constant — it's
                          never toggled, because CSS can't smoothly animate
                          justify-content (it just snaps). Instead we animate
                          `grow` (flex-grow), which IS a real animatable
                          number. When grow is 0, the nav hugs its own
                          content width so centering has no visible effect
                          (looks identical to the old "shrink-0" state).
                          As grow eases from 0 → 1, the container smoothly
                          widens and the tabs glide into the center — and
                          reverses the same way when you navigate back.
                        */}
                        <nav
                            className={`hidden md:flex items-center justify-center gap-1 shrink-0 transition-all duration-500 ease-in-out ${
                                hideSearchAndCenterNav ? "grow" : "grow-0"
                            }`}
                        >
                            {NAV_TABS.map((tab) => {
                                const active = isActive(tab.to);
                                return (
                                    <Link
                                        key={tab.to}
                                        to={tab.to}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                            active
                                                ? "bg-[#0d2e1f] text-white"
                                                : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Search — the ONE search bar. Filters the room list
                            on the dashboard via the ?q= URL param. Collapses
                            smoothly on Bookings/Profile pages. */}
                        <div
                            className={`hidden lg:flex items-center gap-2 bg-gray-100 rounded-full overflow-hidden transition-all duration-500 ease-in-out ${
                                hideSearchAndCenterNav
                                    ? "grow-0 w-0 max-w-0 px-0 py-0 opacity-0 pointer-events-none"
                                    : "grow max-w-md px-4 py-2.5 opacity-100"
                            }`}
                        >
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search rooms, amenities, or dates..."
                                className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full whitespace-nowrap"
                                tabIndex={hideSearchAndCenterNav ? -1 : 0}
                            />
                        </div>

                        {/* Right icons */}
                        <div className="hidden md:flex items-center gap-3 shrink-0">
                            <div className="relative notif-dropdown">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setNotifOpen(!notifOpen);
                                    }}
                                    className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                                    )}
                                </button>

                                {notifOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-900">
                                                Notifications
                                            </p>
                                            <div className="flex items-center gap-3">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={
                                                            markAllNotificationsAsRead
                                                        }
                                                        className="text-xs text-[#1a4a35] hover:text-[#0d2e1f] font-medium"
                                                    >
                                                        Mark all
                                                    </button>
                                                )}
                                                <button
                                                    onClick={fetchNotifications}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-xs text-gray-400">
                                                    {unreadCount} new
                                                </span>
                                            </div>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto notif-scroll">
                                            {notificationsLoading ? (
                                                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0d2e1f] mx-auto mb-2"></div>
                                                    Loading notifications...
                                                </div>
                                            ) : notifications.length > 0 ? (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() =>
                                                            markNotificationAsRead(
                                                                n.id,
                                                            )
                                                        }
                                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                                                            !n.is_read
                                                                ? "bg-[#eaf3ea]/40"
                                                                : ""
                                                        }`}
                                                    >
                                                        <span
                                                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                                                !n.is_read
                                                                    ? "bg-[#0d2e1f]"
                                                                    : "bg-gray-200"
                                                            }`}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {n.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {n.message}
                                                            </p>
                                                            <p className="text-[11px] text-gray-400 mt-1">
                                                                {timeAgo(
                                                                    n.created_at,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                                                    No notifications yet.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {user ? (
                                <div className="relative profile-dropdown">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProfileOpen(!profileOpen);
                                        }}
                                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-[#0d2e1f] flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={`${user.first_name} profile`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                user.first_name?.[0]?.toUpperCase() ||
                                                "?"
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">
                                            {user.first_name}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                                            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#faf8f3] to-white">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {user.first_name}{" "}
                                                    {user.last_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        setProfileOpen(false);
                                                        setIsSettingsOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    Settings
                                                </button>
                                                <Link
                                                    to="/download-app"
                                                    onClick={() =>
                                                        setProfileOpen(false)
                                                    }
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download the app
                                                </Link>
                                            </div>
                                            <div className="border-t border-gray-100 py-1">
                                                <button
                                                    onClick={() => {
                                                        setProfileOpen(false);
                                                        handleLogout();
                                                    }}
                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="px-5 py-2 rounded-full bg-[#0d2e1f] text-white text-sm hover:opacity-90 transition-opacity"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
                            aria-label="Toggle menu"
                        >
                            {menuOpen ? (
                                <X className="w-5 h-5 text-gray-600" />
                            ) : (
                                <Menu className="w-5 h-5 text-gray-600" />
                            )}
                        </button>
                    </div>

                    {/* Mobile menu panel */}
                    {menuOpen && (
                        <div className="md:hidden pb-4">
                            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 mb-3">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) =>
                                        setSearchInput(e.target.value)
                                    }
                                    placeholder="Search rooms, amenities, or dates..."
                                    className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full"
                                />
                            </div>

                            <nav className="flex flex-col gap-1 mb-2">
                                {NAV_TABS.map((tab) => {
                                    const active = isActive(tab.to);
                                    return (
                                        <Link
                                            key={tab.to}
                                            to={tab.to}
                                            onClick={() => setMenuOpen(false)}
                                            className={`flex items-center gap-3 py-3 px-4 rounded-2xl text-sm transition-colors ${
                                                active
                                                    ? "bg-[#0d2e1f] text-white"
                                                    : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            <tab.icon
                                                className={`w-4 h-4 ${active ? "text-white" : ""}`}
                                            />
                                            {tab.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Mobile notifications entry point */}
                            <div className="border-t border-gray-100 pt-3 mb-2">
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setNotifOpen(true);
                                    }}
                                    className="flex items-center justify-between w-full py-3 px-4 rounded-2xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="flex items-center gap-3">
                                        <Bell className="w-4 h-4" />
                                        Notifications
                                    </span>
                                    {unreadCount > 0 && (
                                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {user ? (
                                <div className="border-t border-gray-100 pt-3">
                                    <div className="flex items-center gap-3 px-4 py-2">
                                        <div className="w-10 h-10 rounded-full bg-[#0d2e1f] flex items-center justify-center text-white text-sm font-semibold">
                                            {user.first_name?.[0]?.toUpperCase() ||
                                                "?"}
                                        </div>
                                        <div>
                                            <p className="text-gray-900 text-sm font-medium">
                                                {user.first_name}{" "}
                                                {user.last_name}
                                            </p>
                                            <p className="text-gray-400 text-xs">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setMenuOpen(false)}
                                    className="block px-5 py-3 rounded-full bg-[#0d2e1f] text-white text-sm text-center"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* ── PAGE CONTENT ── */}
            <main>
                <Outlet />
            </main>

            {/* ── FLOATING CHAT BUTTON (persists across all guest tabs) ── */}
            <button
                onClick={() => setChatOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity ring-1 ring-[#c9a96e]/40 ring-offset-2 ring-offset-[#f7f8f5] z-40"
                style={{
                    background: "linear-gradient(135deg, #1a4a35, #0d2e1f)",
                }}
            >
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#f7f8f5]" />
            </button>

            {/* ── CHATBOX ── */}
            {chatOpen && (
                <ChatBox
                    userId={SUPPORT_USER_ID}
                    userName={SUPPORT_USER_NAME}
                    onClose={() => setChatOpen(false)}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </div>
    );
}