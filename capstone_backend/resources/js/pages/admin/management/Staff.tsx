// Staff.tsx
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
    ExportOutlined,
    FilterOutlined,
    SortAscendingOutlined,
    SearchOutlined,
    MoreOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    TeamOutlined,
    IdcardOutlined,
    ShopOutlined,
    DollarOutlined,
    RiseOutlined
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
    Flex,
    Grid,
    Drawer,
    Form,
    Input as AntInput,
    Switch,
    Tabs
} from 'antd';
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

interface Staff {
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
    // Stats
    total_bookings_handled?: number;
    total_orders_handled?: number;
    total_cash_handled?: number;
}

interface StatsData {
    total: number;
    active: number;
    inactive: number;
    admin: number;
    staff: number;
    cashier: number;
    housekeeper: number;
}

const roleColors: Record<string, string> = {
    admin: '#ef4444',
    staff: '#3b82f6',
    cashier: '#10b981',
    housekeeper: '#f59e0b'
};

const roleIcons: Record<string, React.ReactNode> = {
    admin: <IdcardOutlined />,
    staff: <TeamOutlined />,
    cashier: <DollarOutlined />,
    housekeeper: <ShopOutlined />
};

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    staff: 'Staff',
    cashier: 'Cashier',
    housekeeper: 'House Keeper'
};

