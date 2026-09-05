import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ChatBox from "@/components/AdminComponents/ChatBox";
import {
    LogOut,
    LayoutDashboard,
    CalendarDays,
    Users,
    Key,
    ClipboardList,
    PanelLeft,
    ChevronDown,
    Settings,
    LifeBuoy,
    Bell,
    UserPlus,
    ShoppingCart,
    UtensilsCrossed,
    MessageCircle,
    RefreshCw,
    ChevronRight,
    ChevronUp,
    BanknoteArrowDown,
    BookUser,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import ShiftStatusModal from "@/components/StaffComponents/ShiftStatusModal";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import api, { API_BASE } from "@/services/api";
import "@/services/echo";
import logo from "../../images/logo1.png";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

const StaffLayout = ({
    children,
    pageTitle,
}: {
    children?: React.ReactNode;
    pageTitle?: string;
}) => {
    const [isSidebarOpen, setSidebarOpen] = useState(() => {
        const savedState = localStorage.getItem("staffSidebarOpen");
        return savedState !== null ? JSON.parse(savedState) : true;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    const [messages, setMessages] = useState<any[]>([]);
    const [chatFilter, setChatFilter] = useState<"all" | "guest" | "staff">(
        "all",
    );
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const messageRef = useRef<HTMLDivElement | null>(null);
    const chatButtonRef = useRef<HTMLButtonElement | null>(null);

    const [messagesLoading, setMessagesLoading] = useState(false);

    const [activeChatUser, setActiveChatUser] = useState<{
        id: number;
        name: string;
    } | null>(null);

    const chatDropdownRef = useRef<HTMLDivElement | null>(null);
    const chatBoxRef = useRef<HTMLDivElement | null>(null);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [limit, setLimit] = useState(10);
    const [expanded, setExpanded] = useState(false);

    const notifRef = useRef<HTMLDivElement | null>(null);
    const isScrolling = useRef(false);
    const notifScroll = useRef(0);
    const isFirstLoad = React.useRef(true);
    const isClickingNotif = useRef(false);
    const notifButtonRef = useRef<HTMLButtonElement | null>(null);
    const notifDropdownRef = useRef<HTMLDivElement | null>(null);
    const timeMapRef = useRef<{ [key: number]: string }>({});
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [guestName, setGuestName] = useState<string | null>(null);
    const [guestNameLoading, setGuestNameLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const location = useLocation();

    const routesMap: any = {
        "/dashboard": "Dashboard",
        "/reservation-monitor": "Reservation Monitor",
        "/bookings": "Bookings",
        "/booking-management": "Bookings",
        "/booking-details": "Booking Details",
        "/incidents": "Incidents Reports",
        "/transactions": "Transaction",
        "/walk-in-guests": "Walk-in Guests",
        "/cash": "Cash",
        "/extend-stay": "Extend Booking",
    };

    // Check if current path matches a route (including nested paths)
    const isActiveRoute = (href: string) => {
        if (href === "/booking-management") {
            // Highlight Bookings when on booking-management or booking-details
            return (
                location.pathname === "/booking-management" ||
                location.pathname.startsWith("/booking-details/")
            );
        }
        return location.pathname === href;
    };

    // Get breadcrumb items based on current path
    const getBreadcrumbs = () => {
        const pathname = location.pathname;
        const breadcrumbs = [{ name: "Dashboard", path: "/dashboard" }];

        if (pathname === "/dashboard") {
            return breadcrumbs;
        }

        if (
            pathname.startsWith("/booking-management") ||
            pathname === "/bookings"
        ) {
            breadcrumbs.push({ name: "Bookings", path: "/booking-management" });
            return breadcrumbs;
        }

        if (pathname.startsWith("/booking-details/")) {
            breadcrumbs.push(
                { name: "Bookings", path: "/booking-management" },
                { name: "Booking Details", path: pathname },
            );
            return breadcrumbs;
        }

        if (pathname === "/reservation-monitor") {
            breadcrumbs.push({
                name: "Reservation Monitor",
                path: "/reservation-monitor",
            });
            return breadcrumbs;
        }

        if (pathname === "/incidents") {
            breadcrumbs.push({ name: "Incidents Reports", path: "/incidents" });
            return breadcrumbs;
        }

        if (pathname === "/transactions") {
            breadcrumbs.push({ name: "Transactions", path: "/transactions" });
            return breadcrumbs;
        }

        if (pathname === "/walk-in-guests") {
            breadcrumbs.push({
                name: "Walk-in Guests",
                path: "/walk-in-guests",
            });
            return breadcrumbs;
        }

        if (pathname === "/cash") {
            breadcrumbs.push({ name: "Cash", path: "/cash" });
            return breadcrumbs;
        }

        if (pathname === "/extend-stay") {
            breadcrumbs.push({ name: "Extend Booking", path: "/extend-stay" });
            return breadcrumbs;
        }

        return breadcrumbs;
    };

    const getPageTitle = () => {
        if (location.pathname.startsWith("/booking-details/")) {
            return "Booking Details";
        }
        return routesMap[location.pathname] || "Dashboard";
    };

    useEffect(() => {
        localStorage.setItem("staffSidebarOpen", JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
        }
    }, []);

    useEffect(() => {
        console.log("Shift check — user:", user, "role:", user?.role);
        if (!user?.id) return;
        if (user.role?.toLowerCase() !== "staff") return;
        if (sessionStorage.getItem("shiftPromptShown")) {
            console.log("Shift prompt already shown this session, skipping.");
            return;
        }

        console.log("Opening shift modal...");
        setIsShiftModalOpen(true);
        sessionStorage.setItem("shiftPromptShown", "1");
    }, [user?.id]);

    const handleLogout = async () => {
        NProgress.start();

        try {
            const currentShift = await api.get("/shift/current");

            if (currentShift.data?.id) {
                await api.post(`/shift/close/${currentShift.data.id}`, {
                    closed_cash: currentShift.data.expected_cash,
                });
            }

            await api.post("/auth/logout");
        } catch (err) {
            console.log(err);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            sessionStorage.removeItem("shiftPromptShown");

            navigate("/login", {
                replace: true,
            });

            setTimeout(() => {
                NProgress.done();
            }, 200);
        }
    };

    const handleNavigation = (href: string) => {
        NProgress.start();
        navigate(href);
        setIsMobileMenuOpen(false);
        setTimeout(() => {
            NProgress.done();
        }, 200);
    };

    const toggleSidebar = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSidebarOpen(!isSidebarOpen);
    };

    const getUserInitials = () => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        }
        if (user?.first_name) {
            return user.first_name[0].toUpperCase();
        }
        if (user?.name) {
            return user.name[0].toUpperCase();
        }
        if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return "U";
    };

    const getDisplayName = () => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user?.first_name) {
            return user.first_name;
        }
        if (user?.name) {
            return user.name;
        }
        return user?.email?.split("@")[0] || "Staff";
    };

    const isFetching = useRef(false);

    const fetchMessages = async () => {
        if (!user?.id || isFetching.current) return;

        isFetching.current = true;

        try {
            const res = await api.get(`/messages/conversations`);
            const data = Array.isArray(res.data) ? res.data : [];

            setMessages((prev) => {
                if (prev.length === data.length) {
                    let same = true;
                    for (let i = 0; i < prev.length; i++) {
                        if (prev[i].last_message !== data[i].last_message) {
                            same = false;
                            break;
                        }
                    }
                    if (same) return prev;
                }
                return data;
            });

            const unread = data.reduce((sum, c) => sum + (c.unread || 0), 0);
            setUnreadMessages((prev) => (prev === unread ? prev : unread));
        } catch (err) {
            console.error(err);
        } finally {
            isFetching.current = false;
        }
    };

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;
        if (document.visibilityState !== "visible") return;
        if (isScrolling.current) return;
        if (isClickingNotif.current) return;

        if (isFirstLoad.current) {
            setNotificationsLoading(true);
        }

        try {
            const scrollTop = notifRef.current?.scrollTop || 0;
            const prevHeight = notifRef.current?.scrollHeight || 0;

            const res = await api.get(
                `/notifications/user/${user.id}?limit=10&offset=${offset}`,
            );

            const notificationsData = (res.data || []).map((n: any) => {
                if (!timeMapRef.current[n.id]) {
                    timeMapRef.current[n.id] = timeAgo(n.created_at);
                }
                return {
                    ...n,
                    display_time: timeMapRef.current[n.id],
                };
            });
            setNotifications((prev) => {
                if (offset === 0) {
                    return prev.length === notificationsData.length
                        ? prev
                        : notificationsData;
                }
                const merged = [...prev, ...notificationsData];
                return merged.slice(0, 20);
            });

            setTimeout(() => {
                if (notifRef.current && isClickingNotif.current) {
                    const newHeight = notifRef.current.scrollHeight;
                    notifRef.current.scrollTop =
                        scrollTop + (newHeight - prevHeight);
                    isClickingNotif.current = false;
                }
            }, 0);

            const unreadRes = await api.get(
                `/notifications/user/${user.id}/unread-count`,
            );
            setUnreadCount(unreadRes.data.count);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            if (isFirstLoad.current) {
                setNotificationsLoading(false);
                isFirstLoad.current = false;
            }
        }
    }, [user?.id, offset]);

    const markNotificationAsRead = async (id: number) => {
        try {
            isClickingNotif.current = true;
            await api.put(`/notifications/${id}/read`);
            const scrollTop = notifRef.current?.scrollTop || 0;

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );

            setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));

            setTimeout(() => {
                if (notifRef.current) {
                    notifRef.current.scrollTop = scrollTop;
                }
                isClickingNotif.current = false;
            }, 0);
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const getImageUrl = (img?: string | null) => {
        if (!img) return null;

        if (img.startsWith("http")) return img;

        if (img.includes("storage/")) {
            return `${API_BASE}/${img}`;
        }

        return `${API_BASE}/storage/${img}`;
    };

    const markAllNotificationsAsRead = async () => {
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

    const refreshData = () => {
        fetchMessages();
        fetchNotifications();
    };

    useEffect(() => {
        if (!user?.id) return;

        fetchMessages();
        fetchNotifications();
    }, [user?.id]);

    if (!user) {
        return null;
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideChatDropdown =
                chatDropdownRef.current?.contains(target);
            const insideChatBox = chatBoxRef.current?.contains(target);
            const insideChatButton = chatButtonRef.current?.contains(target);
            const insideNotifDropdown =
                notifDropdownRef.current?.contains(target);
            const insideNotifButton = notifButtonRef.current?.contains(target);

            if (
                !insideChatDropdown &&
                !insideChatBox &&
                !insideChatButton &&
                !insideNotifDropdown &&
                !insideNotifButton
            ) {
                setIsChatOpen(false);
                setIsNotifOpen(false);
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () =>
            window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        console.log("👂 STAFF listening:", `notifications.${user.id}`);

        window.Echo.private(`notifications.${user.id}`).listen(
            ".NotificationCreated",
            (e: any) => {
                console.log("🔔 STAFF REALTIME:", e);

                const newNotification = e.notification;

                setNotifications((prev) => {
                    const exists = prev.some(
                        (n) => n.id === newNotification.id,
                    );

                    if (exists) return prev;

                    return [
                        {
                            ...newNotification,
                            display_time: "Just now",
                        },
                        ...prev,
                    ];
                });

                setUnreadCount((prev) => prev + 1);
            },
        );

        return () => {
            window.Echo.leave(`notifications.${user.id}`);
        };
    }, [user?.id]);

    const navigationGroups = [
        {
            label: "MAIN",
            items: [
                {
                    name: "Dashboard",
                    description: "Overview & Analytics",
                    href: "/dashboard",
                    icon: LayoutDashboard,
                },
                {
                    name: "Reservation Monitor",
                    description: "Live Room Reservation Calendar",
                    href: "/reservation-monitor",
                    icon: CalendarDays,
                },
            ],
        },
        {
            label: "OPERATIONS",
            items: [
                {
                    name: "Walk-in",
                    description: "Guest Registration",
                    href: "/walk-in-guests",
                    icon: UserPlus,
                },
                {
                    name: "Cash",
                    description: "Cash Management",
                    href: "/cash",
                    icon: BanknoteArrowDown,
                },
            ],
        },
        {
            label: "MANAGEMENT",
            items: [
                {
                    name: "Bookings",
                    description: "Reservations",
                    href: "/booking-management",
                    icon: CalendarDays,
                },
                {
                    name: "Transactions",
                    description: "Payment History",
                    href: "/transactions",
                    icon: ClipboardList,
                },
                {
                    name: "Incidents Rooms",
                    description: "View reported incidents",
                    href: "/incidents",
                    icon: ClipboardList,
                },
            ],
        },
    ];

    const parseNotificationDetails = (message: string) => {
        const roomMatch = message.match(/Room\s+([A-Za-z0-9\-]+)/i);
        const bookingMatch = message.match(/BOOK-[A-Z0-9]+/i);

        return {
            room: roomMatch ? roomMatch[1] : null,
            bookingReference: bookingMatch ? bookingMatch[0] : null,
        };
    };

    useEffect(() => {
        if (!selectedNotification) {
            setGuestName(null);
            return;
        }

        const { bookingReference } = parseNotificationDetails(
            selectedNotification.message,
        );

        if (!bookingReference) {
            setGuestName(null);
            return;
        }

        setGuestNameLoading(true);
        api.get(`/bookings/reference/${bookingReference}`)
            .then((res) => {
                setGuestName(res.data?.guest_name ?? null);
            })
            .catch(() => {
                setGuestName(null);
            })
            .finally(() => {
                setGuestNameLoading(false);
            });
    }, [selectedNotification]);

    const timeAgo = (dateString: string) => {
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

    const MessageDropdownContent = () => {
        return (
            <div className="chat-dropdown w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">Chats</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            {["all", "guest", "staff"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setChatFilter(type as any)}
                                    className={`px-3 py-1 text-xs rounded-full capitalize transition ${
                                        chatFilter === type
                                            ? "bg-emerald-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    } select-none`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={refreshData}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-gray-500">
                                {unreadMessages} unread
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    ref={messageRef}
                    data-scroll-area
                    className="max-h-96 overflow-y-auto scrollbar-mint px-2 py-2"
                >
                    {messagesLoading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                            Loading messages...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No messages
                        </div>
                    ) : (
                        messages
                            .filter((c) => {
                                if (chatFilter === "all") return true;
                                return (
                                    c.user?.role?.toLowerCase() === chatFilter
                                );
                            })
                            .map((c) => {
                                const chatUser = c.user;
                                if (!chatUser) return null;
                                return (
                                    <div
                                        key={chatUser.id}
                                        onClick={() => {
                                            setActiveChatUser({
                                                id: chatUser.id,
                                                name: chatUser.first_name,
                                            });
                                            setMessages((prev) =>
                                                prev.map((msg) =>
                                                    msg.user.id === chatUser.id
                                                        ? { ...msg, unread: 0 }
                                                        : msg,
                                                ),
                                            );
                                            fetchMessages();
                                        }}
                                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition rounded-lg mb-1 select-none"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border-0 ring-0 shadow-none overflow-hidden">
                                                <AvatarImage
                                                    src={chatUser.avatar_url}
                                                    className="h-full w-full object-cover border-0"
                                                />
                                                <AvatarFallback className="bg-emerald-500 text-white flex items-center justify-center w-full h-full border-0 ring-0 shadow-none">
                                                    {chatUser.first_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                                        {chatUser.first_name}
                                                    </p>
                                                    {c.unread > 0 && (
                                                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                                            {c.unread}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {c.last_sender_id ===
                                                        user?.id && (
                                                        <span className="text-gray-400">
                                                            You:{" "}
                                                        </span>
                                                    )}
                                                    {c.last_message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>

                <div className="text-center py-3 border-t border-gray-100 select-none">
                    <button
                        onClick={() => handleNavigation("/messages")}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                        View all messages
                    </button>
                </div>
            </div>
        );
    };

    const NotificationDropdownContent = () => {
        return (
            <div className="chat-dropdown w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">
                        Notifications
                    </h2>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllNotificationsAsRead}
                                className="text-xs text-emerald-600 hover:text-emerald-700 select-none"
                            >
                                Mark all
                            </button>
                        )}
                        <button
                            onClick={refreshData}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-gray-500">
                            {unreadCount} unread
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <div
                        ref={notifRef}
                        onScroll={(e) => {
                            const el = e.currentTarget;
                            notifScroll.current = el.scrollTop;
                            isScrolling.current = true;
                            setTimeout(() => {
                                isScrolling.current = false;
                            }, 800);
                        }}
                        className={`${expanded ? "max-h-[600px]" : "max-h-96"} overflow-y-auto scrollbar-mint px-2 py-2`}
                    >
                        {notificationsLoading ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No notifications
                            </div>
                        ) : (
                            <>
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            markNotificationAsRead(n.id);
                                            setSelectedNotification(n);
                                            setIsNotifOpen(false);
                                        }}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition rounded-lg mb-1 select-none ${!n.is_read ? "bg-blue-50" : ""}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {n.title}
                                            </p>
                                            {!n.is_read && (
                                                <div className="h-2 w-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {n.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {timeAgo(n.created_at)}
                                        </p>
                                    </div>
                                ))}
                                {!expanded && notifications.length >= 10 && (
                                    <div className="text-center py-3">
                                        <button
                                            onClick={async () => {
                                                isClickingNotif.current = true;
                                                const newOffset = offset + 10;
                                                setOffset(newOffset);
                                                setExpanded(true);
                                                const res = await api.get(
                                                    `/notifications/user/${user.id}?limit=10&offset=${newOffset}`,
                                                );
                                                const data = res.data || [];
                                                setNotifications((prev) => {
                                                    const merged = [
                                                        ...prev,
                                                        ...data,
                                                    ];
                                                    return merged.slice(0, 20);
                                                });
                                            }}
                                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium select-none"
                                        >
                                            See previous notifications
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    {!expanded && notifications.length >= 10 && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
                    )}
                </div>
            </div>
        );
    };

    const fallback = `https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=10b981&color=fff`;

    const breadcrumbs = getBreadcrumbs();

    return (
        <>
            <style>{`
                .scrollbar-mint::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .scrollbar-mint::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .scrollbar-mint::-webkit-scrollbar-thumb {
                    background: #10b981;
                    border-radius: 10px;
                }
                .scrollbar-mint::-webkit-scrollbar-thumb:hover {
                    background: #059669;
                }
                .scrollbar-mint {
                    scrollbar-width: thin;
                    scrollbar-color: #10b981 #f1f1f1;
                }
                .sidebar-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                .sidebar-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .select-none {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                .sidebar-label {
                    transition: opacity 300ms ease-in-out, max-width 300ms ease-in-out, margin 300ms ease-in-out;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .sidebar-label-open {
                    opacity: 1;
                    max-width: 220px;
                }
                .sidebar-label-closed {
                    opacity: 0;
                    max-width: 0;
                    margin: 0 !important;
                }
                .breadcrumb-separator {
                    margin: 0 6px;
                    color: #94a3b8;
                    font-size: 10px;
                }
                .breadcrumb-link {
                    color: #64748b;
                    font-size: 12px;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .breadcrumb-link:hover {
                    color: #10b981;
                }
                .breadcrumb-current {
                    color: #0f172a;
                    font-size: 12px;
                    font-weight: 600;
                }
            `}</style>

            <div className="min-h-screen bg-gray-50">
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                <aside
                    className={`fixed top-0 left-0 h-full bg-gradient-to-b from-emerald-900 to-emerald-950 text-white transition-[width] duration-300 ease-in-out z-50 flex flex-col
                        ${isSidebarOpen ? "w-56" : "w-16"} 
                        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
                >
                    <div className="h-20 flex items-center px-3 shrink-0 border-b border-emerald-800/50">
                        <div
                            onClick={() => handleNavigation("/dashboard")}
                            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity select-none"
                        >
                            <div
                                className={`h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 transition-[margin] duration-300 ease-in-out ${isSidebarOpen ? "mr-3" : "mr-0"}`}
                            >
                                <img
                                    src={logo}
                                    alt="Traveler's Inn Logo"
                                    className="h-full w-auto object-contain scale-125"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        const parent =
                                            e.currentTarget.parentElement;
                                        if (parent) {
                                            const fallbackIcon =
                                                document.createElement("div");
                                            fallbackIcon.className =
                                                "h-7 w-7 text-emerald-600 flex items-center justify-center";
                                            fallbackIcon.innerHTML =
                                                '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>';
                                            parent.appendChild(fallbackIcon);
                                        }
                                    }}
                                />
                            </div>
                            <div
                                className={`sidebar-label flex flex-col ${isSidebarOpen ? "sidebar-label-open" : "sidebar-label-closed"}`}
                            >
                                <span className="font-bold text-sm tracking-tight leading-tight">
                                    Lynn Ennia's
                                </span>
                                <span className="text-[8px] text-emerald-300/80 tracking-wide">
                                    Traveler's Inn
                                </span>
                            </div>
                        </div>
                    </div>

                    <nav
                        className={`flex-1 py-6 px-3 overflow-y-auto ${isSidebarOpen ? "sidebar-scrollbar" : "scrollbar-hide"}`}
                    >
                        <div className="space-y-6">
                            {navigationGroups.map((group) => (
                                <div key={group.label}>
                                    <p
                                        className={`sidebar-label text-[9px] font-semibold tracking-wider text-emerald-400/70 uppercase px-3 mb-2 select-none ${
                                            isSidebarOpen
                                                ? "sidebar-label-open"
                                                : "sidebar-label-closed h-0 mb-0"
                                        }`}
                                    >
                                        {group.label}
                                    </p>
                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            const isActive = isActiveRoute(
                                                item.href,
                                            );
                                            return (
                                                <div
                                                    key={item.name}
                                                    onClick={() =>
                                                        handleNavigation(
                                                            item.href,
                                                        )
                                                    }
                                                    className={`
                                                        flex items-center px-3 py-2 rounded-lg transition-colors duration-300 ease-in-out group cursor-pointer select-none
                                                        ${
                                                            isActive
                                                                ? "bg-emerald-600 text-white shadow-lg"
                                                                : "text-emerald-100 hover:bg-emerald-800/50 hover:text-white"
                                                        }
                                                    `}
                                                    title={
                                                        !isSidebarOpen
                                                            ? item.name
                                                            : undefined
                                                    }
                                                >
                                                    <item.icon
                                                        className={`h-5 w-5 shrink-0 transition-[margin] duration-300 ease-in-out ${isSidebarOpen ? "mr-3" : "mr-0"}`}
                                                    />
                                                    <div
                                                        className={`sidebar-label flex flex-col flex-1 min-w-0 ${
                                                            isSidebarOpen
                                                                ? "sidebar-label-open"
                                                                : "sidebar-label-closed"
                                                        }`}
                                                    >
                                                        <span className="text-xs font-medium truncate">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-[8px] text-emerald-300/70 truncate">
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>

                    <div className="border-t border-emerald-800/50 py-2 px-2 shrink-0 mt-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="
                                        w-full flex items-center justify-center p-2 rounded-lg hover:bg-emerald-800/50 transition-colors group
                                        focus:outline-none focus:ring-0 cursor-pointer select-none
                                    "
                                >
                                    <div
                                        className={`rounded-xl overflow-hidden border border-emerald-400 flex items-center justify-center shrink-0 transition-all duration-300 ease-in-out h-10 w-10 ${
                                            isSidebarOpen ? "mr-3" : "mx-auto"
                                        }`}
                                    >
                                        {user?.profile_image ? (
                                            <img
                                                src={
                                                    getImageUrl(
                                                        user?.profile_image,
                                                    ) || fallback
                                                }
                                                className="w-full h-full object-cover block"
                                                style={{
                                                    objectPosition:
                                                        "center 20%",
                                                    transform: "scale(1.1)",
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        fallback;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-emerald-500 text-white text-sm font-bold">
                                                {user?.first_name?.[0] || "U"}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={`sidebar-label flex-1 text-left ${
                                            isSidebarOpen
                                                ? "sidebar-label-open"
                                                : "sidebar-label-closed"
                                        }`}
                                    >
                                        <p className="text-[10px] relative top-2 font-semibold text-white/90 truncate leading-none select-none">
                                            {getDisplayName()}
                                        </p>
                                        <p className="text-[8px] text-emerald-400/80 truncate select-none">
                                            {user.email}
                                        </p>
                                    </div>

                                    <div
                                        className={`sidebar-label flex flex-col items-center justify-center leading-none text-emerald-400 group-hover:text-white transition-colors select-none ${
                                            isSidebarOpen
                                                ? "sidebar-label-open"
                                                : "sidebar-label-closed"
                                        }`}
                                    >
                                        <ChevronUp className="h-4 w-3 -mb-1" />
                                        <ChevronDown className="h-4 w-3 -mt-1" />
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                side="top"
                                className="mb-2 bg-gradient-to-b from-emerald-900 to-emerald-950 border border-emerald-800 shadow-lg rounded-lg min-w-[200px] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:ring-0"
                            >
                                <DropdownMenuItem
                                    asChild
                                    className="text-emerald-200 focus:bg-transparent focus:outline-none focus:ring-0 data-[highlighted]:bg-emerald-800/50 data-[highlighted]:text-white"
                                >
                                    <div
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 text-emerald-100 cursor-pointer hover:bg-emerald-800/50 select-none"
                                    >
                                        <Settings className="h-4 w-4 text-emerald-400" />
                                        <span>Settings</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-red-400 focus:bg-transparent focus:outline-none focus:ring-0 data-[highlighted]:bg-red-900/30 data-[highlighted]:text-white select-none"
                                >
                                    <LogOut className="mr-2 h-4 w-4 text-red-400" />
                                    <span className="text-red-400">Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>

                <main
                    className={`transition-[margin] duration-300 ease-in-out ${isSidebarOpen ? "lg:ml-56" : "lg:ml-16"} flex flex-col h-screen overflow-hidden`}
                >
                    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 flex-shrink-0">
                        <div className="px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md hover:bg-gray-100"
                                    onClick={toggleSidebar}
                                >
                                    <PanelLeft
                                        className={`h-4 w-4 text-gray-500 transition-transform duration-300 ease-in-out ${
                                            isSidebarOpen
                                                ? "rotate-0"
                                                : "rotate-180"
                                        }`}
                                    />
                                </Button>
                                <div className="w-px h-5 bg-gray-300"></div>
                                {/* Breadcrumb */}
                                <div className="flex items-center">
                                    {breadcrumbs.map((crumb, index) => (
                                        <React.Fragment key={index}>
                                            {index > 0 && (
                                                <ChevronRight className="breadcrumb-separator h-3 w-3" />
                                            )}
                                            {index ===
                                            breadcrumbs.length - 1 ? (
                                                <span className="breadcrumb-current">
                                                    {crumb.name}
                                                </span>
                                            ) : (
                                                <span
                                                    className="breadcrumb-link"
                                                    onClick={() =>
                                                        handleNavigation(
                                                            crumb.path,
                                                        )
                                                    }
                                                >
                                                    {crumb.name}
                                                </span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <div className="relative">
                                    <button
                                        ref={chatButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsNotifOpen(false);
                                            setIsChatOpen((prev) => !prev);
                                        }}
                                        className="relative p-2 rounded-md hover:bg-gray-100 transition-colors select-none"
                                    >
                                        <MessageCircle className="h-4 w-4 text-gray-600" />
                                        {unreadMessages > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-medium px-1.5 rounded-full select-none">
                                                {unreadMessages > 9
                                                    ? "9+"
                                                    : unreadMessages}
                                            </span>
                                        )}
                                    </button>
                                    {isChatOpen && (
                                        <div
                                            ref={chatDropdownRef}
                                            className="absolute right-0 mt-2 z-50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MessageDropdownContent />
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        ref={notifButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsChatOpen(false);
                                            setIsNotifOpen((prev) => {
                                                const next = !prev;
                                                if (next) {
                                                    setOffset(0);
                                                    setExpanded(false);
                                                }
                                                return next;
                                            });
                                        }}
                                        className="relative p-2 rounded-md hover:bg-gray-100 transition-colors select-none"
                                    >
                                        <Bell className="h-4 w-4 text-gray-600" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-medium px-1.5 rounded-full select-none">
                                                {unreadCount > 99
                                                    ? "99+"
                                                    : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {isNotifOpen && (
                                        <div
                                            ref={notifDropdownRef}
                                            className="absolute right-0 mt-2 z-50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <NotificationDropdownContent />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Scrollable content */}
                    <div
                        className={`flex-1 bg-gray-50 ${
                            location.pathname === "/reservation-monitor"
                                ? "overflow-hidden"
                                : "overflow-y-auto scrollbar-mint"
                        }`}
                    >
                        <div
                            className={
                                location.pathname === "/reservation-monitor"
                                    ? "h-full"
                                    : "px-4 sm:px-6 py-4 sm:py-6"
                            }
                        >
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>

            {activeChatUser && (
                <div ref={chatBoxRef}>
                    <ChatBox
                        userId={activeChatUser.id}
                        userName={activeChatUser.name}
                        onClose={() => setActiveChatUser(null)}
                        onMessageSent={(msg) => {
                            setMessages((prev) => {
                                const exists = prev.find(
                                    (m) => m.user.id === activeChatUser.id,
                                );
                                if (exists) {
                                    return prev.map((m) =>
                                        m.user.id === activeChatUser.id
                                            ? {
                                                  ...m,
                                                  last_message: msg,
                                                  last_sender_id: user.id,
                                                  unread: 0,
                                              }
                                            : m,
                                    );
                                }
                                return [
                                    {
                                        user: {
                                            id: activeChatUser.id,
                                            first_name: activeChatUser.name,
                                        },
                                        last_message: msg,
                                        last_sender_id: user.id,
                                        unread: 0,
                                    },
                                    ...prev,
                                ];
                            });
                        }}
                    />
                </div>
            )}

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}

            {isShiftModalOpen && (
                <ShiftStatusModal
                    open={isShiftModalOpen}
                    onClose={() => setIsShiftModalOpen(false)}
                />
            )}

            <Dialog
                open={!!selectedNotification}
                onOpenChange={(open) => !open && setSelectedNotification(null)}
            >
                <DialogContent className="sm:max-w-md bg-white border border-gray-100 shadow-lg ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">
                            {selectedNotification?.title}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {selectedNotification?.message}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedNotification &&
                        (() => {
                            const { room, bookingReference } =
                                parseNotificationDetails(
                                    selectedNotification.message,
                                );

                            if (!room && !bookingReference) return null;

                            return (
                                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
                                    {(guestName || guestNameLoading) && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">
                                                Guest
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                {guestNameLoading
                                                    ? "Loading..."
                                                    : guestName}
                                            </span>
                                        </div>
                                    )}
                                    {room && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">
                                                Room
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                {room}
                                            </span>
                                        </div>
                                    )}
                                    {bookingReference && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">
                                                Booking Ref
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                {bookingReference}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                    <p className="text-xs text-gray-400">
                        {selectedNotification &&
                            timeAgo(selectedNotification.created_at)}
                    </p>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default StaffLayout;
