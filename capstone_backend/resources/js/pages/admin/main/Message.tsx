import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    ChevronRight,
    Search,
    MessageCircle,
    RefreshCw,
    UserPlus,
    Send,
    Loader2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
    Message as ShadcnMessage,
    MessageAvatar,
    MessageContent,
    MessageFooter,
} from "@/components/ui/message";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Textarea } from "@/components/ui/textarea";

import api from "@/services/api";
import Echo from "@/services/echo";
import PageLoader from "@/components/PageLoader";
import nProgress from "nprogress";
import "nprogress/nprogress.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Configure NProgress
nProgress.configure({
    minimum: 0.2,
    easing: "ease",
    speed: 500,
    showSpinner: false,
    trickleSpeed: 200,
});

interface ChatUser {
    id: number;
    first_name: string;
    last_name?: string;
    role?: string;
    avatar_url?: string;
}

interface Conversation {
    user: ChatUser;
    last_message: string;
    last_sender_id: number;
    unread: number;
    created_at: string;
}

function fullName(u: ChatUser | null | undefined): string {
    if (!u) return "Guest";

    return [u.first_name, u.last_name].filter(Boolean).join(" ");
}

function initial(u: ChatUser | null | undefined): string {
    const name = fullName(u);

    return name.charAt(0).toUpperCase() || "G";
}

// ======================================================
// MESSAGE THREAD
// ======================================================