export default function Staff() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [staff, setStaff] = useState<Staff[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newStatus, setNewStatus] = useState<boolean>(true);
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Form
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Filters and sorting
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
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
        admin: 0,
        staff: 0,
        cashier: 0,
        housekeeper: 0
    });

    const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

    const fetchStaff = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const params: any = {
                page: currentPage,
                per_page: perPage,
            };

            if (debouncedSearch) params.search = debouncedSearch;
            if (roleFilter !== 'all') params.role_type = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (sortBy) params.sort = sortBy;

            const response = await api.get("/users", { params });

            const paginatedData = response.data;

            // 🔥 SAFE ACCESS (important)
            const usersData = Array.isArray(paginatedData.data)
                ? paginatedData.data
                : [];

            console.log("USERS FROM API:", usersData);

            // 🔥 FIX: normalize role to lowercase
            const staffUsers = usersData.filter((user: Staff) =>
                ['staff', 'cashier', 'housekeeper'].includes(
                    user.role?.toLowerCase()
                )
            );

            setStaff(staffUsers);

            setLastPage(paginatedData.last_page || 1);
            setTotal(paginatedData.total || staffUsers.length);
            setPerPage(paginatedData.per_page || perPage);

            // 🔥 FIX: normalize in stats too
            setStats({
                total: staffUsers.length,
                active: staffUsers.filter((u: Staff) => u.is_active).length,
                inactive: staffUsers.filter((u: Staff) => !u.is_active).length,

                admin: staffUsers.filter((u: Staff) => u.role?.toLowerCase() === 'admin').length,
                staff: staffUsers.filter((u: Staff) => u.role?.toLowerCase() === 'staff').length,
                cashier: staffUsers.filter((u: Staff) => u.role?.toLowerCase() === 'cashier').length,
                housekeeper: staffUsers.filter((u: Staff) => u.role?.toLowerCase() === 'housekeeper').length,
            });

        } catch (err: any) {
            console.error("Error fetching staff:", err);
            message.error(err.response?.data?.message || "Failed to load staff");
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const handleAddStaff = async (values: any) => {
        setSubmitting(true);
        try {
            await api.post("/users", {
                ...values,
                role: values.role?.toLowerCase().replace(/\s/g, ""),
                password: values.password,
                password_confirmation: values.password_confirmation,
            });
            message.success("Staff member added successfully");
            setAddModalVisible(false);
            form.resetFields();
            fetchStaff();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to add staff");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditStaff = async (values: any) => {
        if (!selectedStaff) return;
        setSubmitting(true);
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
            await api.put(`/users/${selectedStaff.id}`, updateData);
            message.success("Staff member updated successfully");
            setEditModalVisible(false);
            form.resetFields();
            fetchStaff();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update staff");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (staff: Staff, newStatus: boolean) => {
        try {
            await api.patch(`/users/${staff.id}/status`, { is_active: newStatus });
            message.success(`${staff.first_name} ${staff.last_name} has been ${newStatus ? 'activated' : 'deactivated'}`);
            fetchStaff();
            setStatusModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const handleDeleteStaff = async (staff: Staff) => {
        try {
            await api.delete(`/users/${staff.id}`);
            message.success(`${staff.first_name} ${staff.last_name} has been deleted`);
            fetchStaff();
            setDeleteModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to delete staff");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchStaff();
    }, [debouncedSearch, currentPage, roleFilter, statusFilter, sortBy]);

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

    const getAvatarUrl = (staff: Staff) => {
        if (staff.profile_image) {
            if (staff.profile_image.startsWith('http')) {
                return staff.profile_image;
            }
            return `${BASE_URL}/storage/${staff.profile_image}`;
        }
        return undefined;
    };

    const columns: ColumnsType<Staff> = [
        {
            title: 'Staff Member',
            key: 'staff',
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
                            <Tag
                                color={roleColors[record.role] || "default"}
                                icon={roleIcons[record.role]}
                                style={{ fontSize: 11, margin: 0, borderRadius: 5 }}
                            >
                                {roleLabels[record.role]}
                            </Tag>
                            {record.email_verified_at && (
                                <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11, margin: 0, borderRadius: 5 }}>
                                    Verified
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
                        <MailOutlined style={{ color: '#666', width: 16 }} />
                        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: true }}>
                            {record.email}
                        </Text>
                    </Flex>
                    {record.contact_number && (
                        <Flex align="center" gap={8}>
                            <PhoneOutlined style={{ color: '#666', width: 16 }} />
                            <Text style={{ fontSize: 13 }}>{record.contact_number}</Text>
                        </Flex>
                    )}
                </Flex>
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
                        <ClockCircleOutlined style={{ color: '#666' }} />
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
                                    setSelectedStaff(record);
                                    setViewModalVisible(true);
                                }
                            },
                            {
                                key: 'edit',
                                label: 'Edit',
                                icon: <EditOutlined />,
                                onClick: () => {
                                    setSelectedStaff(record);
                                    form.setFieldsValue({
                                        first_name: record.first_name,
                                        last_name: record.last_name,
                                        email: record.email,
                                        contact_number: record.contact_number,
                                        address: record.address,
                                        role: record.role,
                                    });
                                    setEditModalVisible(true);
                                }
                            },
                            {
                                key: 'status',
                                label: record.is_active ? 'Deactivate' : 'Activate',
                                icon: record.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                                onClick: () => {
                                    setSelectedStaff(record);
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
                                    setSelectedStaff(record);
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

    const StatCard = ({ title, value, icon, color, trend }: any) => (
        <Card
            style={{
                borderRadius: 12,
                height: '100%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: 'none'
            }}
            bodyStyle={{ padding: 20 }}
        >
            <Flex justify="space-between" align="flex-start">
                <Flex vertical gap={4}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
                    <Text style={{ fontSize: 28, fontWeight: 600 }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </Text>
                    {trend && (
                        <Tag color="green" style={{ fontSize: 11, margin: 0, borderRadius: 5 }}>
                            <RiseOutlined /> {trend}
                        </Tag>
                    )}
                </Flex>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </div>
            </Flex>
        </Card>
    );

    return (
        <div style={{
            minHeight: 'auto',
            background: 'transparent',
            padding: isMobile ? 16 : 24
        }}>
            {/* Header */}
            <Flex vertical gap={16} style={{ marginBottom: 24 }}>
                <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap" gap={16}>
                    <Flex vertical gap={4}>
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Staff Management</Title>
                        <Text type="secondary">Manage hotel staff, cashiers, and housekeepers</Text>
                    </Flex>
                    <Flex gap={12} wrap="wrap">
                        <Button
                            icon={<ReloadOutlined spin={refreshing} />}
                            onClick={() => fetchStaff(true)}
                            loading={refreshing}
                        >
                            Refresh
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
                            Add Staff
                        </Button>
                        <Button icon={filtersVisible ? <FilterOutlined /> : <FilterOutlined />} onClick={() => setFiltersVisible(!filtersVisible)}>
                            Filters
                        </Button>
                    </Flex>
                </Flex>
                <Divider style={{ margin: 0 }} />
            </Flex>

            {/* Filters */}
            {filtersVisible && (
                <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                    <Flex gap={12} wrap="wrap">
                        <Select
                            style={{ width: isMobile ? '100%' : 140 }}
                            value={roleFilter}
                            onChange={setRoleFilter}
                            placeholder="Filter by Role"
                        >
                            <Option value="all">All Roles</Option>
                            <Option value="admin">Admin</Option>
                            <Option value="staff">Staff</Option>
                            <Option value="cashier">Cashier</Option>
                            <Option value="housekeeper">House Keeper</Option>
                        </Select>
                        <Select
                            style={{ width: isMobile ? '100%' : 140 }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            placeholder="Filter by Status"
                        >
                            <Option value="all">All Status</Option>
                            <Option value="active">Active</Option>
                            <Option value="inactive">Inactive</Option>
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
                </Card>
            )}

            {/* Statistics Grid */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Total Staff"
                        value={stats.total}
                        icon={<TeamOutlined style={{ fontSize: 24, color: '#10b981' }} />}
                        color="#10b981"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Active"
                        value={stats.active}
                        icon={<CheckCircleOutlined style={{ fontSize: 24, color: '#3b82f6' }} />}
                        color="#3b82f6"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Cashiers"
                        value={stats.cashier}
                        icon={<DollarOutlined style={{ fontSize: 24, color: '#10b981' }} />}
                        color="#10b981"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="House Keepers"
                        value={stats.housekeeper}
                        icon={<ShopOutlined style={{ fontSize: 24, color: '#f59e0b' }} />}
                        color="#f59e0b"
                    />
                </Col>
            </Row>

            {/* Search Bar */}
            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
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
            <Card style={{ borderRadius: 12, overflow: 'auto' }}>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={staff}
                        rowKey="id"
                        {...(isMobile ? { scroll: { x: 700 } } : {})}
                        pagination={{
                            current: currentPage,
                            total: total,
                            pageSize: perPage,
                            showSizeChanger: !isMobile,
                            showQuickJumper: !isMobile,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} staff`,
                            onChange: (page) => setCurrentPage(page),
                            onShowSizeChange: (_, size) => {
                                setPerPage(size);
                                setCurrentPage(1);
                            },
                        }}
                        locale={{
                            emptyText: <Empty description="No staff found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }}
                    />
                </Spin>
            </Card>

            {/* Add Staff Modal */}
            <Modal
                title="Add New Staff Member"
                open={addModalVisible}
                onCancel={() => {
                    setAddModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={550}
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddStaff}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="first_name"
                                label="First Name"
                                rules={[{ required: true, message: 'Please enter first name' }]}
                            >
                                <AntInput placeholder="Enter first name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="last_name"
                                label="Last Name"
                                rules={[{ required: true, message: 'Please enter last name' }]}
                            >
                                <AntInput placeholder="Enter last name" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <AntInput placeholder="Enter email address" />
                    </Form.Item>

                    <Form.Item
                        name="contact_number"
                        label="Contact Number"
                    >
                        <AntInput placeholder="Enter contact number" />
                    </Form.Item>

                    <Form.Item
                        name="address"
                        label="Address"
                    >
                        <AntInput.TextArea rows={2} placeholder="Enter address" />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select placeholder="Select role">
                            <Option value="staff">Staff</Option>
                            <Option value="cashier">Cashier</Option>
                            <Option value="housekeeper">House Keeper</Option>
                            <Option value="admin">Administrator</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: 'Please enter password' },
                            { min: 6, message: 'Password must be at least 6 characters' }
                        ]}
                    >
                        <AntInput.Password placeholder="Enter password" />
                    </Form.Item>

                    <Form.Item
                        name="password_confirmation"
                        label="Confirm Password"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Please confirm password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Passwords do not match'));
                                },
                            }),
                        ]}
                    >
                        <AntInput.Password placeholder="Confirm password" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={() => setAddModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            Add Staff
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Staff Modal */}
            <Modal
                title="Edit Staff Member"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={550}
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditStaff}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="first_name"
                                label="First Name"
                                rules={[{ required: true, message: 'Please enter first name' }]}
                            >
                                <AntInput placeholder="Enter first name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="last_name"
                                label="Last Name"
                                rules={[{ required: true, message: 'Please enter last name' }]}
                            >
                                <AntInput placeholder="Enter last name" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <AntInput placeholder="Enter email address" />
                    </Form.Item>

                    <Form.Item
                        name="contact_number"
                        label="Contact Number"
                    >
                        <AntInput placeholder="Enter contact number" />
                    </Form.Item>

                    <Form.Item
                        name="address"
                        label="Address"
                    >
                        <AntInput.TextArea rows={2} placeholder="Enter address" />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select placeholder="Select role">
                            <Option value="staff">Staff</Option>
                            <Option value="cashier">Cashier</Option>
                            <Option value="housekeeper">House Keeper</Option>
                            <Option value="admin">Administrator</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="New Password (leave blank to keep current)"
                    >
                        <AntInput.Password placeholder="Enter new password" />
                    </Form.Item>

                    <Form.Item
                        name="password_confirmation"
                        label="Confirm New Password"
                        dependencies={['password']}
                        rules={[
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!getFieldValue('password') || !value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Passwords do not match'));
                                },
                            }),
                        ]}
                    >
                        <AntInput.Password placeholder="Confirm new password" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            Save Changes
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* View Details Modal */}
            <Modal
                title={
                    <Flex align="center" gap={16}>
                        <Avatar
                            size={64}
                            src={selectedStaff ? getAvatarUrl(selectedStaff) : undefined}
                            style={{
                                backgroundColor: selectedStaff && !selectedStaff.profile_image ? getRandomColor() : undefined,
                            }}
                            icon={selectedStaff && !selectedStaff.profile_image ? <UserOutlined /> : undefined}
                        >
                            {selectedStaff && !selectedStaff.profile_image && !getAvatarUrl(selectedStaff) &&
                                getInitials(selectedStaff.first_name, selectedStaff.last_name)
                            }
                        </Avatar>
                        <Flex vertical>
                            <Text strong style={{ fontSize: 18 }}>
                                {selectedStaff?.first_name} {selectedStaff?.last_name}
                            </Text>
                            <Text type="secondary">Staff Details</Text>
                        </Flex>
                    </Flex>
                }
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setViewModalVisible(false)}>
                        Close
                    </Button>
                ]}
                width={600}
                centered
            >
                {selectedStaff && (
                    <>
                        <Flex
                            justify="space-between"
                            align="center"
                            style={{
                                background: '#f5f5f5',
                                padding: '16px 20px',
                                borderRadius: 12,
                                marginBottom: 24
                            }}
                        >
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Role</Text>
                                <Tag
                                    color={roleColors[selectedStaff.role] ?? "default"}
                                    icon={roleIcons[selectedStaff.role]}
                                    style={{ marginTop: 4, borderRadius: 5 }}
                                >
                                    {roleLabels[selectedStaff.role]}
                                </Tag>
                            </Flex>
                            <Divider type="vertical" style={{ height: 40 }} />
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                                <Badge
                                    status={selectedStaff.is_active ? "success" : "default"}
                                    text={selectedStaff.is_active ? "Active" : "Inactive"}
                                    style={{ marginTop: 4 }}
                                />
                            </Flex>
                            <Divider type="vertical" style={{ height: 40 }} />
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Verification</Text>
                                {selectedStaff.email_verified_at ? (
                                    <Tag icon={<CheckCircleOutlined />} color="success" style={{ marginTop: 4, borderRadius: 5 }}>
                                        Verified
                                    </Tag>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>Unverified</Text>
                                )}
                            </Flex>
                        </Flex>

                        <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: 500 }}>
                            <Descriptions.Item label={<Space><MailOutlined /> Email</Space>}>
                                {selectedStaff.email}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><PhoneOutlined /> Contact Number</Space>}>
                                {selectedStaff.contact_number || <Text type="secondary">Not provided</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><EnvironmentOutlined /> Address</Space>}>
                                {selectedStaff.address || <Text type="secondary">Not provided</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><CalendarOutlined /> Member Since</Space>}>
                                {formatDate(selectedStaff.created_at)}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><ClockCircleOutlined /> Last Login</Space>}>
                                {selectedStaff.last_login ? formatDate(selectedStaff.last_login) : <Text type="secondary">Never</Text>}
                            </Descriptions.Item>
                        </Descriptions>
                    </>
                )}
            </Modal>

            {/* Status Change Modal */}
            <Modal
                title={newStatus ? 'Activate Staff' : 'Deactivate Staff'}
                open={statusModalVisible}
                onCancel={() => setStatusModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setStatusModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="confirm"
                        type={newStatus ? "primary" : "default"}
                        danger={!newStatus}
                        onClick={() => selectedStaff && handleStatusChange(selectedStaff, newStatus)}
                    >
                        {newStatus ? 'Activate' : 'Deactivate'}
                    </Button>
                ]}
            >
                <Paragraph>
                    Are you sure you want to {newStatus ? 'activate' : 'deactivate'} <strong>
                        {selectedStaff?.first_name} {selectedStaff?.last_name}
                    </strong>?
                </Paragraph>
                {!newStatus && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Deactivated staff will not be able to log in or perform their duties.
                    </Text>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                title="Delete Staff Member"
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                centered
                footer={[
                    <Button key="cancel" onClick={() => setDeleteModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="delete"
                        type="primary"
                        danger
                        onClick={() => selectedStaff && handleDeleteStaff(selectedStaff)}
                    >
                        Delete Permanently
                    </Button>
                ]}
            >
                <Paragraph>
                    Are you sure you want to permanently delete <strong>
                        {selectedStaff?.first_name} {selectedStaff?.last_name}
                    </strong>?
                </Paragraph>
                <Text type="danger" style={{ fontSize: 13 }}>
                    This action cannot be undone. All associated data will be removed.
                </Text>
            </Modal>
        </div>
    );
}
