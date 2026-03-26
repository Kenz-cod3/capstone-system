import { useRef } from "react";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/services/api";

type ChatBoxProps = {
    userId: number;
    userName: string;
    onClose: () => void;
    onMessageSent?: () => void;
};

export default function ChatBox({ userId, userName, onClose, onMessageSent }: ChatBoxProps) {

    const currentUser = JSON.parse(localStorage.getItem("user")!);

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollTop = bottomRef.current.scrollHeight;
        }
    }, [messages]);

    const markAsRead = async () => {
        try {
            await api.put(`/messages/read/${currentUser.id}/${userId}`);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/messages/conversation/${currentUser.id}/${userId}`);
            setMessages(Array.isArray(res.data) ? res.data : []);

            // 🔥 ALWAYS MARK AS READ AFTER FETCH
            await markAsRead();

        } catch (err) {
            console.error(err);
            setMessages([]);
        }
    };

    useEffect(() => {
        if (!userId) return;

        const load = async () => {
            await markAsRead();
            await fetchMessages();
        };

        load();

        const interval = setInterval(load, 3000);
        return () => clearInterval(interval);

    }, [userId]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            await api.post("/messages", {
                sender_id: currentUser.id,
                content: newMessage,
                targets: [
                    {
                        target_id: userId,
                        target_type: "App\\Models\\User"
                    }
                ]
            });

            setNewMessage("");
            await fetchMessages();

            if (onMessageSent) {
                onMessageSent(); // 🔥 refresh dropdown
            }

        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white shadow-xl rounded-lg flex flex-col border z-50">

            {/* HEADER */}
            <div className="p-3 border-b flex justify-between items-center bg-emerald-600 text-white rounded-t-lg">

                {/* LEFT SIDE (PROFILE + NAME) */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white text-emerald-600 rounded-full flex items-center justify-center font-bold">
                        {userName?.[0]}
                    </div>
                    <span>{userName}</span>
                </div>

                {/* CLOSE BUTTON */}
                <button onClick={onClose}>✕</button>

            </div>

            {/* MESSAGES */}
            <div
                ref={bottomRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar"
            >
                {messages.map((m, index) => {
                    const isMine = m.message?.sender_id === currentUser.id;
                    const isLast = index === messages.length - 1;

                    return (
                        <div key={m.id}>

                            {/* MESSAGE */}
                            <div
                                className={`p-2 rounded-lg text-sm ${isMine
                                    ? "bg-emerald-500 text-white ml-auto max-w-[70%]"
                                    : "bg-gray-200 max-w-[70%]"
                                    }`}
                            >
                                {m.message?.message || "No message"}
                            </div>

                            {/* ✅ SEEN INDICATOR */}
                            {isMine && isLast && (
                                <div className="text-[10px] text-gray-400 mt-1 text-right">
                                    {m.is_read ? "Seen" : "Sent"}
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>

            {/* INPUT */}
            <div className="p-2 border-t flex items-end gap-2">
                <textarea
                    value={newMessage}
                    onChange={(e) => {
                        setNewMessage(e.target.value);

                        // 🔥 auto expand WITH LIMIT
                        e.target.style.height = "auto";
                        const maxHeight = 120; // 👈 LIMIT (px)

                        if (e.target.scrollHeight <= maxHeight) {
                            e.target.style.height = e.target.scrollHeight + "px";
                        } else {
                            e.target.style.height = maxHeight + "px";
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    className="flex-1 border rounded px-2 py-1 text-sm resize-none overflow-y-auto hide-textarea-scroll"
                    placeholder="Type..."
                    rows={1}
                />
                <button
                    onClick={sendMessage}
                    className="bg-emerald-600 text-white p-2 rounded-full flex items-center justify-center hover:bg-emerald-700 transition"
                >
                    <Send size={18} />
                </button>
            </div>

        </div>
    );
}