function MessageThread({
    userId,
    otherUser,
    onMessageSent,
}: {
    userId: number;
    otherUser: ChatUser;
    onMessageSent?: () => void;
}) {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const isAtBottom = useRef(true);

    // ==================================================
    // AUTO SCROLL
    // ==================================================

    useEffect(() => {
        if (!bottomRef.current) return;

        if (isAtBottom.current) {
            bottomRef.current.scrollTop = bottomRef.current.scrollHeight;
        }
    }, [messages]);

    // ==================================================
    // MARK AS READ
    // ==================================================

    const markAsRead = async () => {
        try {
            await api.put(`/messages/read/${currentUser.id}/${userId}`);
        } catch (err) {
            console.error(err);
        }
    };

    // ==================================================
    // FETCH MESSAGES
    // ==================================================

    const fetchMessages = async () => {
        setMessagesLoading(true);

        try {
            await markAsRead();

            const res = await api.get(
                `/messages/conversation/${currentUser.id}/${userId}`,
            );

            const data = Array.isArray(res.data) ? res.data : [];

            setMessages(data);

            // Make sure initial load goes to bottom
            requestAnimationFrame(() => {
                if (bottomRef.current) {
                    bottomRef.current.scrollTop =
                        bottomRef.current.scrollHeight;
                }

                isAtBottom.current = true;
            });
        } catch (err) {
            console.error(err);
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    };

    // ==================================================
    // REALTIME
    // ==================================================

    useEffect(() => {
        if (!userId || !currentUser?.id) return;

        fetchMessages();

        Echo.channel(`chat.${currentUser.id}`).listen(
            ".MessageSent",
            (e: any) => {
                const raw = e.message;

                if (!raw?.id) return;

                const incoming = {
                    id: raw.id,
                    is_read: raw.is_read,
                    status: "sent",
                    message: raw.message,
                };

                setMessages((prev) => {
                    const exists = prev.some((m) => m.id === incoming.id);

                    if (exists) return prev;

                    return [...prev, incoming];
                });
            },
        );

        return () => {
            Echo.leaveChannel(`chat.${currentUser.id}`);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ==================================================
    // SEND MESSAGE
    // ==================================================

    const sendMessage = async () => {
        if (!newMessage.trim() || sending) return;

        const messageToSend = newMessage.trim();
        const tempId = Date.now();

        // Optimistic UI
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
        setSending(true);

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
                                  message: messageData.message,
                                  sender_id: messageData.sender_id,
                              },
                              status: "sent",
                          }
                        : m,
                ),
            );

            onMessageSent?.();
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
            setSending(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ==================================================
                MESSAGES
            ================================================== */}

            <div
                ref={bottomRef}
                onScroll={(e) => {
                    const el = e.currentTarget;

                    const isBottom =
                        el.scrollHeight - el.scrollTop <= el.clientHeight + 20;

                    isAtBottom.current = isBottom;
                }}
                className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5"
            >
                {/* LOADING SPINNER */}
                {messagesLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />

                            <span className="text-xs text-slate-400">
                                Loading messages...
                            </span>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    /* EMPTY CHAT */
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <MessageCircle className="h-8 w-8 text-slate-300" />

                            <p className="text-sm text-slate-400">
                                No messages yet
                            </p>

                            <p className="text-xs text-slate-300">
                                Start a conversation below.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* MESSAGE LIST */
                    <div className="space-y-3">
                        {messages.map((m) => {
                            const isMine =
                                m.message?.sender_id === currentUser.id;

                            const messageText =
                                m.message?.message || "No message";

                            return (
                                <ShadcnMessage
                                    key={m.id}
                                    align={isMine ? "end" : "start"}
                                    className="w-full"
                                >
                                    {/* AVATAR */}
                                    <MessageAvatar>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={
                                                    isMine
                                                        ? currentUser.avatar_url
                                                        : otherUser.avatar_url
                                                }
                                            />

                                            <AvatarFallback
                                                className={
                                                    isMine
                                                        ? "bg-emerald-500 text-xs text-white"
                                                        : "bg-slate-200 text-xs text-slate-600"
                                                }
                                            >
                                                {isMine
                                                    ? initial(currentUser)
                                                    : initial(otherUser)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </MessageAvatar>

                                    {/* MESSAGE */}
                                    <MessageContent>
                                        <Bubble
                                            variant={
                                                isMine ? "default" : "secondary"
                                            }
                                            className={
                                                isMine
                                                    ? "w-fit max-w-[70%] rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2 text-white"
                                                    : "w-fit max-w-[70%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2 text-slate-800"
                                            }
                                        >
                                            <BubbleContent className="whitespace-pre-wrap break-words">
                                                {messageText}
                                            </BubbleContent>
                                        </Bubble>

                                        {/* STATUS */}
                                        {isMine && (
                                            <MessageFooter className="mt-1 text-[10px] text-slate-400">
                                                {m.status === "sending" &&
                                                    "Sending..."}

                                                {m.status === "failed" &&
                                                    "Failed"}

                                                {m.status === "sent" &&
                                                    (m.is_read
                                                        ? "Seen"
                                                        : "Sent")}
                                            </MessageFooter>
                                        )}
                                    </MessageContent>
                                </ShadcnMessage>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ==================================================
                INPUT
            ================================================== */}

            <div className="shrink-0 border-t border-slate-100 bg-white p-3">
                <div className="flex items-end gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);

                            e.target.style.height = "auto";

                            const maxHeight = 120;

                            e.target.style.height =
                                Math.min(e.target.scrollHeight, maxHeight) +
                                "px";
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
                        placeholder="Type a message..."
                        rows={1}
                        disabled={sending}
                        className="min-h-[42px] max-h-[120px] resize-none rounded-xl border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
                    />

                    <button
                        type="button"
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-40"
                    >
                        {sending ? (
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

// ======================================================
// MAIN PAGE
// ======================================================

export default function Message() {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const queryClient = useQueryClient();

    const [conversations, setConversations] = useState<Conversation[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const [search, setSearch] = useState("");

    const [roleFilter, setRoleFilter] = useState<"all" | "guest" | "staff">(
        "all",
    );

    const [showUserPicker, setShowUserPicker] = useState(false);

    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);

    const [allUsersLoading, setAllUsersLoading] = useState(false);

    const isFetching = useRef(false);

    // ==================================================
    // LOAD CONVERSATIONS WITH TANSTACK QUERY
    // ==================================================

    const { data: conversationsData, isLoading: isConversationsLoading } =
        useQuery({
            queryKey: ["conversations"],
            queryFn: async () => {
                const res = await api.get("/messages/conversations");
                return Array.isArray(res.data) ? res.data : [];
            },
            enabled: !!user?.id,
        });

    // ==================================================
    // LOAD USERS WITH TANSTACK QUERY
    // ==================================================

    const { data: usersData, isLoading: isUsersLoading } = useQuery({
        queryKey: ["chat-users"],
        queryFn: async () => {
            const res = await api.get("/chat/users");
            return Array.isArray(res.data) ? res.data : [];
        },
        enabled: !!user?.id && showUserPicker,
    });

    // ==================================================
    // EFFECTS FOR SETTING DATA
    // ==================================================

    useEffect(() => {
        if (conversationsData) {
            setConversations(conversationsData);
            setLoading(false);
        }
    }, [conversationsData]);

    useEffect(() => {
        if (usersData) {
            setAllUsers(usersData);
            setAllUsersLoading(false);
        }
    }, [usersData]);

    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {
        nProgress.start();

        if (!isConversationsLoading && conversationsData) {
            nProgress.done();
        }

        return () => {
            nProgress.done();
        };
    }, [isConversationsLoading, conversationsData]);

    // ==================================================
    // LOAD CONVERSATIONS (for manual refresh)
    // ==================================================

    const loadConversations = useCallback(async () => {
        if (!user?.id) return;

        nProgress.start();
        setLoading(true);
        setError(null);

        try {
            const data = await queryClient.fetchQuery({
                queryKey: ["conversations"],
                queryFn: async () => {
                    const res = await api.get("/messages/conversations");
                    return Array.isArray(res.data) ? res.data : [];
                },
            });
            setConversations(data);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to load messages",
            );
        } finally {
            setLoading(false);
            nProgress.done();
        }
    }, [user?.id, queryClient]);

    // ==================================================
    // LOAD USERS (for manual refresh)
    // ==================================================

    const fetchAllUsers = useCallback(async () => {
        if (!user?.id) return;

        nProgress.start();
        setAllUsersLoading(true);

        try {
            const data = await queryClient.fetchQuery({
                queryKey: ["chat-users"],
                queryFn: async () => {
                    const res = await api.get("/chat/users");
                    return Array.isArray(res.data) ? res.data : [];
                },
            });
            setAllUsers(data);
        } catch (err) {
            console.error("Failed to fetch chat users:", err);
        } finally {
            setAllUsersLoading(false);
            nProgress.done();
        }
    }, [user?.id, queryClient]);

    // ==================================================
    // INITIAL LOAD EFFECT
    // ==================================================

    useEffect(() => {
        if (user?.id) {
            loadConversations();
        }
    }, [user?.id]);

    // ==================================================
    // FILTER
    // ==================================================

    const filteredList = useMemo(() => {
        const q = search.trim().toLowerCase();

        return conversations.filter((c) => {
            if (
                roleFilter !== "all" &&
                c.user?.role?.toLowerCase() !== roleFilter
            ) {
                return false;
            }

            if (!q) return true;

            return fullName(c.user).toLowerCase().includes(q);
        });
    }, [conversations, search, roleFilter]);

    // ==================================================
    // SELECTED CONVERSATION
    // ==================================================

    const selectedConversation = useMemo(
        () => conversations.find((c) => c.user.id === selectedUserId) ?? null,
        [conversations, selectedUserId],
    );

    const selectedUser: ChatUser | null =
        selectedConversation?.user ??
        allUsers.find((u) => u.id === selectedUserId) ??
        null;

    // ==================================================
    // SELECT CONVERSATION
    // ==================================================

    const handleSelectConversation = (c: Conversation) => {
        setSelectedUserId(c.user.id);

        setShowUserPicker(false);

        setConversations((prev) =>
            prev.map((m) =>
                m.user.id === c.user.id
                    ? {
                          ...m,
                          unread: 0,
                      }
                    : m,
            ),
        );
    };

    // ==================================================
    // SELECT NEW USER
    // ==================================================

    const handleSelectNewUser = (u: ChatUser) => {
        setSelectedUserId(u.id);
        setShowUserPicker(false);
    };

    if (isConversationsLoading && !conversationsData) {
        return <PageLoader />;
    }

    if (!user) {
        nProgress.done();
        return null;
    }

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-50 text-slate-900">
            <style>
                {`
                    /* NProgress custom colors to match your emerald theme */
                    #nprogress .bar {
                        background: #10b981 !important;
                        height: 3px !important;
                    }
                    #nprogress .peg {
                        box-shadow: 0 0 10px #10b981, 0 0 5px #10b981 !important;
                    }
                    #nprogress .spinner-icon {
                        border-top-color: #10b981 !important;
                        border-left-color: #10b981 !important;
                    }
                `}
            </style>
            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <aside className="hidden h-full w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
                {/* HEADER */}

                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-700">
                        {showUserPicker ? "New Message" : "Conversations"}
                    </h2>

                    <div className="flex items-center gap-2">
                        {/* REFRESH */}

                        <button
                            onClick={() =>
                                showUserPicker
                                    ? fetchAllUsers()
                                    : loadConversations()
                            }
                            disabled={
                                showUserPicker ? allUsersLoading : loading
                            }
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                            title="Refresh"
                        >
                            {(showUserPicker ? allUsersLoading : loading) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                        </button>

                        {/* NEW MESSAGE */}

                        <button
                            onClick={() => {
                                const next = !showUserPicker;

                                setShowUserPicker(next);

                                if (next) {
                                    fetchAllUsers();
                                }
                            }}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                            title={showUserPicker ? "Back" : "New message"}
                        >
                            {showUserPicker ? (
                                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                            ) : (
                                <UserPlus className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* SEARCH */}

                {!showUserPicker && (
                    <div className="shrink-0 space-y-2 border-b border-slate-100 px-3 py-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search conversations…"
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex gap-1.5">
                            {["all", "guest", "staff"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setRoleFilter(type as any)}
                                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${
                                        roleFilter === type
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ==================================================
                    SIDEBAR LIST
                ================================================== */}

                <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                    {/* NEW USERS */}

                    {showUserPicker ? (
                        allUsersLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />

                                    <span className="text-xs text-slate-400">
                                        Loading users...
                                    </span>
                                </div>
                            </div>
                        ) : allUsers.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-slate-400">
                                No users found.
                            </div>
                        ) : (
                            allUsers.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => handleSelectNewUser(u)}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-slate-50"
                                >
                                    <Avatar className="h-8 w-8 shrink-0 overflow-hidden border-0 ring-0 shadow-none">
                                        <AvatarImage
                                            src={u.avatar_url}
                                            className="h-full w-full object-cover"
                                        />

                                        <AvatarFallback className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-semibold text-slate-600">
                                            {initial(u)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {fullName(u)}
                                        </p>

                                        <p className="-mt-0.5 truncate text-xs capitalize text-slate-400">
                                            {u.role}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )
                    ) : loading ? (
                        /* CONVERSATION LOADING */

                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />

                                <span className="text-xs text-slate-400">
                                    Loading conversations...
                                </span>
                            </div>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-slate-400">
                            No conversations found.
                        </div>
                    ) : (
                        filteredList.map((c) => {
                            const isActive =
                                c.user.id === selectedUserId && !showUserPicker;

                            return (
                                <button
                                    key={c.user.id}
                                    onClick={() => handleSelectConversation(c)}
                                    className={`relative flex w-full items-center gap-3 px-4 py-2 text-left transition ${
                                        isActive
                                            ? "bg-emerald-50"
                                            : "hover:bg-slate-50"
                                    }`}
                                >
                                    <Avatar className="h-8 w-8 shrink-0 overflow-hidden border-0 ring-0 shadow-none">
                                        <AvatarImage
                                            src={c.user.avatar_url}
                                            className="h-full w-full object-cover"
                                        />

                                        <AvatarFallback className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-semibold text-slate-600">
                                            {initial(c.user)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {fullName(c.user)}
                                            </p>

                                            {c.unread > 0 && (
                                                <span className="shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                    {c.unread}
                                                </span>
                                            )}
                                        </div>

                                        <p className="-mt-0.5 truncate text-xs text-slate-400">
                                            {c.last_sender_id === user?.id && (
                                                <span>You: </span>
                                            )}

                                            {c.last_message}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* FOOTER */}

                <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
                    {showUserPicker
                        ? `${allUsers.length} users`
                        : `Showing 1 to ${filteredList.length} of ${conversations.length} conversations`}
                </div>
            </aside>

            {/* ==================================================
                MAIN
            ================================================== */}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {/* BREADCRUMB */}

                <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-400 md:px-5">
                    <span>Messages</span>

                    {selectedUser && !showUserPicker && (
                        <>
                            <ChevronRight className="h-3.5 w-3.5" />

                            <span className="max-w-[160px] truncate font-medium text-slate-600 sm:max-w-none">
                                {fullName(selectedUser)}
                            </span>
                        </>
                    )}
                </div>

                {/* ERROR */}

                {error && (
                    <div className="mx-3 mt-3 shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:mx-5">
                        {error}{" "}
                        <button
                            onClick={loadConversations}
                            className="font-semibold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* ==================================================
                    SELECTED USER
                ================================================== */}

                {selectedUser && !showUserPicker ? (
                    <>
                        {/* USER HEADER */}

                        <div className="flex shrink-0 items-center gap-3 px-3 py-4 md:px-5">
                            <Avatar className="h-10 w-10 overflow-hidden border-0 ring-0 shadow-none">
                                <AvatarImage
                                    src={selectedUser.avatar_url}
                                    className="h-full w-full object-cover"
                                />

                                <AvatarFallback className="flex h-full w-full items-center justify-center bg-emerald-500 text-sm font-semibold text-white">
                                    {initial(selectedUser)}
                                </AvatarFallback>
                            </Avatar>

                            <div>
                                <h1 className="text-base font-semibold text-slate-900">
                                    {fullName(selectedUser)}
                                </h1>

                                <p className="-mt-0.5 text-xs capitalize text-slate-400">
                                    {selectedUser.role ?? "Guest"}
                                </p>
                            </div>
                        </div>

                        {/* CHAT AREA */}

                        <div className="min-h-0 flex-1 px-3 pb-4 md:px-5">
                            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <MessageThread
                                    userId={selectedUser.id}
                                    otherUser={selectedUser}
                                    onMessageSent={() => loadConversations()}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    !loading && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-slate-400">
                            <MessageCircle className="h-8 w-8 text-slate-300" />

                            {showUserPicker
                                ? "Pick a user from the list to start a new chat."
                                : "Select a conversation to start messaging."}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
