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
    UserDeleteOutlined,
    UserAddOutlined,
    CloseOutlined,
    CalendarOutlined,
} from "@ant-design/icons";
import {
    Select,
    Spin,
    Empty,
    message,
    Modal,
    Dropdown,
    Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { format } from "date-fns";
import dayjs from "dayjs";

// Import the extracted full-screen modal + shared types
import {
    type User,
} from "@/components/AdminComponents/users/Guestdetailmodal";
import { useNavigate } from "react-router-dom";

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
const formatDate = (d?: string) => (d ? format(new Date(d), "MMM dd, yyyy hh:mm a") : "—");

const getLoyaltyLevel = (totalSpent = 0) => {
    if (totalSpent > 50000) return { level: "Platinum", color: "#6366f1", bg: "#eef2ff" };
    if (totalSpent > 25000) return { level: "Gold", color: "#d97706", bg: "#fef3c7" };
    if (totalSpent > 10000) return { level: "Silver", color: "#64748b", bg: "#f1f5f9" };
    return { level: "Bronze", color: "#b45309", bg: "#fef3c7" };
};

// Stat Card Component (matches Users.tsx / WalkInGuests.tsx)
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
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${gradient}`} />
        <div className="relative flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                <p className="text-3xl font-bold text-slate-800 leading-tight">
                    {typeof value === "number" ? value.toLocaleString() : value}
                </p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
                {icon}
            </div>
        </div>
    </div>
);

const StatusPill = ({ active }: { active: boolean }) => (
    <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
    >
        <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
        {active ? "Active" : "Inactive"}
    </span>
);

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

    // ──────────────────────────────────────────────────────────────────────
    // DEBUG NOTE: this is the single source of truth for the table + stats.
    // If counts on screen ever look wrong, check these things IN ORDER:
    //   1. `params` below — confirm filters/search/sort are actually sent
    //   2. `paginatedData.data` — is the API returning guest-only rows, or
    //      do we still need the `.filter(role === 'guest')` safety net?
    //   3. Stats are computed from `guestUsers` (current PAGE only), NOT
    //      from `paginatedData.total` — so "Total Guests" stat uses the
    //      server-side total, but "New This Month" / "Total Revenue" /
    //      "Avg Bookings" only reflect what's on the CURRENT page.
    //      This is a known limitation — if numbers look "too small",
    //      this is almost certainly why. Fix = compute these server-side.
    // ──────────────────────────────────────────────────────────────────────
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
            // Safety net: API is expected to filter by role=guest server-side,
            // but we re-filter client-side in case the backend ignores `role`.
            const guestUsers = usersData.filter((u: User) => u.role === "guest");

            setUsers(guestUsers);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);

            // ⚠️ CURRENT-PAGE-ONLY METRICS — see DEBUG NOTE above.
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const newThisMonth = guestUsers.filter((u: User) => new Date(u.created_at) >= firstDayOfMonth).length;
            const totalRevenue = guestUsers.reduce((s: number, u: User) => s + Number(u.total_spent || 0), 0);
            const averageBookings = guestUsers.length > 0
                ? guestUsers.reduce((s: number, u: User) => s + (u.total_bookings || 0), 0) / guestUsers.length
                : 0;

            setStats({
                total: paginatedData.total, // server-side total (accurate across all pages)
                active: guestUsers.filter((u: User) => u.is_active).length,
                inactive: guestUsers.filter((u: User) => !u.is_active).length,
                verified: guestUsers.filter((u: User) => u.email_verified_at).length,
                newThisMonth,
                averageBookings: Math.round(averageBookings * 10) / 10,
                totalRevenue,
            });
        } catch (err: any) {
            // DEBUG: log full error object to console — message.error only shows
            // the user-facing string, so check console for status code / payload.
            console.error("[Guests] fetchUsers failed:", err);
            message.error(err.response?.data?.message || "Failed to load guests");
        } finally {
            if (!silent) setLoading(false);
            else setRefreshing(false);
        }
    };

    const handleViewGuest = (user: User) => {
        // Passing `user` via router state avoids an extra fetch on the details
        // page, but means that page falls back to nothing if opened directly
        // via URL / refresh. Check `Guestdetailmodal` / details page for its
        // own fetch-by-id fallback if `state.user` is undefined.
        navigate(`/guests/${user.id}`, { state: { user } });
    };

    const handleStatusChange = async (user: User, status: boolean) => {
        try {
            await api.patch(`/users/${user.id}/status`, { is_active: status });
            message.success(`${user.first_name} ${user.last_name} ${status ? "activated" : "deactivated"}`);
            fetchUsers();
            setStatusModalVisible(false);
        } catch (error: any) {
            console.error("[Guests] handleStatusChange failed:", error);
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
            console.error("[Guests] handleDeleteUser failed:", error);
            message.error(error.response?.data?.message || "Failed to delete user");
        }
    };

    // Debounce search input before it triggers a fetch (500ms)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(t);
    }, [search]);

    // IMPORTANT: this effect re-fetches on every filter/sort/page change.
    // If you add a new filter state, add it to this dependency array too,
    // or the new filter will silently do nothing until another field changes.
    useEffect(() => {
        fetchUsers();
    }, [debouncedSearch, currentPage, statusFilter, verificationFilter, sortBy]);

    const loyalty = getLoyaltyLevel(stats.totalRevenue);

    const columns: ColumnsType<User> = [
        {
            title: "Guest",
            key: "guest",
            width: 280,
            fixed: "left",
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    {getAvatarUrl(record) ? (
                        <img
                            src={getAvatarUrl(record)}
                            alt={record.first_name}
                            className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm flex-shrink-0"
                        />
                    ) : (
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(record.id) }}
                        >
                            {getInitials(record.first_name, record.last_name)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                            {record.first_name} {record.last_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {record.email_verified_at && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                                    <CheckCircleOutlined className="text-[10px]" />
                                    Verified
                                </span>
                            )}
                            {!!record.total_bookings && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    <StarOutlined className="text-[10px]" />
                                    {record.total_bookings} bookings
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
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <MailOutlined className="text-slate-400 text-xs" />
                        </div>
                        <span className="text-sm text-slate-600 truncate max-w-[180px]">{record.email}</span>
                    </div>
                    {record.contact_number && (
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <PhoneOutlined className="text-slate-400 text-xs" />
                            </div>
                            <span className="text-sm text-slate-600">{record.contact_number}</span>
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
                    <Tooltip title={record.address}>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <EnvironmentOutlined className="text-slate-400 text-xs" />
                            </div>
                            <span className="text-sm text-slate-600 truncate max-w-[180px]">{record.address}</span>
                        </div>
                    </Tooltip>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
        {
            title: "Status",
            key: "status",
            width: 110,
            align: "center",
            render: (_, record) => <StatusPill active={record.is_active} />,
        },
        {
            title: "Joined",
            key: "joined",
            width: 160,
            align: "center",
            responsive: ["md"],
            render: (_, record) => (
                <Tooltip title={formatDate(record.created_at)}>
                    <div className="flex items-center gap-2 justify-center">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <CalendarOutlined className="text-slate-400 text-xs" />
                        </div>
                        <span className="text-sm text-slate-600">{dayjs(record.created_at).format("MMM DD, YYYY")}</span>
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
                                label: <span className="text-sm">View Details</span>,
                                icon: <EyeOutlined />,
                                onClick: () => handleViewGuest(record),
                            },
                            {
                                key: "status",
                                label: <span className="text-sm">{record.is_active ? "Deactivate" : "Activate"}</span>,
                                icon: record.is_active ? <StopOutlined /> : <CheckOutlined />,
                                onClick: () => {
                                    setSelectedUser(record);
                                    setNewStatus(!record.is_active);
                                    setStatusModalVisible(true);
                                },
                            },
                            { type: "divider" },
                            {
                                key: "delete",
                                label: <span className="text-sm">Delete Guest</span>,
                                icon: <DeleteOutlined />,
                                danger: true,
                                onClick: () => { setSelectedUser(record); setDeleteModalVisible(true); },
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

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <TeamOutlined className="text-white text-lg" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Guest Management</h1>
                        </div>
                        <p className="text-sm text-slate-500 ml-13">Manage and monitor all registered guests</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => fetchUsers(true)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                        >
                            <ReloadOutlined className={refreshing ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button
                            // TODO: not yet wired to a real export endpoint — currently a no-op.
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                        >
                            <ExportOutlined />
                            Export
                        </button>
                        <button
                            onClick={() => setFiltersVisible(!filtersVisible)}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm ${filtersVisible
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                        >
                            <FilterOutlined />
                            Filters
                        </button>
                    </div>
                </div>
                <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
            </div>

            {/* ── Filters Panel ───────────────────────────────── */}
            {filtersVisible && (
                <div className="mb-5 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap gap-3">
                        <Select
                            className="min-w-[150px]"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            suffixIcon={<FilterOutlined />}
                        >
                            <Option value="all">All Status</Option>
                            <Option value="active">Active</Option>
                            <Option value="inactive">Inactive</Option>
                        </Select>
                        <Select
                            className="min-w-[180px]"
                            value={verificationFilter}
                            onChange={setVerificationFilter}
                            suffixIcon={<VerifiedOutlined />}
                        >
                            <Option value="all">All Verification</Option>
                            <Option value="verified">Verified Only</Option>
                            <Option value="unverified">Unverified Only</Option>
                        </Select>
                        <Select
                            className="min-w-[160px]"
                            value={sortBy}
                            onChange={setSortBy}
                            suffixIcon={<SortAscendingOutlined />}
                        >
                            <Option value="newest">Newest First</Option>
                            <Option value="oldest">Oldest First</Option>
                            <Option value="name_asc">Name (A–Z)</Option>
                            <Option value="name_desc">Name (Z–A)</Option>
                        </Select>
                    </div>
                </div>
            )}

            {/* ── Stats Grid (row 1: counts) ──────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard
                    title="Total Guests"
                    value={stats.total}
                    subtitle="All registered guests"
                    icon={<TeamOutlined className="text-xl text-indigo-600" />}
                    gradient="bg-indigo-500"
                    iconBg="bg-indigo-50"
                />
                <StatCard
                    title="Active"
                    value={stats.active}
                    subtitle={`${stats.inactive} inactive`}
                    icon={<CheckCircleOutlined className="text-xl text-emerald-600" />}
                    gradient="bg-emerald-500"
                    iconBg="bg-emerald-50"
                />
                <StatCard
                    title="Verified"
                    value={stats.verified}
                    subtitle="Email confirmed"
                    icon={<VerifiedOutlined className="text-xl text-teal-600" />}
                    gradient="bg-teal-500"
                    iconBg="bg-teal-50"
                />
                <StatCard
                    title="New This Month"
                    // ⚠️ current-page-only — see DEBUG NOTE in fetchUsers()
                    value={stats.newThisMonth}
                    subtitle="Current page only"
                    icon={<RiseOutlined className="text-xl text-violet-600" />}
                    gradient="bg-violet-500"
                    iconBg="bg-violet-50"
                />
            </div>

            {/* ── Stats Grid (row 2: revenue / loyalty) ───────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Total Revenue"
                    // ⚠️ current-page-only — see DEBUG NOTE in fetchUsers()
                    value={`₱${stats.totalRevenue.toLocaleString()}`}
                    subtitle="Current page only"
                    icon={<CreditCardOutlined className="text-xl text-emerald-600" />}
                    gradient="bg-emerald-500"
                    iconBg="bg-emerald-50"
                />
                <StatCard
                    title="Avg. Bookings / Guest"
                    value={stats.averageBookings}
                    subtitle="Current page only"
                    icon={<StarOutlined className="text-xl text-amber-600" />}
                    gradient="bg-amber-500"
                    iconBg="bg-amber-50"
                />
                <StatCard
                    title="Loyalty Level"
                    value={loyalty.level}
                    subtitle="Based on page revenue"
                    icon={<TrophyOutlined className="text-xl" style={{ color: loyalty.color }} />}
                    gradient="bg-slate-500"
                    iconBg=""
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
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by name, email, or contact..."
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
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-800 m-0">Guest List</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600">
                        {total} records
                    </span>
                </div>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={users}
                        rowKey="id"
                        className="guests-table"
                        scroll={{ x: 1000 }}
                        pagination={{
                            current: currentPage,
                            total,
                            pageSize: perPage,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} guests`,
                            onChange: (page) => setCurrentPage(page),
                            // NOTE: changing page size resets to page 1 — intentional,
                            // otherwise currentPage could point past the new last page.
                            onShowSizeChange: (_, size) => { setPerPage(size); setCurrentPage(1); },
                        }}
                        locale={{
                            emptyText: (
                                <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                                        <UserOutlined className="text-2xl text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-500">No guests found</p>
                                    <p className="text-sm">Try adjusting your search or filters</p>
                                </div>
                            ),
                        }}
                    />
                </Spin>
            </div>

            {/* ── Status Toggle Modal ──────────────────────────── */}
            <Modal
                title={null}
                open={statusModalVisible}
                onCancel={() => setStatusModalVisible(false)}
                footer={null}
                width={420}
                centered
            >
                <div className="text-center py-4">
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${newStatus ? "bg-emerald-100" : "bg-orange-100"
                        }`}>
                        {newStatus ? (
                            <UserAddOutlined className="text-3xl text-emerald-600" />
                        ) : (
                            <UserDeleteOutlined className="text-3xl text-orange-600" />
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {newStatus ? "Activate Guest" : "Deactivate Guest"}
                    </h3>
                    <p className="text-slate-500 text-sm mb-1">
                        Are you sure you want to {newStatus ? "activate" : "deactivate"}{" "}
                        <span className="font-semibold text-slate-700">
                            {selectedUser?.first_name} {selectedUser?.last_name}
                        </span>?
                    </p>
                    {!newStatus && (
                        <p className="text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mt-3 mx-auto max-w-sm">
                            Deactivated guests cannot log in or make bookings.
                        </p>
                    )}
                    <div className="flex justify-center gap-3 mt-6">
                        <button
                            onClick={() => setStatusModalVisible(false)}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => selectedUser && handleStatusChange(selectedUser, newStatus)}
                            className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all shadow-lg ${newStatus
                                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                    : "bg-orange-500 hover:bg-orange-600 shadow-orange-200"
                                }`}
                        >
                            {newStatus ? "Activate" : "Deactivate"}
                        </button>
                    </div>
                </div>
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
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Guest</h3>
                    <p className="text-slate-500 text-sm mb-2">
                        Are you sure you want to permanently delete{" "}
                        <span className="font-semibold text-slate-700">
                            {selectedUser?.first_name} {selectedUser?.last_name}
                        </span>?
                    </p>
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mx-auto max-w-sm">
                        ⚠️ This action cannot be undone. All associated data will be permanently removed.
                    </p>
                    <div className="flex justify-center gap-3 mt-6">
                        <button
                            onClick={() => setDeleteModalVisible(false)}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => selectedUser && handleDeleteUser(selectedUser)}
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