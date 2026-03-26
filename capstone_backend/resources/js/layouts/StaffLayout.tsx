import React, { useState } from "react";
import ChatBox from "@/components/AdminComponents/ChatBox";

export default function StaffLayout({ children }: any) {
    const [chatOpen, setChatOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        window.location.replace("/");
    };

    return (
        <div className="flex min-h-screen bg-gray-100">

            {/* 🔥 SIDEBAR */}
            <aside className="w-64 bg-orange-600 text-white p-4 space-y-4 flex flex-col">

                <h2 className="text-xl font-bold mb-4">🍽️ Restaurant</h2>

                <nav className="space-y-2 flex-1">
                    <a href="/restaurant" className="block hover:bg-orange-700 p-2 rounded">
                        Dashboard
                    </a>
                    <a href="/orders" className="block hover:bg-orange-700 p-2 rounded">
                        Orders
                    </a>
                    <a href="/menu" className="block hover:bg-orange-700 p-2 rounded">
                        Menu
                    </a>

                    {/* 🔥 MESSAGE ADMIN BUTTON */}
                    <button
                        onClick={() => setChatOpen(true)}
                        className="block w-full text-left hover:bg-orange-700 p-2 rounded"
                    >
                        💬 Message Admin
                    </button>
                </nav>

                {/* 🔥 LOGOUT */}
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-500 hover:bg-red-600 p-2 rounded"
                >
                    Logout
                </button>

            </aside>

            {/* 🔥 CONTENT */}
            <main className="flex-1 p-6">
                {children}
            </main>

            {/* 🔥 CHAT BOX (FLOATING) */}
            {chatOpen && (
                <ChatBox
                    userId={1} // ⚠️ change if your admin ID is different
                    userName="Admin"
                    onClose={() => setChatOpen(false)}
                />
            )}

        </div>
    );
}