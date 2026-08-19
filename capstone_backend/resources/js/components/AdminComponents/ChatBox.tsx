import { useRef, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import api from "@/services/api";
import Echo from "@/services/echo";

type ChatBoxProps = {
    userId: number;
    userName: string;
    onClose: () => void;
    onMessageSent?: (msg: string) => void;
};

export default function ChatBox({
    userId,
    userName,
    onClose,
    onMessageSent,
}: ChatBoxProps) {
    const currentUser = JSON.parse(localStorage.getItem("user")!);

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    // Loading states
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const isAtBottom = useRef(true);

    // ===============================
    // AUTO SCROLL
    // ===============================
    useEffect(() => {
        if (!bottomRef.current) return;

        if (isAtBottom.current) {
            bottomRef.current.scrollTop =
                bottomRef.current.scrollHeight;
        }
    }, [messages]);

    // ===============================
    // MARK AS READ
    // ===============================
    const markAsRead = async () => {
        try {
            await api.put(
                `/messages/read/${currentUser.id}/${userId}`,
            );
        } catch (err) {
            console.error(err);
        }
    };

    // ===============================
    // FETCH MESSAGES
    // ===============================
    const fetchMessages = async () => {
        setLoadingMessages(true);

        try {
            await markAsRead();

            const res = await api.get(
                `/messages/conversation/${currentUser.id}/${userId}`,
            );

            const newData = Array.isArray(res.data)
                ? res.data
                : [];

            setMessages(newData);
        } catch (err) {
            console.error(err);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    // ===============================
    // REALTIME
    // ===============================
    useEffect(() => {
        if (!userId) return;

        fetchMessages();

        console.log(
            "📩 CHATBOX LISTENING:",
            `chat.${currentUser.id}`,
        );

        Echo.channel(`chat.${currentUser.id}`).listen(
            ".MessageSent",
            (e: any) => {
                console.log("🔥 CHATBOX REALTIME:", e);

                const raw = e.message;

                const incoming = {
                    id: raw.id,
                    is_read: raw.is_read,
                    status: "sent",
                    message: raw.message,
                };

                setMessages((prev) => {
                    if (!incoming?.id) {
                        return prev;
                    }

                    const exists = prev.some(
                        (m) => m.id === incoming.id,
                    );

                    if (exists) {
                        return prev;
                    }

                    return [...prev, incoming];
                });
            },
        );

        return () => {
            Echo.leaveChannel(`chat.${currentUser.id}`);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ===============================
    // SEND MESSAGE
    // ===============================
    const sendMessage = async () => {
        if (!newMessage.trim() || sendingMessage) return;

        const messageToSend = newMessage.trim();

        const tempId = Date.now();

        // Instant UI
        setMessages((prev) => [
            ...prev,
            {
                id: tempId,
                message: {
                    message: messageToSend,
                    sender_id: currentUser.id,
                },
                is_read: false,
                status: "sending",
            },
        ]);

        setNewMessage("");
        setSendingMessage(true);

        try {
            const res = await api.post("/messages", {
                sender_id: currentUser.id,
                content: messageToSend,
                targets: [
                    {
                        target_id: userId,
                    },
                ],
            });

            const messageData = res.data.data;
            const realTarget = messageData.targets[0];

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId
                        ? {
                              ...m,
                              id: realTarget.id,
                              is_read: realTarget.is_read,
                              message: {
                                  message:
                                      messageData.message,
                                  sender_id:
                                      messageData.sender_id,
                              },
                              status: "sent",
                          }
                        : m,
                ),
            );

            if (onMessageSent) {
                onMessageSent(messageToSend);
            }
        } catch (err) {
            console.error(err);

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId
                        ? {
                              ...m,
                              status: "failed",
                          }
                        : m,
                ),
            );
        } finally {
            setSendingMessage(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex h-96 w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {/* ===============================
                HEADER
            =============================== */}
            <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-3 py-3 text-white">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-emerald-600">
                        {userName?.[0]?.toUpperCase()}
                    </div>

                    <span className="truncate text-sm font-semibold">
                        {userName}
                    </span>
                </div>

                <button
                    onClick={onClose}
                    className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-emerald-700"
                >
                    ✕
                </button>
            </div>

            {/* ===============================
                MESSAGES
            =============================== */}
            <div
                ref={bottomRef}
                onScroll={(e) => {
                    const el = e.currentTarget;

                    const isBottom =
                        el.scrollHeight -
                            el.scrollTop <=
                        el.clientHeight + 20;

                    isAtBottom.current = isBottom;
                }}
                className="flex-1 overflow-y-auto px-3 py-4"
            >
                {/* ===============================
                    LOADING SPINNER
                =============================== */}
                {loadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />

                            <span className="text-xs text-slate-400">
                                Loading messages...
                            </span>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    /* ===============================
                        EMPTY STATE
                    =============================== */
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <p className="text-sm text-slate-400">
                                No messages yet
                            </p>

                            <p className="mt-1 text-xs text-slate-300">
                                Start a conversation with {userName}
                            </p>
                        </div>
                    </div>
                ) : (
                    /* ===============================
                        MESSAGE LIST
                    =============================== */
                    <div className="flex flex-col gap-2">
                        {messages.map((m, index) => {
                            const isMine =
                                m.message?.sender_id ===
                                currentUser.id;

                            const isLast =
                                index === messages.length - 1;

                            const messageText =
                                m.message?.message ||
                                "No message";

                            return (
                                <div
                                    key={m.id}
                                    className={`flex w-full ${
                                        isMine
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`flex max-w-[75%] flex-col ${
                                            isMine
                                                ? "items-end"
                                                : "items-start"
                                        }`}
                                    >
                                        {/* ===============================
                                            MESSAGE BUBBLE
                                        =============================== */}
                                        <div
                                            className={`break-words whitespace-pre-wrap px-3 py-2 text-sm leading-relaxed shadow-sm ${
                                                isMine
                                                    ? "rounded-2xl rounded-br-md bg-emerald-600 text-white"
                                                    : "rounded-2xl rounded-bl-md bg-slate-100 text-slate-800"
                                            }`}
                                        >
                                            {messageText}
                                        </div>

                                        {/* ===============================
                                            STATUS
                                        =============================== */}
                                        {isMine && isLast && (
                                            <div className="mt-1 px-1 text-[10px] text-slate-400">
                                                {m.status ===
                                                    "sending" &&
                                                    "Sending..."}

                                                {m.status ===
                                                    "failed" &&
                                                    "Failed"}

                                                {m.status ===
                                                    "sent" &&
                                                    (m.is_read
                                                        ? "Seen"
                                                        : "Sent")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===============================
                INPUT
            =============================== */}
            <div className="shrink-0 border-t border-slate-100 bg-white p-2.5">
                <div className="flex items-end gap-2">
                    <textarea
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);

                            e.target.style.height = "auto";

                            const maxHeight = 120;

                            e.target.style.height =
                                Math.min(
                                    e.target.scrollHeight,
                                    maxHeight,
                                ) + "px";
                        }}
                        onKeyDown={(e) => {
                            if (
                                e.key === "Enter" &&
                                !e.shiftKey &&
                                newMessage.trim()
                            ) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        disabled={sendingMessage}
                        className="min-h-[38px] max-h-[120px] flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder={
                            sendingMessage
                                ? "Sending..."
                                : "Type..."
                        }
                        rows={1}
                    />

                    <button
                        type="button"
                        onClick={sendMessage}
                        disabled={
                            !newMessage.trim() ||
                            sendingMessage
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-40"
                    >
                        {sendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
