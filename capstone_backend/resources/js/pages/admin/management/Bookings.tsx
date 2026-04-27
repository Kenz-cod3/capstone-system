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
    override_reason?: string;
    is_override?: boolean;
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
    role?: string;
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
    const [userRole, setUserRole] = useState<string>("staff");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    useEffect(() => {
        setCurrentPage(1);
        setSearchText("");
    }, [activeTab]);

    useEffect(() => {
        fetchAll(currentPage, pageSize);
    }, [activeTab, currentPage, pageSize]);

    // Get user role on mount
    useEffect(() => {
        const getUserRole = async () => {
            try {
                const response = await api.get('/user');
                setUserRole(response.data.role);
            } catch (error) {
                console.error('Failed to get user role:', error);
            }
        };
        getUserRole();
    }, []);

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

    // Reusable function for actions with admin override
    const handleActionWithOverride = (
        action: (reason?: string) => Promise<void>,
        actionName: string,
        bookingId?: number,
        requiresReason: boolean = true
    ) => {
        // For staff: execute directly
        if (userRole === "staff") {
            action();
            return;
        }

        // For admin: show confirmation modal
        let reason = "";

        const modalContent = (
            <div>
                <Text style={{ fontSize: "13px" }}>You are about to perform an override action: <strong>{actionName}</strong></Text>
                {requiresReason && (
                    <div style={{ marginTop: 16 }}>
                        <Text style={{ fontSize: "13px" }}>Reason for override (optional):</Text>
                        <Input.TextArea
                            rows={3}
                            placeholder="Enter reason for this override action..."
                            onChange={(e) => reason = e.target.value}
                            style={{ marginTop: 8, fontSize: "13px" }}
                        />
                    </div>
                )}
            </div>
        );

        Modal.confirm({
            title: `Admin Override: ${actionName}`,
            content: modalContent,
            okText: "Proceed",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            centered: true,
            width: 500,
            onOk: async () => {
                // Log the override reason
                if (reason) {
                    console.log(`[ADMIN OVERRIDE] ${actionName} on booking #${bookingId}: ${reason}`);
                    // You can also send this to your API
                    try {
                        await api.post(`/bookings/${bookingId}/log-override`, {
                            action: actionName,
                            reason: reason,
                            timestamp: new Date().toISOString(),
                            user_role: userRole
                        }).catch(() => { }); // Silent fail for logging
                    } catch (error) {
                        console.error("Failed to log override:", error);
                    }
                }

                // Execute the action
                await action(reason);

                if (reason) {
                    message.success(`${actionName} completed with override reason logged`);
                } else {
                    message.success(`${actionName} completed`);
                }
            }
        });
    };

    const handleUpdateStatus = async (id: number, status: string, actionName: string) => {
        let overrideReason = "";

        const action = async (reason?: string) => {
            await api.put(`/bookings/${id}`, {
                booking_status: status,
                override_reason: overrideReason
            });

            await fetchAll();

            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking((prev) =>
                    prev ? { ...prev, booking_status: status as Booking["booking_status"] } : null
                );
            }
        };

        if (userRole === "admin") {
            Modal.confirm({
                title: `Admin Override: ${actionName}`,
                content: (
                    <Input.TextArea
                        rows={3}
                        placeholder="Enter reason..."
                        onChange={(e) => overrideReason = e.target.value}
                        style={{ fontSize: "13px" }}
                    />
                ),
                onOk: action
            });
        } else {
            await action();
        }
    };

    const handleCheckoutAction = async (bookingId: number) => {
        const action = async (reason?: string) => {

            const booking = active.find(b => b.id === bookingId);

            if (!booking) return;

            // 🔥 USE CORRECT ENDPOINT
            if (booking.booking_type === "walk_in") {
                await api.post(`/walk-in-guests/${bookingId}/checkout`, {
                    override_reason: reason
                });
            } else {
                await api.put(`/bookings/${bookingId}`, {
                    booking_status: "checked_out",
                    override_reason: reason
                });
            }

            // 🔥 VERY IMPORTANT
            await fetchAll();

            // optional UI update
            if (selectedBooking && selectedBooking.id === bookingId) {
                setSelectedBooking((prev) =>
                    prev ? { ...prev, booking_status: "checked_out" } : null
                );
            }
        };

        await handleActionWithOverride(action, "Check Out", bookingId, true);
    };

    // const handleCheckoutAction = async (bookingId: number) => {

    //     const action = async (reason?: string) => {
    //         await api.post(`/walk-in-guests/${bookingId}/checkout`, {
    //             override_reason: reason
    //         });

    //         const checkedOutBooking = active.find(b => b.id === bookingId);

    //         if (checkedOutBooking) {
    //             const updatedBooking: Booking = { ...checkedOutBooking, booking_status: "checked_out" };
    //             setHistory((prev: Booking[]) => [updatedBooking, ...prev]);
    //             setActive((prev: Booking[]) => prev.filter(b => b.id !== bookingId));
    //         }

    //         if (selectedBooking && selectedBooking.id === bookingId) {
    //             setSelectedBooking((prev: Booking | null) =>
    //                 prev ? { ...prev, booking_status: "checked_out" } : null
    //             );
    //         }
    //     };

    //     await handleActionWithOverride(action, "Check Out", bookingId, true);
    // };

    const handleExtendAction = async (booking: Booking) => {
        const action = async () => {
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
        };

        await handleActionWithOverride(action, "Extend Stay", booking.id, false);
    };

    const handleExtend = (booking: Booking) => {
        if (userRole === "staff") {
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
        } else {
            handleExtendAction(booking);
        }
    };

    const handleDeleteAction = async (id: number) => {
        const action = async (reason?: string) => {
            await api.delete(`/bookings/${id}`, {
                data: { override_reason: reason }
            });

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
        };

        if (userRole === "staff") {
            Modal.confirm({
                title: "Move to Trash",
                content: "Are you sure you want to move this booking to trash?",
                okText: "Yes",
                cancelText: "Cancel",
                okButtonProps: { danger: true },
                onOk: action
            });
        } else {
            await handleActionWithOverride(action, "Move to Trash", id, true);
        }
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
                    <Text type="danger" style={{ fontSize: "13px" }}>⚠️ This action cannot be undone!</Text>
                    <br />
                    <Text style={{ fontSize: "13px" }}>Are you sure you want to permanently delete this booking?</Text>
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
        // 🔥 PRIORITY: booking table (ONLINE)
        if (booking.check_out_time) {
            return formatTime(booking.check_out_time);
        }

        // 🔥 FALLBACK: pivot (WALK-IN)
        if (booking.rooms && booking.rooms.length > 0) {
            const room = booking.rooms[0];

            if (room?.pivot?.check_out_time) {
                return formatTime(room.pivot.check_out_time);
            }
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
                    onClick: () => handleUpdateStatus(record.id, "confirmed", "Confirm Booking")
                });
            }

            if (record.booking_status === "confirmed") {
                items.push({
                    key: "checkin",
                    label: "Check In",
                    onClick: () => handleUpdateStatus(record.id, "checked_in", "Check In")
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
                        handleCheckoutAction(record.id);
                    }
                });
            }

            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => handleDeleteAction(record.id)
            });
        } else if (type === "history") {
            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => handleDeleteAction(record.id)
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

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
        columnWidth: 40,
        fixed: true,
    };

    const columns = [
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Booking Reference ID</span>,
            key: "booking_id",
            width: "15%",
            render: (_: any, record: Booking) => (
                <Text style={{ fontSize: "13px", fontWeight: 500 }}>
                    {record.booking_reference}-{record.id}
                </Text>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Guest Name</span>,
            key: "guest_name",
            width: "15%",
            render: (_: any, record: Booking) => (
                <Button
                    type="link"
                    style={{ color: "black", padding: 0, fontSize: "13px", fontWeight: 400 }}
                    onClick={() => showDetails(record)}
                >
                    {getGuestName(record)}
                </Button>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Room</span>,
            key: "room",
            width: "8%",
            align: "center" as const,
            render: (_: any, record: Booking) => (
                <Text style={{ fontSize: "13px" }}>{record.rooms?.length ? record.rooms.map((r: Room) => r.room_number).join(", ") : "N/A"}</Text>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Type</span>,
            key: "type",
            width: "8%",
            render: (_: any, record: Booking) => (
                <Tag color={record.booking_type === "walk_in" ? "blue" : "green"} style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "6px" }}>
                    {record.booking_type === "walk_in" ? "Walk-in" : "Online"}
                </Tag>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Status</span>,
            key: "status",
            width: "10%",
            render: (_: any, record: Booking) => (
                <Tag color={getStatusColor(record.booking_status)} style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "6px" }}>
                    {record.booking_status?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Stay Type</span>,
            key: "stay_type",
            width: "12%",
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
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Check In</span>,
            key: "check_in",
            width: "8%",
            render: (_: any, record: Booking) => (
                <Text style={{ fontSize: "13px" }}>{formatDate(record.check_in_date)}</Text>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Check-In Time</span>,
            key: "check_in_time",
            width: "8%",
            align: "center" as const,
            render: (_: any, record: Booking) => (
                <Text style={{ fontSize: "13px" }}>{formatTime(record.check_in_time || "")}</Text>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Check Out</span>,
            key: "check_out",
            width: "8%",
            render: (_: any, record: Booking) => (
                <Text style={{ fontSize: "13px" }}>{formatDate(record.check_out_date)}</Text>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Total</span>,
            key: "total",
            width: "8%",
            render: (_: any, record: Booking) => (
                <Text strong style={{ color: "#52c41a", fontSize: "13px", fontWeight: 600 }}>
                    ₱{record.total_price?.toLocaleString()}
                </Text>
            )
        },
        {
            title: <span style={{ fontSize: "13px", fontWeight: 600 }}>Action</span>,
            key: "action",
            width: "5%",
            align: "center" as const,
            render: (_: any, record: Booking) => (
                <div onClick={(e) => handleActionClick(e, record)}>
                    <Dropdown menu={getActionMenu(record, activeTab)} trigger={["click"]}>
                        <Button type="text" icon={<MoreOutlined />} size="small" />
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
            className="no-border-table clickable-rows mint-selection-table premium-table"
            columns={columns}
            dataSource={getTableData()}
            rowKey="id"
            loading={loading}
            size="middle"
            bordered={false}
            pagination={false}
            // scroll={{ x: "max-content" }}
            onRow={rowProps}
            rowSelection={rowSelection}
        />
    );

    const renderPagination = () => (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            flexWrap: "wrap",
            gap: 16,
            padding: "12px 0"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button
                    size="small"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage((prev: number) => prev - 1)}
                    style={{ borderRadius: "8px" }}
                >
                    Prev
                </Button>

                <Text style={{ fontSize: "12px" }}>
                    Page {currentPage} of {Math.ceil(total / pageSize) || 1}
                </Text>

                <Button
                    size="small"
                    disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                    onClick={() => setCurrentPage((prev: number) => prev + 1)}
                    style={{ borderRadius: "8px" }}
                >
                    Next
                </Button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Text style={{ fontSize: "13px" }}>Total: {total}</Text>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: "13px" }}>Rows:</Text>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            fontSize: "13px",
                            backgroundColor: "white",
                            cursor: "pointer",
                            outline: "none"
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <Text style={{ fontSize: "13px" }}>/ page</Text>
                </div>
            </div>
        </div>
    );

    const tabItems: TabsProps["items"] = [
        {
            key: "active",
            label: (
                <Space size={6}>
                    <CheckCircleOutlined style={{ fontSize: "13px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>Active</span>
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
                <Space size={6}>
                    <HistoryOutlined style={{ fontSize: "13px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>History</span>
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
                <Space size={6}>
                    <DeleteOutlined style={{ fontSize: "13px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>Trash</span>
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
                            style={{ marginBottom: 16, fontSize: "12px", borderRadius: "10px" }}
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

        const histories = selectedBooking.histories || [];

        const confirmedBy = histories.find(h => h.new_status === "confirmed");
        const checkedInBy = histories.find(h => h.new_status === "checked_in");
        const checkedOutBy = histories.find(h => h.new_status === "checked_out");
        const override = histories.find(h => h.is_override);

        return (
            <Drawer
                title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space size={8}>
                            <Tag color="blue" style={{ fontSize: "12px", borderRadius: "6px" }}>#{selectedBooking.id}</Tag>
                            <Text strong style={{ fontSize: "14px", fontWeight: 600 }}>{guestName}</Text>
                        </Space>
                    </div>
                }
                placement="right"
                open={detailsVisible}
                onClose={() => setDetailsVisible(false)}
                width={500}
                closable={true}
                closeIcon={<CloseOutlined style={{ fontSize: "14px" }} />}
                extra={
                    <Dropdown menu={getActionMenu(selectedBooking, activeTab)} trigger={["click"]}>
                        <Button type="primary" icon={<MoreOutlined />} size="middle" style={{ borderRadius: "8px" }}>
                            Actions
                        </Button>
                    </Dropdown>
                }
            >
                <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <Badge
                        color={statusColor}
                        text={
                            <Text strong style={{ fontSize: "14px", color: statusColor, fontWeight: 600 }}>
                                {selectedBooking.booking_status?.replace(/_/g, " ").toUpperCase()}
                            </Text>
                        }
                    />
                </div>

                <Card
                    title={
                        <Space size={6}>
                            <UserOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Guest Information</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: "12px", border: "1px solid #f0f0f0" }}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Name</span>}>
                            <Text strong style={{ fontSize: "13px" }}>{guestDetails.name}</Text>
                        </Descriptions.Item>
                        {guestDetails.email !== undefined && (
                            <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Email</span>}>
                                <Text style={{ fontSize: "13px" }}>{guestDetails.email}</Text>
                            </Descriptions.Item>
                        )}
                        {guestDetails.phone !== undefined && (
                            <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Phone</span>}>
                                <Space size={4}>
                                    <PhoneOutlined style={{ fontSize: "12px" }} />
                                    <Text style={{ fontSize: "13px" }}>{guestDetails.phone}</Text>
                                </Space>
                            </Descriptions.Item>
                        )}
                        {guestDetails.address !== undefined && (
                            <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Address</span>}>
                                <Space size={4}>
                                    <EnvironmentOutlined style={{ fontSize: "12px" }} />
                                    <Text style={{ fontSize: "13px" }}>{guestDetails.address}</Text>
                                </Space>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <CalendarOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Booking Details</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: "12px", border: "1px solid #f0f0f0" }}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Booking Type</span>}>
                            <Tag color={selectedBooking.booking_type === "walk_in" ? "blue" : "green"} style={{ fontSize: "12px", borderRadius: "6px" }}>
                                {selectedBooking.booking_type === "walk_in" ? "Walk-in" : "Online"}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Stay Type</span>}>
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
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Booking Reference</span>}>
                            <Text code style={{ fontSize: "12px" }}>{selectedBooking.booking_reference}</Text>
                        </Descriptions.Item>

                        {(() => {
                            const isWalkIn = selectedBooking.booking_type === "walk_in";

                            const formatUser = (user: any) => {
                                if (!user) return "N/A";

                                return (
                                    <>
                                        {user.first_name} {user.last_name}
                                        {user.role && (
                                            <Text type="secondary" style={{ marginLeft: 6 }}>
                                                ({user.role})
                                            </Text>
                                        )}
                                    </>
                                );
                            };

                            return (
                                <>
                                    {/* WALK-IN */}
                                    {isWalkIn ? (
                                        <Descriptions.Item label="Handled By">
                                            {formatUser(selectedBooking.created_by)}
                                        </Descriptions.Item>
                                    ) : (
                                        <>
                                            {/* ONLINE */}
                                            <Descriptions.Item label="Created By">
                                                {selectedBooking.created_by
                                                    ? formatUser(selectedBooking.created_by)
                                                    : "Customer"}
                                            </Descriptions.Item>

                                            <Descriptions.Item label="Confirmed By">
                                                {confirmedBy?.user
                                                    ? formatUser(confirmedBy.user)
                                                    : <Text type="secondary">Not confirmed</Text>}
                                            </Descriptions.Item>
                                        </>
                                    )}

                                    {/* CHECK-IN */}
                                    {checkedInBy?.user && (
                                        <Descriptions.Item label="Checked-in By">
                                            {formatUser(checkedInBy.user)}
                                        </Descriptions.Item>
                                    )}

                                    {/* CHECK-OUT */}
                                    {checkedOutBy?.user && (
                                        <Descriptions.Item label="Checked-out By">
                                            {formatUser(checkedOutBy.user)}
                                        </Descriptions.Item>
                                    )}

                                    {/* OVERRIDE */}
                                    {override?.user && (
                                        <Descriptions.Item label="Override By">
                                            <Text type="danger">
                                                {formatUser(override.user)}
                                            </Text>
                                        </Descriptions.Item>
                                    )}
                                </>
                            );
                        })()}

                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Created At</span>}>
                            <Space size={4}>
                                <CalendarOutlined style={{ fontSize: "12px" }} />
                                <Text style={{ fontSize: "13px" }}>{formatDateTime(selectedBooking.created_at || "")}</Text>
                            </Space>
                        </Descriptions.Item>

                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Check-in Date</span>}>
                            <Space size={4}>
                                <CalendarOutlined style={{ fontSize: "12px" }} />
                                <Text style={{ fontSize: "13px" }}>{formatDate(selectedBooking.check_in_date)}</Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Check-in Time</span>}>
                            <Space size={4}>
                                <ClockCircleOutlined style={{ fontSize: "12px" }} />
                                <Text style={{ fontSize: "13px" }}>{formatTime(selectedBooking.check_in_time || "")}</Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Expected Check-out</span>}>
                            <Space size={4}>
                                <CalendarOutlined style={{ fontSize: "12px" }} />
                                <Text style={{ fontSize: "13px" }}>{getExpectedCheckoutDate(selectedBooking)}</Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span style={{ fontSize: "12px", fontWeight: 500 }}>Check-out Time</span>}>
                            <Space size={4}>
                                <ClockCircleOutlined style={{ fontSize: "12px" }} />
                                <Text style={{ fontSize: "13px" }}>{getCheckoutTime(selectedBooking)}</Text>
                            </Space>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <TagOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Rooms</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: "12px", border: "1px solid #f0f0f0" }}
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
                                        padding: "10px 14px",
                                        background: "#f8fafc",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0"
                                    }}>
                                        <Space size={8}>
                                            <Tag color="blue" style={{ fontSize: "12px", borderRadius: "6px" }}>Room {room.room_number}</Tag>
                                            <Text type="secondary" style={{ fontSize: "12px" }}>
                                                {room.room_type?.type_name ?? "-"}
                                            </Text>
                                        </Space>
                                        <Space direction="vertical" size={0} align="end">
                                            {room.room_type?.base_price && (
                                                <Text type="secondary" style={{ fontSize: "11px" }}>
                                                    Original: ₱{room.room_type.base_price.toLocaleString()}
                                                </Text>
                                            )}
                                            <Text strong style={{ color: "#52c41a", fontSize: "13px", fontWeight: 600 }}>
                                                {roomStayType === "short_stay" ? "Short Stay" : "Overnight"}: ₱{roomPrice.toLocaleString()}
                                            </Text>
                                        </Space>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <Text type="secondary" style={{ fontSize: "13px" }}>No rooms assigned</Text>
                    )}
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Payment Summary</span>
                        </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16, borderRadius: "12px", border: "1px solid #f0f0f0" }}
                >
                    <div style={{ textAlign: "right" }}>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: "12px" }}>Subtotal:</Text>
                            <Text style={{ marginLeft: 16, fontSize: "13px" }}>₱{selectedBooking.total_price?.toLocaleString()}</Text>
                        </div>
                        <Divider style={{ margin: "8px 0" }} />
                        <div>
                            <Text strong style={{ fontSize: "13px", fontWeight: 600 }}>Total:</Text>
                            <Text strong style={{ fontSize: "14px", color: "#52c41a", marginLeft: 16, fontWeight: 700 }}>
                                ₱{selectedBooking.total_price?.toLocaleString()}
                            </Text>
                        </div>
                    </div>
                </Card>

                {selectedBooking.histories && selectedBooking.histories.length > 0 && (
                    <Card
                        title={<span style={{ fontSize: "13px", fontWeight: 600 }}>Activity Log</span>}
                        size="small"
                        style={{ borderRadius: "12px", border: "1px solid #f0f0f0" }}
                    >
                        <Timeline
                            items={selectedBooking.histories.map((history: History) => ({
                                color: history.new_status === "checked_out" ? "green" : "blue",
                                children: (
                                    <div>
                                        <Text strong style={{
                                            fontSize: "12px",
                                            color: history.is_override ? "red" : undefined,
                                            fontWeight: 600
                                        }}>
                                            {history.change_note || "Status Updated"}
                                        </Text>

                                        {history.is_override && history.override_reason && (
                                            <>
                                                <br />
                                                <Text type="danger" style={{ fontSize: "11px" }}>
                                                    Override Reason: {history.override_reason}
                                                </Text>
                                            </>
                                        )}

                                        <br />
                                        <Text type="secondary" style={{ fontSize: "11px" }}>
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
        <div className="space-y-1 pb-6">
            <style>
                {`
                    .clickable-rows tbody tr:hover {
                        background-color: #f9fafb !important;
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
                    .mint-tabs .ant-tabs-tab {
                        font-size: 13px !important;
                        padding: 12px 0 !important;
                    }
                    
                    /* Mint green table row selection */
                    .mint-selection-table .ant-table-tbody > tr.ant-table-row-selected > td {
                        background-color: #ecfdf5 !important;
                    }
                    
                    .mint-selection-table .ant-table-tbody > tr.ant-table-row-selected:hover > td {
                        background-color: #d1fae5 !important;
                    }
                    
                    /* Mint green checkbox when selected */
                    .mint-selection-table .ant-checkbox-checked .ant-checkbox-inner {
                        background-color: #10b981 !important;
                        border-color: #10b981 !important;
                    }
                    
                    .mint-selection-table .ant-checkbox-checked .ant-checkbox-inner::after {
                        border-color: white !important;
                    }
                    
                    .mint-selection-table .ant-checkbox:hover .ant-checkbox-inner {
                        border-color: #10b981 !important;
                    }
                    
                    /* Premium table styling */
                    .premium-table .ant-table {
                        background: white;
                        border-radius: 16px;
                        overflow: visible; /* 🔥 FIX */
                    }
                    
                    .premium-table .ant-table-thead > tr > th {
                        font-size: 13px !important;
                        font-weight: 600 !important;
                        padding: 14px 8px !important;
                        background-color: #f8fafc !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        color: #1e293b !important;
                    }
                    
                    .premium-table .ant-table-tbody > tr > td {
                        font-size: 13px !important;
                        padding: 12px 8px !important;
                        border-bottom: 1px solid #f1f5f9 !important;
                        color: #334155 !important;
                    }
                    
                    .premium-table .ant-table-tbody > tr:last-child > td {
                        border-bottom: none !important;
                    }
                    
                    /* Card and component styling */
                    .ant-descriptions-item-label {
                        font-size: 12px !important;
                        font-weight: 500 !important;
                        color: #64748b !important;
                    }
                    .ant-descriptions-item-content {
                        font-size: 13px !important;
                        color: #1e293b !important;
                    }
                    .ant-card-head-title {
                        font-size: 13px !important;
                        font-weight: 600 !important;
                        color: #1e293b !important;
                    }
                    .ant-timeline-item-content {
                        font-size: 12px !important;
                    }
                    .ant-tag {
                        font-size: 12px !important;
                        border-radius: 6px !important;
                        padding: 4px 12px !important;
                    }
                    .ant-btn {
                        font-size: 13px !important;
                        border-radius: 8px !important;
                    }
                    
                    /* Modal styling */
                    .ant-modal-content {
                        border-radius: 16px !important;
                    }
                    
                    .ant-modal-header {
                        border-radius: 16px 16px 0 0 !important;
                    }
                    
                    @media (max-width: 768px) {
                        .ant-table {
                            font-size: 12px;
                        }
                        .ant-table-thead > tr > th {
                            font-size: 12px !important;
                        }
                        .ant-table-tbody > tr > td {
                            font-size: 12px !important;
                        }
                    }
                `}
            </style>
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                    <Title level={5} style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>Bookings Management</Title>
                    <Text type="secondary" style={{ fontSize: "12px", color: "#64748b" }}>Manage and track all reservations</Text>
                </div>
                <Search
                    placeholder="Search by name, ID, or type"
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    size="middle"
                />
            </div>

            <Tabs
                className="tabs-right mint-tabs"
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="middle"
                centered={false}
            />

            {renderBookingDetails()}
        </div>
    );
}