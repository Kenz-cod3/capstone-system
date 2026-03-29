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
    MessageCircle
} from "lucide-react";
import ChatBox from "@/components/AdminComponents/ChatBox";

export default function StaffLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
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
        { name: "Dashboard", href: "/restaurant", icon: LayoutDashboard },
        { name: "POS / Orders", href: "/orders", icon: ShoppingCart },
        { name: "Menu", href: "/menu", icon: UtensilsCrossed },
        { name: "Pending Orders", href: "/product", icon: ClipboardList },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* 🌿 SIDEBAR */}
            <aside
                className={`bg-gradient-to-b from-emerald-900 to-emerald-950 text-white transition-all duration-300 
                ${isSidebarOpen ? "w-64" : "w-20"} flex flex-col`}
            >

                {/* LOGO */}
                <div className={`h-16 flex items-center border-b border-emerald-800 ${isSidebarOpen ? "px-6" : "justify-center"}`}>
                    <h1 className="font-bold text-lg">🍽️</h1>
                    {isSidebarOpen && <span className="ml-2 font-semibold">Restaurant</span>}
                </div>

                {/* NAV */}
                <nav className="flex-1 p-3 space-y-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <div
                                key={item.name}
                                onClick={() => navigate(item.href)}
                                className={`
                                    flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition
                                    ${active
                                        ? "bg-emerald-600 shadow text-white"
                                        : "hover:bg-emerald-800/50 text-emerald-100"}
                                    ${!isSidebarOpen && "justify-center"}
                                `}
                            >
                                <item.icon className="h-5 w-5" />
                                {isSidebarOpen && <span>{item.name}</span>}
                            </div>
                        );
                    })}
                </nav>

                {/* LOGOUT */}
                <div className="p-3 border-t border-emerald-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg"
                    >
                        <LogOut className="h-4 w-4" />
                        {isSidebarOpen && "Logout"}
                    </button>
                </div>
            </aside>

            {/* 🌿 MAIN */}
            <div className="flex-1 flex flex-col">

                {/* 🔝 TOPBAR */}
                <header className="bg-white border-b px-4 py-3 flex justify-between items-center">

                    <div className="flex items-center gap-3">
                        <button onClick={toggleSidebar}>
                            {isSidebarOpen ? (
                                <PanelLeft className="h-5 w-5" />
                            ) : (
                                <PanelRight className="h-5 w-5" />
                            )}
                        </button>

                        <h1 className="font-semibold text-gray-700">
                            Staff Panel
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">

                        {/* 💬 CHAT BUTTON */}
                        <button
                            onClick={() => setChatOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
                        >
                            <MessageCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Message Admin</span>
                        </button>

                    </div>

                </header>

                {/* 📦 CONTENT */}
                <main className="p-6 flex-1 overflow-auto">
                    <Outlet />
                </main>
                {chatOpen && (
                    <ChatBox
                        userId={1} // ⚠️ your admin ID
                        userName="Admin"
                        onClose={() => setChatOpen(false)}
                    />
                )}

            </div>
        </div>
    );
}