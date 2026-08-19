import { useEffect, useState } from "react";
import api from "@/services/api";
import {
    SearchOutlined,
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    ReloadOutlined,
    MoreOutlined,
    EyeOutlined,
    DeleteOutlined,
    TeamOutlined,
    CalendarOutlined,
    HistoryOutlined,
    CloseOutlined,
    StarOutlined,
    RiseOutlined,
} from "@ant-design/icons";

import {
    Table,
    Spin,
    Empty,
    message,
    Modal,
    Dropdown,
    Typography,
    Tooltip,
    Descriptions,
    Tabs,
} from "antd";

import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface WalkInGuest {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    full_name?: string;
    contact_number?: string;
    address?: string;
    bookings_count?: number;
    total_spent?: number;
    created_at: string;
    updated_at: string;
}

interface BookingDetails {
    id: number;
    booking_reference: string;
    booking_status: string;
    booking_type: string;
    stay_type: string;
    check_in_date: string;
    check_out_date: string;
    check_in_time: string | null;
    total_price: number;
    created_at: string;
    updated_at: string;
    walk_in_guest: {
        id: number;
        first_name: string;
        last_name: string;
        contact_number?: string;
        address?: string;
    };
    booked_rooms: Array<{
        id: number;
        status: string;
        room_id: number;
        price_at_time_of_booking: number;
        subtotal: number;
        stay_type: string;
        check_out_time: string | null;

        room: {
            id: number;
            room_number: string;
            room_type: {
                id: number;
                type_name: string;
            };
        };

        booking_add_ons: Array<{
            id: number;
            quantity: number;
            subtotal: number;

            add_on: {
                id: number;
                add_on_name: string;
                price: number;
            };
        }>;
    }>;
}

interface GuestDetailsResponse {
    guest: WalkInGuest;
    bookings: BookingDetails[];
    summary: {
        total_bookings: number;
        total_spent: number;
        first_visit: string;
        last_visit: string;
        average_spent: number;
    };
}

// Stat Card Component (matches Users.tsx)
const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    gradient,
    iconBg,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
}) => (
    <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm border border-white/60 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div
            className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${gradient}`}
        />
        <div className="relative flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    {title}
                </p>
                <p className="text-3xl font-bold text-slate-800 leading-tight">
                    {typeof value === "number" ? value.toLocaleString() : value}
                </p>
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                )}
            </div>
            <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}
            >
                {icon}
            </div>
        </div>
    </div>
);

const statusStyles: Record<string, string> = {
    checked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
    checked_out: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-cyan-50 text-cyan-700 border-cyan-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
};

const statusDot: Record<string, string> = {
    checked_in: "bg-emerald-500",
    checked_out: "bg-blue-500",
    pending: "bg-amber-500",
    confirmed: "bg-cyan-500",
    cancelled: "bg-red-500",
};

const StatusPill = ({ status }: { status: string }) => (
    <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusStyles[status] || "bg-slate-50 text-slate-500 border-slate-200"}`}
    >
        <span
            className={`w-1.5 h-1.5 rounded-full ${statusDot[status] || "bg-slate-400"}`}
        />
        {getStatusText(status)}
    </span>
);

function getStatusText(status: string) {
    const text: Record<string, string> = {
        checked_in: "Checked In",
        checked_out: "Checked Out",
        pending: "Pending",
        confirmed: "Confirmed",
        cancelled: "Cancelled",
    };
    return text[status] || status;
}

