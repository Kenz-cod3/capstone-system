import { useEffect, useRef, useState } from "react";

import { useParams } from "react-router-dom";

import api from "@/services/api";
import Echo from "@/services/echo";

type Message = {
    id: number;

    message: {
        message: string;
        sender_id: number;
    };
};

export default function ChatPage() {

    const { userId } = useParams();

    const parsedUserId = Number(userId);

    const currentUser = JSON.parse(
        localStorage.getItem("user")!
    );

    const [messages, setMessages] =
        useState<Message[]>([]);

    const [newMessage, setNewMessage] =
        useState("");

    const bottomRef =
        useRef<HTMLDivElement | null>(null);

    // 🔥 FETCH MESSAGES
    const fetchMessages = async () => {

        if (!parsedUserId) return;

        try {

            const res = await api.get(
                `/messages/user/${parsedUserId}`
            );

            setMessages(
                Array.isArray(res.data)
                    ? res.data
                    : []
            );

        } catch (err) {

            console.error(
                "❌ FETCH ERROR:",
                err
            );

            setMessages([]);
        }
    };

    // 🔥 INITIAL LOAD
    useEffect(() => {

        fetchMessages();

    }, [parsedUserId]);

    // 🔥 REALTIME
    useEffect(() => {

        if (!currentUser?.id) return;

        console.log(
            "💬 CHAT PAGE LISTENING:",
            `chat.${currentUser.id}`
        );

        Echo.channel(
            `chat.${currentUser.id}`
        )
        .listen(".MessageSent", (e: any) => {

            console.log(
                "🔥 REALTIME MESSAGE:",
                e
            );

            const raw =
                e.message || e;

            const incoming: Message = {

                id: raw?.id,

                message: {
                    message: raw?.message,
                    sender_id: raw?.sender_id,
                }
            };

            setMessages((prev) => {

                const exists = prev.some(
                    (m) => m.id === incoming.id
                );

                if (exists) {
                    return prev;
                }

                return [
                    ...prev,
                    incoming
                ];
            });
        });

        return () => {

            Echo.leaveChannel(
                `chat.${currentUser.id}`
            );
        };

    }, []);

    // 🔥 AUTO SCROLL
    useEffect(() => {

        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
        });

    }, [messages]);

    // 🔥 SEND MESSAGE
    const sendMessage = async () => {

        if (!newMessage.trim()) return;

        const tempId = Date.now();

        const optimisticMessage: Message = {

            id: tempId,

            message: {
                message: newMessage,
                sender_id: currentUser.id,
            }
        };

        // 🔥 INSTANT UI
        setMessages((prev) => [
            ...prev,
            optimisticMessage
        ]);

        const messageToSend = newMessage;

        setNewMessage("");

        try {

            await api.post("/messages", {

                sender_id: currentUser.id,

                content: messageToSend,

                targets: [
                    {
                        target_id: parsedUserId,

                        target_type:
                            "App\\Models\\User"
                    }
                ]
            });

        } catch (err) {

            console.error(
                "❌ SEND ERROR:",
                err
            );

            // 🔥 REMOVE FAILED MESSAGE
            setMessages((prev) =>
                prev.filter(
                    (m) => m.id !== tempId
                )
            );
        }
    };

    return (

        <div className="flex flex-col h-full bg-white">

            {/* 🔥 HEADER */}
            <div className="border-b border-gray-200 p-4">

                <h1 className="text-lg font-semibold text-gray-800">
                    Chat
                </h1>

            </div>

            {/* 🔥 MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">

                {messages.length === 0 && (

                    <div className="text-center text-gray-400 mt-10">
                        No messages
                    </div>
                )}

                {messages.map((m) => {

                    const isMine =
                        m.message?.sender_id ===
                        currentUser.id;

                    return (

                        <div
                            key={m.id}
                            className={`flex ${isMine
                                ? "justify-end"
                                : "justify-start"
                            }`}
                        >

                            <div
                                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${isMine
                                    ? "bg-emerald-500 text-white rounded-br-md"
                                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                                }`}
                            >

                                {m.message?.message}

                            </div>

                        </div>
                    );
                })}

                <div ref={bottomRef} />

            </div>

            {/* 🔥 INPUT */}
            <div className="border-t border-gray-200 p-4 bg-white">

                <div className="flex items-center gap-3">

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) =>
                            setNewMessage(
                                e.target.value
                            )
                        }
                        onKeyDown={(e) => {

                            if (
                                e.key === "Enter"
                            ) {

                                sendMessage();
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <button
                        onClick={sendMessage}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl transition-all"
                    >

                        Send

                    </button>

                </div>

            </div>

        </div>
    );
}