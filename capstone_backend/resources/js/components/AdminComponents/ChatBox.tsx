import { useRef } from "react";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/services/api";

type ChatBoxProps = {
    userId: number;
    userName: string;
    onClose: () => void;
    onMessageSent?: (msg: string) => void;
};

export default function ChatBox({ userId, userName, onClose, onMessageSent }: ChatBoxProps) {

    const currentUser = JSON.parse(localStorage.getItem("user")!);

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const isAtBottom = useRef(true);

    useEffect(() => {
        if (!bottomRef.current) return;

        if (isAtBottom.current) {
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
            // ✅ mark first
            await markAsRead();

            // ✅ then fetch updated data
            const res = await api.get(`/messages/conversation/${currentUser.id}/${userId}`);
            setMessages(prev => {
                const newData = Array.isArray(res.data) ? res.data : [];

                // 🔥 keep temp messages (yung sending pa)
                const tempMessages = prev.filter(m => m.status === "sending");

                // 🔥 merge backend + existing status
                const merged = newData.map(msg => {
                    const existing = prev.find(p => p.id === msg.id);

                    return {
                        ...msg,
                        status: existing?.status || "sent"
                    };
                });

                // ✅ combine both
                return [...merged, ...tempMessages];
            });

        } catch (err) {
            console.error(err);
            setMessages([]);
        }
    };

    useEffect(() => {
        if (!userId) return;

        const load = async () => {
            await fetchMessages();
        };

        load();

        const interval = setInterval(load, 3000);
        return () => clearInterval(interval);

    }, [userId]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        const messageToSend = newMessage;

        // 🔥 create temp message
        const tempId = Date.now();

        // ✅ INSTANT UI
        setMessages(prev => [
            ...prev,
            {
                id: tempId,
                message: {
                    message: messageToSend,
                    sender_id: currentUser.id
                },
                is_read: false,
                status: "sending" // 🔥 NEW
            }
        ]);

        setNewMessage("");

        try {
            await api.post("/messages", {
                sender_id: currentUser.id,
                content: messageToSend,
                targets: [
                    {
                        target_id: userId,
                        target_type: "App\\Models\\User"
                    }
                ]
            });

            // ✅ UPDATE STATUS → SENT
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: "sent" }
                        : m
                )
            );

            if (onMessageSent) {
                onMessageSent(messageToSend);
            }

        } catch (err) {
            console.error(err);

            // ❌ UPDATE STATUS → FAILED
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: "failed" }
                        : m
                )
            );
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
                onScroll={(e) => {
                    const el = e.currentTarget;

                    const isBottom =
                        el.scrollHeight - el.scrollTop <= el.clientHeight + 20;

                    isAtBottom.current = isBottom;
                }}
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
                                    {m.status === "sending" && "Sending..."}
                                    {m.status === "failed" && "Failed ❌"}
                                    {m.status === "sent" && (m.is_read ? "Seen" : "Sent")}
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