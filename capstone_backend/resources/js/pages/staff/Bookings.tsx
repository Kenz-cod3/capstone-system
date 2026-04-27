import { useEffect, useState } from "react";
import {
    MoreOutlined,
    CloseOutlined,
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    DollarOutlined,
    TagOutlined,
    ClockCircleOutlined,
    HistoryOutlined,
    DeleteOutlined,
    CheckCircleOutlined
} from "@ant-design/icons";
import {
    Table,
    Tabs,
    Input,
    Button,
    message,
    Modal,
    Tag,
    Dropdown,
    Alert,
    Typography,
    Drawer,
    Descriptions,
    Space,
    Divider,
    Card,
    Badge,
    Timeline
} from "antd";
import type { MenuProps, TabsProps } from "antd";
import api from "@/services/api";

const { Title, Text } = Typography;
const { Search } = Input;

interface Room {
    id: number;
    room_number: string;
    room_type?: {
        type_name?: string;
        base_price?: number;
        short_stay_price?: number;
    };
    pivot?: {
        subtotal: number;
        price_at_time_of_booking: number;
        stay_type?: "short_stay" | "overnight";
        check_out_time?: string;
    };
}

interface History {
    id: number;
    old_status: string;
    new_status: string;
    change_note: string;
    changed_at: string;
    changed_by?: number;
    user?: {
        first_name?: string;
        last_name?: string;
    };
}

