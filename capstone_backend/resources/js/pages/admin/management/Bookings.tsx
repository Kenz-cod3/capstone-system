import { useEffect, useState } from "react";
import { MoreOutlined } from "@ant-design/icons";
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
    Typography
} from "antd";
import type { MenuProps } from "antd";
import api from "@/services/api";

const { Title, Text } = Typography;
const { Search } = Input;

export default function Bookings() {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [active, setActive] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [trash, setTrash] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>("active");
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        setCurrentPage(1);
        setSearchText(""); // ✅ reset search
    }, [activeTab]);

    useEffect(() => {
        fetchAll(currentPage, pageSize);
    }, [activeTab, currentPage, pageSize]);

    const fetchAll = async (page = currentPage, perPage = pageSize) => {
        setLoading(true);

        try {
            let endpoint = "/bookings/active";

            if (activeTab === "history") endpoint = "/bookings/history";
            if (activeTab === "trash") endpoint = "/bookings/trash";

            const res = await api.get(`${endpoint}?page=${page}&per_page=${perPage}`);

            const response = res.data;

            // ✅ FIX: prevent invalid page (important for trash 1 page bug)
            if (response.current_page > response.last_page) {
                setCurrentPage(response.last_page || 1);
                return;
            }

            const data = response.data || [];

            // ✅ SET DATA PER TAB (clean)
            if (activeTab === "active") {
                setActive(data);
            } else if (activeTab === "history") {
                setHistory(data);
            } else if (activeTab === "trash") {
                setTrash(data);
            }

            // ✅ SET TOTAL (single only, no duplicate)
            setTotal(response.total ?? 0);

        } catch (err) {
            console.error(err);
            message.error("Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const filterData = (data: any[]) => {
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

            // ✅ FIX: Update local state correctly
            if (status === "checked_out" || status === "cancelled") {
                const bookingToMove = active.find(b => b.id === id);
                if (bookingToMove) {
                    const updatedBooking = { ...bookingToMove, booking_status: status };
                    setHistory(prev => [updatedBooking, ...prev]);
                    setActive(prev => prev.filter(b => b.id !== id));
                }
            } else {
                setActive(prev =>
                    prev.map(b => b.id === id ? { ...b, booking_status: status } : b)
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
                const updatedBooking = { ...checkedOutBooking, booking_status: "checked_out" };
                setHistory(prev => [updatedBooking, ...prev]);
                setActive(prev => prev.filter(b => b.id !== bookingId));
            }

            message.success(`Booking #${bookingId} checked out successfully`);
        } catch (error) {
            console.error(error);
            message.error("Checkout failed");
        }
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

                    setActive(prev => prev.filter(b => b.id !== id));
                    setHistory(prev => prev.filter(b => b.id !== id));

                    if (deleted) {
                        setTrash(prev => [{ ...deleted, deleted_at: new Date() }, ...prev]);
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
            setTrash(prev => prev.filter(b => b.id !== id));

            if (restored) {
                const { deleted_at, ...cleanRestored } = restored;
                if (restored.booking_status === "checked_out" || restored.booking_status === "cancelled") {
                    setHistory(prev => [cleanRestored, ...prev]);
                } else {
                    setActive(prev => [cleanRestored, ...prev]);
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
                    setTrash(prev => prev.filter(b => b.id !== id));
                    message.success(`Booking #${id} permanently deleted`);
                } catch (err) {
                    console.error(err);
                    message.error("Failed to delete booking permanently");
                }
            }
        });
    };

    const formatDate = (date: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "orange",
            confirmed: "green",
            checked_in: "blue",
            checked_out: "default",
            cancelled: "red"
        };
        return colors[status] || "default";
    };

    const getGuestName = (booking: any) => {
        if (booking.booking_type === "online") {
            const firstName = booking.user?.first_name ?? "";
            const lastName = booking.user?.last_name ?? "";
            return `${firstName} ${lastName}`.trim() || "N/A";
        } else {
            return booking.walk_in_guest?.guest_name || "Guest";
        }
    };

    const getActionMenu = (record: any, type: string): MenuProps => {
        const items: MenuProps["items"] = [];

        if (type === "active") {
            // ✅ FIX: Only show relevant status transitions
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
                    key: "checkout",
                    label: "Check Out",
                    onClick: () => {
                        if (record.booking_type === "walk_in") handleCheckout(record.id);
                        else handleUpdateStatus(record.id, "checked_out");
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

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 100,
            render: (id: number) => <Text strong>#{id}</Text>
        },
        {
            title: "Guest Name",
            key: "guest_name",
            width: 220,
            render: (_: any, record: any) => (
                <Text style={{ fontSize: "14px" }}>{getGuestName(record)}</Text>
            )
        },
        {
            title: "Room",
            key: "room",
            width: 120,
            render: (_: any, record: any) => (
                <Text>{record.rooms?.length ? record.rooms.map((r: any) => r.room_number).join(", ") : "N/A"}</Text>
            )
        },
        {
            title: "Type",
            key: "type",
            width: 110,
            render: (_: any, record: any) => (
                <Tag color={record.booking_type === "walk_in" ? "blue" : "green"} style={{ fontSize: "12px", padding: "4px 12px" }}>
                    {record.booking_type === "walk_in" ? "Walk-in" : "Online"}
                </Tag>
            )
        },
        {
            title: "Status",
            key: "status",
            width: 130,
            render: (_: any, record: any) => (
                <Tag color={getStatusColor(record.booking_status)} style={{ fontSize: "12px", padding: "4px 12px" }}>
                    {record.booking_status?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            )
        },
        {
            title: "Check In",
            key: "check_in",
            width: 130,
            render: (_: any, record: any) => (
                <Text>{formatDate(record.check_in_date)}</Text>
            )
        },
        {
            title: "Check Out",
            key: "check_out",
            width: 130,
            render: (_: any, record: any) => (
                <Text>{formatDate(record.check_out_date)}</Text>
            )
        },
        {
            title: "Total",
            key: "total",
            width: 130,
            render: (_: any, record: any) => (
                <Text strong style={{ color: "#52c41a", fontSize: "14px" }}>
                    ₱ {record.total_price?.toLocaleString()}
                </Text>
            )
        },
        {
            title: "Action",
            key: "action",
            width: 100,
            align: "center" as const,
            render: (_: any, record: any) => (
                <Dropdown menu={getActionMenu(record, activeTab)} trigger={["click"]}>
                    <Button type="text" icon={<MoreOutlined />} size="middle" />
                </Dropdown>
            )
        }
    ];

    const getTableData = () => {
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

    const tabItems = [
        {
            key: "active",
            label: `Active (${active.length})`,
            children: (
                <>
                    <Table
                        className="no-border-table"
                        columns={columns}
                        dataSource={getTableData()}
                        rowKey="id"
                        loading={loading}
                        size="large"
                        bordered={false}
                        pagination={false}
                        scroll={{ y: 400 }}
                    />

                    {/* 🔥 CUSTOM PAGINATION */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 16,
                        flexWrap: "wrap"
                    }}>

                        {/* LEFT SIDE */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                            <Button
                                disabled={currentPage === 1 || loading}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                Prev
                            </Button>

                            <Text>
                                Page {currentPage} of {Math.ceil(total / pageSize) || 1}
                            </Text>

                            <Button
                                disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next
                            </Button>

                        </div>

                        {/* RIGHT SIDE */}
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

                            {/* TOTAL */}
                            <Text>
                                Total: {total}
                            </Text>

                            {/* ROWS */}
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
                </>
            )
        },
        {
            key: "history",
            label: `History (${history.length})`,
            children: (
                <>
                    <Table
                        className="no-border-table"
                        columns={columns}
                        dataSource={getTableData()}
                        rowKey="id"
                        loading={loading}
                        size="large"
                        bordered={false}
                        pagination={false}
                        scroll={{ y: 400 }}
                    />

                    {/* 🔥 CUSTOM PAGINATION */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 16,
                        flexWrap: "wrap"
                    }}>

                        {/* LEFT SIDE */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                            <Button
                                disabled={currentPage === 1 || loading}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                Prev
                            </Button>

                            <Text>
                                Page {currentPage} of {Math.ceil(total / pageSize) || 1}
                            </Text>

                            <Button
                                disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next
                            </Button>

                        </div>

                        {/* RIGHT SIDE */}
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

                            {/* TOTAL */}
                            <Text>
                                Total: {total}
                            </Text>

                            {/* ROWS */}
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
                </>
            )
        },
        {
            key: "trash",
            label: `Trash (${trash.length})`,
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
                    <>
                        <Table
                            className="no-border-table"
                            columns={columns}
                            dataSource={getTableData()}
                            rowKey="id"
                            loading={loading}
                            size="large"
                            bordered={false}
                            pagination={false}
                            scroll={{ y: 400 }}
                        />

                        {/* 🔥 CUSTOM PAGINATION */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 16,
                            flexWrap: "wrap"
                        }}>

                            {/* LEFT SIDE */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                                <Button
                                    disabled={currentPage === 1 || loading}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    Prev
                                </Button>

                                <Text>
                                    Page {currentPage} of {Math.ceil(total / pageSize) || 1}
                                </Text>

                                <Button
                                    disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    Next
                                </Button>

                            </div>

                            {/* RIGHT SIDE */}
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

                                {/* TOTAL */}
                                <Text>
                                    Total: {total}
                                </Text>

                                {/* ROWS */}
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
                    </>
                </>
            )
        }
    ];

    return (
        <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
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
                className="mint-tabs"
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
            />
        </div>
    );
}