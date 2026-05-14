import { useEffect, useState } from "react";
import api from "@/services/api";
import {
    SearchOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    ReloadOutlined,
    MoreOutlined,
    EyeOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    StarOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    CreditCardOutlined,
    TeamOutlined,
    RiseOutlined,
    VerifiedOutlined,
    StopOutlined,
    CheckOutlined,
    FilterOutlined,
    SortAscendingOutlined,
    ExportOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserDeleteOutlined,
    UserAddOutlined,
} from "@ant-design/icons";
import {
    Badge,
    Input,
    Button,
    Table,
    Avatar,
    Select,
    Spin,
    Empty,
    message,
    Modal,
    Dropdown,
    Typography,
    Divider,
    Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

// ✅ Import the extracted full-screen modal + shared types
import {
    type User,
} from "@/components/AdminComponents/users/Guestdetailmodal";
import { useNavigate } from "react-router-dom";

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface StatsData {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    newThisMonth: number;
    averageBookings: number;
    totalRevenue: number;
}

const AVATAR_COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"];
const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const getInitials = (first: string, last: string) =>
    `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();
const formatDate = (d?: string) => d ? format(new Date(d), "MMM dd, yyyy hh:mm a") : "—";

const getLoyaltyLevel = (totalSpent = 0) => {
    if (totalSpent > 50000) return { level: "Platinum", color: "#3b82f6", bg: "#dbeafe" };
    if (totalSpent > 25000) return { level: "Gold", color: "#d97706", bg: "#fef3c7" };
    if (totalSpent > 10000) return { level: "Silver", color: "#6b7280", bg: "#f3f4f6" };
    return { level: "Bronze", color: "#cd7f32", bg: "#fef3c7" };
};

export default function Guests() {
    const [users, setUsers] = useState<User[]>([]);
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [newStatus, setNewStatus] = useState<boolean>(true);
    const [filtersVisible, setFiltersVisible] = useState(false);

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [verificationFilter, setVerificationFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(10);

    const [stats, setStats] = useState<StatsData>({
        total: 0, active: 0, inactive: 0, verified: 0,
        newThisMonth: 0, averageBookings: 0, totalRevenue: 0,
    });

    const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

    const getAvatarUrl = (user: User) => {
        if (!user?.profile_image) return undefined;
        return user.profile_image.startsWith("http")
            ? user.profile_image
            : `${BASE_URL}/storage/${user.profile_image}`;
    };

    const fetchUsers = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            else setRefreshing(true);

            const params: any = { page: currentPage, per_page: perPage, role: "guest" };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter !== "all") params.status = statusFilter;
            if (verificationFilter !== "all") params.verified = verificationFilter;
            if (sortBy) params.sort = sortBy;

            const response = await api.get("/users", { params });
            const paginatedData = response.data;
            const usersData = paginatedData.data || [];
            const guestUsers = usersData.filter((u: User) => u.role === "guest");

            setUsers(guestUsers);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);

            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const newThisMonth = guestUsers.filter((u: User) => new Date(u.created_at) >= firstDayOfMonth).length;
            const totalRevenue = guestUsers.reduce((s: number, u: User) => s + Number(u.total_spent || 0), 0);
            const averageBookings = guestUsers.length > 0
                ? guestUsers.reduce((s: number, u: User) => s + (u.total_bookings || 0), 0) / guestUsers.length
                : 0;

            setStats({
                total: paginatedData.total,
                active: guestUsers.filter((u: User) => u.is_active).length,
                inactive: guestUsers.filter((u: User) => !u.is_active).length,
                verified: guestUsers.filter((u: User) => u.email_verified_at).length,
                newThisMonth,
                averageBookings: Math.round(averageBookings * 10) / 10,
                totalRevenue,
            });
        } catch (err: any) {
            message.error(err.response?.data?.message || "Failed to load guests");
        } finally {
            if (!silent) setLoading(false);
            else setRefreshing(false);
        }
    };

    const handleViewGuest = (user: User) => {
        navigate(`/guests/${user.id}`, {
            state: { user },
        });
    };

    const handleStatusChange = async (user: User, status: boolean) => {
        try {
            await api.patch(`/users/${user.id}/status`, { is_active: status });
            message.success(`${user.first_name} ${user.last_name} ${status ? "activated" : "deactivated"}`);
            fetchUsers();
            setStatusModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const handleDeleteUser = async (user: User) => {
        try {
            await api.delete(`/users/${user.id}`);
            message.success(`${user.first_name} ${user.last_name} has been deleted`);
            fetchUsers();
            setDeleteModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to delete user");
        }
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { fetchUsers(); }, [debouncedSearch, currentPage, statusFilter, verificationFilter, sortBy]);

    const loyalty = getLoyaltyLevel(stats.totalRevenue);

    // ── Sub-components ────────────────────────────────────────────────────────

    const StatCard = ({ title, value, icon, color, trend }: any) => (
        <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5 hover:shadow-md transition-all h-full">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wider">{title}</span>
                    <span className="text-3xl font-bold text-[#1a1a18]">{typeof value === "number" ? value.toLocaleString() : value}</span>
                    {trend && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 w-fit">
                            <RiseOutlined className="mr-1" /> {trend}
                        </span>
                    )}
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                    {icon}
                </div>
            </div>
        </div>
    );

    const columns: ColumnsType<User> = [
        {
            title: "Guest",
            key: "guest",
            width: 280,
            fixed: "left",
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size={44}
                        src={getAvatarUrl(record)}
                        style={{ backgroundColor: !record.profile_image ? getAvatarColor(record.id) : undefined, flexShrink: 0 }}
                        icon={!record.profile_image ? <UserOutlined /> : undefined}
                    >
                        {!record.profile_image && !getAvatarUrl(record) && getInitials(record.first_name, record.last_name)}
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <Text strong style={{ fontSize: 15 }}>{record.first_name} {record.last_name}</Text>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {record.email_verified_at && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-50 text-green-700">
                                    <CheckCircleOutlined className="text-[10px]" /> Verified
                                </span>
                            )}
                            {!!record.total_bookings && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700">
                                    <StarOutlined className="text-[10px]" /> {record.total_bookings} bookings
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Contact",
            key: "contact",
            responsive: ["md"],
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <MailOutlined className="text-[#b0ae9f] w-4" />
                        <Tooltip title={record.email}>
                            <span className="text-[13px] text-[#4a4a42] truncate max-w-[180px]">{record.email}</span>
                        </Tooltip>
                    </div>
                    {record.contact_number && (
                        <div className="flex items-center gap-2">
                            <PhoneOutlined className="text-[#b0ae9f] w-4" />
                            <span className="text-[13px] text-[#4a4a42]">{record.contact_number}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Address",
            key: "address",
            responsive: ["lg"],
            render: (_, record) =>
                record.address ? (
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-[#b0ae9f]" />
                        <Tooltip title={record.address}>
                            <span className="text-[13px] text-[#4a4a42] truncate max-w-[200px]">{record.address}</span>
                        </Tooltip>
                    </div>
                ) : <span className="text-[#b0ae9f]">—</span>,
        },
        {
            title: "Status",
            key: "status",
            width: 100,
            align: "center",
            render: (_, record) => (
                <Badge status={record.is_active ? "success" : "default"} text={record.is_active ? "Active" : "Inactive"} />
            ),
        },
        {
            title: "Joined",
            key: "joined",
            width: 150,
            responsive: ["md"],
            render: (_, record) => (
                <Tooltip title={formatDate(record.created_at)}>
                    <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-[#b0ae9f]" />
                        <span className="text-[13px] text-[#4a4a42]">{dayjs(record.created_at).format("MMM DD, YYYY")}</span>
                    </div>
                </Tooltip>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 80,
            align: "center",
            fixed: "right",
            render: (_, record) => (
                <Dropdown
                    menu={{
                        items: [
                            { key: "view", label: "View Details", icon: <EyeOutlined />, onClick: () => handleViewGuest(record) },
                            {
                                key: "status",
                                label: record.is_active ? "Deactivate" : "Activate",
                                icon: record.is_active ? <StopOutlined /> : <CheckOutlined />,
                                onClick: () => { setSelectedUser(record); setNewStatus(!record.is_active); setStatusModalVisible(true); },
                            },
                            { type: "divider" },
                            { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true, onClick: () => { setSelectedUser(record); setDeleteModalVisible(true); } },
                        ],
                    }}
                    trigger={["click"]}
                >
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className="min-h-screen p-4 md:p-6 bg-white font-['DM_Sans',sans-serif]">

            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div>
                        <h1 className="font-['Playfair_Display',serif] text-2xl md:text-3xl font-bold text-[#1a1a18] tracking-tight mb-1">
                            Guest Management
                        </h1>
                        <p className="text-[13px] text-[#8a8878]">Manage and monitor all registered guests</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            icon={<ReloadOutlined spin={refreshing} />}
                            onClick={() => fetchUsers(true)}
                            loading={refreshing}
                            className="border-[#e0ddd6] text-[#6b6960] rounded-xl"
                        >
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            icon={<ExportOutlined />}
                            className="bg-[#3eb489] border-[#3eb489] hover:bg-[#31a07a] rounded-xl shadow-sm"
                        >
                            Export
                        </Button>
                        <Button
                            icon={filtersVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                            onClick={() => setFiltersVisible(!filtersVisible)}
                            className="border-[#e0ddd6] text-[#6b6960] rounded-xl"
                        >
                            Filters
                        </Button>
                    </div>
                </div>
                <Divider className="border-[#e8e6df] my-0" />
            </div>

            {/* Filters */}
            {filtersVisible && (
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm mb-6 p-5">
                    <div className="flex flex-wrap gap-3">
                        {[
                            {
                                value: statusFilter, onChange: setStatusFilter, icon: <FilterOutlined />, width: 140,
                                options: [["all", "All Status"], ["active", "Active"], ["inactive", "Inactive"]]
                            },
                            {
                                value: verificationFilter, onChange: setVerificationFilter, icon: <VerifiedOutlined />, width: 170,
                                options: [["all", "All Verification"], ["verified", "Verified Only"], ["unverified", "Unverified Only"]]
                            },
                            {
                                value: sortBy, onChange: setSortBy, icon: <SortAscendingOutlined />, width: 150,
                                options: [["newest", "Newest First"], ["oldest", "Oldest First"], ["name_asc", "Name A–Z"], ["name_desc", "Name Z–A"]]
                            },
                        ].map(({ value, onChange, icon, width, options }, i) => (
                            <Select key={i} style={{ width }} value={value} onChange={onChange} suffixIcon={icon}
                                className="[&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:border-[#e0ddd6]">
                                {options.map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
                            </Select>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Total Guests" value={stats.total} color="#10b981" trend="+12%" icon={<TeamOutlined style={{ fontSize: 24, color: "#10b981" }} />} />
                <StatCard title="Active" value={stats.active} color="#3b82f6" trend="+8%" icon={<CheckCircleOutlined style={{ fontSize: 24, color: "#3b82f6" }} />} />
                <StatCard title="Verified" value={stats.verified} color="#14b8a6" trend="+15%" icon={<VerifiedOutlined style={{ fontSize: 24, color: "#14b8a6" }} />} />
                <StatCard title="New This Month" value={stats.newThisMonth} color="#8b5cf6" trend="+23%" icon={<RiseOutlined style={{ fontSize: 24, color: "#8b5cf6" }} />} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                    { title: "Total Revenue", value: `₱${stats.totalRevenue.toLocaleString()}`, icon: <CreditCardOutlined style={{ fontSize: 24, color: "#10b981" }} /> },
                    { title: "Avg. Bookings/User", value: stats.averageBookings, icon: <StarOutlined style={{ fontSize: 24, color: "#10b981" }} /> },
                ].map(({ title, value, icon }) => (
                    <div key={title} className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5 hover:shadow-md transition-all flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50">{icon}</div>
                        <div>
                            <span className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wider block">{title}</span>
                            <span className="text-2xl font-bold text-[#1a1a18]">{value}</span>
                        </div>
                    </div>
                ))}
                <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm p-5 hover:shadow-md transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${loyalty.color}15` }}>
                        <TrophyOutlined style={{ fontSize: 24, color: loyalty.color }} />
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold text-[#8a8878] uppercase tracking-wider block">Loyalty Level</span>
                        <span className="text-2xl font-bold" style={{ color: loyalty.color }}>{loyalty.level}</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm mb-6 p-5">
                <Search
                    placeholder="Search by name, email, or contact..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="[&_.ant-input-group-addon_.ant-btn]:bg-[#3eb489] [&_.ant-input-group-addon_.ant-btn]:border-[#3eb489] [&_.ant-input-group-addon_.ant-btn]:hover:bg-[#31a07a] [&_.ant-input-group-addon_.ant-btn]:rounded-r-xl [&_.ant-input]:rounded-l-xl"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#eeece6] flex items-center justify-between">
                    <h2 className="font-['Playfair_Display',serif] text-base font-semibold text-[#1a1a18] m-0">Guest List</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f5ee] text-[#1e7a45]">
                        {total} records
                    </span>
                </div>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={users}
                        rowKey="id"
                        scroll={{ x: 1000 }}
                        pagination={{
                            current: currentPage,
                            total,
                            pageSize: perPage,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} guests`,
                            onChange: (page) => setCurrentPage(page),
                            onShowSizeChange: (_, size) => { setPerPage(size); setCurrentPage(1); },
                        }}
                        locale={{ emptyText: <Empty description="No guests found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        className="[&_.ant-table-thead_.ant-table-cell]:bg-[#f8f7f4] [&_.ant-table-thead_.ant-table-cell]:text-[10.5px] [&_.ant-table-thead_.ant-table-cell]:font-bold [&_.ant-table-thead_.ant-table-cell]:text-[#8a8878] [&_.ant-table-thead_.ant-table-cell]:uppercase [&_.ant-table-thead_.ant-table-cell]:tracking-wider [&_.ant-table-tbody_.ant-table-row:hover_.ant-table-cell]:bg-[#f9f8f5]"
                    />
                </Spin>
            </div>

            {/* Status Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        {newStatus ? <UserAddOutlined className="text-emerald-500" /> : <UserDeleteOutlined className="text-red-500" />}
                        <span>{newStatus ? "Activate" : "Deactivate"} Guest</span>
                    </div>
                }
                open={statusModalVisible}
                onCancel={() => setStatusModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setStatusModalVisible(false)} className="rounded-xl border-[#e0ddd6]">Cancel</Button>,
                    <Button
                        key="confirm"
                        type={newStatus ? "primary" : "default"}
                        danger={!newStatus}
                        onClick={() => selectedUser && handleStatusChange(selectedUser, newStatus)}
                        className={newStatus ? "bg-[#3eb489] border-[#3eb489] hover:bg-[#31a07a] rounded-xl" : "rounded-xl"}
                    >
                        {newStatus ? "Activate" : "Deactivate"}
                    </Button>,
                ]}
                className="[&_.ant-modal-content]:rounded-2xl"
            >
                <Paragraph>
                    Are you sure you want to {newStatus ? "activate" : "deactivate"}{" "}
                    <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?
                </Paragraph>
                {!newStatus && <p className="text-xs text-[#8a8878] mt-2">Deactivated users cannot log in or make bookings.</p>}
            </Modal>

            {/* Delete Modal */}
            <Modal
                title="Delete Guest"
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setDeleteModalVisible(false)} className="rounded-xl border-[#e0ddd6]">Cancel</Button>,
                    <Button key="delete" type="primary" danger onClick={() => selectedUser && handleDeleteUser(selectedUser)} className="rounded-xl">
                        Delete Permanently
                    </Button>,
                ]}
                className="[&_.ant-modal-content]:rounded-2xl"
            >
                <Paragraph>
                    Are you sure you want to permanently delete{" "}
                    <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?
                </Paragraph>
                <p className="text-xs text-red-500 mt-2">This action cannot be undone. All associated data will be removed.</p>
            </Modal>
        </div>
    );
}