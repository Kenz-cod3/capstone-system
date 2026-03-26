import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function ChatPage() {
    const { userId } = useParams();
    const parsedUserId = Number(userId);

    const currentUser = JSON.parse(localStorage.getItem("user")!);

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const fetchMessages = async () => {
        if (!parsedUserId) return;

        try {
            const res = await api.get(`/messages/user/${parsedUserId}`);
            setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setMessages([]);
        }
    };

    useEffect(() => {
        fetchMessages();

        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [parsedUserId]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            await api.post("/messages", {
                sender_id: currentUser.id,
                content: newMessage,
                targets: [
                    {
                        target_id: parsedUserId,
                        target_type: "App\\Models\\User"
                    }
                ]
            });

            setNewMessage("");
            fetchMessages();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full">

            {/* HEADER */}
            <div className="p-4 border-b font-semibold">
                Chat
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                    const isMine = m.message?.sender_id === currentUser.id;

                    return (
                        <div
                            key={m.id}
                            className={`p-2 rounded-lg max-w-xs ${isMine
                                    ? "bg-emerald-500 text-white ml-auto"
                                    : "bg-gray-100"
                                }`}
                        >
                            {m.message?.message || "No message"}
                        </div>
                    );
                })}
            </div>

            {/* INPUT */}
            <div className="p-4 border-t flex gap-2">
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2"
                    placeholder="Type message..."
                />
                <button
                    onClick={sendMessage}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
                >
                    Send
                </button>
            </div>

        </div>
    );
}