interface User {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface WalkInGuest {
    id: number;
    guest_name: string;
    contact_number?: string;
    address?: string;
}

interface CreatedByUser {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
}

interface Booking {
    id: number;
    booking_reference: string;
    booking_type: "online" | "walk_in";
    booking_status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
    stay_type: "short_stay" | "overnight";
    check_in_date: string;
    check_out_date: string;
    check_in_time?: string;
    check_out_time?: string;
    total_price: number;
    created_at?: string;
    deleted_at?: string | null;
    user?: User;
    walk_in_guest?: WalkInGuest;
    rooms?: Room[];
    histories?: History[];
    created_by?: CreatedByUser;
}

interface PaginatedResponse {
    data: Booking[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface GuestDetails {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}

export default function Bookings() {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [active, setActive] = useState<Booking[]>([]);
    const [history, setHistory] = useState<Booking[]>([]);
    const [trash, setTrash] = useState<Booking[]>([]);
    const [activeTab, setActiveTab] = useState<string>("active");
    const [loading, setLoading] = useState<boolean>(false);
    const [searchText, setSearchText] = useState<string>("");
    const [detailsVisible, setDetailsVisible] = useState<boolean>(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        setCurrentPage(1);
        setSearchText("");
    }, [activeTab]);

    useEffect(() => {
        fetchAll(currentPage, pageSize);
    }, [activeTab, currentPage, pageSize]);

    const fetchAll = async (page: number = currentPage, perPage: number = pageSize) => {
        setLoading(true);

        try {
            let endpoint = "/bookings/active";

            if (activeTab === "history") endpoint = "/bookings/history";
            if (activeTab === "trash") endpoint = "/bookings/trash";

            const res = await api.get<PaginatedResponse>(`${endpoint}?page=${page}&per_page=${perPage}`);

            const response = res.data;

            if (response.current_page > response.last_page) {
                setCurrentPage(response.last_page || 1);
                return;
            }

            const data = response.data || [];

            if (activeTab === "active") {
                setActive(data);
            } else if (activeTab === "history") {
                setHistory(data);
            } else if (activeTab === "trash") {
                setTrash(data);
            }

            setTotal(response.total ?? 0);

        } catch (err) {
            console.error(err);
            message.error("Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const filterData = (data: Booking[]): Booking[] => {
        if (!searchText) return data;
        if (!Array.isArray(data)) return [];

        return data.filter((b) => {
            const name = b.booking_type === "online"
                ? `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`.trim()
                : b.walk_in_guest?.guest_name ?? "";

            return (
                name.toLowerCase().includes(searchText.toLowerCase()) ||
                b.booking_type?.toLowerCase().includes(searchText.toLowerCase()) ||
                String(b.id).includes(searchText)
            );
        });
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/bookings/${id}`, { booking_status: status });

            await fetchAll();

            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking((prev) =>
                    prev ? { ...prev, booking_status: status as Booking["booking_status"] } : null
                );
            }

            message.success(`Booking #${id} status updated to ${status}`);
        } catch (err) {
            console.error(err);
            message.error("Failed to update status");
        }
    };

    const handleCheckout = async (bookingId: number) => {
        try {
            await api.post(`/walk-in-guests/${bookingId}/checkout`);

            const checkedOutBooking = active.find(b => b.id === bookingId);

            if (checkedOutBooking) {
                const updatedBooking: Booking = { ...checkedOutBooking, booking_status: "checked_out" };
                setHistory((prev: Booking[]) => [updatedBooking, ...prev]);
                setActive((prev: Booking[]) => prev.filter(b => b.id !== bookingId));
            }

            if (selectedBooking && selectedBooking.id === bookingId) {
                setSelectedBooking((prev: Booking | null) =>
                    prev ? { ...prev, booking_status: "checked_out" } : null
                );
            }

            message.success(`Booking #${bookingId} checked out successfully`);
        } catch (error) {
            console.error(error);
            message.error("Checkout failed");
        }
    };

    const handleExtend = (booking: Booking) => {
        Modal.confirm({
            title: "Extend Stay",
            content: "Add 1 hour (₱100)?",
            okText: "Extend",
            cancelText: "Cancel",
            centered: true,
            onOk: async () => {
                try {
                    const res = await api.post<{ total_price: number }>(`/bookings/${booking.id}/extend`);

                    setActive((prev: Booking[]) =>
                        prev.map(b =>
                            b.id === booking.id
                                ? { ...b, total_price: res.data.total_price }
                                : b
                        )
                    );

                    if (selectedBooking && selectedBooking.id === booking.id) {
                        setSelectedBooking((prev: Booking | null) =>
                            prev ? { ...prev, total_price: res.data.total_price } : null
                        );
                    }

                    message.success("Stay extended successfully");
                } catch (err) {
                    console.error(err);
                    message.error("Failed to extend stay");
                }
            }
        });
    };

    const handleDelete = async (id: number) => {
        Modal.confirm({
            title: "Move to Trash",
            content: "Are you sure you want to move this booking to trash?",
            okText: "Yes",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.delete(`/bookings/${id}`);

                    const deleted = active.find(b => b.id === id) || history.find(b => b.id === id);

                    setActive((prev: Booking[]) => prev.filter(b => b.id !== id));
                    setHistory((prev: Booking[]) => prev.filter(b => b.id !== id));

                    if (deleted) {
                        const deletedBooking: Booking = { ...deleted, deleted_at: new Date().toISOString() };
                        setTrash((prev: Booking[]) => [deletedBooking, ...prev]);
                    }

                    if (selectedBooking && selectedBooking.id === id) {
                        setDetailsVisible(false);
                        setSelectedBooking(null);
                    }

                    message.success(`Booking #${id} moved to trash`);
                } catch (err) {
                    console.error(err);
                    message.error("Failed to move booking to trash");
                }
            }
        });
    };

    const handleRestore = async (id: number) => {
        try {
            await api.post(`/bookings/${id}/restore`);

            const restored = trash.find(b => b.id === id);
            setTrash((prev: Booking[]) => prev.filter(b => b.id !== id));

            if (restored) {
                const { deleted_at, ...cleanRestored } = restored;
                if (restored.booking_status === "checked_out" || restored.booking_status === "cancelled") {
                    setHistory((prev: Booking[]) => [cleanRestored as Booking, ...prev]);
                } else {
                    setActive((prev: Booking[]) => [cleanRestored as Booking, ...prev]);
                }
            }

            message.success("Booking restored successfully");
        } catch (err) {
            console.error(err);
            message.error("Failed to restore booking");
        }
    };

