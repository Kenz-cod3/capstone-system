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
} from "lucide-react";
import ChatBox from "@/components/AdminComponents/ChatBox";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import logo from "../../images/logo1.png"; // Adjust path as needed

/**
 * Staff / Cashier layout — "Ticket Rail" design (matches Dashboard, Orders,
 * Menu, and Order management)
 *
 * Fonts used (add to your index.html <head>, or a global stylesheet):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
 */
export default function StaffLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

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
            <div className="min-h-screen bg-[#eef0ea]">
                {/* Overlay for mobile - closes dropdown when clicking outside */}
                {dropdownOpen && (
                    <div className="fixed inset-0 z-0" onClick={() => setDropdownOpen(false)} />
                )}

                {/* SIDEBAR — floating, white panel */}
                <aside
                    className={`fixed top-3 left-3 bottom-3 bg-white shadow-[0_10px_30px_-12px_rgba(28,36,32,0.25)] transition-all duration-300 z-50
                    ${isSidebarOpen ? "w-64" : "w-20"} flex flex-col rounded-lg border border-[#e3e6dc]`}
                >
                    {/* LOGO */}
                    <div
                        className={`h-20 flex items-center ${
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
                                        e.currentTarget.style.display = "none";
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            const fallbackIcon = document.createElement("div");
                                            fallbackIcon.className =
                                                "h-11 w-11 rounded-full bg-[#3ECF8E] flex items-center justify-center text-white font-bold text-lg";
                                            fallbackIcon.innerHTML = "🍽️";
                                            parent.appendChild(fallbackIcon);
                                        }
                                    }}
                                />
                            </div>
                            {isSidebarOpen && (
                                <div className="flex flex-col">
                                    <span className="font-['Space_Grotesk'] font-semibold text-[15px] tracking-tight leading-tight text-[#1c2420]">
                                        Lynn Ennia's
                                    </span>
                                    <span className="text-[10px] text-[#2fa876] tracking-[0.14em] uppercase font-['IBM_Plex_Mono']">
                                        Restaurant
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NAVIGATION */}
                    <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                        {navItems.map((item) => {
                            const active = isActive(item.href);

                            return (
                                <div
                                    key={item.name}
                                    onClick={() => navigate(item.href)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all group
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
                                            active ? "text-white" : "text-[#5c6258]"
                                        }`}
                                    />
                                    {isSidebarOpen && (
                                        <div className="flex flex-col min-w-0">
                                            <span
                                                className={`text-[13px] font-medium truncate ${
                                                    active ? "text-white" : "text-[#3c423a]"
                                                }`}
                                            >
                                                {item.name}
                                            </span>
                                            <span
                                                className={`text-[9.5px] font-['IBM_Plex_Mono'] transition-colors ${
                                                    active ? "text-white/85" : "text-[#8a8f83]"
                                                }`}
                                            >
                                                {item.description}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* FOOTER WITH AVATAR DROPDOWN */}
                    <div className="p-3 flex-shrink-0 relative z-20 border-t border-[#e3e6dc]">
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#f5f6f2] transition ${
                                    !isSidebarOpen && "justify-center"
                                }`}
                            >
                                <div className="w-9 h-9 rounded-full bg-[#3ECF8E] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 font-['IBM_Plex_Mono']">
                                    KM
                                </div>
                                {isSidebarOpen && (
                                    <>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-[13px] font-medium text-[#1c2420] truncate">
                                                Kenneth
                                            </p>
                                            <p className="text-[11px] text-[#8a8f83]">Cashier</p>
                                        </div>
                                        <ChevronUp
                                            className={`h-3.5 w-3.5 text-[#8a8f83] transition-transform duration-200 ${
                                                dropdownOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div
                                    className={`absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-[0_10px_30px_-12px_rgba(28,36,32,0.5)] border border-[#dde1d7] overflow-hidden z-30 ${
                                        !isSidebarOpen && "left-1/2 -translate-x-1/2 w-48"
                                    }`}
                                >
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            setIsSettingsOpen(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f2] transition text-left"
                                    >
                                        <Settings className="h-4 w-4 text-[#8a8f83]" />
                                        <span className="text-sm text-[#3c423a]">Settings</span>
                                    </button>
                                    <div className="border-t border-[#dde1d7]"></div>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fbe9e6] transition text-left"
                                    >
                                        <LogOut className="h-4 w-4 text-[#a1402f]" />
                                        <span className="text-sm text-[#8a3226]">Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main
                    className={`transition-all duration-300 ${
                        isSidebarOpen ? "pl-72" : "pl-28"
                    } flex flex-col min-h-screen`}
                >
                    {/* TOPBAR */}
                    <header className="sticky top-3 z-30 px-4 pt-3">
                        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-[#dde1d7] px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSidebar}
                                    className="h-8 w-8 rounded-md hover:bg-[#f5f6f2] flex items-center justify-center transition"
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

                    {/* CONTENT */}
                    <div className="flex-1 p-6">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* CHATBOX */}
            {chatOpen && (
                <ChatBox userId={1} userName="Admin" onClose={() => setChatOpen(false)} />
            )}

            {/* Settings Modal */}
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        </>
    );
}