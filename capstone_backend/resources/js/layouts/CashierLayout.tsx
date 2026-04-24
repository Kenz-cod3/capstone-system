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
    User,
    Settings,
    ChevronUp
} from "lucide-react";
import ChatBox from "@/components/AdminComponents/ChatBox";
import SettingsModal from "@/components/AdminComponents/SettingsModal";
import logo from "../../images/logo1.png"; // Adjust path as needed

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

    const isActive = (path: string) =>
        location.pathname.startsWith(path);

    const navItems = [
        { 
            name: "Dashboard", 
            description: "Overview & Analytics",
            href: "/restaurant", 
            icon: LayoutDashboard 
        },
        { 
            name: "POS / Orders", 
            description: "Process Orders",
            href: "/orders", 
            icon: ShoppingCart 
        },
        { 
            name: "Menu", 
            description: "Manage Menu Items",
            href: "/menu", 
            icon: UtensilsCrossed 
        },
        { 
            name: "Pending Orders", 
            description: "Track Pending",
            href: "/product", 
            icon: ClipboardList 
        },
    ];

    // Get page title based on current path
    const getPageTitle = () => {
        const currentItem = navItems.find(item => isActive(item.href));
        return currentItem?.name || "Cashier Panel";
    };

    return (
        <>
            <div className="min-h-screen bg-gray-100">
                {/* Overlay for mobile - closes dropdown when clicking outside */}
                {dropdownOpen && (
                    <div 
                        className="fixed inset-0 z-0"
                        onClick={() => setDropdownOpen(false)}
                    />
                )}

                {/* 🌿 SIDEBAR - Floating */}
                <aside
                    className={`fixed top-3 left-3 bottom-3 bg-white shadow-xl transition-all duration-300 z-50
                    ${isSidebarOpen ? "w-64" : "w-20"} flex flex-col rounded-3xl`}
                >

                    {/* LOGO - Larger size matching AdminLayout */}
                    <div className={`h-20 flex items-center ${isSidebarOpen ? "px-6" : "justify-center"} flex-shrink-0 border-b border-gray-100`}>
                        <div 
                            onClick={() => navigate("/restaurant")}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="h-12 w-12 rounded-full overflow-hidden bg-white flex items-center justify-center">
                                <img
                                    src={logo}
                                    alt="Lynn Ennia's Logo"
                                    className="h-full w-auto object-contain scale-110"
                                    onError={(e) => {
                                        // Fallback if logo fails to load
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            const fallbackIcon = document.createElement('div');
                                            fallbackIcon.className = 'h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl';
                                            fallbackIcon.innerHTML = '🍽️';
                                            parent.appendChild(fallbackIcon);
                                        }
                                    }}
                                />
                            </div>
                            {isSidebarOpen && (
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg tracking-tight leading-tight text-gray-800">
                                        Lynn Ennia's
                                    </span>
                                    <span className="text-[10px] text-gray-500 tracking-wide">
                                        Restaurant
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NAVIGATION with descriptions - description turns black on hover */}
                    <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const active = isActive(item.href);

                            return (
                                <div
                                    key={item.name}
                                    onClick={() => navigate(item.href)}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all group
                                        ${active
                                            ? "bg-green-500 text-white shadow-md"
                                            : "text-gray-600 hover:bg-gray-100"}
                                        ${!isSidebarOpen && "justify-center"}
                                    `}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {isSidebarOpen && (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                {item.name}
                                            </span>
                                            <span className={`text-[9px] transition-colors ${
                                                active 
                                                    ? "text-white/80" 
                                                    : "text-gray-400"
                                            }`}>
                                                {item.description}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* FOOTER WITH AVATAR DROPDOWN */}
                    <div className="p-3 flex-shrink-0 relative z-20">
                        <div className="relative">
                            {/* Avatar Button */}
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition ${
                                    !isSidebarOpen && "justify-center"
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    KM
                                </div>
                                {isSidebarOpen && (
                                    <>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-semibold text-gray-700">Kenneth</p>
                                            <p className="text-xs text-gray-400">Cashier</p>
                                        </div>
                                        <ChevronUp className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                            dropdownOpen ? "rotate-180" : ""
                                        }`} />
                                    </>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div className={`absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-30 ${
                                    !isSidebarOpen && "left-1/2 -translate-x-1/2 w-48"
                                }`}>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            navigate("/profile");
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                                    >
                                        <User className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            setIsSettingsOpen(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                                    >
                                        <Settings className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">Settings</span>
                                    </button>
                                    <div className="border-t border-gray-200"></div>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-left"
                                    >
                                        <LogOut className="h-4 w-4 text-red-500" />
                                        <span className="text-sm text-red-600">Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* 🌿 MAIN CONTENT - With margin for floating sidebar */}
                <main className={`transition-all duration-300 ${isSidebarOpen ? 'pl-72' : 'pl-28'} flex flex-col min-h-screen`}>
                    {/* 🔝 TOPBAR - Floating header matching sidebar style - Wider */}
                    <header className="sticky top-3 z-30 px-4 pt-3">
                        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Toggle Button */}
                                <button
                                    onClick={toggleSidebar}
                                    className="h-8 w-8 rounded-md hover:bg-gray-100 flex items-center justify-center transition"
                                >
                                    {isSidebarOpen ? (
                                        <PanelLeft className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <PanelRight className="h-4 w-4 text-gray-500" />
                                    )}
                                </button>

                                {/* Separator */}
                                <div className="w-px h-5 bg-gray-300"></div>

                                {/* Title - Grey color */}
                                <h1 className="text-sm relative top-[3px] font-medium text-gray-600 tracking-wide">
                                    {getPageTitle()}
                                </h1>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* 💬 CHAT BUTTON */}
                                <button
                                    onClick={() => setChatOpen(true)}
                                    className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
                                >
                                    <MessageCircle className="h-4 w-4 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* 📦 CONTENT */}
                    <div className="flex-1 p-6">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* 💬 CHATBOX */}
            {chatOpen && (
                <ChatBox
                    userId={1}
                    userName="Admin"
                    onClose={() => setChatOpen(false)}
                />
            )}

            {/* Settings Modal - Same as AdminLayout */}
            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
}