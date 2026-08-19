import { useState, useEffect } from "react";
import {
    Avatar,
    Spin,
    Empty,
    Badge,
    Descriptions,
    Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    UserOutlined,
    CheckCircleOutlined,
    HistoryOutlined,
    DollarOutlined,
    CalendarOutlined,
    TrophyOutlined,
    InfoCircleOutlined,
    CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { format } from "date-fns";

// ─── Types (shared, ideally move to types/index.ts) ──────────────────────────

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
    address?: string;
    profile_image?: string;
    role: string;
    is_active: boolean;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
    total_bookings?: number;
    total_spent?: number;
}

export interface BookingDetails {
    id: number;
    booking_reference: string;
    booking_status: string;
    booking_type: string;
    stay_type: string;
    check_in_date: string;
    check_out_date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    total_price: number;
    created_at: string;
    updated_at: string;
    user_id: number | null;
    walk_in_guest_id: number | null;
    booked_rooms: Array<{
        id: number;
        room_id: number;
        price_at_time_of_booking: number;
        subtotal: number;
        stay_type: string;
        check_out_time: string | null;
        status?: string;
        room: {
            id: number;
            room_number: string;
            room_type: {
                id: number;
                type_name: string;
                base_price?: number;
                short_stay_price?: number;
            };
        };
    }>;
    add_ons: Array<{
        id: number;
        add_on_name: string;
        price: number;
        pivot: { quantity: number; subtotal: number };
    }>;
}

export interface GuestDetailsResponse {
    guest: User | null;
    bookings: BookingDetails[];
    summary: {
        total_bookings: number;
        total_spent: number;
        first_visit: string | null;
        last_visit: string | null;
        average_spent: number;
    };
}

