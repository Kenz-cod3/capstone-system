// Users.tsx - Enhanced design with Tailwind CSS
import { useEffect, useState } from "react";
import api from "@/services/api";
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    StopOutlined,
    PlusOutlined,
    ReloadOutlined,
    FilterOutlined,
    SortAscendingOutlined,
    SearchOutlined,
    MoreOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    TeamOutlined,
    ShopOutlined,
    DollarOutlined,
    CrownOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import {
    Badge,
    Card,
    Input,
    Button,
    Table,
    Tag,
    Avatar,
    Space,
    Select,
    Spin,
    Empty,
    message,
    Modal,
    Dropdown,
    Row,
    Col,
    Typography,
    Divider,
    Tooltip,
    Descriptions,
    Flex,
    Grid,
    Form,
    Input as AntInput,
} from 'antd';
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
    address?: string;
    profile_image?: string;
    role: 'admin' | 'staff' | 'cashier' | 'housekeeper';
    is_active: boolean;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
}

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    administrators: number;
    staffMembers: number;
    cashiers: number;
    housekeepers: number;
}

const roleConfig = {
    admin: {
        color: '#ef4444',
        tailwindBg: 'bg-red-50',
        tailwindText: 'text-red-600',
        tailwindBorder: 'border-red-200',
        tailwindDot: 'bg-red-500',
        icon: <CrownOutlined />,
        label: 'Administrator',
        description: 'Full system access',
        badgeColor: 'red',
        order: 1
    },
    staff: {
        color: '#3b82f6',
        tailwindBg: 'bg-blue-50',
        tailwindText: 'text-blue-600',
        tailwindBorder: 'border-blue-200',
        tailwindDot: 'bg-blue-500',
        icon: <TeamOutlined />,
        label: 'Staff',
        description: 'Manage bookings and operations',
        badgeColor: 'blue',
        order: 2
    },
    cashier: {
        color: '#10b981',
        tailwindBg: 'bg-emerald-50',
        tailwindText: 'text-emerald-600',
        tailwindBorder: 'border-emerald-200',
        tailwindDot: 'bg-emerald-500',
        icon: <DollarOutlined />,
        label: 'Cashier',
        description: 'Handle payments and transactions',
        badgeColor: 'green',
        order: 3
    },
    housekeeper: {
        color: '#f59e0b',
        tailwindBg: 'bg-amber-50',
        tailwindText: 'text-amber-600',
        tailwindBorder: 'border-amber-200',
        tailwindDot: 'bg-amber-500',
        icon: <ShopOutlined />,
        label: 'Housekeeper',
        description: 'Manage room cleaning and maintenance',
        badgeColor: 'orange',
        order: 4
    }
};

const roleOptions = [
    { value: 'admin', label: 'Administrator', icon: <CrownOutlined style={{ color: '#ef4444' }} />, description: 'Full system access' },
    { value: 'staff', label: 'Staff', icon: <TeamOutlined style={{ color: '#3b82f6' }} />, description: 'Manage bookings and operations' },
    { value: 'cashier', label: 'Cashier', icon: <DollarOutlined style={{ color: '#10b981' }} />, description: 'Handle payments and transactions' },
    { value: 'housekeeper', label: 'Housekeeper', icon: <ShopOutlined style={{ color: '#f59e0b' }} />, description: 'Manage room cleaning and maintenance' }
];

// Stat Card Component
const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    gradient,
    iconBg,
}: {
    title: string;
    value: number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
}) => (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm border border-white/60 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group`}>
        {/* Decorative gradient blob */}
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${gradient}`} />
        <div className="relative flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                <p className="text-3xl font-bold text-slate-800 leading-tight">{value.toLocaleString()}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
                {icon}
            </div>
        </div>
    </div>
);

