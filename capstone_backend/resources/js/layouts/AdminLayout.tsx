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
    PanelRight,
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
    Menu,
    X,
    Package,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import api, { API_BASE } from "@/services/api";
import logo from "../../images/logo1.png";
import Echo from "@/services/echo";

const AdminLayout = ({
    children,
    pageTitle
}: {
    children?: React.ReactNode;
    pageTitle?: string;
}) => {
    const [isSidebarOpen, setSidebarOpen] = useState(() => {
        const savedState = localStorage.getItem('adminSidebarOpen');
        // On mobile, default to closed
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        if (isMobile) return false;
        return savedState !== null ? JSON.parse(savedState) : true;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const [messages, setMessages] = useState<any[]>([]);
    const [chatFilter, setChatFilter] = useState<"all" | "guest" | "staff">("all");
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const messageRef = useRef<HTMLDivElement | null>(null);
    const chatButtonRef = useRef<HTMLButtonElement | null>(null);
    const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

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
    const isFirstLoad = useRef(true);
    const isClickingNotif = useRef(false);
    const notifButtonRef = useRef<HTMLButtonElement | null>(null);
    const notifDropdownRef = useRef<HTMLDivElement | null>(null);
    const timeMapRef = useRef<{ [key: number]: string }>({});
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [offset, setOffset] = useState(0);

    // State for dropdown toggles
    const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>(() => {
        const saved = localStorage.getItem("adminDropdowns");
        return saved
            ? JSON.parse(saved)
            : {
                bookings: false,
                users: false,
            };
    });

    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("user") || "null") : null;
    const location = useLocation();

    const routesMap: any = {
        "/dashboard": "Dashboard",
        "/bookings": "Bookings",
        "/booking-transactions": "Booking List",
        "/booking-receipts": "Booking Transaction",
        "/incidents": "Incidents Reports",
        "/walk-in-guests": "Walk-in Guests",
        "/rooms": "Rooms",
        "/expenses": "All Cash Transactions",
        "/cash-management": "Cash Management",
        "/guests": "Online Guests",
        "/walkin-guest": "WalkIn Guest",
        "/staff": "System Users",
        "/housekeepers": "House Keepers",
        "/admin/menu": "Menu",
        "/admin/orders": "Orders Report",
        "/reports": "Reports",
    };

    const getPageTitle = () => {
        return routesMap[location.pathname] || "Dashboard";
    };

    useEffect(() => {
        const isMobile = window.innerWidth < 1024;
        if (!isMobile) {
            localStorage.setItem('adminSidebarOpen', JSON.stringify(isSidebarOpen));
        }
    }, [isSidebarOpen]);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 1024;
            if (!isMobile) {
                setIsMobileMenuOpen(false);
                const savedState = localStorage.getItem('adminSidebarOpen');
                if (savedState !== null) {
                    setSidebarOpen(JSON.parse(savedState));
                } else {
                    setSidebarOpen(true);
                }
            } else {
                setSidebarOpen(false);
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        localStorage.setItem("adminDropdowns", JSON.stringify(openDropdowns));
    }, [openDropdowns]);

    useEffect(() => {
        setOpenDropdowns((prev: any) => ({
            ...prev,
            bookings: location.pathname.includes("booking")
                ? true
                : prev.bookings,
            users:
                location.pathname.includes("guest") ||
                    location.pathname.includes("staff") ||
                    location.pathname.includes("housekeeper")
                    ? true
                    : prev.users,
        }));
    }, [location.pathname]);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
        }
    }, [navigate]);

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
        setIsMobileMenuOpen(false);
        // On mobile, close sidebar after navigation
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const toggleSidebar = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsTransitioning(true);
        setSidebarOpen(!isSidebarOpen);
        setTimeout(() => setIsTransitioning(false), 300);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const toggleDropdown = (dropdownName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenDropdowns(prev => ({
            ...prev,
            [dropdownName]: !prev[dropdownName]
        }));
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
            setUnreadMessages(prev => prev === unread ? prev : unread);
        } catch (err) {
            console.error(err);
        } finally {
            isFetching.current = false;
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
                `/notifications/user/${user.id}?limit=10&offset=${offset}`
            );

            const notificationsData = (res.data || []).map((n: any) => {
                if (!timeMapRef.current[n.id]) {
                    timeMapRef.current[n.id] = timeAgo(n.created_at);
                }
                return {
                    ...n,
                    display_time: timeMapRef.current[n.id]
                };
            });

            setNotifications(prev => {
                if (offset === 0) {
                    return notificationsData;
                }

                const existingIds = new Set(prev.map(n => n.id));

                const merged = [
                    ...notificationsData.filter((n: any) => !existingIds.has(n.id)),
                    ...prev
                ];

                return merged.slice(0, 20);
            });

            setTimeout(() => {
                if (notifRef.current && isClickingNotif.current) {
                    const newHeight = notifRef.current.scrollHeight;
                    notifRef.current.scrollTop = scrollTop + (newHeight - prevHeight);
                    isClickingNotif.current = false;
                }
            }, 0);

            const unreadRes = await api.get(`/notifications/user/${user.id}/unread-count`);
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

            setNotifications(prev => {
                const updated = [...prev];

                const index = updated.findIndex(n => n.id === id);

                if (index !== -1) {
                    updated[index] = {
                        ...updated[index],
                        is_read: true
                    };
                }

                return updated;
            });

            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));

            requestAnimationFrame(() => {
                if (notifRef.current) {
                    notifRef.current.scrollTop = scrollTop;
                }

                setTimeout(() => {
                    isClickingNotif.current = false;
                }, 300);
            });
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

        // INITIAL LOAD
        fetchNotifications();

        // 🔥 REALTIME NOTIFICATIONS
        Echo.private(`notifications.${user.id}`)
            .listen(".NotificationCreated", (e: any) => {
                console.log("🔔 REALTIME:", e);

                const newNotification = e.notification;

                setNotifications((prev) => {
                    const exists = prev.some((n) => n.id === newNotification.id);

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
            });

        return () => {
            Echo.leave(`notifications.${user.id}`);
        };
    }, [user?.id]);

    useEffect(() => {

        if (!user?.id) return;

        // 🔥 INITIAL LOAD
        fetchMessages();

        console.log(
            "📩 LISTENING CHAT:",
            `chat.${user.id}`
        );

        Echo.channel(`chat.${user.id}`)
            .listen(".MessageSent", (e: any) => {

                console.log(
                    "📩 REALTIME MESSAGE:",
                    e
                );

                fetchMessages();

            });

        return () => {

            Echo.leaveChannel(
                `chat.${user.id}`
            );
        };

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
            const insideMobileMenu = mobileMenuButtonRef.current?.contains(target);
            const insideMobileSidebar = document.querySelector('.mobile-sidebar')?.contains(target);

            if (!insideChatDropdown && !insideChatBox && !insideChatButton && !insideNotifDropdown && !insideNotifButton) {
                setIsChatOpen(false);
                setIsNotifOpen(false);
            }

            // Only close mobile menu when clicking outside, not when clicking inside dropdown items
            if (!insideMobileMenu && !insideMobileSidebar && isMobileMenuOpen) {
                // Check if click is on a dropdown item or navigation item
                const isDropdownItem = (e.target as HTMLElement).closest('[data-dropdown-item]');
                const isNavItem = (e.target as HTMLElement).closest('[data-nav-item]');
                if (!isDropdownItem && !isNavItem) {
                    setIsMobileMenuOpen(false);
                }
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, [isMobileMenuOpen]);

    const navigationGroups = [
        {
            label: "MAIN",
            items: [
                {
                    name: "Dashboard",
                    description: "Overview & Analytics",
                    href: "/dashboard",
                    icon: LayoutDashboard
                },
            ],
        },
        {
            label: "MANAGEMENT",
            items: [
                {
                    name: "Bookings Management",
                    description: "Booking Monitoring & Reservations",
                    href: "/bookings",
                    icon: CalendarDays,
                    hasDropdown: true,
                    dropdownItems: [
                        {
                            name: "Booking List",
                            description: "Manage booking list transactions",
                            href: "/booking-transactions",
                            icon: CalendarDays
                        },
                        {
                            name: "Booking Transactions",
                            description: "View and print transaction",
                            href: "/booking-receipts",
                            icon: ClipboardList
                        },
                        {
                            name: "Incidents Rooms",
                            description: "View reported Incidents",
                            href: "/incidents",
                            icon: ClipboardList
                        }
                    ]
                },
                {
                    name: "Rooms",
                    description: "Room Management",
                    href: "/rooms",
                    icon: Key
                },
                {
                    name: "Add-Ons",
                    description: "Manage room add-ons",
                    href: "/add-ons",
                    icon: Package
                },
                {
                    name: "User & Guest",
                    description: "User & Guest Management",
                    href: "/users",
                    icon: Users,
                    hasDropdown: true,
                    dropdownItems: [
                        {
                            name: "Online Guest",
                            description: "Guest profiles and history",
                            href: "/guests",
                            icon: Users
                        },
                        {
                            name: "Walk-in Guests",
                            description: "Manage walk-in guest records",
                            href: "/walkin-guest",
                            icon: Users
                        },
                        {
                            name: "System Users",
                            description: "Admin & Employee accounts and roles",
                            href: "/staff",
                            icon: Users
                        },
                        // {
                        //     name: "House Keeper",
                        //     description: "Housekeeping assignments",
                        //     href: "/housekeepers",
                        //     icon: Users
                        // }
                    ]
                },
            ],
        },
        {
            label: "FINANCE",
            items: [
                {
                    name: "Cash Management",
                    description: "Cash transactions",
                    href: "/cash-management",
                    icon: TrendingUp,
                },
                {
                    name: "Expenses",
                    description: "Expense tracking",
                    href: "/expenses",
                    icon: TrendingDown,
                },
            ],
        },
        {
            label: "RESTAURANT",
            items: [
                {
                    name: "Menu",
                    description: "Food & Beverage",
                    href: "/admin/menu",
                    icon: ShoppingCart
                },
                {
                    name: "Orders Report",
                    description: "Order Sales Management",
                    href: "/admin/orders",
                    icon: UtensilsCrossed
                },
            ],
        },
        {
            label: "REPORTS & ANALYTICS",
            items: [
                {
                    name: "Reports",
                    description: "Reports & Analytics",
                    href: "/reports",
                    icon: ClipboardList
                },
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

    // Render navigation item with nested dropdown and vertical line indicators
    const renderNavItem = (item: any, isSidebarOpen: boolean, depth: number = 0, isMobile: boolean = false) => {
        const isActive = location.pathname === item.href ||
            (item.dropdownItems && item.dropdownItems.some((subItem: any) => location.pathname === subItem.href));
        const isOpen = openDropdowns[`${isMobile ? 'mobile_' : ''}${item.name.toLowerCase()}`];

        if (item.hasDropdown && (isSidebarOpen || isMobile)) {
            return (
                <div key={item.name} className="space-y-1 select-none">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            const dropdownKey = `${isMobile ? 'mobile_' : ''}${item.name.toLowerCase()}`;
                            setOpenDropdowns(prev => ({
                                ...prev,
                                [dropdownKey]: !prev[dropdownKey]
                            }));
                        }}
                        className={`
                            flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all duration-200 group cursor-pointer
                            ${isActive
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <item.icon className="h-4 w-4 shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs font-medium truncate">
                                    {item.name}
                                </span>
                                <span className={`text-[8px] truncate ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>
                                    {item.description}
                                </span>
                            </div>
                        </div>
                        <ChevronRight
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${isActive ? 'text-white' : 'text-gray-400'}`}
                        />
                    </div>

                    {isOpen && (
                        <div className="relative ml-2 pl-4 select-none">
                            <div className="absolute left-2 top-5 bottom-5 w-px bg-gray-200"></div> {/*line for dropdown*/}
                            <div className="space-y-1">
                                {item.dropdownItems.map((subItem: any) => {
                                    const isSubActive = location.pathname === subItem.href;
                                    return (
                                        <div
                                            key={subItem.name}
                                            data-dropdown-item="true"
                                            onClick={() => {
                                                handleNavigation(subItem.href);
                                            }}
                                            className={`
                                                relative flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-200 group cursor-pointer
                                                ${isSubActive
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }
                                            `}
                                        >
                                            <subItem.icon className="h-4 w-4 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-medium truncate block">
                                                    {subItem.name}
                                                </span>
                                                {subItem.description && (
                                                    <p className={`text-[8px] truncate ${isSubActive ? 'text-emerald-100' : 'text-gray-400'}`}>
                                                        {subItem.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // For closed sidebar or items without dropdown
        return (
            <div
                key={item.name}
                data-nav-item="true"
                onClick={() => handleNavigation(item.href)}
                className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group cursor-pointer select-none
                    ${isActive
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${!isSidebarOpen && !isMobile && 'justify-center'}
                `}
                title={!isSidebarOpen && !isMobile ? item.name : undefined}
            >
                <item.icon className={`h-4 w-4 shrink-0 transition-all duration-200 ${!isSidebarOpen && !isMobile ? 'mx-auto' : ''}`} />
                <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${(!isSidebarOpen && !isMobile) ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    <span className="text-xs font-medium truncate">
                        {item.name}
                    </span>
                    <span className={`text-[8px] truncate ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {item.description}
                    </span>
                </div>
            </div>
        );
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
                                    className={`px-3 py-1 text-xs rounded-full capitalize transition ${chatFilter === type
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        } select-none`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={refreshData} className="text-gray-500 hover:text-gray-700">
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-gray-500">{unreadMessages} unread</span>
                        </div>
                    </div>
                </div>

                <div ref={messageRef} data-scroll-area className="max-h-96 overflow-y-auto scrollbar-mint px-2 py-2">
                    {messagesLoading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                            Loading messages...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">No messages</div>
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
                                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition rounded-lg mb-1 select-none"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border-0 ring-0 shadow-none overflow-hidden">
                                                <AvatarImage src={chatUser.avatar_url} className="h-full w-full object-cover border-0" />
                                                <AvatarFallback className="bg-emerald-500 text-white flex items-center justify-center w-full h-full border-0 ring-0 shadow-none">
                                                    {chatUser.first_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{chatUser.first_name}</p>
                                                    {c.unread > 0 && (
                                                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                                            {c.unread}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {c.last_sender_id === user?.id && <span className="text-gray-400">You: </span>}
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
                    <button onClick={() => handleNavigation('/messages')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
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
                    <h2 className="text-base font-bold text-gray-900">Notifications</h2>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button onClick={markAllNotificationsAsRead} className="text-xs text-emerald-600 hover:text-emerald-700 select-none">
                                Mark all
                            </button>
                        )}
                        <button onClick={refreshData} className="text-gray-500 hover:text-gray-700">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-gray-500">{unreadCount} unread</span>
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
                        className={`${expanded ? 'max-h-[600px]' : 'max-h-96'} overflow-y-auto scrollbar-mint px-2 py-2`}
                    >
                        {notificationsLoading ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                        ) : (
                            <>
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => markNotificationAsRead(n.id)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-lg mb-1 select-none ${!n.is_read ? "bg-emerald-50" : ""}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
                                            {!n.is_read && <div className="h-2 w-2 bg-emerald-500 rounded-full ml-2 flex-shrink-0"></div>}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
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
                                                const res = await api.get(`/notifications/user/${user.id}?limit=10&offset=${newOffset}`);
                                                const data = res.data || [];
                                                setNotifications(prev => {
                                                    const merged = [...prev, ...data];
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

    return (
        <>
            <style>{`
                /* Apply DM Sans font to the entire admin layout */
                .min-h-screen, 
                .min-h-screen * {
                    font-family: 'DM Sans', sans-serif;
                }
                
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
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 10px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                .sidebar-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db #f1f1f1;
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
                .sidebar-transition {
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .content-transition {
                    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>

            <div className="min-h-screen bg-gray-50 font-sans">
                {/* Mobile Menu Backdrop */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Desktop Sidebar - White background with smooth transition */}
                <aside
                    className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 text-gray-700 z-50 flex flex-col sidebar-transition
                        ${isSidebarOpen ? 'w-64' : 'w-20'} 
                        hidden lg:flex shadow-sm`}
                >
                    {/* Logo Section - Centered when closed */}
                    <div className={`h-20 flex items-center ${isSidebarOpen ? 'px-6' : 'justify-center'} shrink-0 border-b border-gray-200 transition-all duration-300`}>
                        <div
                            onClick={() => handleNavigation('/dashboard')}
                            className={`
                                         flex items-center cursor-pointer hover:opacity-80 transition-all duration-300 select-none
                                        ${isSidebarOpen ? 'gap-3' : 'justify-center w-full'}
                                    `}
                        >
                            <div className={`
                                            rounded-full overflow-hidden flex items-center justify-center flex-shrink-0
                                            ${isSidebarOpen ? 'h-10 w-10' : 'h-12 w-12 mx-auto'}
                                        `}>
                                <img
                                    src={logo}
                                    alt="Traveler's Inn Logo"
                                    className="h-full w-auto object-contain scale-125"
                                    onError={(e) => {
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
                            <div className={`flex flex-col transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 w-0'}`}>
                                <span className="font-bold text-sm tracking-tight leading-tight text-gray-800 whitespace-nowrap">Lynn Ennia's</span>
                                <span className="text-[10px] text-emerald-600/80 tracking-wide whitespace-nowrap">Traveler's Inn</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation with Scrollbar - No blinking on icons */}
                    <nav className={`flex-1 py-6 px-3 overflow-y-auto sidebar-scrollbar transition-all duration-300`}>
                        <div className="space-y-6">
                            {navigationGroups.map((group) => (
                                <div key={group.label}>
                                    <div className={`transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 h-auto mb-2' : 'opacity-0 h-0 mb-0'}`}>
                                        {isSidebarOpen && (
                                            <p className="text-[9px] font-semibold tracking-wider text-gray-400 uppercase px-3 select-none">
                                                {group.label}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {group.items.map((item) => renderNavItem(item, isSidebarOpen, 0, false))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>

                    {/* User Menu - Avatar centered when closed */}
                    <div className={`
                                      border-t border-gray-200 py-3 shrink-0 mt-auto transition-all duration-300
                                     ${isSidebarOpen ? 'px-3' : 'px-2'}
                                `}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={`
                                                w-full flex items-center -px-2 -py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 group
                                                focus:outline-none focus:ring-0 cursor-pointer select-none
                                                ${isSidebarOpen ? 'gap-3' : 'justify-center'}
                                            `}
                                >
                                    <div className={`rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSidebarOpen ? 'h-10 w-10' : 'h-9 w-9'}`}>
                                        {user?.profile_image ? (
                                            <img
                                                src={getImageUrl(user?.profile_image) || fallback}
                                                className="w-full h-full object-cover block"
                                                style={{ objectPosition: "center 20%", transform: "scale(1.1)" }}
                                                onError={(e) => {
                                                    e.currentTarget.src = fallback;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-emerald-500 text-white text-xs font-bold">
                                                {user?.first_name?.[0] || "U"}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`flex-1 text-left transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 w-0'}`}>
                                        <p className="text-xs relative top-2 font-semibold text-gray-800 truncate leading-none select-none whitespace-nowrap">
                                            {getDisplayName()}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate select-none whitespace-nowrap">
                                            {user.email}
                                        </p>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center leading-none text-gray-400 group-hover:text-gray-600 transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                                        <ChevronUp className="h-4 w-3 -mb-1" />
                                        <ChevronDown className="h-4 w-3 -mt-1" />
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                side="top"
                                className="mb-2 bg-white border border-gray-200 shadow-lg rounded-lg min-w-[200px] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:ring-0"
                            >
                                <DropdownMenuItem
                                    asChild
                                    className="text-gray-700 focus:bg-transparent focus:outline-none focus:ring-0 data-[highlighted]:bg-gray-50 data-[highlighted]:text-gray-900"
                                >
                                    <div onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-3 py-2 text-gray-700 cursor-pointer hover:bg-gray-50 select-none">
                                        <Settings className="h-4 w-4 text-gray-500" />
                                        <span>Settings</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    asChild
                                    className="text-gray-700 focus:bg-transparent focus:outline-none focus:ring-0 data-[highlighted]:bg-gray-50 data-[highlighted]:text-gray-900"
                                >
                                    <div onClick={() => handleNavigation('/help')} className="flex items-center gap-2 px-3 py-2 text-gray-700 cursor-pointer hover:bg-gray-50 select-none">
                                        <LifeBuoy className="h-4 w-4 text-gray-500" />
                                        <span>Help Center</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-red-600 focus:bg-transparent focus:outline-none focus:ring-0 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 select-none"
                                >
                                    <LogOut className="mr-2 h-4 w-4 text-red-500" />
                                    <span className="text-red-600">Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>

                {/* Mobile Sidebar - White background with smooth transition */}
                <div
                    className={`
                        fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200
                        text-gray-700 transition-transform duration-300 ease-out z-50 flex flex-col shadow-xl lg:hidden mobile-sidebar
                        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}
                >
                    {/* Mobile Sidebar Header */}
                    <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                                <img
                                    src={logo}
                                    alt="Traveler's Inn Logo"
                                    className="h-full w-auto object-contain scale-125"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight leading-tight text-gray-800">Lynn Ennia's</span>
                                <span className="text-[10px] text-emerald-600/80 tracking-wide">Traveler's Inn</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    <nav className="flex-1 py-6 px-4 overflow-y-auto sidebar-scrollbar">
                        <div className="space-y-6">
                            {navigationGroups.map((group) => (
                                <div key={group.label}>
                                    <p className="text-[9px] font-semibold tracking-wider text-gray-400 uppercase mb-2 px-2">
                                        {group.label}
                                    </p>
                                    <div className="space-y-1">
                                        {group.items.map((item) => renderNavItem(item, true, 0, true))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>

                    {/* Mobile User Section */}
                    <div className="border-t border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                                {user?.profile_image ? (
                                    <img
                                        src={getImageUrl(user?.profile_image) || fallback}
                                        className="w-full h-full object-cover block"
                                        style={{ objectPosition: "center 20%", transform: "scale(1.1)" }}
                                        onError={(e) => {
                                            e.currentTarget.src = fallback;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-emerald-500 text-white text-xs font-bold">
                                        {user?.first_name?.[0] || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">{getDisplayName()}</p>
                                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            <button
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Settings className="h-4 w-4 text-gray-500" />
                                <span className="text-sm">Settings</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content with smooth margin transition */}
                <main className={`content-transition ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} flex flex-col h-screen overflow-hidden`}>
                    {/* Header */}
                    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 flex-shrink-0">
                        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* Mobile Menu Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md hover:bg-gray-100 lg:hidden"
                                    onClick={toggleMobileMenu}
                                    ref={mobileMenuButtonRef}
                                >
                                    <Menu className="h-4 w-4 text-gray-500" />
                                </Button>

                                {/* Desktop Sidebar Toggle */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md hover:bg-gray-100 hidden lg:flex transition-transform duration-200 hover:scale-105"
                                    onClick={toggleSidebar}
                                >
                                    {isSidebarOpen ? (
                                        <PanelLeft className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <PanelRight className="h-4 w-4 text-gray-500" />
                                    )}
                                </Button>

                                <div className="w-px h-4 bg-gray-300 hidden sm:block"></div>
                                <h1 className="text-sm relative top-0.5 font-medium text-gray-600 tracking-wide select-none">
                                    {getPageTitle()}
                                </h1>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Messages Dropdown */}
                                <div className="relative">
                                    <button
                                        ref={chatButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsNotifOpen(false);
                                            setIsChatOpen(prev => !prev);
                                        }}
                                        className="relative p-2 rounded-md hover:bg-gray-100 transition-colors select-none"
                                    >
                                        <MessageCircle className="h-4 w-4 text-gray-600" />
                                        {unreadMessages > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-medium px-1.5 rounded-full select-none">
                                                {unreadMessages > 9 ? '9+' : unreadMessages}
                                            </span>
                                        )}
                                    </button>
                                    {isChatOpen && (
                                        <div ref={chatDropdownRef} className="absolute right-0 mt-2 z-50 animate-in slide-in-from-top-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                                            <MessageDropdownContent />
                                        </div>
                                    )}
                                </div>

                                {/* Notifications Dropdown */}
                                <div className="relative">
                                    <button
                                        ref={notifButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsChatOpen(false);
                                            setIsNotifOpen(prev => {
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
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {isNotifOpen && (
                                        <div ref={notifDropdownRef} className="absolute right-0 mt-2 z-50 animate-in slide-in-from-top-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                                            <NotificationDropdownContent />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto scrollbar-mint bg-gray-50">
                        <div className="px-4 sm:px-6 py-4 sm:py-6">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>

            {/* Chat Box */}
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
                                    return prev.map(m =>
                                        m.user.id === activeChatUser.id
                                            ? { ...m, last_message: msg, last_sender_id: user.id, unread: 0 }
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