interface Props {
    open: boolean;
    onClose: () => void;
    selectedUser: User | null;
    guestDetails: GuestDetailsResponse | null;
    loadingDetails: boolean;
    baseUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string) =>
    `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();

const AVATAR_COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"];
const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const getAvatarUrl = (user: User, baseUrl: string) => {
    if (!user?.profile_image) return undefined;
    return user.profile_image.startsWith("http")
        ? user.profile_image
        : `${baseUrl}/storage/${user.profile_image}`;
};

const getLoyaltyLevel = (totalSpent = 0) => {
    if (totalSpent > 50000) return { level: "Platinum", color: "#3b82f6", bg: "#dbeafe" };
    if (totalSpent > 25000) return { level: "Gold", color: "#d97706", bg: "#fef3c7" };
    if (totalSpent > 10000) return { level: "Silver", color: "#6b7280", bg: "#f3f4f6" };
    return { level: "Bronze", color: "#cd7f32", bg: "#fef3c7" };
};

const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 })
        .format(Number(amount || 0));

const formatDate = (d?: string) => d ? format(new Date(d), "MMM dd, yyyy hh:mm a") : "—";

const STATUS_CLASSES: Record<string, string> = {
    checked_in: "bg-green-100 text-green-700",
    checked_out: "bg-blue-100 text-blue-700",
    pending: "bg-orange-100 text-orange-700",
    confirmed: "bg-cyan-100 text-cyan-700",
    cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
    checked_in: "Checked In", checked_out: "Checked Out",
    pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled",
};

// Some booking sources (e.g. the raw /bookings endpoint) don't return a
// top-level `booking_status` — only each room has its own `status`. Mirror
// the same derivation used on the Walk-in Guests page so the pill isn't blank.
const getBookingStatus = (booking: BookingDetails): string => {
    if (booking.booking_status) return booking.booking_status;

    const rooms = booking.booked_rooms ?? [];
    if (!rooms.length) return "pending";
    if (rooms.length === 1) return rooms[0]!.status || "pending";

    if (rooms.every((r) => r.status === "checked_out")) return "checked_out";
    if (rooms.every((r) => r.status === "cancelled")) return "cancelled";
    if (rooms.some((r) => r.status === "checked_in")) return "checked_in";
    if (rooms.some((r) => r.status === "confirmed")) return "confirmed";
    return "pending";
};

const StatusPill = ({ status }: { status: string }) => (
    <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_CLASSES[status] || "bg-gray-100 text-gray-600"
            }`}
    >
        {STATUS_LABELS[status] || status}
    </span>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function GuestDetailModal({
    open, onClose, selectedUser, guestDetails, loadingDetails, baseUrl,
}: Props) {
    const [activeTab, setActiveTab] = useState<"overview" | "bookings">("overview");
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (open) {
            setShouldRender(true);
            // Small delay to ensure DOM is ready
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            // Remove from DOM after animation completes
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [open]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    if (!shouldRender) return null;

    const loyalty = getLoyaltyLevel(guestDetails?.summary.total_spent);

    // ── Booking History columns (matches Walk-in Guests layout) ──
    const bookingColumns: ColumnsType<BookingDetails> = [
        {
            title: "Reference",
            key: "reference",
            render: (_, r) => (
                <span className="font-mono font-semibold bg-[#f2f0eb] text-[#4a4a42] px-2 py-1 rounded-md text-xs">
                    {r.booking_reference}
                </span>
            ),
        },
        {
            title: "Rooms",
            key: "rooms_count",
            render: (_, r) => (
                <span className="font-semibold text-[#1a1a18] text-sm">
                    {(r.booked_rooms ?? []).length} Room{(r.booked_rooms ?? []).length !== 1 ? "s" : ""}
                </span>
            ),
        },
        {
            title: "Check-in",
            key: "check_in",
            render: (_, r) => (
                <span className="text-[#1a1a18] text-sm">
                    {dayjs(r.check_in_date).format("MMM DD, YYYY")}
                </span>
            ),
        },
        {
            title: "Check-out",
            key: "check_out",
            render: (_, r) => (
                <span className="text-[#1a1a18] text-sm">
                    {r.check_out_date ? dayjs(r.check_out_date).format("MMM DD, YYYY") : "—"}
                </span>
            ),
        },
        {
            title: "Amount",
            key: "amount",
            align: "right",
            render: (_, r) => (
                <span className="font-bold text-[#1e7a45] text-[13.5px]">{formatCurrency(r.total_price)}</span>
            ),
        },
    ];

    return (
        <div
            className={`fixed inset-0 z-[1000] flex flex-col bg-white font-['DM_Sans',sans-serif] transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'
                }`}
            style={{
                fontFamily: "'DM Sans', sans-serif",
                transform: isAnimating ? 'translateY(0)' : 'translateY(100%)'
            }}
        >
            {/* ── Top Bar ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-[#eeece6] bg-white">
                <div className="flex items-center gap-4">
                    {selectedUser && (
                        <>
                            <Avatar
                                size={52}
                                src={getAvatarUrl(selectedUser, baseUrl)}
                                style={{ backgroundColor: !selectedUser.profile_image ? getAvatarColor(selectedUser.id) : undefined }}
                                icon={!selectedUser.profile_image ? <UserOutlined /> : undefined}
                            >
                                {!selectedUser.profile_image && getInitials(selectedUser.first_name, selectedUser.last_name)}
                            </Avatar>
                            <div>
                                <h1 className="text-xl font-bold text-[#1a1a18] m-0"
                                    style={{ fontFamily: "'Playfair Display', serif" }}>
                                    {selectedUser.first_name} {selectedUser.last_name}
                                </h1>
                                <p className="text-xs text-[#8a8878] m-0 mt-0.5">{selectedUser.email}</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Loyalty badge */}
                    {/* {guestDetails && (
                        <span
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{ background: loyalty.bg, color: loyalty.color }}
                        >
                            <TrophyOutlined />
                            {loyalty.level} Member
                        </span>
                    )} */}
                    {/* Active badge */}
                    {selectedUser && (
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${selectedUser.is_active ? "bg-[#e8f5ee] text-[#1e7a45]" : "bg-[#f2f0eb] text-[#6b6960]"
                            }`}>
                            {selectedUser.is_active ? "Active" : "Inactive"}
                        </span>
                    )}
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e0ddd6] text-[#6b6960] hover:bg-[#1a1a18] hover:text-white hover:border-[#1a1a18] transition-all text-base"
                    >
                        <CloseOutlined />
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto bg-[#f8f7f4]">
                <Spin spinning={loadingDetails} className="min-h-full">
                    {!guestDetails && !loadingDetails ? (
                        <div className="flex items-center justify-center h-full py-24">
                            <Empty description="No guest details found" />
                        </div>
                    ) : guestDetails && (
                        <div className="max-w-6xl mx-auto px-8 py-8">

                            {/* ── Summary Cards ── */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    {
                                        label: "Total Visits",
                                        value: guestDetails.summary.total_bookings,
                                        valueClass: "text-[#1a1a18]",
                                    },
                                    {
                                        label: "Total Spent",
                                        value: formatCurrency(guestDetails.summary.total_spent),
                                        valueClass: "text-[#1e7a45]",
                                    },
                                    {
                                        label: "Avg per Visit",
                                        value: formatCurrency(guestDetails.summary.average_spent),
                                        valueClass: "text-[#c17a00]",
                                    },
                                    {
                                        label: "First Visit",
                                        value: guestDetails.summary.first_visit
                                            ? dayjs(guestDetails.summary.first_visit).format("MMM DD, YYYY")
                                            : "No visits",
                                        valueClass: "text-[#1a1a18] text-base",
                                    },
                                ].map(({ label, value, valueClass }) => (
                                    <div key={label} className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878]">{label}</span>
                                        </div>
                                        <p className={`text-2xl font-bold m-0 ${valueClass}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Tabs ── */}
                            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">
                                {/* Tab bar */}
                                <div className="flex border-b border-[#eeece6] px-6">
                                    {(["overview", "bookings"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold transition-all border-b-2 -mb-px ${activeTab === tab
                                                ? "text-[#3eb489] border-[#3eb489]"
                                                : "text-[#8a8878] border-transparent hover:text-[#1a1a18]"
                                                }`}
                                        >
                                            {tab === "overview" ? <InfoCircleOutlined /> : <HistoryOutlined />}
                                            {tab === "overview" ? "Guest Information" : "Booking History"}
                                            {tab === "bookings" && (
                                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#3eb489] text-white text-[10px] font-bold">
                                                    {guestDetails.bookings.length}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab body */}
                                <div className="p-6">
                                    {activeTab === "overview" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Personal Info */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-4">Personal Information</p>
                                                <div className="flex flex-col gap-3">
                                                    {[
                                                        { label: "Full Name", value: `${guestDetails.guest?.first_name ?? ""} ${guestDetails.guest?.last_name ?? ""}`.trim() || "—" },
                                                        { label: "Email", value: guestDetails.guest?.email || "—" },
                                                        { label: "Contact Number", value: guestDetails.guest?.contact_number || "—" },
                                                        { label: "Address", value: guestDetails.guest?.address || "—" },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#b0ae9f]">{label}</span>
                                                            <span className="text-sm font-medium text-[#1a1a18]">{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Account Info */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8878] mb-4">Account Details</p>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b0ae9f]">Email Verification</span>
                                                        {guestDetails.guest?.email_verified_at ? (
                                                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e7a45]">
                                                                <CheckCircleOutlined /> Verified
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-[#c17a00]">Not Verified</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b0ae9f]">Account Status</span>
                                                        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${guestDetails.guest?.is_active ? "text-[#1e7a45]" : "text-[#6b6960]"}`}>
                                                            <span className={`w-2 h-2 rounded-full ${guestDetails.guest?.is_active ? "bg-[#3eb489]" : "bg-[#c0bdb4]"}`} />
                                                            {guestDetails.guest?.is_active ? "Active" : "Inactive"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b0ae9f]">Member Since</span>
                                                        <span className="text-sm font-medium text-[#1a1a18]">{formatDate(guestDetails.guest?.created_at)}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b0ae9f]">Last Login</span>
                                                        <span className="text-sm font-medium text-[#1a1a18]">
                                                            {guestDetails.guest?.last_login ? formatDate(guestDetails.guest.last_login) : "Never"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b0ae9f]">Last Visit</span>
                                                        <span className="text-sm font-medium text-[#1a1a18]">
                                                            {guestDetails.bookings[0]?.check_in_date
                                                                ? dayjs(guestDetails.bookings[0].check_in_date).format("MMMM DD, YYYY")
                                                                : "No visits yet"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "bookings" && (
                                        <Table
                                            columns={bookingColumns}
                                            dataSource={guestDetails.bookings}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, showTotal: (t) => `${t} bookings` }}
                                            size="middle"
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <div className="p-4 bg-[#f8f7f4] rounded-xl border border-[#e8e6df]">
                                                        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                                                            <Descriptions.Item label="Booking Reference">
                                                                <span className="font-mono text-xs">{record.booking_reference}</span>
                                                            </Descriptions.Item>
                                                            <Descriptions.Item label="Status">
                                                                <StatusPill status={getBookingStatus(record)} />
                                                            </Descriptions.Item>
                                                            <Descriptions.Item label="Check-in">
                                                                {dayjs(record.check_in_date).format("MMMM DD, YYYY")}
                                                                {record.check_in_time ? ` · ${dayjs(record.check_in_time).format("hh:mm A")}` : ""}
                                                            </Descriptions.Item>
                                                            <Descriptions.Item label="Check-out">
                                                                {record.check_out_date ? dayjs(record.check_out_date).format("MMMM DD, YYYY") : "N/A"}
                                                                {record.check_out_time ? ` · ${dayjs(record.check_out_time).format("hh:mm A")}` : ""}
                                                            </Descriptions.Item>
                                                            <Descriptions.Item label="Stay Type">
                                                                {record.stay_type === "overnight" ? "Overnight" : "Short Stay"}
                                                            </Descriptions.Item>
                                                            <Descriptions.Item label="Total Amount">
                                                                <span className="font-bold text-[#1e7a45]">{formatCurrency(record.total_price)}</span>
                                                            </Descriptions.Item>

                                                            <Descriptions.Item label="Booked Rooms" span={2}>
                                                                <div className="space-y-3">
                                                                    {(record.booked_rooms ?? []).map((br) => (
                                                                        <div key={br.id} className="rounded-xl border border-[#e8e6df] p-4 bg-white">
                                                                            <div className="flex justify-between items-start gap-3">
                                                                                <h4 className="font-semibold text-[#1a1a18] m-0">
                                                                                    Room {br.room.room_number} ({br.room.room_type?.type_name})
                                                                                </h4>
                                                                                <StatusPill status={br.status || getBookingStatus(record)} />
                                                                            </div>
                                                                            <div className="flex justify-between items-center mt-3">
                                                                                <span className="text-sm text-[#8a8878]">
                                                                                    {br.stay_type === "overnight" ? "Overnight" : "Short Stay"}
                                                                                </span>
                                                                                <span className="font-semibold text-[#1a1a18]">
                                                                                    {formatCurrency(br.subtotal)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-3 flex justify-between border-t border-[#eeece6] pt-3">
                                                                                <span className="font-semibold text-[#6b6960] text-sm">Subtotal</span>
                                                                                <span className="font-bold text-[#1a1a18]">
                                                                                    {formatCurrency(br.subtotal)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </Descriptions.Item>

                                                            {record.add_ons?.length > 0 && (
                                                                <Descriptions.Item label="Add-ons" span={2}>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {record.add_ons.map((a) => (
                                                                            <span key={a.id} className="px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-100 text-orange-700">
                                                                                {a.add_on_name} ×{a.pivot.quantity} = {formatCurrency(a.pivot.subtotal)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </Descriptions.Item>
                                                            )}
                                                        </Descriptions>
                                                    </div>
                                                ),
                                            }}
                                            className="[&_.ant-table-thead_.ant-table-cell]:bg-[#f8f7f4] [&_.ant-table-thead_.ant-table-cell]:text-[10.5px] [&_.ant-table-thead_.ant-table-cell]:font-bold [&_.ant-table-thead_.ant-table-cell]:text-[#8a8878] [&_.ant-table-thead_.ant-table-cell]:uppercase [&_.ant-table-thead_.ant-table-cell]:tracking-widest [&_.ant-table-tbody_.ant-table-row:hover_.ant-table-cell]:bg-[#f9f8f5]"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Spin>
            </div>
        </div>
    );
}