export default function WalkInGuests() {
    const [guests, setGuests] = useState<WalkInGuest[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedGuest, setSelectedGuest] = useState<WalkInGuest | null>(
        null,
    );
    const [guestDetails, setGuestDetails] =
        useState<GuestDetailsResponse | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState("bookings");

    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [totalRevenue, setTotalRevenue] = useState(0);

    const fetchGuests = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const params: any = { page: currentPage, per_page: perPage };
            if (debouncedSearch) params.search = debouncedSearch;

            const response = await api.get("/walk-in-guests", { params });
            const paginatedData = response.data;

            setGuests(paginatedData.data || []);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);
            setTotalRevenue(Number(paginatedData.total_revenue || 0));
        } catch (err: any) {
            console.error(err);
            message.error(
                err.response?.data?.message || "Failed to load walk-in guests",
            );
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const fetchGuestDetails = async (guestId: number) => {
        setLoadingDetails(true);
        try {
            const response = await api.get(
                `/walk-in-guests/${guestId}/details`,
            );
            setGuestDetails(response.data);
        } catch (error: any) {
            message.error(
                error.response?.data?.message || "Failed to load guest details",
            );
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleViewGuest = async (guest: WalkInGuest) => {
        setSelectedGuest(guest);
        setViewModalVisible(true);
        setActiveTab("bookings");
        await fetchGuestDetails(guest.id);
    };

    const handleDeleteGuest = async (guest: WalkInGuest) => {
        try {
            await api.delete(`/walk-in-guests/${guest.id}`);
            message.success(`${guest.full_name} has been deleted`);
            fetchGuests();
            setDeleteModalVisible(false);
        } catch (error: any) {
            message.error(
                error.response?.data?.message || "Failed to delete guest",
            );
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchGuests();
    }, [debouncedSearch, currentPage]);

    const getInitials = (firstName: string, lastName: string) =>
        `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

    const avatarColors = [
        "#10b981",
        "#14b8a6",
        "#06b6d4",
        "#3b82f6",
        "#6366f1",
        "#8b5cf6",
    ];
    const getAvatarColor = (name: string) =>
        avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        return format(new Date(dateString), "MMM dd, yyyy hh:mm a");
    };

    const formatCurrency = (amount: number | string) => {
        const safeAmount = Number(amount || 0);
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(safeAmount);
    };

    const columns: ColumnsType<WalkInGuest> = [
        {
            title: "Guest",
            key: "guest",
            width: 280,
            fixed: "left",
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                        style={{
                            backgroundColor: getAvatarColor(record.first_name),
                        }}
                    >
                        {getInitials(record.first_name, record.last_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="relative top-2 font-semibold text-slate-800 text-sm truncate">
                            {record.full_name}
                        </p>
                        <span className="relative bottom-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-lg text-xs font-semibold border bg-indigo-50 text-indigo-600 border-indigo-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Walk-in
                        </span>
                    </div>
                </div>
            ),
        },
        {
            title: "Contact",
            key: "contact",
            responsive: ["md"],
            render: (_, record) => (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <PhoneOutlined className="text-slate-400 text-xs" />
                        </div>
                        <span className="text-sm text-slate-600">
                            {record.contact_number || "---"}
                        </span>
                    </div>
                    {record.address && (
                        <Tooltip title={record.address}>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <EnvironmentOutlined className="text-slate-400 text-xs" />
                                </div>
                                <span className="text-sm text-slate-600 truncate max-w-[180px]">
                                    {record.address}
                                </span>
                            </div>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: "Visits",
            key: "bookings",
            width: 100,
            align: "center",
            render: (_, record) => (
                <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm">
                    {record.bookings_count || 0}
                </span>
            ),
        },
        {
            title: "Total Spent",
            key: "total_spent",
            width: 140,
            render: (_, record) => (
                <span className="font-bold text-slate-800 text-sm">
                    {formatCurrency(record.total_spent || 0)}
                </span>
            ),
        },
        {
            title: "First Visit",
            key: "created",
            width: 160,
            align: "center",
            responsive: ["md"],
            render: (_, record) => (
                <Tooltip title={formatDate(record.created_at)}>
                    <div className="flex items-center gap-2 justify-center">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <CalendarOutlined className="text-slate-400 text-xs" />
                        </div>
                        <span className="text-sm text-slate-600">
                            {dayjs(record.created_at).format("MMM DD, YYYY")}
                        </span>
                    </div>
                </Tooltip>
            ),
        },
        {
            title: "",
            key: "actions",
            width: 60,
            align: "center",
            fixed: "right",
            render: (_, record) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: "view",
                                label: (
                                    <span className="text-sm">
                                        View Details
                                    </span>
                                ),
                                icon: <EyeOutlined />,
                                onClick: () => handleViewGuest(record),
                            },
                            { type: "divider" },
                            {
                                key: "delete",
                                label: (
                                    <span className="text-sm">
                                        Delete Guest
                                    </span>
                                ),
                                icon: <DeleteOutlined />,
                                danger: true,
                                onClick: () => {
                                    setSelectedGuest(record);
                                    setDeleteModalVisible(true);
                                },
                            },
                        ],
                    }}
                    trigger={["click"]}
                >
                    <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
                        <MoreOutlined />
                    </button>
                </Dropdown>
            ),
        },
    ];

    const getBookingStatus = (booking: BookingDetails) => {
        const rooms = booking.booked_rooms ?? [];

        if (!rooms.length) return "pending";

        if (rooms.length === 1) {
            return rooms[0]!.status;
        }

        if (rooms.every((r) => r.status === "checked_out"))
            return "checked_out";

        if (rooms.every((r) => r.status === "refunded")) return "refunded";

        if (rooms.every((r) => r.status === "cancelled")) return "cancelled";

        if (rooms.some((r) => r.status === "checked_in")) return "checked_in";

        if (rooms.some((r) => r.status === "confirmed")) return "confirmed";

        return "pending";
    };

    const getBookingTotal = (booking: BookingDetails) => {
        let total = 0;

        booking.booked_rooms?.forEach((room) => {
            total += Number(room.subtotal || 0);

            room.booking_add_ons?.forEach((addon) => {
                total += Number(addon.subtotal || 0);
            });
        });

        return total;
    };

    // interface BookingHistoryRow {
    //     id: number;
    //     booking_reference: string;
    //     stay_type: string;
    //     check_in_date: string;
    //     check_out_date: string;
    //     subtotal: number;
    //     status: string;

    //     room: {
    //         room_number: string;
    //         room_type: {
    //             type_name: string;
    //         };
    //     };

    //     add_ons: {
    //         id: number;
    //         add_on_name: string;
    //         pivot: {
    //             quantity: number;
    //             subtotal: number;
    //         };
    //     }[];
    // }

    // const bookingRows: BookingHistoryRow[] =
    //     guestDetails?.bookings.flatMap((booking) =>
    //         booking.booked_rooms.map((room) => ({
    //             id: room.id,
    //             booking_reference: booking.booking_reference,
    //             stay_type: room.stay_type,
    //             check_in_date: booking.check_in_date,
    //             check_out_date: booking.check_out_date,
    //             subtotal: room.subtotal,
    //             status: room.status,
    //             room: room.room,
    //             add_ons: booking.add_ons ?? [],
    //         })),
    //     ) ?? [];

    const getRoomSubtotal = (room: BookingDetails["booked_rooms"][number]) => {
        const addOnTotal =
            room.booking_add_ons?.reduce(
                (sum, addon) => sum + Number(addon.subtotal || 0),
                0,
            ) || 0;

        return Number(room.subtotal || 0) + addOnTotal;
    };

    const bookingColumns: ColumnsType<BookingDetails> = [
        {
            title: "Reference",
            dataIndex: "booking_reference",
            render: (value) => (
                <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs">
                    {value}
                </span>
            ),
        },
        {
            title: "Rooms",
            render: (_, record) => (
                <span className="font-semibold">
                    {record.booked_rooms.length} Room
                    {record.booked_rooms.length > 1 ? "s" : ""}
                </span>
            ),
        },

        // {
        //     title: "Room",
        //     render: (_, record) => (
        //         <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200">
        //             Room {record.room.room_number} (
        //             {record.room.room_type.type_name})
        //         </span>
        //     ),
        // },

        {
            title: "Check-in",
            render: (_, record) =>
                dayjs(record.check_in_date).format("MMM DD, YYYY"),
        },

        {
            title: "Check-out",
            render: (_, record) =>
                dayjs(record.check_out_date).format("MMM DD, YYYY"),
        },

        // {
        //     title: "Stay Type",
        //     render: (_, record) => (
        //         <span
        //             className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${
        //                 record.stay_type === "overnight"
        //                     ? "bg-blue-50 text-blue-600 border border-blue-200"
        //                     : "bg-amber-50 text-amber-600 border border-amber-200"
        //             }`}
        //         >
        //             {record.stay_type === "overnight"
        //                 ? "Overnight"
        //                 : "Short Stay"}
        //         </span>
        //     ),
        // },

        {
            title: "Amount",
            render: (_, record) => (
                <span className="font-bold">
                    {/* {formatCurrency(record.subtotal)} */}
                    {formatCurrency(getBookingTotal(record))}
                </span>
            ),
        },

        // {
        //     title: "Status",
        //     render: (_, record) => (
        //         <StatusPill status={getBookingStatus(record)} />
        //     ),
        //     // <StatusPill status={record.status} />,
        // },
    ];
    // const bookingColumns: ColumnsType<BookingDetails> = [
    //     {
    //         title: "Reference",
    //         key: "reference",
    //         render: (_, record) => (
    //             <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs">
    //                 {record.booking_reference}
    //             </span>
    //         ),
    //     },
    //     {
    //         title: "Check-in",
    //         key: "check_in",
    //         render: (_, record) => (
    //             <div className="flex flex-col">
    //                 <span className="text-slate-700 text-sm">
    //                     {dayjs(record.check_in_date).format("MMM DD, YYYY")}
    //                 </span>
    //                 {record.check_in_time && (
    //                     <span className="text-slate-400 text-xs">
    //                         {dayjs(record.check_in_time).format("hh:mm A")}
    //                     </span>
    //                 )}
    //             </div>
    //         ),
    //     },
    //     {
    //         title: "Check-out",
    //         key: "check_out",
    //         render: (_, record) => (
    //             <span className="text-slate-700 text-sm">
    //                 {record.check_out_date
    //                     ? dayjs(record.check_out_date).format("MMM DD, YYYY")
    //                     : "-"}
    //             </span>
    //         ),
    //     },
    //     {
    //         title: "Stay Type",
    //         key: "stay_type",
    //         render: (_, record) => (
    //             <span
    //                 className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${
    //                     record.stay_type === "overnight"
    //                         ? "bg-blue-50 text-blue-600 border-blue-200"
    //                         : "bg-amber-50 text-amber-600 border-amber-200"
    //                 }`}
    //             >
    //                 {record.stay_type === "overnight"
    //                     ? "Overnight"
    //                     : "Short Stay"}
    //             </span>
    //         ),
    //     },
    //     {
    //         title: "Rooms",
    //         key: "rooms",
    //         render: (_, record) => (
    //             <div className="flex flex-wrap gap-1">
    //                 {(record.booked_rooms ?? []).map((br) => (
    //                     <span
    //                         key={br.id}
    //                         className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200"
    //                     >
    //                         Room {br.room.room_number}
    //                     </span>
    //                 ))}
    //             </div>
    //         ),
    //     },
    //     {
    //         title: "Amount",
    //         key: "amount",
    //         align: "right",
    //         render: (_, record) => (
    //             <span className="font-bold text-slate-800 text-sm">
    //                 {formatCurrency(getBookingTotal(record))}
    //             </span>
    //         ),
    //     },
    //     {
    //         title: "Status",
    //         key: "status",
    //         align: "center",
    //         render: (_, record) => (
    //             <StatusPill status={getBookingStatus(record)} />
    //         ),
    //     },
    // ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <UserOutlined className="text-white text-lg" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                                Walk-in Guests
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 ml-13">
                            Track guests who book without a prior reservation
                        </p>
                    </div>
                    <button
                        onClick={() => fetchGuests(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                    >
                        <ReloadOutlined
                            className={refreshing ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>
                <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
            </div>

            {/* ── Stats Grid ──────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Total Guests"
                    value={total}
                    subtitle="All walk-in records"
                    icon={<TeamOutlined className="text-xl text-indigo-600" />}
                    gradient="bg-indigo-500"
                    iconBg="bg-indigo-50"
                />
                <StatCard
                    title="Total Revenue"
                    value={`₱${Number(totalRevenue || 0).toLocaleString()}`}
                    subtitle="Lifetime walk-in spend"
                    icon={
                        <span className="text-xl font-bold text-emerald-600">
                            ₱
                        </span>
                    }
                    gradient="bg-emerald-500"
                    iconBg="bg-emerald-50"
                />
                <StatCard
                    title="Avg. Spend / Guest"
                    value={
                        total > 0
                            ? `₱${Math.round(totalRevenue / total).toLocaleString()}`
                            : "₱0"
                    }
                    subtitle="Across all guests"
                    icon={<RiseOutlined className="text-xl text-amber-600" />}
                    gradient="bg-amber-500"
                    iconBg="bg-amber-50"
                />
            </div>

            {/* ── Search ──────────────────────────────────────── */}
            <div className="mb-5 flex justify-end">
                <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                        <SearchOutlined className="text-slate-400 text-base" />
                        <div className="mx-3 h-5 border-l border-slate-300" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Search by name, address, or contact..."
                        className="w-[400px] pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 shadow-sm outline-none transition-all
                        focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                            <CloseOutlined className="text-xs" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Table Card ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={guests}
                        rowKey="id"
                        className="guests-table"
                        scroll={{ x: 800 }}
                        pagination={{
                            current: currentPage,
                            total: total,
                            pageSize: perPage,
                            showSizeChanger: true,
                            showTotal: (t, range) =>
                                `${range[0]}-${range[1]} of ${t} guests`,
                            onChange: (page) => setCurrentPage(page),
                            position: ["bottomCenter"],
                        }}
                        locale={{
                            emptyText: (
                                <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                                        <UserOutlined className="text-2xl text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-500">
                                        No walk-in guests found
                                    </p>
                                    <p className="text-sm">
                                        Try adjusting your search
                                    </p>
                                </div>
                            ),
                        }}
                    />
                </Spin>
            </div>

            {/* ── View Modal ────────────────────────────────────── */}
            <Modal
                title={
                    selectedGuest && (
                        <div className="flex items-center gap-4 pb-1">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                                style={{
                                    backgroundColor: getAvatarColor(
                                        selectedGuest.first_name,
                                    ),
                                }}
                            >
                                {getInitials(
                                    selectedGuest.first_name,
                                    selectedGuest.last_name,
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-lg leading-tight">
                                    {selectedGuest.full_name}
                                </p>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-lg text-xs font-semibold border bg-indigo-50 text-indigo-600 border-indigo-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Walk-in Guest
                                </span>
                            </div>
                        </div>
                    )
                }
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                width={900}
                centered
                footer={[
                    <button
                        key="close"
                        onClick={() => setViewModalVisible(false)}
                        className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Close
                    </button>,
                ]}
                className="custom-modal"
            >
                <Spin spinning={loadingDetails}>
                    {guestDetails && (
                        <div className="mt-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <HistoryOutlined className="text-indigo-500 text-lg mb-1.5 block" />
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5">
                                        Visits
                                    </p>
                                    <p className="text-xl font-bold text-slate-800 m-0">
                                        {guestDetails.summary.total_bookings}
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-emerald-500 text-lg mb-1.5 block">
                                        ₱
                                    </span>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5">
                                        Total Spent
                                    </p>
                                    <p className="text-xl font-bold text-emerald-600 m-0">
                                        {formatCurrency(
                                            guestDetails.summary.total_spent,
                                        )}
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-amber-500 text-lg mb-1.5 block">
                                        ₱
                                    </span>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5">
                                        Average
                                    </p>
                                    <p className="text-xl font-bold text-amber-600 m-0">
                                        {formatCurrency(
                                            guestDetails.summary.average_spent,
                                        )}
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <CalendarOutlined className="text-slate-400 text-lg mb-1.5 block" />
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5">
                                        First Visit
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 m-0">
                                        {guestDetails.summary.first_visit
                                            ? dayjs(
                                                  guestDetails.summary
                                                      .first_visit,
                                              ).format("MMM DD, YYYY")
                                            : "No visits"}
                                    </p>
                                </div>
                            </div>

                            <Tabs
                                activeKey={activeTab}
                                onChange={setActiveTab}
                                className="guest-tabs"
                            >
                                <TabPane tab="Booking History" key="bookings">
                                    <Table
                                        columns={bookingColumns}
                                        // dataSource={bookingRows}
                                        dataSource={guestDetails.bookings}
                                        rowKey="id"
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                        // expandable={{
                                        //     expandedRowRender: (record) => (
                                        //         <div className="p-4 bg-slate-50 rounded-xl">
                                        //             <Descriptions
                                        //                 column={{
                                        //                     xs: 1,
                                        //                     sm: 2,
                                        //                 }}
                                        //                 size="small"
                                        //                 bordered
                                        //             >
                                        //                 <Descriptions.Item label="Booking Reference">
                                        //                     <span className="font-mono text-xs">
                                        //                         {
                                        //                             record.booking_reference
                                        //                         }
                                        //                     </span>
                                        //                 </Descriptions.Item>
                                        //                 <Descriptions.Item label="Status">
                                        //                     <StatusPill
                                        //                         status={
                                        //                             record.booking_status
                                        //                         }
                                        //                     />
                                        //                 </Descriptions.Item>
                                        //                 <Descriptions.Item label="Check-in Date">
                                        //                     {dayjs(
                                        //                         record.check_in_date,
                                        //                     ).format(
                                        //                         "MMMM DD, YYYY",
                                        //                     )}
                                        //                 </Descriptions.Item>
                                        //                 <Descriptions.Item label="Check-out Date">
                                        //                     {record.check_out_date
                                        //                         ? dayjs(
                                        //                               record.check_out_date,
                                        //                           ).format(
                                        //                               "MMMM DD, YYYY",
                                        //                           )
                                        //                         : "N/A"}
                                        //                 </Descriptions.Item>
                                        //                 <Descriptions.Item label="Stay Type">
                                        //                     {record.stay_type ===
                                        //                     "overnight"
                                        //                         ? "Overnight"
                                        //                         : "Short Stay"}
                                        //                 </Descriptions.Item>
                                        //                 <Descriptions.Item label="Total Amount">
                                        //                     <span className="font-bold text-slate-800">
                                        //                         {formatCurrency(
                                        //                             record.total_price,
                                        //                         )}
                                        //                     </span>
                                        //                 </Descriptions.Item>
                                        //                 <Descriptions.Item
                                        //                     label="Rooms Booked"
                                        //                     span={2}
                                        //                 >
                                        //                     <div className="flex flex-wrap gap-1">
                                        //                         {(
                                        //                             record.booked_rooms ??
                                        //                             []
                                        //                         ).map((br) => (
                                        //                             <span
                                        //                                 key={
                                        //                                     br.id
                                        //                                 }
                                        //                                 className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200"
                                        //                             >
                                        //                                 Room{" "}
                                        //                                 {
                                        //                                     br
                                        //                                         .room
                                        //                                         .room_number
                                        //                                 }{" "}
                                        //                                 (
                                        //                                 {br.room
                                        //                                     .room_type
                                        //                                     ?.type_name ||
                                        //                                     "Standard"}
                                        //                                 )
                                        //                             </span>
                                        //                         ))}
                                        //                     </div>
                                        //                 </Descriptions.Item>
                                        //                 {record.add_ons &&
                                        //                     record.add_ons
                                        //                         .length > 0 && (
                                        //                         <Descriptions.Item
                                        //                             label="Add-ons"
                                        //                             span={2}
                                        //                         >
                                        //                             <div className="flex flex-wrap gap-1">
                                        //                                 {record.add_ons.map(
                                        //                                     (
                                        //                                         addon,
                                        //                                     ) => (
                                        //                                         <span
                                        //                                             key={
                                        //                                                 addon.id
                                        //                                             }
                                        //                                             className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200"
                                        //                                         >
                                        //                                             {
                                        //                                                 addon.add_on_name
                                        //                                             }{" "}
                                        //                                             x
                                        //                                             {
                                        //                                                 addon
                                        //                                                     .pivot
                                        //                                                     .quantity
                                        //                                             }{" "}
                                        //                                             =
                                        //                                             ₱
                                        //                                             {
                                        //                                                 addon
                                        //                                                     .pivot
                                        //                                                     .subtotal
                                        //                                             }
                                        //                                         </span>
                                        //                                     ),
                                        //                                 )}
                                        //                             </div>
                                        //                         </Descriptions.Item>
                                        //                     )}
                                        //             </Descriptions>
                                        //         </div>
                                        //     ),
                                        // }}
                                        // expandable={{
                                        //     expandedRowRender: (record) => (
                                        //         <Descriptions
                                        //             bordered
                                        //             size="small"
                                        //             column={2}
                                        //         >
                                        //             <Descriptions.Item label="Booking">
                                        //                 {
                                        //                     record.booking_reference
                                        //                 }
                                        //             </Descriptions.Item>

                                        //             <Descriptions.Item label="Status">
                                        //                 <StatusPill
                                        //                     status={
                                        //                         record.status
                                        //                     }
                                        //                 />
                                        //             </Descriptions.Item>

                                        //             <Descriptions.Item label="Room">
                                        //                 Room{" "}
                                        //                 {
                                        //                     record.room
                                        //                         .room_number
                                        //                 }{" "}
                                        //                 (
                                        //                 {
                                        //                     record.room
                                        //                         .room_type
                                        //                         .type_name
                                        //                 }
                                        //                 )
                                        //             </Descriptions.Item>

                                        //             <Descriptions.Item label="Amount">
                                        //                 {formatCurrency(
                                        //                     record.subtotal,
                                        //                 )}
                                        //             </Descriptions.Item>

                                        //             <Descriptions.Item label="Check-in">
                                        //                 {dayjs(
                                        //                     record.check_in_date,
                                        //                 ).format(
                                        //                     "MMMM DD, YYYY",
                                        //                 )}
                                        //             </Descriptions.Item>

                                        //             <Descriptions.Item label="Check-out">
                                        //                 {dayjs(
                                        //                     record.check_out_date,
                                        //                 ).format(
                                        //                     "MMMM DD, YYYY",
                                        //                 )}
                                        //             </Descriptions.Item>

                                        //             <Descriptions.Item
                                        //                 label="Add-ons"
                                        //                 span={2}
                                        //             >
                                        //                 {(record.add_ons ?? [])
                                        //                     .length === 0 ? (
                                        //                     <span>
                                        //                         No add-ons
                                        //                     </span>
                                        //                 ) : (
                                        //                     <div className="flex flex-wrap gap-2">
                                        //                         {(
                                        //                             record.add_ons ??
                                        //                             []
                                        //                         ).map(
                                        //                             (addon) => (
                                        //                                 <span
                                        //                                     key={
                                        //                                         addon.id
                                        //                                     }
                                        //                                     className="inline-flex px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs"
                                        //                                 >
                                        //                                     {
                                        //                                         addon.add_on_name
                                        //                                     }{" "}
                                        //                                     ×{" "}
                                        //                                     {
                                        //                                         addon
                                        //                                             .pivot
                                        //                                             .quantity
                                        //                                     }
                                        //                                     {
                                        //                                         " = "
                                        //                                     }
                                        //                                     {formatCurrency(
                                        //                                         addon
                                        //                                             .pivot
                                        //                                             .subtotal,
                                        //                                     )}
                                        //                                 </span>
                                        //                             ),
                                        //                         )}
                                        //                     </div>
                                        //                 )}
                                        //             </Descriptions.Item>
                                        //         </Descriptions>
                                        //     ),
                                        // }}
                                        expandable={{
                                            expandedRowRender: (record) => (
                                                <Descriptions
                                                    bordered
                                                    size="small"
                                                    column={2}
                                                >
                                                    <Descriptions.Item label="Booking Reference">
                                                        <span className="font-mono text-xs">
                                                            {
                                                                record.booking_reference
                                                            }
                                                        </span>
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Status">
                                                        <StatusPill
                                                            status={getBookingStatus(
                                                                record,
                                                            )}
                                                        />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Check-in">
                                                        {dayjs(
                                                            record.check_in_date,
                                                        ).format(
                                                            "MMMM DD, YYYY",
                                                        )}
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Check-out">
                                                        {record.check_out_date
                                                            ? dayjs(
                                                                  record.check_out_date,
                                                              ).format(
                                                                  "MMMM DD, YYYY",
                                                              )
                                                            : "N/A"}
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Stay Type">
                                                        {record.stay_type ===
                                                        "overnight"
                                                            ? "Overnight"
                                                            : "Short Stay"}
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Total Amount">
                                                        <span className="font-bold text-slate-800">
                                                            {formatCurrency(
                                                                getBookingTotal(
                                                                    record,
                                                                ),
                                                            )}
                                                        </span>
                                                    </Descriptions.Item>

                                                    {/* ADD ONS */}
                                                    <Descriptions.Item
                                                        label="Booked Rooms"
                                                        span={2}
                                                    >
                                                        <div className="space-y-4">
                                                            {(
                                                                record.booked_rooms ??
                                                                []
                                                            ).map((room) => (
                                                                <div
                                                                    key={
                                                                        room.id
                                                                    }
                                                                    className="rounded-xl border border-slate-200 p-4 bg-white"
                                                                >
                                                                    {/* Header */}
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <h4 className="font-semibold text-slate-800">
                                                                                Room{" "}
                                                                                {
                                                                                    room
                                                                                        .room
                                                                                        .room_number
                                                                                }{" "}
                                                                                (
                                                                                {
                                                                                    room
                                                                                        .room
                                                                                        .room_type
                                                                                        .type_name
                                                                                }
                                                                                )
                                                                            </h4>
                                                                        </div>

                                                                        <StatusPill
                                                                            status={
                                                                                room.status
                                                                            }
                                                                        />
                                                                    </div>

                                                                    <div className="flex justify-between items-center mt-3">
                                                                        <span className="text-sm text-slate-500">
                                                                            {room.stay_type ===
                                                                            "overnight"
                                                                                ? "Overnight"
                                                                                : "Short Stay"}
                                                                        </span>

                                                                        <span className="font-semibold text-slate-700">
                                                                            {formatCurrency(
                                                                                room.subtotal,
                                                                            )}
                                                                        </span>
                                                                    </div>

                                                                    {/* Room Add-ons */}
                                                                    {room
                                                                        .booking_add_ons
                                                                        ?.length >
                                                                        0 && (
                                                                        <div className="mt-3 border-t pt-3">
                                                                            <div className="text-sm font-semibold text-slate-700 mb-2">
                                                                                Add-ons
                                                                                Included
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                {room.booking_add_ons.map(
                                                                                    (
                                                                                        addon,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                addon.id
                                                                                            }
                                                                                            className="flex justify-between text-sm"
                                                                                        >
                                                                                            <span className="text-slate-600">
                                                                                                {
                                                                                                    addon
                                                                                                        .add_on
                                                                                                        .add_on_name
                                                                                                }{" "}
                                                                                                ×{" "}
                                                                                                {
                                                                                                    addon.quantity
                                                                                                }
                                                                                            </span>

                                                                                            <span className="font-medium text-slate-700">
                                                                                                {formatCurrency(
                                                                                                    addon.subtotal,
                                                                                                )}
                                                                                            </span>
                                                                                        </div>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Subtotal */}
                                                                    <div className="mt-3 flex justify-between border-t pt-3">
                                                                        <span className="font-semibold text-slate-600">
                                                                            Subtotal
                                                                        </span>

                                                                        <span className="font-bold text-slate-800">
                                                                            {formatCurrency(
                                                                                getRoomSubtotal(
                                                                                    room,
                                                                                ),
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            ),
                                        }}
                                    />
                                </TabPane>
                                <TabPane tab="Guest Information" key="overview">
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        {[
                                            {
                                                icon: <UserOutlined />,
                                                label: "Full Name",
                                                value: guestDetails.guest
                                                    .full_name,
                                            },
                                            {
                                                icon: <PhoneOutlined />,
                                                label: "Phone",
                                                value:
                                                    guestDetails.guest
                                                        .contact_number ||
                                                    "N/A",
                                            },
                                            {
                                                icon: <EnvironmentOutlined />,
                                                label: "Address",
                                                value:
                                                    guestDetails.guest
                                                        .address || "N/A",
                                            },
                                            {
                                                icon: <CalendarOutlined />,
                                                label: "Member Since",
                                                value: formatDate(
                                                    guestDetails.guest
                                                        .created_at,
                                                ),
                                            },
                                            {
                                                icon: <CalendarOutlined />,
                                                label: "Last Update",
                                                value: formatDate(
                                                    guestDetails.guest
                                                        .updated_at,
                                                ),
                                            },
                                            {
                                                icon: <StarOutlined />,
                                                label: "Last Visit",
                                                value: guestDetails.bookings[0]
                                                    ?.check_in_date
                                                    ? dayjs(
                                                          guestDetails
                                                              .bookings[0]
                                                              .check_in_date,
                                                      ).format("MMMM DD, YYYY")
                                                    : "N/A",
                                            },
                                        ].map((item, i, arr) => (
                                            <div
                                                key={item.label}
                                                className={`flex items-start gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-400 text-sm">
                                                    {item.icon}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {item.label}
                                                    </p>
                                                    <p className="text-sm text-slate-700 mt-0.5">
                                                        {item.value}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {/* <div className="flex items-start gap-3 px-4 py-3">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-400 text-sm">
                                                <HistoryOutlined />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium mb-1.5">
                                                    Stay Types
                                                </p>
                                                <div className="flex gap-1.5">
                                                    {guestDetails.bookings.some(
                                                        (booking) =>
                                                            (
                                                                booking.booked_rooms ??
                                                                []
                                                            ).some(
                                                                (room) =>
                                                                    String(
                                                                        room.stay_type,
                                                                    )
                                                                        .trim()
                                                                        .toLowerCase() ===
                                                                    "overnight",
                                                            ),
                                                    ) && (
                                                        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                                            Overnight
                                                        </span>
                                                    )}
                                                    {guestDetails.bookings.some(
                                                        (booking) =>
                                                            (
                                                                booking.booked_rooms ??
                                                                []
                                                            ).some(
                                                                (room) =>
                                                                    String(
                                                                        room.stay_type,
                                                                    )
                                                                        .trim()
                                                                        .toLowerCase() ===
                                                                    "short_stay",
                                                            ),
                                                    ) && (
                                                        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                                            Short Stay
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div> */}
                                    </div>
                                </TabPane>
                            </Tabs>
                        </div>
                    )}
                </Spin>
            </Modal>

            {/* ── Delete Modal ─────────────────────────────────── */}
            <Modal
                title={null}
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                footer={null}
                width={420}
                centered
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 mx-auto mb-4 flex items-center justify-center">
                        <DeleteOutlined className="text-3xl text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                        Delete Walk-in Guest
                    </h3>
                    <p className="text-slate-500 text-sm mb-2">
                        Are you sure you want to permanently delete{" "}
                        <span className="font-semibold text-slate-700">
                            {selectedGuest?.full_name}
                        </span>
                        ?
                    </p>
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mx-auto max-w-sm">
                        ⚠️ This action cannot be undone. All associated booking
                        records will be permanently removed.
                    </p>
                    <div className="flex justify-center gap-3 mt-6">
                        <button
                            onClick={() => setDeleteModalVisible(false)}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() =>
                                selectedGuest &&
                                handleDeleteGuest(selectedGuest)
                            }
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2"
                        >
                            <DeleteOutlined />
                            Delete Permanently
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Table style overrides ─────────────────────────── */}
            <style>{`
                .users-table .ant-table {
                    font-size: 14px;
                }
                .users-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    color: #64748b !important;
                    font-weight: 600 !important;
                    font-size: 12px !important;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid #e2e8f0 !important;
                    padding: 12px 16px !important;
                }
                .users-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #f1f5f9 !important;
                    padding: 14px 16px !important;
                    vertical-align: middle;
                }
                .users-table .ant-table-tbody > tr:hover > td {
                    background: #f8fafc !important;
                }
                .users-table .ant-table-tbody > tr:last-child > td {
                    border-bottom: none !important;
                }
                .users-table .ant-pagination {
                    padding: 16px 20px !important;
                    margin: 0 !important;
                    border-top: 1px solid #f1f5f9;
                }
                .ant-modal-content {
                    border-radius: 20px !important;
                    overflow: hidden;
                    padding: 28px !important;
                }
                .ant-modal-header {
                    border-bottom: 1px solid #f1f5f9 !important;
                    padding-bottom: 16px !important;
                    margin-bottom: 0 !important;
                }
                .ant-form-item-label > label {
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: #475569 !important;
                }
                .ant-input, .ant-input-password, .ant-select-selector {
                    border-radius: 10px !important;
                    border-color: #e2e8f0 !important;
                }
                .ant-input:focus, .ant-input-focused, 
                .ant-input-password:focus-within,
                .ant-select-focused .ant-select-selector {
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12) !important;
                }
                .ant-btn-primary {
                    border-radius: 10px !important;
                    background: #4f46e5 !important;
                    border-color: #4f46e5 !important;
                }
            `}</style>
        </div>
    );
}
