import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    ShoppingCart,
    UtensilsCrossed,
    ClipboardList,
    LogOut,
    PanelLeft,
    PanelRight,
    MessageCircle,
    Settings,
    ChevronUp,
    ReceiptText,
} from "lucide-react";
import ChatBox from "@/components/AdminComponents/ChatBox";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import { API_BASE } from "@/services/api";
import logo from "../../images/logo1.png";

/**
 * Staff / Cashier layout — "Ticket Rail" design
 */

const SIDEBAR_TRANSITION = "duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";

export default function StaffLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const user =
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "null")
            : null;

    const getDisplayName = () => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user?.first_name) return user.first_name;
        if (user?.name) return user.name;
        return user?.email?.split("@")[0] || "Staff";
    };

    const getUserInitials = () => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        }
        if (user?.first_name) return user.first_name[0].toUpperCase();
        if (user?.name) return user.name[0].toUpperCase();
        if (user?.email) return user.email[0].toUpperCase();
        return "S";
    };

    const getRoleLabel = () => {
        if (!user?.role) return "Cashier";
        return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    };

    const getImageUrl = (img?: string | null) => {
        if (!img) return null;
        if (img.startsWith("http")) return img;
        if (img.includes("storage/")) return `${API_BASE}/${img}`;
        return `${API_BASE}/storage/${img}`;
    };

    const profileImageUrl = getImageUrl(user?.profile_image);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    const navItems = [
        {
            name: "Dashboard",
            description: "Overview & analytics",
            href: "/restaurant",
            icon: LayoutDashboard,
        },
        {
            name: "POS / Orders",
            description: "Process orders",
            href: "/orders",
            icon: ShoppingCart,
        },
        {
            name: "Menu",
            description: "Manage menu items",
            href: "/menu",
            icon: UtensilsCrossed,
        },
        {
            name: "Order Management",
            description: "Track order sales",
            href: "/product",
            icon: ClipboardList,
        },
    ];

    const getPageTitle = () => {
        const currentItem = navItems.find((item) => isActive(item.href));
        return currentItem?.name || "Cashier panel";
    };

    return (
        <>
            {/* ----------------------------------------------------------------- */}
            {/* GLOBAL SCROLLBAR STYLES (GREEN + SLIM)                            */}
            {/* ----------------------------------------------------------------- */}
            <style>
                {`
                    /* ============ SIDEBAR NAV SCROLLBAR ============ */
                    .sidebar-nav-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: #3ECF8E transparent;
                    }
                    .sidebar-nav-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .sidebar-nav-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .sidebar-nav-scroll::-webkit-scrollbar-thumb {
                        background-color: transparent;
                        border-radius: 999px;
                        transition: background-color 0.2s ease;
                    }
                    .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
                        background-color: #3ECF8E;
                    }
                    .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
                        background-color: #2fa876;
                    }
                    .sidebar-nav-scroll:hover {
                        scrollbar-color: #2fa876 transparent;
                    }
                    .sidebar-nav-scroll::-webkit-scrollbar-button {
                        display: none;
                    }

                    /* ============ MAIN CONTENT SCROLLBAR ============ */
                    .main-content-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: #3ECF8E transparent;
                    }
                    .main-content-scroll::-webkit-scrollbar {
                        width: 6px;
                    }
                    .main-content-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .main-content-scroll::-webkit-scrollbar-thumb {
                        background-color: #3ECF8E;
                        border-radius: 999px;
                        transition: background-color 0.2s ease;
                    }
                    .main-content-scroll::-webkit-scrollbar-thumb:hover {
                        background-color: #2fa876;
                    }
                    .main-content-scroll::-webkit-scrollbar-button {
                        display: none;
                    }

                    /* ============ GLOBAL PAGE SCROLLBAR (html/body) ============ */
                    html, body {
                        scrollbar-width: thin;
                        scrollbar-color: #3ECF8E transparent;
                    }
                    html::-webkit-scrollbar,
                    body::-webkit-scrollbar {
                        width: 6px;
                    }
                    html::-webkit-scrollbar-track,
                    body::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    html::-webkit-scrollbar-thumb,
                    body::-webkit-scrollbar-thumb {
                        background-color: #3ECF8E;
                        border-radius: 999px;
                    }
                    html::-webkit-scrollbar-thumb:hover,
                    body::-webkit-scrollbar-thumb:hover {
                        background-color: #2fa876;
                    }
                `}
            </style>

            <div className="min-h-screen bg-[#eef0ea]">
                {dropdownOpen && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setDropdownOpen(false)}
                    />
                )}

                {/* SIDEBAR */}
                <aside
                    className={`fixed top-3 left-3 bottom-3 bg-white shadow-[0_10px_30px_-12px_rgba(28,36,32,0.25)] transition-[width] ${SIDEBAR_TRANSITION} will-change-[width] z-50
                    ${
                        isSidebarOpen ? "w-64" : "w-20"
                    } flex flex-col rounded-lg border border-[#e3e6dc]`}
                >
                    {/* LOGO */}
                    <div
                        className={`h-20 flex items-center transition-[padding] ${SIDEBAR_TRANSITION} ${
                            isSidebarOpen ? "px-5" : "justify-center"
                        } flex-shrink-0 border-b border-[#e3e6dc]`}
                    >
                        <div
                            onClick={() => navigate("/restaurant")}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="h-11 w-11 rounded-full overflow-hidden bg-[#f5f6f2] flex items-center justify-center flex-shrink-0">
                                <img
                                    src={logo}
                                    alt="Lynn Ennia's Logo"
                                    className="h-full w-auto object-contain scale-110"
                                    onError={(e) => {
                                        e.currentTarget.style.display =
                                            "none";
                                        const parent =
                                            e.currentTarget.parentElement;
                                        if (parent) {
                                            const fallbackIcon =
                                                document.createElement("div");
                                            fallbackIcon.className =
                                                "h-11 w-11 rounded-full bg-[#3ECF8E] flex items-center justify-center text-white font-bold text-lg";
                                            fallbackIcon.innerHTML = "🍽️";
                                            parent.appendChild(fallbackIcon);
                                        }
                                    }}
                                />
                            </div>

                            <div
                                className={`flex flex-col overflow-hidden transition-all ${SIDEBAR_TRANSITION} ${
                                    isSidebarOpen
                                        ? "max-w-[160px] opacity-100"
                                        : "max-w-0 opacity-0"
                                }`}
                            >
                                <span className="font-['Space_Grotesk'] font-semibold text-[15px] tracking-tight leading-tight text-[#1c2420] whitespace-nowrap">
                                    Lynn Ennia's
                                </span>
                                <span className="text-[10px] text-[#2fa876] tracking-[0.14em] uppercase font-['IBM_Plex_Mono'] whitespace-nowrap">
                                    Restaurant
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* NAVIGATION */}
                    <nav className="sidebar-nav-scroll flex-1 p-3 space-y-1.5 overflow-y-auto">
                        {navItems.map((item) => {
                            const active = isActive(item.href);

                            return (
                                <div
                                    key={item.name}
                                    onClick={() => navigate(item.href)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${SIDEBAR_TRANSITION} group
                                        ${
                                            active
                                                ? "bg-[#3ECF8E]"
                                                : "text-[#5c6258] hover:bg-[#f5f6f2]"
                                        }
                                        ${!isSidebarOpen && "justify-center"}
                                    `}
                                >
                                    <item.icon
                                        className={`h-4.5 w-4.5 flex-shrink-0 ${
                                            active
                                                ? "text-white"
                                                : "text-[#5c6258]"
                                        }`}
                                    />

                                    <div
                                        className={`flex flex-col min-w-0 overflow-hidden transition-all ${SIDEBAR_TRANSITION} ${
                                            isSidebarOpen
                                                ? "max-w-[160px] opacity-100"
                                                : "max-w-0 opacity-0"
                                        }`}
                                    >
                                        <span
                                            className={`text-[13px] font-medium truncate whitespace-nowrap ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#3c423a]"
                                            }`}
                                        >
                                            {item.name}
                                        </span>
                                        <span
                                            className={`text-[9.5px] font-['IBM_Plex_Mono'] whitespace-nowrap transition-colors ${
                                                active
                                                    ? "text-white/85"
                                                    : "text-[#8a8f83]"
                                            }`}
                                        >
                                            {item.description}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    {/* FOOTER */}
                    <div className="p-3 flex-shrink-0 relative z-20 border-t border-[#e3e6dc]">
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#f5f6f2] transition-colors ${SIDEBAR_TRANSITION} ${
                                    !isSidebarOpen && "justify-center"
                                }`}
                            >
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#3ECF8E] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 font-['IBM_Plex_Mono']">
                                    {profileImageUrl ? (
                                        <img
                                            src={profileImageUrl}
                                            alt={getDisplayName()}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    ) : (
                                        getUserInitials()
                                    )}
                                </div>

                                <div
                                    className={`flex items-center flex-1 min-w-0 overflow-hidden transition-all ${SIDEBAR_TRANSITION} ${
                                        isSidebarOpen
                                            ? "max-w-[160px] opacity-100"
                                            : "max-w-0 opacity-0"
                                    }`}
                                >
                                    <div className="-mb-2 flex-1 text-left min-w-0">
                                        <p className="mb-0.5 text-[13px] font-medium text-[#1c2420] truncate whitespace-nowrap">
                                            {getDisplayName()}
                                        </p>
                                        <p className="text-[11px] text-[#8a8f83] whitespace-nowrap">
                                            {getRoleLabel()}
                                        </p>
                                    </div>
                                    <ChevronUp
                                        className={`h-3.5 w-3.5 text-[#8a8f83] flex-shrink-0 transition-transform ${SIDEBAR_TRANSITION} ${
                                            dropdownOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </div>
                            </button>

                            {dropdownOpen && (
                                <div
                                    className={`absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-[0_10px_30px_-12px_rgba(28,36,32,0.5)] border border-[#dde1d7] overflow-hidden z-30 ${
                                        !isSidebarOpen &&
                                        "left-1/2 -translate-x-1/2 w-48"
                                    }`}
                                >
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            setIsSettingsOpen(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f2] transition-colors text-left"
                                    >
                                        <Settings className="h-4 w-4 text-[#8a8f83]" />
                                        <span className="text-sm text-[#3c423a]">
                                            Settings
                                        </span>
                                    </button>
                                    <div className="border-t border-[#dde1d7]"></div>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fbe9e6] transition-colors text-left"
                                    >
                                        <LogOut className="h-4 w-4 text-[#a1402f]" />
                                        <span className="text-sm text-[#8a3226]">
                                            Logout
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* MAIN */}
                <main
                    className={`transition-[padding-left] ${SIDEBAR_TRANSITION} will-change-[padding-left] ${
                        isSidebarOpen ? "pl-72" : "pl-28"
                    } flex flex-col min-h-screen`}
                >
                    <header
                        className={`sticky top-3 z-30 px-4 pt-3 transition-[padding-left] ${SIDEBAR_TRANSITION}`}
                    >
                        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-[#dde1d7] px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSidebar}
                                    className="h-8 w-8 rounded-md hover:bg-[#f5f6f2] flex items-center justify-center transition-colors"
                                >
                                    {isSidebarOpen ? (
                                        <PanelLeft className="h-4 w-4 text-[#8a8f83]" />
                                    ) : (
                                        <PanelRight className="h-4 w-4 text-[#8a8f83]" />
                                    )}
                                </button>

                                <div className="w-px h-5 bg-[#dde1d7]"></div>

                                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#2fa876] uppercase font-['IBM_Plex_Mono']">
                                    {getPageTitle()}
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setChatOpen(true)}
                                    className="relative p-2 rounded-md hover:bg-[#f5f6f2] transition-colors"
                                >
                                    <MessageCircle className="h-4 w-4 text-[#5c6258]" />
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* MAIN CONTENT — may green slim scrollbar */}
                    <div className="main-content-scroll flex-1 p-6 overflow-y-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {chatOpen && (
                <ChatBox
                    userId={user?.id || 1}
                    userName={getDisplayName()}
                    onClose={() => setChatOpen(false)}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
}