    const handleForceDelete = async (id: number) => {
        Modal.confirm({
            title: "Permanent Deletion",
            content: (
                <div>
                    <Text type="danger">⚠️ This action cannot be undone!</Text>
                    <br />
                    <Text>Are you sure you want to permanently delete this booking?</Text>
                </div>
            ),
            okText: "Delete Forever",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.delete(`/bookings/${id}/force-delete`);
                    setTrash((prev: Booking[]) => prev.filter(b => b.id !== id));

                    if (selectedBooking && selectedBooking.id === id) {
                        setDetailsVisible(false);
                        setSelectedBooking(null);
                    }

                    message.success(`Booking #${id} permanently deleted`);
                } catch (err) {
                    console.error(err);
                    message.error("Failed to delete booking permanently");
                }
            }
        });
    };

    const showDetails = (record: Booking) => {
        setSelectedBooking(record);
        setDetailsVisible(true);
    };

    const formatDate = (date: string): string => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const formatDateTime = (datetime: string): string => {
        if (!datetime) return "-";
        return new Date(datetime).toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatTime = (datetime: string): string => {
        if (!datetime) return "-";
        return new Date(datetime).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getExpectedCheckoutDate = (booking: Booking): string => {
        if (!booking.check_in_date) return "-";

        const date = new Date(booking.check_in_date);
        date.setDate(date.getDate() + 1);

        return formatDate(date.toISOString());
    };

    const getCheckoutTime = (booking: Booking): string => {
        if (!booking.rooms || booking.rooms.length === 0) return "-";

        const room = booking.rooms[0];

        if (room?.pivot?.check_out_time) {
            return formatTime(room.pivot.check_out_time);
        }

        return "-";
    };

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            pending: "orange",
            confirmed: "green",
            checked_in: "blue",
            checked_out: "default",
            cancelled: "red"
        };
        return colors[status] || "default";
    };

    const getStatusBadgeColor = (status: string): string => {
        const colors: Record<string, string> = {
            pending: "#faad14",
            confirmed: "#52c41a",
            checked_in: "#1890ff",
            checked_out: "#8c8c8c",
            cancelled: "#ff4d4f"
        };
        return colors[status] || "#8c8c8c";
    };

    const getGuestName = (booking: Booking): string => {
        if (booking.booking_type === "online") {
            const firstName = booking.user?.first_name ?? "";
            const lastName = booking.user?.last_name ?? "";
            return `${firstName} ${lastName}`.trim() || "N/A";
        } else {
            return booking.walk_in_guest?.guest_name || "Guest";
        }
    };

    const getGuestDetails = (booking: Booking): GuestDetails => {
        if (booking.booking_type === "online") {
            const result: GuestDetails = {
                name: `${booking.user?.first_name ?? ""} ${booking.user?.last_name ?? ""}`.trim()
            };
            if (booking.user?.email !== undefined) result.email = booking.user.email;
            if (booking.user?.phone !== undefined) result.phone = booking.user.phone;
            if (booking.user?.address !== undefined) result.address = booking.user.address;
            return result;
        } else {
            const result: GuestDetails = {
                name: booking.walk_in_guest?.guest_name || "Guest"
            };
            if (booking.walk_in_guest?.contact_number !== undefined) result.phone = booking.walk_in_guest.contact_number;
            if (booking.walk_in_guest?.address !== undefined) result.address = booking.walk_in_guest.address;
            return result;
        }
    };

    const getRoomPrice = (room: Room, stayType: string): number => {
        if (room.pivot?.subtotal != null) {
            return Number(room.pivot.subtotal);
        }

        if (room.pivot?.price_at_time_of_booking != null) {
            if (stayType === "short_stay") {
                return Number(room.pivot.price_at_time_of_booking) / 2;
            }
            return Number(room.pivot.price_at_time_of_booking);
        }

        if (room.room_type) {
            if (stayType === "short_stay" && room.room_type.short_stay_price) {
                return room.room_type.short_stay_price;
            }
            return room.room_type.base_price || 0;
        }

        return 0;
    };

    const getActionMenu = (record: Booking, type: string): MenuProps => {
        const items: MenuProps["items"] = [];

        if (type === "active") {
            if (record.booking_status === "pending") {
                items.push({
                    key: "confirm",
                    label: "Confirm",
                    onClick: () => handleUpdateStatus(record.id, "confirmed")
                });
            }

            if (record.booking_status === "confirmed") {
                items.push({
                    key: "checkin",
                    label: "Check In",
                    onClick: () => handleUpdateStatus(record.id, "checked_in")
                });
            }

            if (record.booking_status === "checked_in") {
                items.push({
                    key: "extend",
                    label: "Extend Stay",
                    onClick: () => handleExtend(record)
                });
                items.push({
                    key: "checkout",
                    label: "Check Out",
                    onClick: () => {
                        handleUpdateStatus(record.id, "checked_out");
                    }
                });
            }

            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => handleDelete(record.id)
            });
        } else if (type === "history") {
            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => handleDelete(record.id)
            });
        } else if (type === "trash") {
            items.push(
                {
                    key: "restore",
                    label: "Restore",
                    onClick: () => handleRestore(record.id)
                },
                {
                    key: "delete",
                    label: "Delete Forever",
                    danger: true,
                    onClick: () => handleForceDelete(record.id)
                }
            );
        }

        return { items };
    };

    const handleActionClick = (e: React.MouseEvent, record: Booking) => {
        e.stopPropagation();
    };

    const columns = [
        {
            title: "Booking ID",
            key: "booking_id",
            width: 180,
            render: (_: any, record: Booking) => (
                <Text>
                    {record.booking_reference}-{record.id}
                </Text>
            )
        },
        {
            title: "Guest Name",
            key: "guest_name",
            width: 200,
            render: (_: any, record: Booking) => (
                <Text
                    style={{ color: "#000", cursor: "pointer" }}
                    onClick={() => showDetails(record)}
                >
                    {getGuestName(record)}
                </Text>
            )
        },
        {
            title: "Room",
            key: "room",
            width: 120,
            align: "center" as const,
            render: (_: any, record: Booking) => (
                <Text>{record.rooms?.length ? record.rooms.map((r: Room) => r.room_number).join(", ") : "N/A"}</Text>
            )
        },
        {
            title: "Type",
            key: "type",
            width: 100,
            render: (_: any, record: Booking) => (
                <Tag color={record.booking_type === "walk_in" ? "blue" : "green"} style={{ fontSize: "12px", padding: "4px 10px" }}>
                    {record.booking_type === "walk_in" ? "Walk-in" : "Online"}
                </Tag>
            )
        },
        {
            title: "Status",
            key: "status",
            width: 120,
            render: (_: any, record: Booking) => (
                <Tag color={getStatusColor(record.booking_status)} style={{ fontSize: "12px", padding: "4px 10px" }}>
                    {record.booking_status?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            )
        },
        {
            title: "Stay Type",
            key: "stay_type",
            width: 140,
            render: (_: any, record: Booking) => {
                const type =
                    record.rooms?.[0]?.pivot?.stay_type || record.stay_type;

                return (
                    <Tag
                        color={type === "short_stay" ? "purple" : "cyan"}
                        style={{ fontSize: "12px", borderRadius: "6px" }}
                    >
                        {type === "short_stay" ? "Short Stay" : "Overnight"}
                    </Tag>
                );
            }
        },
        {
            title: "Check In",
            key: "check_in",
            width: 110,
            render: (_: any, record: Booking) => (
                <Text>{formatDate(record.check_in_date)}</Text>
            )

        },
        {
            title: "Check-In Time",
            key: "check_in_time",
            width: 120,
            align: "center" as const,
            render: (_: any, record: Booking) => (
                <Text>{formatTime(record.check_in_time || "")}</Text>
            )
        },
        {
            title: "Check Out",
            key: "check_out",
            width: 110,
            render: (_: any, record: Booking) => (
                <Text>{formatDate(record.check_out_date)}</Text>
            )
        },
        {
            title: "Total",
            key: "total",
            width: 110,
            render: (_: any, record: Booking) => (
                <Text strong style={{ color: "#52c41a", fontSize: "14px" }}>
                    ₱{record.total_price?.toLocaleString()}
                </Text>
            )
        },
        {
            title: "Action",
            key: "action",
            width: 80,
            align: "center" as const,
            render: (_: any, record: Booking) => (
                <div onClick={(e) => handleActionClick(e, record)}>
                    <Dropdown menu={getActionMenu(record, activeTab)} trigger={["click"]}>
                        <Button type="text" icon={<MoreOutlined />} size="middle" />
                    </Dropdown>
                </div>
            )
        }
    ];

    const rowProps = (record: Booking) => {
        return {
            onClick: () => showDetails(record),
            style: { cursor: "pointer" },
            className: "clickable-row"
        };
    };

    const getTableData = (): Booking[] => {
        switch (activeTab) {
            case "active":
                return filterData(active);
            case "history":
                return filterData(history);
            case "trash":
                return filterData(trash);
            default:
                return [];
        }
    };

    const renderTable = () => (
        <Table<Booking>
            className="no-border-table clickable-rows"
            columns={columns}
            dataSource={getTableData()}
            rowKey="id"
            loading={loading}
            size="large"
            bordered={false}
            pagination={false}
            onRow={rowProps}
        />
    );

    const renderPagination = () => (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            flexWrap: "wrap",
            gap: 16
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage((prev: number) => prev - 1)}
                >
                    Prev
                </Button>

                <Text>
                    Page {currentPage} of {Math.ceil(total / pageSize) || 1}
                </Text>

                <Button
                    disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                    onClick={() => setCurrentPage((prev: number) => prev + 1)}
                >
                    Next
                </Button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Text>Total: {total}</Text>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Text>Rows:</Text>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #d9d9d9"
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <Text>/ page</Text>
                </div>
            </div>
        </div>
    );

    const tabItems: TabsProps["items"] = [
        {
            key: "active",
            label: (
                <Space>
                    <CheckCircleOutlined />
                    Active ({active.length})
                </Space>
            ),
            children: (
                <>
                    {renderTable()}
                    {renderPagination()}
                </>
            )
        },
        {
            key: "history",
            label: (
                <Space>
                    <HistoryOutlined />
                    History ({history.length})
                </Space>
            ),
            children: (
                <>
                    {renderTable()}
                    {renderPagination()}
                </>
            )
        },
        {
            key: "trash",
            label: (
                <Space>
                    <DeleteOutlined />
                    Trash ({trash.length})
                </Space>
            ),
            children: (
                <>
                    {trash.length > 0 && (
                        <Alert
                            message="Warning"
                            description="Items in trash will be permanently deleted. Use 'Delete Forever' with caution."
                            type="warning"
                            showIcon
                            closable
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    {renderTable()}
                    {renderPagination()}
                </>
            )
        }
    ];

    const renderBookingDetails = () => {
        if (!selectedBooking) return null;

        const guestDetails = getGuestDetails(selectedBooking);
        const guestName = getGuestName(selectedBooking);
        const statusColor = getStatusBadgeColor(selectedBooking.booking_status);

        return (
            <Drawer
                title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space>
                            <Tag color="blue">#{selectedBooking.id}</Tag>
                            <Text strong style={{ fontSize: "16px" }}>{guestName}</Text>
                        </Space>
                    </div>
                }
                placement="right"
                open={detailsVisible}
                onClose={() => setDetailsVisible(false)}
                width={500}
                closable={true}
                closeIcon={<CloseOutlined />}
                extra={
                    <Dropdown menu={getActionMenu(selectedBooking, activeTab)} trigger={["click"]}>
                        <Button type="primary" icon={<MoreOutlined />}>
                            Actions
                        </Button>
                    </Dropdown>
                }
            >
                <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <Badge
                        color={statusColor}
                        text={
                            <Text strong style={{ fontSize: "16px", color: statusColor }}>
                                {selectedBooking.booking_status?.replace(/_/g, " ").toUpperCase()}
                            </Text>
                        }
                    />
                </div>

                <Card
                    title={
                        <Space>
                            <UserOutlined />
                            <span>Guest Information</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 10 }}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label="Name">
                            <Text strong>{guestDetails.name}</Text>
                        </Descriptions.Item>
                        {guestDetails.email !== undefined && (
                            <Descriptions.Item label="Email">
                                {guestDetails.email}
                            </Descriptions.Item>
                        )}
                        {guestDetails.phone !== undefined && (
                            <Descriptions.Item label="Phone">
                                <Space>
                                    <PhoneOutlined />
                                    {guestDetails.phone}
                                </Space>
                            </Descriptions.Item>
                        )}
                        {guestDetails.address !== undefined && (
                            <Descriptions.Item label="Address">
                                <Space>
                                    <EnvironmentOutlined />
                                    {guestDetails.address}
                                </Space>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </Card>

                <Card
                    title={
                        <Space>
                            <CalendarOutlined />
                            <span>Booking Details</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 10 }}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label="Booking Type">
                            <Tag color={selectedBooking.booking_type === "walk_in" ? "blue" : "green"}>
                                {selectedBooking.booking_type === "walk_in" ? "Walk-in" : "Online"}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Stay Type">
                            {(() => {
                                const type =
                                    selectedBooking.rooms?.[0]?.pivot?.stay_type ||
                                    selectedBooking.stay_type;

                                return (
                                    <Tag
                                        color={type === "short_stay" ? "purple" : "cyan"}
                                        style={{ fontSize: "12px", borderRadius: "6px" }}
                                    >
                                        {type === "short_stay" ? "Short Stay" : "Overnight"}
                                    </Tag>
                                );
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Booking Reference">
                            <Text code>{selectedBooking.booking_reference}</Text>
                        </Descriptions.Item>

                        {/* Created By Section */}
                        <Descriptions.Item label="Created By">
                            <Space>
                                <UserOutlined />
                                {selectedBooking.created_by ? (
                                    <Text>
                                        {selectedBooking.created_by.first_name} {selectedBooking.created_by.last_name}
                                        {selectedBooking.created_by.email && (
                                            <Text type="secondary" style={{ fontSize: "12px", marginLeft: 8 }}>
                                                ({selectedBooking.created_by.email})
                                            </Text>
                                        )}
                                    </Text>
                                ) : (
                                    <Text type="secondary">System / N/A</Text>
                                )}
                            </Space>
                        </Descriptions.Item>

                        <Descriptions.Item label="Created At">
                            <Space>
                                <CalendarOutlined />
                                {formatDateTime(selectedBooking.created_at || "")}
                            </Space>
                        </Descriptions.Item>

                        <Descriptions.Item label="Check-in Date">
                            <Space>
                                <CalendarOutlined />
                                {formatDate(selectedBooking.check_in_date)}
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Check-in Time">
                            <Space>
                                <ClockCircleOutlined />
                                {formatTime(selectedBooking.check_in_time || "")}
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Expected Check-out">
                            <Space>
                                <CalendarOutlined />
                                {getExpectedCheckoutDate(selectedBooking)}
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Check-out Time">
                            <Space>
                                <ClockCircleOutlined />
                                {getCheckoutTime(selectedBooking)}
                            </Space>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card
                    title={
                        <Space>
                            <TagOutlined />
                            <span>Rooms</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 10 }}
                >
                    {selectedBooking.rooms && selectedBooking.rooms.length > 0 ? (
                        selectedBooking.rooms.map((room: Room, index: number) => {
                            const roomStayType = room.pivot?.stay_type || selectedBooking.stay_type;
                            const roomPrice = getRoomPrice(room, roomStayType);
                            return (
                                <div key={room.id} style={{ marginBottom: index === (selectedBooking.rooms?.length ?? 0) - 1 ? 0 : 12 }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "8px 12px",
                                        background: "#f5f5f5",
                                        borderRadius: 8
                                    }}>
                                        <Space>
                                            <Tag color="blue">Room {room.room_number}</Tag>
                                            <Text type="secondary">
                                                {room.room_type?.type_name ?? "-"}
                                            </Text>
                                        </Space>
                                        <Space direction="vertical" size={0} align="end">
                                            {room.room_type?.base_price && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Original: ₱{room.room_type.base_price.toLocaleString()}
                                                </Text>
                                            )}
                                            <Text strong style={{ color: "#52c41a" }}>
                                                {roomStayType === "short_stay" ? "Short Stay" : "Overnight"}: ₱{roomPrice.toLocaleString()}
                                            </Text>
                                        </Space>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <Text type="secondary">No rooms assigned</Text>
                    )}
                </Card>

                <Card
                    title={
                        <Space>
                            <DollarOutlined />
                            <span>Payment Summary</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 10 }}
                >
                    <div style={{ textAlign: "right" }}>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Subtotal:</Text>
                            <Text style={{ marginLeft: 16 }}>₱{selectedBooking.total_price?.toLocaleString()}</Text>
                        </div>
                        <Divider style={{ margin: "8px 0" }} />
                        <div>
                            <Text strong style={{ fontSize: "16px" }}>Total:</Text>
                            <Text strong style={{ fontSize: "18px", color: "#52c41a", marginLeft: 16 }}>
                                ₱{selectedBooking.total_price?.toLocaleString()}
                            </Text>
                        </div>
                    </div>
                </Card>

                {selectedBooking.histories && selectedBooking.histories.length > 0 && (
                    <Card
                        title="Activity Log"
                        size="small"
                        style={{ borderRadius: 10 }}
                    >
                        <Timeline
                            items={selectedBooking.histories.map((history: History) => ({
                                color: history.new_status === "checked_out" ? "green" : "blue",
                                children: (
                                    <div>
                                        <Text strong>{history.change_note || "Status Updated"}</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: "12px" }}>
                                            From: {history.old_status} → To: {history.new_status}
                                        </Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: "11px" }}>
                                            {formatDateTime(history.changed_at)}
                                        </Text>
                                    </div>
                                )
                            }))}
                        />
                    </Card>
                )}
            </Drawer>
        );
    };

    return (
        <div style={{
            padding: "24px 40px",
            maxWidth: "1700px",
            width: "100%",
            margin: "0 auto"
        }}>
            <style>
                {`
                    .clickable-rows tbody tr:hover {
                        background-color: #f5f5f5;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    .clickable-row {
                        cursor: pointer;
                    }
                    .tabs-right .ant-tabs-nav {
                        justify-content: flex-end !important;
                    }
                    .tabs-right .ant-tabs-nav-list {
                        justify-content: flex-end;
                    }
                    .mint-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                        color: #10b981 !important;
                    }
                    .mint-tabs .ant-tabs-ink-bar {
                        background: #10b981 !important;
                    }
                `}
            </style>
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Bookings Management</Title>
                    <Text type="secondary">Manage and track all reservations</Text>
                </div>
                <Search
                    placeholder="Search by name, ID, or type"
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    size="large"
                />
            </div>

            <Tabs
                className="tabs-right mint-tabs"
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
                centered={false}
            />

            {renderBookingDetails()}
        </div>
    );
}
