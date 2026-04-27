import { useEffect, useState } from "react";
import api from "@/services/api";
import {
    SearchOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    LeftOutlined,
    RightOutlined,
    ReloadOutlined,
    DownloadOutlined,
    MoreOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    StarOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    CreditCardOutlined,
    TeamOutlined,
    RiseOutlined,
    CalendarOutlined,
    VerifiedOutlined,
    StopOutlined,
    CheckOutlined,
    FilterOutlined,
    SortAscendingOutlined,
    PlusOutlined,
    ExportOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    UserDeleteOutlined,
    UserAddOutlined
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
    Statistic,
    Row,
    Col,
    Typography,
    Divider,
    Tooltip,
    Descriptions,
    Tabs,
    Segmented,
    App,
    theme,
    Flex,
    Grid,
    Drawer,
    Popconfirm,
    Image
} from 'antd';
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { useToken } = theme;
const { useBreakpoint } = Grid;

interface User {
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

interface StatsData {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    newThisMonth: number;
    averageBookings: number;
    totalRevenue: number;
}

export default function Guests() {
    const { token } = useToken();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [newStatus, setNewStatus] = useState<boolean>(true);
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Filters and sorting
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [verificationFilter, setVerificationFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(10);

    const [stats, setStats] = useState<StatsData>({
        total: 0,
        active: 0,
        inactive: 0,
        verified: 0,
        newThisMonth: 0,
        averageBookings: 0,
        totalRevenue: 0
    });

    const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

    const fetchUsers = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const params: any = {
                page: currentPage,
                per_page: perPage,
                role: 'guest',
            };

            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (verificationFilter !== 'all') params.verified = verificationFilter;
            if (sortBy) params.sort = sortBy;

            const response = await api.get("/users", { params });
            const paginatedData = response.data;
            const usersData = paginatedData.data || [];
            const guestUsers = usersData.filter((user: User) => user.role === 'guest');

            setUsers(guestUsers);
            setLastPage(paginatedData.last_page);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);

            // Calculate stats
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const newThisMonth = guestUsers.filter((user: User) =>
                new Date(user.created_at) >= firstDayOfMonth
            ).length;

            const totalRevenue = guestUsers.reduce(
                (sum: number, user: User) => sum + Number(user.total_spent || 0),
                0
            );
            const averageBookings = guestUsers.length > 0
                ? guestUsers.reduce((sum: number, user: User) => sum + (user.total_bookings || 0), 0) / guestUsers.length
                : 0;

            setStats({
                total: paginatedData.total,
                active: guestUsers.filter((u: User) => u.is_active).length,
                inactive: guestUsers.filter((u: User) => !u.is_active).length,
                verified: guestUsers.filter((u: User) => u.email_verified_at).length,
                newThisMonth: newThisMonth,
                averageBookings: Math.round(averageBookings * 10) / 10,
                totalRevenue: totalRevenue
            });


        } catch (err: any) {
            console.error("Error fetching guests:", err);
            message.error(err.response?.data?.message || "Failed to load guests");
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const handleStatusChange = async (user: User, newStatus: boolean) => {
        try {
            await api.patch(`/users/${user.id}/status`, { is_active: newStatus });
            if (newStatus) {
                message.success(`${user.first_name} ${user.last_name} has been activated`);
            } else {
                message.success(`${user.first_name} ${user.last_name} has been deactivated`);
            }
            fetchUsers();
            setStatusModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const handleDeleteUser = async (user: User) => {
        try {
            await api.delete(`/users/${user.id}`);
            message.success(`${user.first_name} ${user.last_name} has been deleted successfully`);
            fetchUsers();
            setDeleteModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to delete user");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchUsers();
    }, [debouncedSearch, currentPage, statusFilter, verificationFilter, sortBy]);

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getRandomColor = () => {
        const colors = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    };

    // Helper function to get avatar URL
    const getAvatarUrl = (user: User) => {
        if (user.profile_image) {
            if (user.profile_image.startsWith('http')) {
                return user.profile_image;
            }
            return `${BASE_URL}/storage/${user.profile_image}`;
        }
        return undefined;
    };

    const columns: ColumnsType<User> = [
        {
            title: 'Guest',
            key: 'guest',
            width: isMobile ? 200 : 280,
            fixed: isMobile ? false : 'left',
            render: (_, record) => (
                <Flex align="center" gap={12}>
                    <Avatar
                        size={44}
                        src={getAvatarUrl(record)}
                        style={{ backgroundColor: !record.profile_image ? getRandomColor() : undefined, flexShrink: 0 }}
                        icon={!record.profile_image ? <UserOutlined /> : undefined}
                    >
                        {!record.profile_image && !getAvatarUrl(record) && getInitials(record.first_name, record.last_name)}
                    </Avatar>
                    <Flex vertical style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 15 }}>
                            {record.first_name} {record.last_name}
                        </Text>
                        <Flex wrap gap={4} style={{ marginTop: 4 }}>
                            {record.email_verified_at && (
                                <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11, margin: 0, borderRadius: 5 }}>
                                    Verified
                                </Tag>
                            )}
                            {record.total_bookings && record.total_bookings > 0 && (
                                <Tag icon={<StarOutlined />} color="gold" style={{ fontSize: 11, margin: 0, borderRadius: 5 }}>
                                    {record.total_bookings} bookings
                                </Tag>
                            )}
                        </Flex>
                    </Flex>
                </Flex>
            )
        },
        {
            title: 'Contact',
            key: 'contact',
            responsive: ['md'],
            render: (_, record) => (
                <Flex vertical gap={4}>
                    <Flex align="center" gap={8}>
                        <MailOutlined style={{ color: token.colorTextSecondary, width: 16 }} />
                        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: true }}>
                            {record.email}
                        </Text>
                    </Flex>
                    {record.contact_number && (
                        <Flex align="center" gap={8}>
                            <PhoneOutlined style={{ color: token.colorTextSecondary, width: 16 }} />
                            <Text style={{ fontSize: 13 }}>{record.contact_number}</Text>
                        </Flex>
                    )}
                </Flex>
            )
        },
        {
            title: 'Address',
            key: 'address',
            responsive: ['lg'],
            render: (_, record) => (
                record.address ? (
                    <Flex align="center" gap={8}>
                        <EnvironmentOutlined style={{ color: token.colorTextSecondary }} />
                        <Text
                            style={{ fontSize: 13 }}
                            ellipsis={{ tooltip: record.address }}
                        >
                            {record.address}
                        </Text>
                    </Flex>
                ) : <Text type="secondary">—</Text>
            )
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Badge
                    status={record.is_active ? "success" : "default"}
                    text={record.is_active ? "Active" : "Inactive"}
                />
            )
        },
        {
            title: 'Joined',
            key: 'joined',
            width: 150,
            responsive: ['md'],
            render: (_, record) => (
                <Tooltip title={formatDate(record.created_at)}>
                    <Flex align="center" gap={8}>
                        <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                        <Text style={{ fontSize: 13 }}>
                            {dayjs(record.created_at).format('MMM DD, YYYY')}
                        </Text>
                    </Flex>
                </Tooltip>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            align: 'center',
            fixed: isMobile ? false : 'right',
            render: (_, record) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'view',
                                label: 'View Details',
                                icon: <EyeOutlined />,
                                onClick: () => {
                                    setSelectedUser(record);
                                    setViewModalVisible(true);
                                }
                            },
                            {
                                key: 'status',
                                label: record.is_active ? 'Deactivate' : 'Activate',
                                icon: record.is_active ? <StopOutlined /> : <CheckOutlined />,
                                onClick: () => {
                                    setSelectedUser(record);
                                    setNewStatus(!record.is_active);
                                    setStatusModalVisible(true);
                                }
                            },
                            { type: 'divider' },
                            {
                                key: 'delete',
                                label: 'Delete',
                                icon: <DeleteOutlined />,
                                danger: true,
                                onClick: () => {
                                    setSelectedUser(record);
                                    setDeleteModalVisible(true);
                                }
                            }
                        ]
                    }}
                    trigger={['click']}
                >
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            )
        }
    ];

    // Filter bar component
    const FilterBar = () => (
        <Flex vertical gap={16}>
            <Flex gap={12} wrap="wrap">
                <Select
                    style={{ width: isMobile ? '100%' : 140 }}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    suffixIcon={<FilterOutlined />}
                >
                    <Option value="all">All Status</Option>
                    <Option value="active">Active</Option>
                    <Option value="inactive">Inactive</Option>
                </Select>
                <Select
                    style={{ width: isMobile ? '100%' : 160 }}
                    value={verificationFilter}
                    onChange={setVerificationFilter}
                    suffixIcon={<VerifiedOutlined />}
                >
                    <Option value="all">All Verification</Option>
                    <Option value="verified">Verified Only</Option>
                    <Option value="unverified">Unverified Only</Option>
                </Select>
                <Select
                    style={{ width: isMobile ? '100%' : 140 }}
                    value={sortBy}
                    onChange={setSortBy}
                    suffixIcon={<SortAscendingOutlined />}
                >
                    <Option value="newest">Newest First</Option>
                    <Option value="oldest">Oldest First</Option>
                    <Option value="name_asc">Name A-Z</Option>
                    <Option value="name_desc">Name Z-A</Option>
                </Select>
            </Flex>
        </Flex>
    );

    // Stat card component with white UI
    const StatCard = ({ title, value, icon, color, trend, prefix = '' }: any) => (
        <Card 
            style={{ 
                borderRadius: 16, 
                height: '100%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #f0f0f0',
                background: '#ffffff',
                transition: 'all 0.3s ease'
            }}
            bodyStyle={{ padding: 20 }}
            hoverable
        >
            <Flex justify="space-between" align="flex-start">
                <Flex vertical gap={6}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>{title}</Text>
                    <Text style={{ fontSize: 30, fontWeight: 600, color: '#1a1a1a' }}>
                        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
                    </Text>
                    {trend && (
                        <Tag color="green" style={{ fontSize: 11, margin: 0, borderRadius: 10, padding: '2px 8px' }}>
                            <RiseOutlined /> {trend}
                        </Tag>
                    )}
                </Flex>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `${color}10`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </div>
            </Flex>
        </Card>
    );

    // Premium white stat card with subtle mint accent
    const PremiumStatCard = ({ title, value, icon, suffix = '' }: any) => (
        <Card 
            style={{ 
                borderRadius: 16, 
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #f0f0f0',
                background: '#ffffff',
                transition: 'all 0.3s ease'
            }} 
            bodyStyle={{ padding: '20px 24px' }}
            hoverable
        >
            <Flex align="center" gap={16}>
                <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: '#10b98110',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </div>
                <Flex vertical style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                        {title}
                    </Text>
                    <Text style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
                        {value}{suffix}
                    </Text>
                </Flex>
            </Flex>
        </Card>
    );

    // Get loyalty level based on total revenue
    const getLoyaltyLevel = () => {
        if (stats.totalRevenue > 50000) return "Platinum";
        if (stats.totalRevenue > 25000) return "Gold";
        if (stats.totalRevenue > 10000) return "Silver";
        return "Bronze";
    };

    // Get loyalty level color
    const getLoyaltyColor = () => {
        const level = getLoyaltyLevel();
        switch (level) {
            case "Platinum": return '#3b82f6';
            case "Gold": return '#d97706';
            case "Silver": return '#6b7280';
            default: return '#cd7f32';
        }
    };

    return (
        <div style={{
            minHeight: 'auto',
            padding: isMobile ? 16 : 24
        }}>
            {/* Header */}
            <Flex vertical gap={16} style={{ marginBottom: 24 }}>
                <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap" gap={16}>
                    <Flex vertical gap={4}>
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: '#1a1a1a' }}>Guest Management</Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>Manage and monitor all registered guests</Text>
                    </Flex>
                    <Flex gap={12} wrap="wrap">
                        <Button
                            icon={<ReloadOutlined spin={refreshing} />}
                            onClick={() => fetchUsers(true)}
                            loading={refreshing}
                            style={{ borderRadius: 10 }}
                        >
                            Refresh
                        </Button>
                        <Button type="primary" icon={<ExportOutlined />} style={{ borderRadius: 10, background: '#10b981', borderColor: '#10b981' }}>
                            Export
                        </Button>
                        <Button 
                            icon={filtersVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} 
                            onClick={() => setFiltersVisible(!filtersVisible)}
                            style={{ borderRadius: 10 }}
                        >
                            Filters
                        </Button>
                    </Flex>
                </Flex>
                <Divider style={{ margin: 0, borderColor: '#e8e8e8' }} />
            </Flex>

            {/* Collapsible Filters */}
            {filtersVisible && (
                <Card 
                    style={{ 
                        marginBottom: 24, 
                        borderRadius: 16,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: '1px solid #f0f0f0',
                        background: '#ffffff'
                    }}
                >
                    <FilterBar />
                </Card>
            )}

            {/* Statistics Grid - White Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Total Guests"
                        value={stats.total}
                        icon={<TeamOutlined style={{ fontSize: 24, color: '#10b981' }} />}
                        color="#10b981"
                        trend="+12%"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Active"
                        value={stats.active}
                        icon={<CheckCircleOutlined style={{ fontSize: 24, color: '#3b82f6' }} />}
                        color="#3b82f6"
                        trend="+8%"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Verified"
                        value={stats.verified}
                        icon={<VerifiedOutlined style={{ fontSize: 24, color: '#14b8a6' }} />}
                        color="#14b8a6"
                        trend="+15%"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="New This Month"
                        value={stats.newThisMonth}
                        icon={<RiseOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />}
                        color="#8b5cf6"
                        trend="+23%"
                    />
                </Col>
            </Row>

            {/* Premium White Stats Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <PremiumStatCard
                        title="Total Revenue"
                        value={`₱${stats.totalRevenue.toLocaleString()}`}
                        icon={<CreditCardOutlined style={{ fontSize: 24, color: '#10b981' }} />}
                    />
                </Col>
                <Col xs={24} md={8}>
                    <PremiumStatCard
                        title="Avg. Bookings/User"
                        value={stats.averageBookings}
                        icon={<StarOutlined style={{ fontSize: 24, color: '#10b981' }} />}
                    />
                </Col>
                <Col xs={24} md={8}>
                    <Card 
                        style={{ 
                            borderRadius: 16, 
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #f0f0f0',
                            background: '#ffffff',
                            transition: 'all 0.3s ease'
                        }} 
                        bodyStyle={{ padding: '20px 24px' }}
                        hoverable
                    >
                        <Flex align="center" gap={16}>
                            <div style={{
                                width: 52,
                                height: 52,
                                borderRadius: 16,
                                background: '#10b98110',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <TrophyOutlined style={{ fontSize: 24, color: getLoyaltyColor() }} />
                            </div>
                            <Flex vertical style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                                    Loyalty Level
                                </Text>
                                <Flex align="center" gap={8}>
                                    <Text style={{ fontSize: 28, fontWeight: 700, color: getLoyaltyColor(), lineHeight: 1.2 }}>
                                        {getLoyaltyLevel()}
                                    </Text>
                                    {stats.totalRevenue === 0 && (
                                        <Tag color="default" style={{ borderRadius: 10 }}>No activity</Tag>
                                    )}
                                </Flex>
                            </Flex>
                        </Flex>
                    </Card>
                </Col>
            </Row>

            {/* Search Bar */}
            <Card 
                style={{ 
                    marginBottom: 24, 
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #f0f0f0',
                    background: '#ffffff'
                }}
            >
                <Search
                    placeholder="Search by name, email, or contact..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                    }}
                />
            </Card>

            {/* Table */}
            <Card 
                style={{ 
                    borderRadius: 16, 
                    overflow: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #f0f0f0',
                    background: '#ffffff'
                }}
            >
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={users}
                        rowKey="id"
                        {...(isMobile ? { scroll: { x: 700 } } : {})}
                        pagination={{
                            current: currentPage,
                            total: total,
                            pageSize: perPage,
                            showSizeChanger: !isMobile,
                            showQuickJumper: !isMobile,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} guests`,
                            onChange: (page) => setCurrentPage(page),
                            onShowSizeChange: (_, size) => {
                                setPerPage(size);
                                setCurrentPage(1);
                            },
                            position: ['bottomCenter']
                        }}
                        locale={{
                            emptyText: <Empty description="No guests found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }}
                    />
                </Spin>
            </Card>

            {/* View Details Modal */}
            <Modal
                title={
                    <Flex align="center" gap={16}>
                        <Avatar
                            size={64}
                            src={selectedUser ? getAvatarUrl(selectedUser) : undefined}
                            style={{ 
                                backgroundColor: selectedUser && !selectedUser.profile_image ? getRandomColor() : undefined,
                                border: `3px solid ${token.colorBorderBg}`,
                                boxShadow: token.boxShadowTertiary
                            }}
                            icon={selectedUser && !selectedUser.profile_image ? <UserOutlined /> : undefined}
                        >
                            {selectedUser && !selectedUser.profile_image && !getAvatarUrl(selectedUser) && 
                                getInitials(selectedUser.first_name, selectedUser.last_name)
                            }
                        </Avatar>
                        <Flex vertical>
                            <Text strong style={{ fontSize: 18 }}>
                                {selectedUser?.first_name} {selectedUser?.last_name}
                            </Text>
                            <Text type="secondary">Guest Details</Text>
                        </Flex>
                    </Flex>
                }
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setViewModalVisible(false)} style={{ borderRadius: 10 }}>
                        Close
                    </Button>
                ]}
                width={650}
                centered
                styles={{ body: { paddingTop: 24 } }}
            >
                {selectedUser && (
                    <>
                        <Flex 
                            justify="space-between" 
                            align="center" 
                            style={{ 
                                background: '#f8fafc',
                                padding: '16px 20px',
                                borderRadius: 16,
                                marginBottom: 24,
                                border: '1px solid #f0f0f0'
                            }}
                        >
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Bookings</Text>
                                <Text strong style={{ fontSize: 24, color: '#10b981' }}>
                                    {selectedUser.total_bookings || 0}
                                </Text>
                            </Flex>
                            <Divider type="vertical" style={{ height: 40, borderColor: '#e8e8e8' }} />
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Spent</Text>
                                <Text strong style={{ fontSize: 24, color: '#10b981' }}>
                                    ₱{(selectedUser.total_spent || 0).toLocaleString()}
                                </Text>
                            </Flex>
                            <Divider type="vertical" style={{ height: 40, borderColor: '#e8e8e8' }} />
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                                <Badge 
                                    status={selectedUser.is_active ? "success" : "default"} 
                                    text={selectedUser.is_active ? "Active" : "Inactive"}
                                />
                            </Flex>
                        </Flex>

                        <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: 500 }}>
                            <Descriptions.Item label={
                                <Space>
                                    <MailOutlined />
                                    Email
                                </Space>
                            }>
                                <Flex align="center" gap={8} wrap="wrap">
                                    {selectedUser.email}
                                    {selectedUser.email_verified_at && (
                                        <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 5 }}>Verified</Tag>
                                    )}
                                </Flex>
                            </Descriptions.Item>
                            <Descriptions.Item label={
                                <Space>
                                    <PhoneOutlined />
                                    Contact Number
                                </Space>
                            }>
                                {selectedUser.contact_number || <Text type="secondary">Not provided</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label={
                                <Space>
                                    <EnvironmentOutlined />
                                    Address
                                </Space>
                            }>
                                {selectedUser.address || <Text type="secondary">Not provided</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label={
                                <Space>
                                    <CalendarOutlined />
                                    Member Since
                                </Space>
                            }>
                                {formatDate(selectedUser.created_at)}
                            </Descriptions.Item>
                            <Descriptions.Item label={
                                <Space>
                                    <ClockCircleOutlined />
                                    Last Login
                                </Space>
                            }>
                                {selectedUser.last_login ? formatDate(selectedUser.last_login) : <Text type="secondary">Never</Text>}
                            </Descriptions.Item>
                        </Descriptions>

                        {(() => {
                            const spent = selectedUser.total_spent || 0;
                            let level = 'Bronze';
                            let color = '#cd7f32';
                            let bgColor = '#fef3c7';
                            if (spent > 50000) {
                                level = 'Platinum';
                                color = '#3b82f6';
                                bgColor = '#dbeafe';
                            } else if (spent > 25000) {
                                level = 'Gold';
                                color = '#d97706';
                                bgColor = '#fef3c7';
                            } else if (spent > 10000) {
                                level = 'Silver';
                                color = '#6b7280';
                                bgColor = '#f3f4f6';
                            }
                            return (
                                <Flex justify="center" style={{ marginTop: 24 }}>
                                    <Tag icon={<TrophyOutlined />} style={{ background: bgColor, borderColor: color, color: color, borderRadius: 12, padding: '4px 12px' }}>
                                        {level} Member
                                    </Tag>
                                </Flex>
                            );
                        })()}
                    </>
                )}
            </Modal>

            {/* Status Change Modal */}
            <Modal
                title={
                    <Flex align="center" gap={8}>
                        {newStatus ? <UserAddOutlined style={{ color: '#10b981' }} /> : <UserDeleteOutlined style={{ color: '#ef4444' }} />}
                        <span>{newStatus ? 'Activate' : 'Deactivate'} Guest</span>
                    </Flex>
                }
                open={statusModalVisible}
                onCancel={() => setStatusModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setStatusModalVisible(false)} style={{ borderRadius: 10 }}>
                        Cancel
                    </Button>,
                    <Button
                        key="confirm"
                        type={newStatus ? "primary" : "default"}
                        danger={!newStatus}
                        onClick={() => selectedUser && handleStatusChange(selectedUser, newStatus)}
                        style={newStatus ? { background: '#10b981', borderColor: '#10b981', borderRadius: 10 } : { borderRadius: 10 }}
                    >
                        {newStatus ? 'Activate' : 'Deactivate'}
                    </Button>
                ]}
            >
                <Paragraph>
                    Are you sure you want to {newStatus ? 'activate' : 'deactivate'} <strong>
                        {selectedUser?.first_name} {selectedUser?.last_name}
                    </strong>?
                </Paragraph>
                {!newStatus && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Deactivated users will not be able to log in or make bookings.
                    </Text>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                title="Delete Guest"
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setDeleteModalVisible(false)} style={{ borderRadius: 10 }}>
                        Cancel
                    </Button>,
                    <Button
                        key="delete"
                        type="primary"
                        danger
                        onClick={() => selectedUser && handleDeleteUser(selectedUser)}
                        style={{ borderRadius: 10 }}
                    >
                        Delete Permanently
                    </Button>
                ]}
            >
                <Paragraph>
                    Are you sure you want to permanently delete <strong>
                        {selectedUser?.first_name} {selectedUser?.last_name}
                    </strong>?
                </Paragraph>
                <Text type="danger" style={{ fontSize: 13 }}>
                    This action cannot be undone. All associated data will be removed.
                </Text>
            </Modal>
        </div>
    );
}