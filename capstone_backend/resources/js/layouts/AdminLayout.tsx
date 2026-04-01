import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ChatBox from "@/components/AdminComponents/ChatBox";
import {
    LogOut,
    LayoutDashboard,
    Hotel,
    CalendarDays,
    Users,
    Key,
    ClipboardList,
    Menu as MenuIcon,
    PanelLeft,
    PanelRight,
    ChevronDown,
    Settings,
    LifeBuoy,
    Bell,
    UserPlus,
    ShoppingCart,
    UtensilsCrossed,
    MessageCircle,
    CheckCheck,
    RefreshCw
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import { Badge } from "@/components/ui/badge";
import api from "@/services/api";
import logo from "../../images/logo1.png"; // Adjust this path to your actual logo location

const AdminLayout = ({
    children,
    pageTitle
}: {
    children?: React.ReactNode;
    pageTitle?: string;
}) => {
    const [isSidebarOpen, setSidebarOpen] = useState(() => {
        const savedState = localStorage.getItem('adminSidebarOpen');
        return savedState !== null ? JSON.parse(savedState) : true;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [messages, setMessages] = useState<any[]>([]);
    const [chatFilter, setChatFilter] = useState<"all" | "guest" | "staff">("all");
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

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const location = useLocation();

    const routesMap: any = {
        "/dashboard": "Dashboard",
        "/bookings": "Bookings",
        "/walk-in-guests": "Walk-in Guests",
        "/rooms": "Rooms",
        "/guests": "Guests",
        "/reports": "Reports",
    };

    const getPageTitle = () => {
        return routesMap[location.pathname] || "Dashboard";
    };

    useEffect(() => {
        localStorage.setItem('adminSidebarOpen', JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
        }
    }, []);

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            console.log("Logout API failed");
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const handleNavigation = (href: string) => {
        navigate(href);
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
        return 'U';
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
        return user?.email?.split('@')[0] || 'Admin';
    };

    const isFetching = useRef(false);

    const fetchMessages = async () => {
        if (!user?.id || isFetching.current) return;

        isFetching.current = true;

        try {
            const res = await api.get(`/messages/conversations`);
            const data = Array.isArray(res.data) ? res.data : [];

            setMessages(prev => {
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

            setUnreadMessages(prev =>
                prev === unread ? prev : unread
            );

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

            const wasAtBottom =
                notifRef.current &&
                notifRef.current.scrollHeight - notifRef.current.scrollTop <= notifRef.current.clientHeight + 5;

            const res = await api.get(
                `/notifications/user/${user.id}?limit=10&offset=${offset}`
            );

            const notificationsData = (res.data || []).map((n: any) => {
                if (!timeMapRef.current[n.id]) {
                    timeMapRef.current[n.id] = timeAgo(n.created_at);
                }

                return {
                    ...n,
                    display_time: timeMapRef.current[n.id] // 🔥 LOCK TIME
                };
            });
            setNotifications(prev => {
                if (offset === 0) {
                    return prev.length === notificationsData.length ? prev : notificationsData;
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

            const unreadRes = await api.get(`/notifications/user/${user.id}/unread-count`);
            setUnreadCount(unreadRes.data.count);

            let hasChanged = false;

            if (hasChanged) {
                requestAnimationFrame(() => {
                    if (notifRef.current && !wasAtBottom && !isNotifOpen) {
                        notifRef.current.scrollTop = scrollTop;
                    }
                });
            }

        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            if (isFirstLoad.current) {
                setNotificationsLoading(false);
                isFirstLoad.current = false;
            }
        }
    }, [user?.id, isNotifOpen, offset]);

    const markNotificationAsRead = async (id: number) => {
        try {
            isClickingNotif.current = true; // 🔥 IMPORTANT

            await api.put(`/notifications/${id}/read`);

            const scrollTop = notifRef.current?.scrollTop || 0;

            setNotifications(prev =>
                prev.map(n =>
                    n.id === id ? { ...n, is_read: true } : n
                )
            );

            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));

            // restore scroll
            setTimeout(() => {
                if (notifRef.current) {
                    notifRef.current.scrollTop = scrollTop;
                }
                isClickingNotif.current = false; // 🔥 reset after click
            }, 0);

        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const markAllNotificationsAsRead = async () => {
        try {
            await api.put(`/notifications/user/${user.id}/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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

        // 🔥 ONLY FETCH WHEN FIRST LOAD
        if (offset === 0) {
            fetchNotifications();
        }

        const interval = setInterval(() => {
            if (!isNotifOpen && offset === 0) {
                fetchNotifications();
            }
        }, 5000);

        return () => clearInterval(interval);

    }, [user?.id, offset, isNotifOpen]);
    useEffect(() => {
        if (!user?.id) return;

        fetchMessages();

        const interval = setInterval(() => {
            fetchMessages();
        }, 3000);

        return () => clearInterval(interval);
    }, [user?.id]);

    if (!user) {
        return null;
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;

            const insideChatDropdown = chatDropdownRef.current?.contains(target);
            const insideChatBox = chatBoxRef.current?.contains(target);
            const insideChatButton = chatButtonRef.current?.contains(target);

            const insideNotifDropdown = notifDropdownRef.current?.contains(target);
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

        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navigationGroups = [
        {
            label: "MAIN",
            items: [
                { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                { name: "Bookings", href: "/bookings", icon: CalendarDays },
            ],
        },
        {
            label: "OPERATIONS",
            items: [
                { name: "Walk-in", href: "/walk-in-guests", icon: UserPlus },
            ],
        },
        {
            label: "MANAGEMENT",
            items: [
                { name: "Rooms", href: "/rooms", icon: Key },
                { name: "Guests", href: "/guests", icon: Users },
            ],
        },
        {
            label: "RESTAURANT",
            items: [
                { name: "Menu", href: "/admin/menu", icon: ShoppingCart },
                { name: "Orders", href: "/admin/orders", icon: UtensilsCrossed },
            ],
        },
        {
            label: "ANALYTICS",
            items: [
                { name: "Reports", href: "/reports", icon: ClipboardList },
            ],
        },
    ];

    const timeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);

        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "Just now";

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;

        const years = Math.floor(days / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    };

    const MessageDropdownContent = () => {
        return (
            <div className="chat-dropdown w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-sm">

                {/* HEADER */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">

                    {/* LEFT → TITLE */}
                    <h2 className="text-base font-bold text-gray-900">
                        Chats
                    </h2>

                    {/* RIGHT → FILTER + ACTION */}
                    <div className="flex items-center gap-4">

                        {/* FILTER */}
                        <div className="flex gap-2">
                            {["all", "guest", "staff"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setChatFilter(type as any)}
                                    className={`px-3 py-1 text-xs rounded-full capitalize transition ${chatFilter === type
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* ACTION */}
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

                {/* MESSAGE LIST */}
                <div
                    ref={messageRef}
                    data-scroll-area
                    className="max-h-96 overflow-y-auto scrollbar-hide px-2 py-2"
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
                                return c.user?.role?.toLowerCase() === chatFilter;
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
                                                name: chatUser.first_name
                                            });

                                            setMessages(prev =>
                                                prev.map(msg =>
                                                    msg.user.id === chatUser.id
                                                        ? { ...msg, unread: 0 }
                                                        : msg
                                                )
                                            );

                                            fetchMessages();
                                        }}
                                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition rounded-lg mb-1"
                                    >
                                        <div className="flex items-center gap-3">

                                            {/* AVATAR */}
                                            <Avatar className="h-9 w-9 border-0 ring-0 shadow-none overflow-hidden">
                                                <AvatarImage
                                                    src={chatUser.avatar_url}
                                                    className="h-full w-full object-cover border-0"
                                                />
                                                <AvatarFallback
                                                    className="bg-emerald-500 text-white flex items-center justify-center w-full h-full border-0 ring-0 shadow-none"
                                                >
                                                    {chatUser.first_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* NAME + MESSAGE */}
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
                                                    {c.last_sender_id === user?.id && (
                                                        <span className="text-gray-400">You: </span>
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

                {/* FOOTER */}
                <div className="text-center py-3 border-t border-gray-100">
                    <button
                        onClick={() => handleNavigation('/messages')}
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

                {/* HEADER */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">

                    <h2 className="text-base font-bold text-gray-900">
                        Notifications
                    </h2>

                    <div className="flex items-center gap-3">

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllNotificationsAsRead}
                                className="text-xs text-emerald-600 hover:text-emerald-700"
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

                {/* LIST + GRADIENT */}
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
                        className={`${expanded ? 'max-h-[600px]' : 'max-h-96'} overflow-y-auto px-2 py-2`}
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
                                        onClick={() => markNotificationAsRead(n.id)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition rounded-lg mb-1 ${!n.is_read ? "bg-blue-50" : ""
                                            }`}
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

                                {/* SEE MORE BUTTON */}
                                {!expanded && notifications.length >= 10 && (
                                    <div className="text-center py-3">
                                        <button
                                            onClick={async () => {
                                                isClickingNotif.current = true;

                                                const newOffset = offset + 10;
                                                setOffset(newOffset);
                                                setExpanded(true);

                                                // 🔥 DIRECT FETCH (ETO ANG KULANG MO)
                                                const res = await api.get(
                                                    `/notifications/user/${user.id}?limit=10&offset=${newOffset}`
                                                );

                                                const data = res.data || [];

                                                setNotifications(prev => {
                                                    const merged = [...prev, ...data];
                                                    return merged.slice(0, 20);
                                                });
                                            }}
                                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            See previous notifications
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* GRADIENT FADE */}
                    {!expanded && notifications.length >= 10 && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed top-0 left-0 h-full bg-gradient-to-b from-emerald-900 to-emerald-950 text-white transition-all duration-300 z-50 flex flex-col
                        ${isSidebarOpen ? 'w-64' : 'w-20'} 
                        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
                >
                    {/* Logo Section - Circle matches logo size */}
                    <div className={`h-16 flex items-center ${isSidebarOpen ? 'px-6' : 'justify-center'} border-b border-emerald-800/50 shrink-0`}>
                        <div
                            onClick={() => handleNavigation('/dashboard')}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            {/* Logo with White Circle - Exactly matching logo size */}
                            <div className="h-12 w-12 rounded-full overflow-hidden">
                                <img
                                    src={logo}
                                    alt="Traveler's Inn Logo"
                                    className="h-full w-auto object-contain scale-125"
                                    onError={(e) => {
                                        // Fallback if logo fails to load
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            const fallbackIcon = document.createElement('div');
                                            fallbackIcon.className = 'h-7 w-7 text-emerald-600 flex items-center justify-center';
                                            fallbackIcon.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>';
                                            parent.appendChild(fallbackIcon);
                                        }
                                    }}
                                />
                            </div>
                            {isSidebarOpen && (
                                <span className="font-bold text-lg tracking-tight">Traveler's Inn</span>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto scrollbar-hide">
                        {navigationGroups.map((group) => (
                            <div key={group.label}>
                                {isSidebarOpen && (
                                    <p className="text-xs text-emerald-400 uppercase px-3 mb-2">
                                        {group.label}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = location.pathname === item.href;
                                        return (
                                            <div
                                                key={item.name}
                                                onClick={() => handleNavigation(item.href)}
                                                className={`
                                                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                                                    cursor-pointer
                                                    ${isActive
                                                        ? 'bg-emerald-600 text-white shadow-lg'
                                                        : 'text-emerald-100 hover:bg-emerald-800/50 hover:text-white'
                                                    }
                                                    ${!isSidebarOpen && 'justify-center'}
                                                `}
                                            >
                                                <item.icon className="h-5 w-5 shrink-0" />
                                                {isSidebarOpen && (
                                                    <span className="text-sm font-medium">
                                                        {item.name}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User Menu */}
                    <div className="border-t border-emerald-800/50 p-4 shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={`
                                        w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-800/50 transition-colors group
                                        focus:outline-none focus:ring-0
                                        ${!isSidebarOpen && 'justify-center'}
                                        cursor-pointer
                                    `}
                                >
                                    <Avatar className={`${isSidebarOpen ? 'h-10 w-10' : 'h-9 w-9'} border-2 border-emerald-500 shadow-md`}>
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold">
                                            {getUserInitials()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isSidebarOpen && (
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-semibold truncate text-white">
                                                {getDisplayName()}
                                            </p>
                                            <p className="text-xs text-emerald-300 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    )}
                                    {isSidebarOpen && (
                                        <ChevronDown className="h-4 w-4 text-emerald-400 group-hover:text-white transition-colors" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                side="top"
                                className="mb-2 bg-gradient-to-b from-emerald-900 to-emerald-950 border border-emerald-800 shadow-lg rounded-lg min-w-[200px]"
                            >
                                <DropdownMenuItem asChild>
                                    <div
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 text-emerald-100 cursor-pointer hover:bg-emerald-800/50"
                                    >
                                        <Settings className="h-4 w-4 text-emerald-400" />
                                        <span>Settings</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <div
                                        onClick={() => handleNavigation('/help')}
                                        className="flex items-center gap-2 px-3 py-2 text-emerald-100 cursor-pointer hover:bg-emerald-800/50"
                                    >
                                        <LifeBuoy className="h-4 w-4 text-emerald-400" />
                                        <span>Help Center</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer hover:bg-red-900/30 px-3 py-2"
                                >
                                    <LogOut className="mr-2 h-4 w-4 text-red-400" />
                                    <span className="text-red-400">Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                    {/* TRANSPARENT HEADER */}
                    <header className="bg-transparent sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-gray-200/50">
                        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                >
                                    <MenuIcon className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hidden lg:flex"
                                    onClick={toggleSidebar}
                                >
                                    {isSidebarOpen ? (
                                        <PanelLeft className="h-5 w-5" />
                                    ) : (
                                        <PanelRight className="h-5 w-5" />
                                    )}
                                </Button>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    {getPageTitle()}
                                </h1>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Messages Dropdown */}
                                <div className="relative">

                                    {/* CHAT BUTTON */}

                                    <button
                                        ref={chatButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsNotifOpen(false);
                                            setIsChatOpen(prev => !prev);
                                        }}
                                        className="relative p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <MessageCircle className="h-5 w-5" />

                                        {unreadMessages > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] px-1.5 rounded-full">
                                                {unreadMessages}
                                            </span>
                                        )}
                                    </button>

                                    {/* CHAT DROPDOWN */}
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

                                {/* Notifications Dropdown */}
                                <div className="relative">

                                    {/* NOTIF BUTTON */}
                                    <button
                                        ref={notifButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsChatOpen(false);

                                            setIsNotifOpen(prev => {
                                                const next = !prev;

                                                if (next) {
                                                    setOffset(0); // 🔥 reset ONLY when opening
                                                    setExpanded(false);
                                                }

                                                return next;
                                            });
                                        }}
                                        className="relative p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <Bell className="h-5 w-5" />

                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* NOTIF DROPDOWN */}
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

                    <div className="px-4 sm:px-6 lg:px-8 pb-4 h-[calc(100vh-64px)] flex flex-col">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* CHAT BOX HERE */}
            {activeChatUser && (
                <div ref={chatBoxRef}>
                    <ChatBox
                        userId={activeChatUser.id}
                        userName={activeChatUser.name}
                        onClose={() => setActiveChatUser(null)}
                        onMessageSent={(msg) => {
                            setMessages(prev => {
                                const exists = prev.find(m => m.user.id === activeChatUser.id);

                                if (exists) {
                                    // update existing convo
                                    return prev.map(m =>
                                        m.user.id === activeChatUser.id
                                            ? {
                                                ...m,
                                                last_message: msg,
                                                last_sender_id: user.id,
                                                unread: 0
                                            }
                                            : m
                                    );
                                }
                                return [
                                    {
                                        user: { id: activeChatUser.id, first_name: activeChatUser.name },
                                        last_message: msg,
                                        last_sender_id: user.id,
                                        unread: 0
                                    },
                                    ...prev
                                ];
                            });
                        }}
                    />
                </div>
            )}


            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
};

export default AdminLayout;