// Role Badge Component
const RoleBadge = ({ role }: { role: keyof typeof roleConfig }) => {
    const config = roleConfig[role];
    if (!config) return <span className="text-slate-400 text-xs">Unknown</span>;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.tailwindBg} ${config.tailwindText} ${config.tailwindBorder}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.tailwindDot}`} />
            {config.label}
        </span>
    );
};

// Status Badge Component
const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${active
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        {active ? 'Active' : 'Inactive'}
    </span>
);

export default function Users() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [allUsers, setAllUsers] = useState<User[]>([]);   // ALL users from API, never paginated
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<boolean>(true);
    const [showFilters, setShowFilters] = useState(false);

    const [form] = Form.useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        administrators: 0,
        staffMembers: 0,
        cashiers: 0,
        housekeepers: 0
    });

    const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

    // Single fetch — grabs ALL users, no server-side pagination
    const fetchUsers = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            else setIsRefreshing(true);

            // API ignores large per_page — loop through every page to collect all users
            let page = 1;
            let collected: User[] = [];
            let lastPage = 1;

            do {
                const resp = await api.get("/users", { params: { page, per_page: 100 } });
                const raw = resp.data;
                const pageItems: User[] = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
                collected = [...collected, ...pageItems];
                lastPage = raw.last_page ?? raw.meta?.last_page ?? 1;
                page++;
            } while (page <= lastPage);

            const all: User[] = collected.filter((u: User) =>
                ['admin', 'staff', 'cashier', 'housekeeper'].includes(u.role?.toLowerCase())
            );

            setAllUsers(all);
            setStats({
                totalUsers: all.length,
                activeUsers: all.filter((u) => u.is_active).length,
                inactiveUsers: all.filter((u) => !u.is_active).length,
                administrators: all.filter((u) => u.role?.toLowerCase() === 'admin').length,
                staffMembers: all.filter((u) => u.role?.toLowerCase() === 'staff').length,
                cashiers: all.filter((u) => u.role?.toLowerCase() === 'cashier').length,
                housekeepers: all.filter((u) => u.role?.toLowerCase() === 'housekeeper').length,
            });
        } catch (error: any) {
            console.error("Error fetching users:", error);
            message.error(error.response?.data?.message || "Failed to load users");
        } finally {
            if (!silent) setIsLoading(false);
            else setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // Client-side filtered + sorted view derived from allUsers
    const displayUsers = (() => {
        let list = [...allUsers];

        // role filter
        if (roleFilter !== 'all') list = list.filter(u => u.role?.toLowerCase() === roleFilter);

        // status filter
        if (statusFilter === 'active') list = list.filter(u => u.is_active);
        else if (statusFilter === 'inactive') list = list.filter(u => !u.is_active);

        // search
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            list = list.filter(u =>
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.contact_number || '').toLowerCase().includes(q)
            );
        }

        // PRIMARY sort: always group by role order → admin, staff, cashier, housekeeper
        const roleOrder: Record<string, number> = { admin: 1, staff: 2, cashier: 3, housekeeper: 4 };
        list.sort((a, b) => {
            const roleDiff = (roleOrder[a.role?.toLowerCase()] ?? 99) - (roleOrder[b.role?.toLowerCase()] ?? 99);
            if (roleDiff !== 0) return roleDiff;

            // SECONDARY sort: user-chosen sort within each role group
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'name_asc') return `${a.first_name}${a.last_name}`.localeCompare(`${b.first_name}${b.last_name}`);
            if (sortBy === 'name_desc') return `${b.first_name}${b.last_name}`.localeCompare(`${a.first_name}${a.last_name}`);
            return 0;
        });

        return list;
    })();

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleCreateUser = async (values: any) => {
        setIsSubmitting(true);
        try {
            await api.post("/users", { ...values, role: values.role?.toLowerCase() });
            message.success("User created successfully");
            setAddModalOpen(false);
            form.resetFields();
            await fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to create user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (values: any) => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        try {
            const updateData: any = {
                first_name: values.first_name,
                last_name: values.last_name,
                email: values.email,
                contact_number: values.contact_number,
                address: values.address,
                role: values.role,
            };
            if (values.password) {
                updateData.password = values.password;
                updateData.password_confirmation = values.password_confirmation;
            }
            await api.put(`/users/${selectedUser.id}`, updateData);
            message.success("User updated successfully");
            setEditModalOpen(false);
            form.resetFields();
            await fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (user: User, status: boolean) => {
        try {
            await api.patch(`/users/${user.id}/status`, { is_active: status });
            message.success(`${user.first_name} ${user.last_name} has been ${status ? 'activated' : 'deactivated'}`);
            await fetchUsers();
            setStatusModalOpen(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const handleDeleteUser = async (user: User) => {
        try {
            await api.delete(`/users/${user.id}`);
            message.success(`${user.first_name} ${user.last_name} has been deleted`);
            await fetchUsers();
            setDeleteModalOpen(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to delete user");
        }
    };

    const getInitials = (firstName: string, lastName: string) =>
        `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

    const avatarColors = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];
    const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    };

    const getAvatarUrl = (user: User) => {
        if (user.profile_image) {
            if (user.profile_image.startsWith('http')) return user.profile_image;
            return `${BASE_URL}/storage/${user.profile_image}`;
        }
        return undefined;
    };

    const columns: ColumnsType<User> = [
        {
            title: 'User',
            key: 'user',
            width: isMobile ? 200 : 300,
            fixed: isMobile ? false : 'left',
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        {getAvatarUrl(record) ? (
                            <img
                                src={getAvatarUrl(record)}
                                alt={record.first_name}
                                className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm"
                            />
                        ) : (
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                style={{ backgroundColor: getAvatarColor(record.first_name) }}
                            >
                                {getInitials(record.first_name, record.last_name)}
                            </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${record.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                            {record.first_name} {record.last_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <RoleBadge role={record.role} />
                            {record.email_verified_at && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                                    <CheckCircleOutlined className="text-xs" />
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Contact',
            key: 'contact',
            responsive: ['md'],
            render: (_, record) => (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <MailOutlined className="text-slate-400 text-xs" />
                        </div>
                        <span className="text-sm text-slate-600 truncate max-w-[200px]">{record.email}</span>
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
            )
        },
        {
            title: 'Status',
            key: 'status',
            width: 110,
            align: 'center',
            render: (_, record) => <StatusBadge active={record.is_active} />
        },
        {
            title: 'Joined',
            key: 'joined',
            width: 160,
            align: 'center',
            responsive: ['md'],
            render: (_, record) => (
                <Tooltip title={formatDate(record.created_at)}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <CalendarOutlined className="text-slate-400 text-xs" />
                        </div>
                        <span className="text-sm text-slate-600">
                            {dayjs(record.created_at).format('MMM DD, YYYY')}
                        </span>
                    </div>
                </Tooltip>
            )
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            align: 'center',
            fixed: isMobile ? false : 'right',
            render: (_, record) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'view',
                                label: <span className="text-sm">View Details</span>,
                                icon: <EyeOutlined />,
                                onClick: () => { setSelectedUser(record); setViewModalOpen(true); }
                            },
                            {
                                key: 'edit',
                                label: <span className="text-sm">Edit User</span>,
                                icon: <EditOutlined />,
                                onClick: () => {
                                    setSelectedUser(record);
                                    form.setFieldsValue({
                                        first_name: record.first_name,
                                        last_name: record.last_name,
                                        email: record.email,
                                        contact_number: record.contact_number,
                                        address: record.address,
                                        role: record.role,
                                    });
                                    setEditModalOpen(true);
                                }
                            },
                            {
                                key: 'status',
                                label: <span className="text-sm">{record.is_active ? 'Deactivate' : 'Activate'}</span>,
                                icon: record.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                                onClick: () => {
                                    setSelectedUser(record);
                                    setNewStatus(!record.is_active);
                                    setStatusModalOpen(true);
                                }
                            },
                            { type: 'divider' },
                            {
                                key: 'delete',
                                label: <span className="text-sm">Delete User</span>,
                                icon: <DeleteOutlined />,
                                danger: true,
                                onClick: () => { setSelectedUser(record); setDeleteModalOpen(true); }
                            }
                        ]
                    }}
                    trigger={['click']}
                >
                    <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
                        <MoreOutlined />
                    </button>
                </Dropdown>
            )
        }
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
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">User Management</h1>
                        </div>
                        <p className="text-sm text-slate-500 ml-13">
                            Manage system users: Administrators, Staff, Cashiers, and Housekeepers
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => fetchUsers(true)}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                        >
                            <ReloadOutlined className={isRefreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm ${showFilters
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                        >
                            <FilterOutlined />
                            Filters
                        </button>
                        <button
                            onClick={() => setAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            <PlusOutlined />
                            Add New User
                        </button>
                    </div>
                </div>
                <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
            </div>

            {/* ── Filters Panel ───────────────────────────────── */}
            {showFilters && (
                <div className="mb-5 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap gap-3">

                        <Select
                            className="min-w-[150px]"
                            value={roleFilter}
                            onChange={(v) => setRoleFilter(v)}
                            placeholder="Filter by Role"
                        >
                            <Option value="all">All Roles</Option>
                            <Option value="admin">Administrators</Option>
                            <Option value="staff">Staff</Option>
                            <Option value="cashier">Cashiers</Option>
                            <Option value="housekeeper">Housekeepers</Option>
                        </Select>

                        <Select
                            className="min-w-[150px]"
                            value={statusFilter}
                            onChange={(v) => setStatusFilter(v)}
                            placeholder="Filter by Status"
                        >
                            <Option value="all">All Status</Option>
                            <Option value="active">Active Users</Option>
                            <Option value="inactive">Inactive Users</Option>
                        </Select>

                        <Select
                            className="min-w-[170px]"
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

            {/* ── Stats Grid ──────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    subtitle="All system users"
                    icon={<TeamOutlined className="text-xl text-indigo-600" />}
                    gradient="bg-indigo-500"
                    iconBg="bg-indigo-50"
                />
                <StatCard
                    title="Active"
                    value={stats.activeUsers}
                    subtitle={`${stats.inactiveUsers} inactive`}
                    icon={<CheckCircleOutlined className="text-xl text-emerald-600" />}
                    gradient="bg-emerald-500"
                    iconBg="bg-emerald-50"
                />
                <StatCard
                    title="Admins"
                    value={stats.administrators}
                    subtitle="Full system access"
                    icon={<CrownOutlined className="text-xl text-red-500" />}
                    gradient="bg-red-500"
                    iconBg="bg-red-50"
                />
                <StatCard
                    title="Staff"
                    value={stats.staffMembers}
                    subtitle="Manage bookings"
                    icon={<TeamOutlined className="text-xl text-blue-600" />}
                    gradient="bg-blue-500"
                    iconBg="bg-blue-50"
                />
                <StatCard
                    title="Cashiers"
                    value={stats.cashiers}
                    subtitle="Handle payments"
                    icon={<DollarOutlined className="text-xl text-emerald-600" />}
                    gradient="bg-emerald-500"
                    iconBg="bg-emerald-50"
                />
                <StatCard
                    title="Housekeeping"
                    value={stats.housekeepers}
                    subtitle="Room maintenance"
                    icon={<ShopOutlined className="text-xl text-amber-600" />}
                    gradient="bg-amber-500"
                    iconBg="bg-amber-50"
                />
            </div>

            {/* ── Search ──────────────────────────────────────── */}
            <div className="mb-5 relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <SearchOutlined className="text-slate-400 text-base" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); }}
                    placeholder="Search users by name, email, or phone number..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                        <CloseOutlined className="text-xs" />
                    </button>
                )}
            </div>

            {/* ── Table Card ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Spin spinning={isLoading}>
                    <Table
                        columns={columns}
                        dataSource={displayUsers}
                        rowKey="id"
                        className="users-table"
                        {...(isMobile ? { scroll: { x: 700 } } : {})}
                        pagination={false}
                        locale={{
                            emptyText: (
                                <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                                        <UserOutlined className="text-2xl text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-500">No users found</p>
                                    <p className="text-sm">Try adjusting your search or filters</p>
                                </div>
                            )
                        }}
                    />
                </Spin>
                {/* Row count footer */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        Showing <span className="font-semibold text-slate-600">{displayUsers.length}</span> of{' '}
                        <span className="font-semibold text-slate-600">{allUsers.length}</span> total users
                    </p>
                    {debouncedSearch || roleFilter !== 'all' || statusFilter !== 'all' ? (
                        <button
                            onClick={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); }}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                        >
                            Clear filters
                        </button>
                    ) : null}
                </div>
            </div>

            {/* ── Create User Modal ────────────────────────────── */}
            <Modal
                title={
                    <div className="flex items-center gap-3 pb-1">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <PlusOutlined className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">Add New User</p>
                            <p className="text-xs text-slate-400 font-normal">Fill in the details below</p>
                        </div>
                    </div>
                }
                open={addModalOpen}
                onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
                footer={null}
                width={560}
                centered
                className="custom-modal"
            >
                <Form form={form} layout="vertical" onFinish={handleCreateUser} className="mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="first_name" label="First Name" rules={[{ required: true, message: 'Required' }]}>
                            <AntInput placeholder="First name" className="rounded-xl" />
                        </Form.Item>
                        <Form.Item name="last_name" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
                            <AntInput placeholder="Last name" className="rounded-xl" />
                        </Form.Item>
                    </div>
                    <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
                        <AntInput placeholder="email@example.com" className="rounded-xl" prefix={<MailOutlined className="text-slate-300" />} />
                    </Form.Item>
                    <Form.Item name="contact_number" label="Phone Number">
                        <AntInput placeholder="+63 900 000 0000" className="rounded-xl" prefix={<PhoneOutlined className="text-slate-300" />} />
                    </Form.Item>
                    <Form.Item name="address" label="Address">
                        <AntInput.TextArea rows={2} placeholder="Enter full address" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="role" label="User Role" rules={[{ required: true, message: 'Please select a role' }]} tooltip="Role determines system access">
                        <Select placeholder="Select user role" className="rounded-xl">
                            {roleOptions.map(role => (
                                <Option key={role.value} value={role.value}>
                                    <div className="flex items-center gap-2">
                                        {role.icon}
                                        <span className="font-medium">{role.label}</span>
                                        <span className="text-slate-400 text-xs">· {role.description}</span>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Min 6 chars' }]}>
                            <AntInput.Password placeholder="••••••••" className="rounded-xl" />
                        </Form.Item>
                        <Form.Item
                            name="password_confirmation"
                            label="Confirm Password"
                            dependencies={['password']}
                            rules={[
                                { required: true, message: 'Required' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                                        return Promise.reject(new Error('Passwords do not match'));
                                    },
                                }),
                            ]}
                        >
                            <AntInput.Password placeholder="••••••••" className="rounded-xl" />
                        </Form.Item>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => { setAddModalOpen(false); form.resetFields(); }}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60 flex items-center gap-2">
                            {isSubmitting ? <ReloadOutlined className="animate-spin" /> : <PlusOutlined />}
                            Create User
                        </button>
                    </div>
                </Form>
            </Modal>

            {/* ── Edit User Modal ──────────────────────────────── */}
            <Modal
                title={
                    <div className="flex items-center gap-3 pb-1">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                            <EditOutlined className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">Edit User</p>
                            <p className="text-xs text-slate-400 font-normal">Update user information</p>
                        </div>
                    </div>
                }
                open={editModalOpen}
                onCancel={() => { setEditModalOpen(false); form.resetFields(); }}
                footer={null}
                width={560}
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleUpdateUser} className="mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="first_name" label="First Name" rules={[{ required: true, message: 'Required' }]}>
                            <AntInput placeholder="First name" className="rounded-xl" />
                        </Form.Item>
                        <Form.Item name="last_name" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
                            <AntInput placeholder="Last name" className="rounded-xl" />
                        </Form.Item>
                    </div>
                    <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
                        <AntInput placeholder="email@example.com" className="rounded-xl" prefix={<MailOutlined className="text-slate-300" />} />
                    </Form.Item>
                    <Form.Item name="contact_number" label="Phone Number">
                        <AntInput placeholder="+63 900 000 0000" className="rounded-xl" prefix={<PhoneOutlined className="text-slate-300" />} />
                    </Form.Item>
                    <Form.Item name="address" label="Address">
                        <AntInput.TextArea rows={2} placeholder="Enter full address" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="role" label="User Role" rules={[{ required: true, message: 'Please select a role' }]}>
                        <Select placeholder="Select user role">
                            {roleOptions.map(role => (
                                <Option key={role.value} value={role.value}>{role.label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                        <p className="text-xs text-slate-500 font-medium mb-3">🔒 Password Change (optional)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="password" label="New Password" style={{ marginBottom: 0 }} tooltip="Leave blank to keep current password">
                                <AntInput.Password placeholder="New password" className="rounded-xl" />
                            </Form.Item>
                            <Form.Item
                                name="password_confirmation"
                                label="Confirm New Password"
                                style={{ marginBottom: 0 }}
                                dependencies={['password']}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!getFieldValue('password') || !value || getFieldValue('password') === value) return Promise.resolve();
                                            return Promise.reject(new Error('Passwords do not match'));
                                        },
                                    }),
                                ]}
                            >
                                <AntInput.Password placeholder="Confirm password" className="rounded-xl" />
                            </Form.Item>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setEditModalOpen(false); form.resetFields(); }}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center gap-2">
                            {isSubmitting ? <ReloadOutlined className="animate-spin" /> : <CheckCircleOutlined />}
                            Save Changes
                        </button>
                    </div>
                </Form>
            </Modal>

            {/* ── View User Modal ──────────────────────────────── */}
            <Modal
                title={
                    selectedUser && (
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {getAvatarUrl(selectedUser) ? (
                                    <img src={getAvatarUrl(selectedUser)} alt={selectedUser.first_name}
                                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100" />
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                                        style={{ backgroundColor: getAvatarColor(selectedUser.first_name) }}>
                                        {getInitials(selectedUser.first_name, selectedUser.last_name)}
                                    </div>
                                )}
                                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${selectedUser.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-lg leading-tight">
                                    {selectedUser.first_name} {selectedUser.last_name}
                                </p>
                                <RoleBadge role={selectedUser.role} />
                            </div>
                        </div>
                    )
                }
                open={viewModalOpen}
                onCancel={() => setViewModalOpen(false)}
                footer={[
                    <button key="close" onClick={() => setViewModalOpen(false)}
                        className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                        Close
                    </button>
                ]}
                width={580}
                centered
            >
                {selectedUser && (
                    <div className="mt-4 space-y-4">
                        {/* Summary Pills */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-xs text-slate-400 mb-2">Role</p>
                                <RoleBadge role={selectedUser.role} />
                                <p className="text-xs text-slate-400 mt-1">{roleConfig[selectedUser.role]?.description}</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-xs text-slate-400 mb-2">Status</p>
                                <StatusBadge active={selectedUser.is_active} />
                            </div>
                            <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-xs text-slate-400 mb-2">Verification</p>
                                {selectedUser.email_verified_at ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                        <CheckCircleOutlined /> Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                        Unverified
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                            {[
                                { icon: <MailOutlined />, label: 'Email', value: selectedUser.email },
                                { icon: <PhoneOutlined />, label: 'Phone', value: selectedUser.contact_number || '—' },
                                { icon: <EnvironmentOutlined />, label: 'Address', value: selectedUser.address || '—' },
                                { icon: <CalendarOutlined />, label: 'Member Since', value: formatDate(selectedUser.created_at) },
                                { icon: <ClockCircleOutlined />, label: 'Last Login', value: selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never' },
                            ].map((item, i, arr) => (
                                <div key={item.label} className={`flex items-start gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-400 text-sm">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                                        <p className="text-sm text-slate-700 mt-0.5">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Status Toggle Modal ──────────────────────────── */}
            <Modal
                title={null}
                open={statusModalOpen}
                onCancel={() => setStatusModalOpen(false)}
                footer={null}
                width={420}
                centered
            >
                <div className="text-center py-4">
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${newStatus ? 'bg-emerald-100' : 'bg-orange-100'
                        }`}>
                        {newStatus
                            ? <CheckCircleOutlined className="text-3xl text-emerald-600" />
                            : <StopOutlined className="text-3xl text-orange-600" />
                        }
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {newStatus ? 'Activate User' : 'Deactivate User'}
                    </h3>
                    <p className="text-slate-500 text-sm mb-1">
                        Are you sure you want to {newStatus ? 'activate' : 'deactivate'}{' '}
                        <span className="font-semibold text-slate-700">
                            {selectedUser?.first_name} {selectedUser?.last_name}
                        </span>?
                    </p>
                    {!newStatus && (
                        <p className="text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mt-3 mx-auto max-w-sm">
                            Deactivated users will not be able to log in or access the system.
                        </p>
                    )}
                    <div className="flex justify-center gap-3 mt-6">
                        <button onClick={() => setStatusModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={() => selectedUser && handleToggleStatus(selectedUser, newStatus)}
                            className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all shadow-lg ${newStatus
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                    : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                                }`}>
                            {newStatus ? 'Activate' : 'Deactivate'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Delete Modal ─────────────────────────────────── */}
            <Modal
                title={null}
                open={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                footer={null}
                width={420}
                centered
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 mx-auto mb-4 flex items-center justify-center">
                        <DeleteOutlined className="text-3xl text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Delete User</h3>
                    <p className="text-slate-500 text-sm mb-2">
                        Are you sure you want to permanently delete{' '}
                        <span className="font-semibold text-slate-700">
                            {selectedUser?.first_name} {selectedUser?.last_name}
                        </span>?
                    </p>
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mx-auto max-w-sm">
                        ⚠️ This action cannot be undone. All associated data will be permanently removed.
                    </p>
                    <div className="flex justify-center gap-3 mt-6">
                        <button onClick={() => setDeleteModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={() => selectedUser && handleDeleteUser(selectedUser)}
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2">
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