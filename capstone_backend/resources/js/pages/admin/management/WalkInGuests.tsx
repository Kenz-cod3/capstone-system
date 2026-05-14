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
} from "@ant-design/icons";

import {
    Input,
    Button,
    Table,
    Avatar,
    Space,
    Spin,
    Empty,
    message,
    Modal,
    Dropdown,
    Row,
    Col,
    Typography,
    Tooltip,
    Descriptions,
    Tabs,
    Statistic,
} from "antd";

import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
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
    }>;
    add_ons: Array<{
        id: number;
        add_on_name: string;
        price: number;
        pivot: {
            quantity: number;
            subtotal: number;
        };
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

export default function WalkInGuests() {
    const [guests, setGuests] = useState<WalkInGuest[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedGuest, setSelectedGuest] = useState<WalkInGuest | null>(null);
    const [guestDetails, setGuestDetails] = useState<GuestDetailsResponse | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [totalRevenue, setTotalRevenue] = useState(0);

    const fetchGuests = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const params: any = {
                page: currentPage,
                per_page: perPage,
            };

            if (debouncedSearch) {
                params.search = debouncedSearch;
            }

            const response = await api.get("/walk-in-guests", {
                params,
            });

            const paginatedData = response.data;

            setGuests(paginatedData.data || []);
            setLastPage(paginatedData.last_page);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);
            setTotalRevenue(Number(paginatedData.total_revenue || 0));
        } catch (err: any) {
            console.error(err);
            message.error(
                err.response?.data?.message ||
                "Failed to load walk-in guests"
            );
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const fetchGuestDetails = async (guestId: number) => {
        setLoadingDetails(true);
        try {
            const response = await api.get(`/walk-in-guests/${guestId}/details`);
            setGuestDetails(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to load guest details");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleViewGuest = async (guest: WalkInGuest) => {
        setSelectedGuest(guest);
        setViewModalVisible(true);
        setActiveTab("overview");
        await fetchGuestDetails(guest.id);
    };

    const handleDeleteGuest = async (guest: WalkInGuest) => {
        try {
            await api.delete(`/walk-in-guests/${guest.id}`);
            message.success(`${guest.full_name} deleted successfully`);
            fetchGuests();
            setDeleteModalVisible(false);
        } catch (error: any) {
            message.error(
                error.response?.data?.message ||
                "Failed to delete guest"
            );
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchGuests();
    }, [debouncedSearch, currentPage]);

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
    };

    const getRandomColor = () => {
        const colors = ["#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"];
        return colors[Math.floor(Math.random() * colors.length)];
    };

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

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'checked_in': 'green',
            'checked_out': 'blue',
            'pending': 'orange',
            'confirmed': 'cyan',
            'cancelled': 'red'
        };
        return colors[status] || 'default';
    };

    const getStatusText = (status: string) => {
        const text: Record<string, string> = {
            'checked_in': 'Checked In',
            'checked_out': 'Checked Out',
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'cancelled': 'Cancelled'
        };
        return text[status] || status;
    };

    const columns: ColumnsType<WalkInGuest> = [
        {
            title: "Guest",
            key: "guest",
            width: 300,
            fixed: "left",
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size={44}
                        style={{
                            backgroundColor: getRandomColor(),
                            flexShrink: 0,
                        }}
                        icon={<UserOutlined />}
                    >
                        {getInitials(record.first_name, record.last_name)}
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <Text strong style={{ fontSize: 15 }}>
                            {record.full_name}
                        </Text>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 w-fit mt-1">
                            Walk-in Guest
                        </span>
                    </div>
                </div>
            ),
        },
        {
            title: "Contact",
            key: "contact",
            render: (_, record) => (
                <div className="flex items-center gap-2">
                    <PhoneOutlined className="text-gray-400 w-4" />
                    <span className="text-[13px] text-gray-700">{record.contact_number || "N/A"}</span>
                </div>
            ),
        },
        {
            title: "Address",
            key: "address",
            responsive: ["md"],
            render: (_, record) =>
                record.address ? (
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400" />
                        <Tooltip title={record.address}>
                            <span className="text-[13px] text-gray-700 truncate max-w-[200px]">
                                {record.address}
                            </span>
                        </Tooltip>
                    </div>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            title: "Total Visits",
            key: "bookings",
            width: 120,
            align: "center",
            render: (_, record) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                    {record.bookings_count || 0}
                </span>
            ),
        },
        {
            title: "Total Spent",
            key: "total_spent",
            width: 140,
            align: "left",
            render: (_, record) => (
                <span className="font-bold text-emerald-600 text-sm">
                    {formatCurrency(record.total_spent || 0)}
                </span>
            ),
        },
        {
            title: "First Visit",
            key: "created",
            width: 160,
            align: "center",
            render: (_, record) => (
                <Tooltip title={formatDate(record.created_at)}>
                    <div className="flex items-center gap-2">
                        <CalendarOutlined className="text-gray-400" />
                        <span className="text-[13px] text-gray-700">
                            {dayjs(record.created_at).format("MMM DD, YYYY")}
                        </span>
                    </div>
                </Tooltip>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 90,
            align: "center",
            render: (_, record) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: "view",
                                label: "View Details",
                                icon: <EyeOutlined />,
                                onClick: () => handleViewGuest(record),
                            },
                            { type: "divider" },
                            {
                                key: "delete",
                                label: "Delete",
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
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ];

    const bookingColumns: ColumnsType<BookingDetails> = [
        {
            title: "Reference",
            key: "reference",
            render: (_, record) => (
                <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs">
                    {record.booking_reference}
                </span>
            ),
        },
        {
            title: "Check-in",
            key: "check_in",
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-gray-800">{dayjs(record.check_in_date).format("MMM DD, YYYY")}</span>
                    {record.check_in_time && (
                        <span className="text-gray-400 text-xs">
                            {dayjs(record.check_in_time).format("hh:mm A")}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: "Check-out",
            key: "check_out",
            render: (_, record) => (
                <span className="text-gray-800">
                    {record.check_out_date ? dayjs(record.check_out_date).format("MMM DD, YYYY") : "-"}
                </span>
            ),
        },
        {
            title: "Stay Type",
            key: "stay_type",
            render: (_, record) => (
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                    record.stay_type === "overnight" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-orange-100 text-orange-700"
                }`}>
                    {record.stay_type === "overnight" ? "Overnight" : "Short Stay"}
                </span>
            ),
        },
        {
            title: "Rooms",
            key: "rooms",
            render: (_, record) => (
                <div className="flex flex-wrap gap-1">
                    {(record.booked_rooms ?? []).map((br) => (
                        <span key={br.id} className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                            Room {br.room.room_number}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            title: "Amount",
            key: "amount",
            align: "right",
            render: (_, record) => (
                <span className="font-bold text-emerald-600">
                    {formatCurrency(record.total_price)}
                </span>
            ),
        },
        {
            title: "Status",
            key: "status",
            align: "center",
            render: (_, record) => (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize
                    ${record.booking_status === 'checked_in' ? 'bg-green-100 text-green-700' : ''}
                    ${record.booking_status === 'checked_out' ? 'bg-blue-100 text-blue-700' : ''}
                    ${record.booking_status === 'pending' ? 'bg-orange-100 text-orange-700' : ''}
                    ${record.booking_status === 'confirmed' ? 'bg-cyan-100 text-cyan-700' : ''}
                    ${record.booking_status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                `}>
                    {getStatusText(record.booking_status)}
                </span>
            ),
        },
    ];

    return (
        <div className="min-h-screen font-['DM_Sans',sans-serif] p-4 md:p-6 bg-white">
            {/* HEADER */}
            <div className="mb-8">
                <h1 className="font-['Playfair_Display',serif] text-2xl md:text-3xl font-bold text-[#1a1a18] tracking-tight mb-1">
                    Walk-in Guests
                </h1>
                <p className="text-[13px] text-[#8a8878] tracking-wide">
                    Manage all walk-in guests
                </p>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <TeamOutlined style={{ fontSize: 22 }} />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wider mb-0.5">Total Guests</p>
                            <p className="text-3xl font-bold text-[#1a1a18] m-0">{total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                            <span className="font-bold text-xl">₱</span>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wider mb-0.5">Total Revenue</p>
                            <p className="text-3xl font-bold text-[#1a1a18] m-0">₱{Number(totalRevenue || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEARCH CARD */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm mb-6 p-5">
                <Search
                    placeholder="Search name, address, or contact..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="[&_.ant-input-group-addon_.ant-btn]:bg-[#3eb489] [&_.ant-input-group-addon_.ant-btn]:border-[#3eb489] [&_.ant-input-group-addon_.ant-btn]:hover:bg-[#31a07a]"
                />
            </div>

            {/* TABLE CARD */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#eeece6]">
                    <div className="flex items-center justify-between">
                        <h2 className="font-['Playfair_Display',serif] text-base font-semibold text-[#1a1a18] m-0">
                            Guest List
                        </h2>
                        <Button 
                            icon={<ReloadOutlined spin={refreshing} />} 
                            onClick={() => fetchGuests(true)} 
                            loading={refreshing}
                            className="border-[#e0ddd6] text-[#6b6960] hover:border-[#1a1a18] hover:text-[#1a1a18]"
                        >
                            Refresh
                        </Button>
                    </div>
                </div>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={guests}
                        rowKey="id"
                        scroll={{ x: 800 }}
                        pagination={{
                            current: currentPage,
                            total: total,
                            pageSize: perPage,
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} guests`,
                            onChange: (page) => setCurrentPage(page),
                            position: ["bottomCenter"],
                        }}
                        locale={{
                            emptyText: <Empty description="No walk-in guests found" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                        }}
                        className="[&_.ant-table-thead_.ant-table-cell]:bg-[#f8f7f4] [&_.ant-table-thead_.ant-table-cell]:text-[10.5px] [&_.ant-table-thead_.ant-table-cell]:font-bold [&_.ant-table-thead_.ant-table-cell]:text-[#8a8878] [&_.ant-table-thead_.ant-table-cell]:uppercase [&_.ant-table-thead_.ant-table-cell]:tracking-wider [&_.ant-table-tbody_.ant-table-cell]:border-b-[#f2f0eb] [&_.ant-table-tbody_.ant-table-row:hover_.ant-table-cell]:bg-[#f9f8f5]"
                    />
                </Spin>
            </div>

            {/* VIEW MODAL */}
            <Modal
                title={
                    <div className="flex items-center gap-3">
                        <Avatar size={40} style={{ backgroundColor: getRandomColor() }} icon={<UserOutlined />} />
                        <div>
                            <Text strong>{selectedGuest?.full_name}</Text>
                            <p className="text-xs text-[#8a8878] m-0">Walk-in Guest Details</p>
                        </div>
                    </div>
                }
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                width={900}
                centered
                footer={[
                    <Button key="close" onClick={() => setViewModalVisible(false)}>
                        Close
                    </Button>,
                ]}
                className="[&_.ant-modal-content]:rounded-2xl"
            >
                <Spin spinning={loadingDetails}>
                    {guestDetails && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <HistoryOutlined className="text-blue-500 text-lg mb-1 block" />
                                    <p className="text-[11px] text-[#8a8878] uppercase font-semibold tracking-wider mb-0">Visits</p>
                                    <p className="text-xl font-bold text-[#1a1a18] m-0">{guestDetails.summary.total_bookings}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <span className="text-emerald-500 text-lg mb-1 block">₱</span>
                                    <p className="text-[11px] text-[#8a8878] uppercase font-semibold tracking-wider mb-0">Total Spent</p>
                                    <p className="text-xl font-bold text-emerald-600 m-0">{formatCurrency(guestDetails.summary.total_spent)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <span className="text-amber-500 text-lg mb-1 block">₱</span>
                                    <p className="text-[11px] text-[#8a8878] uppercase font-semibold tracking-wider mb-0">Average</p>
                                    <p className="text-xl font-bold text-amber-600 m-0">{formatCurrency(guestDetails.summary.average_spent)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <CalendarOutlined className="text-gray-500 text-lg mb-1 block" />
                                    <p className="text-[11px] text-[#8a8878] uppercase font-semibold tracking-wider mb-0">First Visit</p>
                                    <p className="text-sm font-medium text-[#1a1a18] m-0">
                                        {guestDetails.summary.first_visit
                                            ? dayjs(guestDetails.summary.first_visit).format("MMM DD, YYYY")
                                            : "No visits"}
                                    </p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <Tabs activeKey={activeTab} onChange={setActiveTab} className="[&_.ant-tabs-tab]:font-medium">
                                <TabPane tab="Booking History" key="bookings">
                                    <Table
                                        columns={bookingColumns}
                                        dataSource={guestDetails.bookings}
                                        rowKey="id"
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                        expandable={{
                                            expandedRowRender: (record) => (
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                                                        <Descriptions.Item label="Booking Reference">
                                                            <span className="font-mono text-xs">{record.booking_reference}</span>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Status">
                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                                                ${record.booking_status === 'checked_in' ? 'bg-green-100 text-green-700' : ''}
                                                                ${record.booking_status === 'checked_out' ? 'bg-blue-100 text-blue-700' : ''}
                                                                ${record.booking_status === 'pending' ? 'bg-orange-100 text-orange-700' : ''}
                                                                ${record.booking_status === 'confirmed' ? 'bg-cyan-100 text-cyan-700' : ''}
                                                                ${record.booking_status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                                                            `}>
                                                                {getStatusText(record.booking_status)}
                                                            </span>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Check-in Date">
                                                            {dayjs(record.check_in_date).format("MMMM DD, YYYY")}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Check-out Date">
                                                            {record.check_out_date ? dayjs(record.check_out_date).format("MMMM DD, YYYY") : "N/A"}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Stay Type">
                                                            {record.stay_type === "overnight" ? "Overnight" : "Short Stay"}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Total Amount">
                                                            <span className="font-bold text-emerald-600">{formatCurrency(record.total_price)}</span>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Rooms Booked" span={2}>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(record.booked_rooms ?? []).map((br) => (
                                                                    <span key={br.id} className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                                                                        Room {br.room.room_number} ({br.room.room_type?.type_name || "Standard"})
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </Descriptions.Item>
                                                        {record.add_ons && record.add_ons.length > 0 && (
                                                            <Descriptions.Item label="Add-ons" span={2}>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {record.add_ons.map((addon) => (
                                                                        <span key={addon.id} className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700">
                                                                            {addon.add_on_name} x{addon.pivot.quantity} = ₱{addon.pivot.subtotal}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </Descriptions.Item>
                                                        )}
                                                    </Descriptions>
                                                </div>
                                            ),
                                        }}
                                        className="[&_.ant-table-thead_.ant-table-cell]:bg-[#f8f7f4] [&_.ant-table-thead_.ant-table-cell]:text-[10.5px]"
                                    />
                                </TabPane>
                                <TabPane tab="Guest Information" key="overview">
                                    <Descriptions bordered column={{ xs: 1, sm: 2 }}>
                                        <Descriptions.Item label="Full Name">{guestDetails.guest.full_name}</Descriptions.Item>
                                        <Descriptions.Item label="Contact Number">{guestDetails.guest.contact_number || "N/A"}</Descriptions.Item>
                                        <Descriptions.Item label="Address" span={2}>{guestDetails.guest.address || "N/A"}</Descriptions.Item>
                                        <Descriptions.Item label="Member Since">{formatDate(guestDetails.guest.created_at)}</Descriptions.Item>
                                        <Descriptions.Item label="Last Update">{formatDate(guestDetails.guest.updated_at)}</Descriptions.Item>
                                        <Descriptions.Item label="Last Visit">
                                            {guestDetails.bookings[0]?.check_in_date
                                                ? dayjs(guestDetails.bookings[0].check_in_date).format("MMMM DD, YYYY")
                                                : "N/A"}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Stay Types">
                                            <div className="flex gap-1">
                                                {guestDetails.bookings.some(booking =>
                                                    (booking.booked_rooms ?? []).some(room =>
                                                        String(room.stay_type).trim().toLowerCase() === "overnight"
                                                    )
                                                ) && (
                                                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">Overnight</span>
                                                )}
                                                {guestDetails.bookings.some(booking =>
                                                    (booking.booked_rooms ?? []).some(room =>
                                                        String(room.stay_type).trim().toLowerCase() === "short_stay"
                                                    )
                                                ) && (
                                                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700">Short Stay</span>
                                                )}
                                            </div>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </TabPane>
                            </Tabs>
                        </>
                    )}
                </Spin>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                title="Delete Walk-in Guest"
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setDeleteModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button key="delete" type="primary" danger onClick={() => selectedGuest && handleDeleteGuest(selectedGuest)}>
                        Delete
                    </Button>,
                ]}
                className="[&_.ant-modal-content]:rounded-2xl"
            >
                <Paragraph>
                    Are you sure you want to delete <strong>{selectedGuest?.full_name}</strong>?
                    This action cannot be undone and will remove all associated booking records.
                </Paragraph>
            </Modal>
        </div>
    );
}