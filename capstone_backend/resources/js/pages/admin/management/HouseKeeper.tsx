// HouseKeeper.tsx
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
    SearchOutlined,
    MoreOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    TeamOutlined,
    ShopOutlined,
    ToolOutlined,
    RiseOutlined,
    FilterOutlined,
    SortAscendingOutlined
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
    Input as AntInput
} from 'antd';
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

interface HouseKeeper {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
    address?: string;
    profile_image?: string;
    role: 'housekeeper';
    is_active: boolean;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
    // Stats
    rooms_cleaned_today?: number;
    rooms_assigned?: number;
}

interface StatsData {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    onDuty: number;
    offDuty: number;
}

export default function HouseKeeper() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [housekeepers, setHousekeepers] = useState<HouseKeeper[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedHousekeeper, setSelectedHousekeeper] = useState<HouseKeeper | null>(null);
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
        verified: 0,
        onDuty: 0,
        offDuty: 0
    });

    const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

    const fetchHousekeepers = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const params: any = {
                page: currentPage,
                per_page: perPage,
                role: 'housekeeper',
            };

            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (sortBy) params.sort = sortBy;

            const response = await api.get("/users", { params });
            const paginatedData = response.data;
            const usersData = paginatedData.data || [];
            const housekeeperUsers = usersData.filter((user: HouseKeeper) => user.role === 'housekeeper');

            setHousekeepers(housekeeperUsers);
            setLastPage(paginatedData.last_page);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);

            // Calculate stats
            setStats({
                total: housekeeperUsers.length,
                active: housekeeperUsers.filter((u: HouseKeeper) => u.is_active).length,
                inactive: housekeeperUsers.filter((u: HouseKeeper) => !u.is_active).length,
                verified: housekeeperUsers.filter((u: HouseKeeper) => u.email_verified_at).length,
                onDuty: housekeeperUsers.filter((u: HouseKeeper) => u.is_active).length,
                offDuty: housekeeperUsers.filter((u: HouseKeeper) => !u.is_active).length,
            });

        } catch (err: any) {
            console.error("Error fetching housekeepers:", err);
            message.error(err.response?.data?.message || "Failed to load housekeepers");
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const handleAddHousekeeper = async (values: any) => {
        setSubmitting(true);
        try {
            await api.post("/users", {
                ...values,
                role: 'housekeeper',
                password: values.password,
                password_confirmation: values.password_confirmation,
            });
            message.success("Housekeeper added successfully");
            setAddModalVisible(false);
            form.resetFields();
            fetchHousekeepers();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to add housekeeper");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditHousekeeper = async (values: any) => {
        if (!selectedHousekeeper) return;
        setSubmitting(true);
        try {
            const updateData: any = {
                first_name: values.first_name,
                last_name: values.last_name,
                email: values.email,
                contact_number: values.contact_number,
                address: values.address,
            };
            if (values.password) {
                updateData.password = values.password;
                updateData.password_confirmation = values.password_confirmation;
            }
            await api.put(`/users/${selectedHousekeeper.id}`, updateData);
            message.success("Housekeeper updated successfully");
            setEditModalVisible(false);
            form.resetFields();
            fetchHousekeepers();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update housekeeper");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (housekeeper: HouseKeeper, newStatus: boolean) => {
        try {
            await api.patch(`/users/${housekeeper.id}/status`, { is_active: newStatus });
            message.success(`${housekeeper.first_name} ${housekeeper.last_name} has been ${newStatus ? 'activated' : 'deactivated'}`);
            fetchHousekeepers();
            setStatusModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const handleDeleteHousekeeper = async (housekeeper: HouseKeeper) => {
        try {
            await api.delete(`/users/${housekeeper.id}`);
            message.success(`${housekeeper.first_name} ${housekeeper.last_name} has been deleted`);
            fetchHousekeepers();
            setDeleteModalVisible(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to delete housekeeper");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchHousekeepers();
    }, [debouncedSearch, currentPage, statusFilter, sortBy]);

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

    const getAvatarUrl = (housekeeper: HouseKeeper) => {
        if (housekeeper.profile_image) {
            if (housekeeper.profile_image.startsWith('http')) {
                return housekeeper.profile_image;
            }
            return `${BASE_URL}/storage/${housekeeper.profile_image}`;
        }
        return undefined;
    };

    const columns: ColumnsType<HouseKeeper> = [
        {
            title: 'Housekeeper',
            key: 'housekeeper',
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
                            <Tag icon={<ShopOutlined />} color="#f59e0b" style={{ fontSize: 11, margin: 0, borderRadius: 5 }}>
                                House Keeper
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
                                    setSelectedHousekeeper(record);
                                    setViewModalVisible(true);
                                }
                            },
                            {
                                key: 'edit',
                                label: 'Edit',
                                icon: <EditOutlined />,
                                onClick: () => {
                                    setSelectedHousekeeper(record);
                                    form.setFieldsValue({
                                        first_name: record.first_name,
                                        last_name: record.last_name,
                                        email: record.email,
                                        contact_number: record.contact_number,
                                        address: record.address,
                                    });
                                    setEditModalVisible(true);
                                }
                            },
                            {
                                key: 'status',
                                label: record.is_active ? 'Deactivate' : 'Activate',
                                icon: record.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                                onClick: () => {
                                    setSelectedHousekeeper(record);
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
                                    setSelectedHousekeeper(record);
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
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Housekeeping Staff</Title>
                        <Text type="secondary">Manage housekeeping personnel and their assignments</Text>
                    </Flex>
                    <Flex gap={12} wrap="wrap">
                        <Button
                            icon={<ReloadOutlined spin={refreshing} />}
                            onClick={() => fetchHousekeepers(true)}
                            loading={refreshing}
                        >
                            Refresh
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
                            Add Housekeeper
                        </Button>
                        <Button icon={<FilterOutlined />} onClick={() => setFiltersVisible(!filtersVisible)}>
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
                        title="Total Housekeepers"
                        value={stats.total}
                        icon={<TeamOutlined style={{ fontSize: 24, color: '#f59e0b' }} />}
                        color="#f59e0b"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Active"
                        value={stats.active}
                        icon={<CheckCircleOutlined style={{ fontSize: 24, color: '#10b981' }} />}
                        color="#10b981"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="On Duty"
                        value={stats.onDuty}
                        icon={<ToolOutlined style={{ fontSize: 24, color: '#3b82f6' }} />}
                        color="#3b82f6"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Verified"
                        value={stats.verified}
                        icon={<CheckCircleOutlined style={{ fontSize: 24, color: '#14b8a6' }} />}
                        color="#14b8a6"
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
                        dataSource={housekeepers}
                        rowKey="id"
                        {...(isMobile ? { scroll: { x: 700 } } : {})}
                        pagination={{
                            current: currentPage,
                            total: total,
                            pageSize: perPage,
                            showSizeChanger: !isMobile,
                            showQuickJumper: !isMobile,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} housekeepers`,
                            onChange: (page) => setCurrentPage(page),
                            onShowSizeChange: (_, size) => {
                                setPerPage(size);
                                setCurrentPage(1);
                            },
                        }}
                        locale={{
                            emptyText: <Empty description="No housekeepers found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }}
                    />
                </Spin>
            </Card>

            {/* Add Housekeeper Modal */}
            <Modal
                title="Add New Housekeeper"
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
                    onFinish={handleAddHousekeeper}
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
                            Add Housekeeper
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Housekeeper Modal */}
            <Modal
                title="Edit Housekeeper"
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
                    onFinish={handleEditHousekeeper}
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
                            src={selectedHousekeeper ? getAvatarUrl(selectedHousekeeper) : undefined}
                            style={{ 
                                backgroundColor: selectedHousekeeper && !selectedHousekeeper.profile_image ? getRandomColor() : undefined,
                            }}
                            icon={selectedHousekeeper && !selectedHousekeeper.profile_image ? <UserOutlined /> : undefined}
                        >
                            {selectedHousekeeper && !selectedHousekeeper.profile_image && !getAvatarUrl(selectedHousekeeper) && 
                                getInitials(selectedHousekeeper.first_name, selectedHousekeeper.last_name)
                            }
                        </Avatar>
                        <Flex vertical>
                            <Text strong style={{ fontSize: 18 }}>
                                {selectedHousekeeper?.first_name} {selectedHousekeeper?.last_name}
                            </Text>
                            <Text type="secondary">Housekeeper Details</Text>
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
                {selectedHousekeeper && (
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
                                <Tag icon={<ShopOutlined />} color="#f59e0b" style={{ marginTop: 4, borderRadius: 5 }}>
                                    House Keeper
                                </Tag>
                            </Flex>
                            <Divider type="vertical" style={{ height: 40 }} />
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                                <Badge 
                                    status={selectedHousekeeper.is_active ? "success" : "default"} 
                                    text={selectedHousekeeper.is_active ? "Active" : "Inactive"}
                                    style={{ marginTop: 4 }}
                                />
                            </Flex>
                            <Divider type="vertical" style={{ height: 40 }} />
                            <Flex vertical align="center" style={{ flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Verification</Text>
                                {selectedHousekeeper.email_verified_at ? (
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
                                {selectedHousekeeper.email}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><PhoneOutlined /> Contact Number</Space>}>
                                {selectedHousekeeper.contact_number || <Text type="secondary">Not provided</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><EnvironmentOutlined /> Address</Space>}>
                                {selectedHousekeeper.address || <Text type="secondary">Not provided</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><CalendarOutlined /> Member Since</Space>}>
                                {formatDate(selectedHousekeeper.created_at)}
                            </Descriptions.Item>
                            <Descriptions.Item label={<Space><ClockCircleOutlined /> Last Login</Space>}>
                                {selectedHousekeeper.last_login ? formatDate(selectedHousekeeper.last_login) : <Text type="secondary">Never</Text>}
                            </Descriptions.Item>
                        </Descriptions>
                    </>
                )}
            </Modal>

            {/* Status Change Modal */}
            <Modal
                title={newStatus ? 'Activate Housekeeper' : 'Deactivate Housekeeper'}
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
                        onClick={() => selectedHousekeeper && handleStatusChange(selectedHousekeeper, newStatus)}
                    >
                        {newStatus ? 'Activate' : 'Deactivate'}
                    </Button>
                ]}
            >
                <Paragraph>
                    Are you sure you want to {newStatus ? 'activate' : 'deactivate'} <strong>
                        {selectedHousekeeper?.first_name} {selectedHousekeeper?.last_name}
                    </strong>?
                </Paragraph>
                {!newStatus && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Deactivated housekeepers will not be able to log in or receive assignments.
                    </Text>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                title="Delete Housekeeper"
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
                        onClick={() => selectedHousekeeper && handleDeleteHousekeeper(selectedHousekeeper)}
                    >
                        Delete Permanently
                    </Button>
                ]}
            >
                <Paragraph>
                    Are you sure you want to permanently delete <strong>
                        {selectedHousekeeper?.first_name} {selectedHousekeeper?.last_name}
                    </strong>?
                </Paragraph>
                <Text type="danger" style={{ fontSize: 13 }}>
                    This action cannot be undone. All associated data will be removed.
                </Text>
            </Modal>
        </div>
    );
}