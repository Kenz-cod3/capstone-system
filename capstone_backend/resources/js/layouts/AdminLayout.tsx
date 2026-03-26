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
    const [unreadMessages, setUnreadMessages] = useState(0);

    const messageRef = useRef<HTMLDivElement | null>(null);

    const [messagesLoading, setMessagesLoading] = useState(false);

    const [activeChatUser, setActiveChatUser] = useState<{
        id: number;
        name: string;
    } | null>(null);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const notifRef = useRef<HTMLDivElement | null>(null);
    const isScrolling = useRef(false);
    const notifScroll = useRef(0);
    const isFirstLoad = React.useRef(true);
    const isClickingNotif = useRef(false);

    const [notificationsLoading, setNotificationsLoading] = useState(false);

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
            await api.post("/auth/logout"); // may token pa dito ✅
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

    const fetchMessages = useCallback(async () => {
        if (!user?.id) return;

        if (messages.length === 0) {
            setMessagesLoading(true);
        }

        try {
            const res = await api.get(`/messages/conversations`);
            const data = Array.isArray(res.data) ? res.data : [];

            // ✅ SAVE SCROLL
            const scrollTop = messageRef.current?.scrollTop || 0;

            setMessages(prev => {
                if (JSON.stringify(prev) === JSON.stringify(data)) {
                    return prev;
                }
                return data;
            });

            // ✅ FIX UNREAD (no unnecessary re-render)
            const unread = data.reduce((sum, c) => sum + (c.unread || 0), 0);

            setUnreadMessages(prev =>
                prev === unread ? prev : unread
            );

            // ✅ RESTORE SCROLL
            setTimeout(() => {
                if (messageRef.current) {
                    messageRef.current.scrollTop = scrollTop;
                }
            }, 0);

        } catch (err) {
            console.error(err);
        } finally {
            if (messages.length === 0) {
                setMessagesLoading(false);
            }
        }
    }, [user?.id]);



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

            const wasAtBottom =
                notifRef.current &&
                notifRef.current.scrollHeight - notifRef.current.scrollTop <= notifRef.current.clientHeight + 5;

            const res = await api.get(`/notifications/user/${user.id}`);

            const notificationsData = res.data || [];

            // ✅ unread count (backend source of truth)
            const unreadRes = await api.get(`/notifications/user/${user.id}/unread-count`);
            setUnreadCount(unreadRes.data.count);

            let hasChanged = false;

            setNotifications(prev => {
                const merged = notificationsData;

                const isSame =
                    prev.length === merged.length &&
                    prev.every(p =>
                        merged.some((m: any) => m.id === p.id && m.is_read === p.is_read)
                    );

                if (isSame) return prev;

                hasChanged = true;

                return merged;
            });

            // ✅ RESTORE SCROLL
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
    }, [user?.id, isNotifOpen]);

    const markNotificationAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);

            // update UI agad (no refresh needed)
            setNotifications(prev =>
                prev.map(n =>
                    n.id === id ? { ...n, is_read: true } : n
                )
            );

            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));

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

        fetchNotifications();
        fetchMessages();

        const interval = setInterval(() => {
            fetchNotifications();
            fetchMessages();
        }, 7000);

        return () => clearInterval(interval);
    }, []);

    if (!user) {
        return null;
    }

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
                { name: "Products", href: "/products", icon: ShoppingCart },
                { name: "Orders", href: "/orders", icon: UtensilsCrossed },
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
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

        const days = Math.floor(hours / 24);
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days} days ago`;

        return date.toLocaleDateString();
    };

    const MessageDropdownContent = () => {
        return (
            <div className="w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-lg">
                    <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
                    <div className="flex items-center gap-2">
                        {/* {unreadMessages > 0 && (
                            <button
                                onClick={markAllMessagesAsRead}
                                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                                <CheckCheck className="h-3 w-3" />
                                Mark all read
                            </button>
                        )} */}
                        <button
                            onClick={refreshData}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            <RefreshCw className="h-3 w-3" />
                        </button>
                        <span className="text-xs text-gray-500">{unreadMessages} unread</span>
                    </div>
                </div>

                <div ref={messageRef} className="max-h-96 overflow-y-auto scrollbar-hide">
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
                        messages.map((c) => {
                            const user = c.user;

                            if (!user) return null; // ✅ IMPORTANT FIX

                            return (
                                <div
                                    key={user.id}
                                    onClick={() => {
                                        setActiveChatUser({
                                            id: user.id,
                                            name: user.first_name
                                        });
                                        fetchMessages();
                                    }}
                                    className="px-4 py-3 border-b cursor-pointer hover:bg-gray-50"
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-semibold text-gray-800">
                                            {user.first_name}
                                        </p>

                                        {c.unread > 0 && (
                                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                                {c.unread}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 truncate">
                                        {c.last_message}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="text-center py-2 border-t bg-white rounded-b-lg">
                    <button
                        onClick={() => {
                            handleNavigation('/messages');
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                        View all messages
                    </button>
                </div>
            </div>
        )
    };

    const NotificationDropdownContent = () => (
        <div className="w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-800">Notifications</h2>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllNotificationsAsRead}
                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        >
                            <CheckCheck className="h-3 w-3" />
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={refreshData}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        <RefreshCw className="h-3 w-3" />
                    </button>
                    <span className="text-xs text-gray-500">{unreadCount} unread</span>
                </div>
            </div>

            <div
                ref={notifRef}
                onScroll={(e) => {
                    notifScroll.current = e.currentTarget.scrollTop;

                    isScrolling.current = true;

                    setTimeout(() => {
                        isScrolling.current = false;
                    }, 800);
                }}
                className="max-h-96 overflow-y-auto scrollbar-hide"
            >
                {notificationsLoading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        You're all caught up 🎉
                    </div>
                ) : (
                    notifications.map((n) => {
                        const time = timeAgo(n.created_at);
                        return (
                            <div
                                key={n.id}
                                onClick={() => markNotificationAsRead(n.id)}
                                className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors relative
                                    ${!n.is_read ? 'bg-blue-50' : 'bg-white'}`}
                            >
                                {!n.is_read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                )}
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-semibold text-gray-800 pr-6">
                                        {n.title}
                                    </p>
                                    {!n.is_read && (
                                        <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                    {n.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {time}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="text-center py-2 border-t bg-white rounded-b-lg">
                <button
                    onClick={() => {
                        handleNavigation('/notifications');
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                    View all notifications
                </button>
            </div>
        </div>
    );

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
                    {/* Logo */}
                    <div className={`h-16 flex items-center ${isSidebarOpen ? 'px-6' : 'justify-center'} border-b border-emerald-800/50 shrink-0`}>
                        <div
                            onClick={() => handleNavigation('/dashboard')}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                                <Hotel className="h-5 w-5 text-white" />
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
                    <header className="bg-white sticky top-0 z-30 border-b border-gray-200">
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="relative">
                                            <MessageCircle className="h-5 w-5" />
                                            {unreadMessages > 0 && (
                                                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-blue-500 text-white text-[10px]">
                                                    {unreadMessages > 99 ? '99+' : unreadMessages}
                                                </Badge>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="p-0 bg-transparent border-none shadow-none">
                                        <MessageDropdownContent />
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Notifications Dropdown */}
                                <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="relative">
                                            <Bell className="h-5 w-5" />
                                            {unreadCount > 0 && (
                                                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px]">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </Badge>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="p-0 bg-transparent border-none shadow-none">
                                        <NotificationDropdownContent />
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-64px)] flex flex-col">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* 🔥 CHAT BOX HERE */}
            {activeChatUser && (
                <ChatBox
                    userId={activeChatUser.id}
                    userName={activeChatUser.name}
                    onClose={() => setActiveChatUser(null)}
                    onMessageSent={fetchMessages}
                />
            )}


            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
};

export default AdminLayout;