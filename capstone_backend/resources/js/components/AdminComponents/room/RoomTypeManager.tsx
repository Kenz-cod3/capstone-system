import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input, Button, message, Table, Popconfirm, Space, Card, Tag, Form, Spin, Alert, Typography, Modal, Select, Divider } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, ArrowLeftOutlined, PlusCircleOutlined } from "@ant-design/icons";
import api from "@/services/api";

const { Title } = Typography;
const { Option } = Select;

interface RoomType {
    id: number;
    type_name: string;
    description: string;
    max_occupancy: number;
    base_price: number;
    short_stay_price: number;
    amenities: Amenity[];
}

interface Amenity {
    id: number;
    name: string;
}

interface RoomTypeManagerProps {
    onClose: () => void;
    onRefresh?: () => void;
}

export default function RoomTypeManager({ onClose, onRefresh }: RoomTypeManagerProps) {
    const queryClient = useQueryClient();
    const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isAmenityModalVisible, setIsAmenityModalVisible] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [form] = Form.useForm();
    const [amenityForm] = Form.useForm();

    // Trigger entrance animation
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 10);
        return () => {
            document.body.style.overflow = 'unset';
            clearTimeout(timer);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const { data: roomTypes = [], isLoading, error, refetch } = useQuery<RoomType[]>({
        queryKey: ["roomTypes"],
        queryFn: async () => {
            const response = await api.get("/room-types");
            return response.data;
        },
    });

    const { data: amenities = [], refetch: refetchAmenities } = useQuery<Amenity[]>({
        queryKey: ["amenities"],
        queryFn: async () => {
            const response = await api.get("/amenities");
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const response = await api.post("/room-types", values);
            return response.data;
        },
        onSuccess: () => {
            message.success("Room type created successfully");
            refetch();
            onRefresh?.();
            handleModalClose();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to create room type");
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: number; values: any }) => {
            const response = await api.put(`/room-types/${id}`, values);
            return response.data;
        },
        onSuccess: () => {
            message.success("Room type updated successfully");
            refetch();
            onRefresh?.();
            handleModalClose();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to update room type");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/room-types/${id}`);
        },
        onSuccess: () => {
            message.success("Room type deleted successfully");
            refetch();
            onRefresh?.();
        },
        onError: (error: any) => {
            if (error.response?.status === 409) {
                message.error("Cannot delete: This room type is in use by existing rooms");
            } else {
                message.error(error.response?.data?.message || "Failed to delete room type");
            }
        },
    });

    // New mutation for creating amenities
    const createAmenityMutation = useMutation({
        mutationFn: async (values: { name: string }) => {
            const response = await api.post("/amenities", values);
            return response.data;
        },
        onSuccess: () => {
            message.success("Amenity created successfully");
            refetchAmenities();
            queryClient.invalidateQueries({ queryKey: ["amenities"] });
            handleAmenityModalClose();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to create amenity");
        },
    });

    const handleSubmit = async (values: any) => {
        try {
            const formatted = {
                type_name: values.type_name,
                description: values.description?.trim() || null,
                max_occupancy: Number(values.max_occupancy),
                base_price: Number(values.base_price),
                short_stay_price:
                    values.short_stay_price !== undefined &&
                    values.short_stay_price !== ""
                        ? Number(values.short_stay_price)
                        : null,
                amenities: values.amenities || [],
            };

            if (editingRoomType) {
                await updateMutation.mutateAsync({
                    id: editingRoomType.id,
                    values: formatted,
                });
            } else {
                await createMutation.mutateAsync(formatted);
            }
        } catch (error: any) {
            message.error(
                error.response?.data?.message || "Failed to save room type."
            );
        }
    };

    const handleEdit = (roomType: RoomType) => {
        setEditingRoomType(roomType);

        form.setFieldsValue({
            type_name: roomType.type_name,
            description: roomType.description,
            max_occupancy: roomType.max_occupancy,
            base_price: roomType.base_price,
            short_stay_price: roomType.short_stay_price,
            amenities:roomType.amenities?.map(a => a.id) || [],
        });

        setIsModalVisible(true);
    };

    const handleCreate = () => {
        setEditingRoomType(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingRoomType(null);
        form.resetFields();
    };

    const handleAmenityModalOpen = () => {
        setIsAmenityModalVisible(true);
        amenityForm.resetFields();
    };

    const handleAmenityModalClose = () => {
        setIsAmenityModalVisible(false);
        amenityForm.resetFields();
    };

    const handleAmenitySubmit = async (values: { name: string }) => {
        try {
            await createAmenityMutation.mutateAsync(values);
        } catch (error) {
            // Error handled in mutation
        }
    };

    const columns = [
        {
            title: "Type Name",
            dataIndex: "type_name",
            key: "type_name",
            sorter: (a: RoomType, b: RoomType) => a.type_name.localeCompare(b.type_name),
        },
        {
            title: "Amenities",
            key: "amenities",
            render: (_: any, record: RoomType) =>
                record.amenities?.length ? (
                    <Tag color="green">
                        {record.amenities.map(a => a.name).join(", ")}
                    </Tag>
                ) : (
                    "-"
                )
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            render: (text: string) => text || "—",
        },
        {
            title: "Max Occupancy",
            dataIndex: "max_occupancy",
            key: "max_occupancy",
            align: "center" as const,
            sorter: (a: RoomType, b: RoomType) => a.max_occupancy - b.max_occupancy,
            render: (value: number) => (
                <Tag color="blue">{value} {value === 1 ? "person" : "persons"}</Tag>
            ),
        },
        {
            title: "Base Price",
            dataIndex: "base_price",
            key: "base_price",
            sorter: (a: RoomType, b: RoomType) => a.base_price - b.base_price,
            render: (value: number) => `₱${value?.toLocaleString()} / night`,
        },
        {
            title: "Short Stay",
            dataIndex: "short_stay_price",
            key: "short_stay_price",
            sorter: (a: RoomType, b: RoomType) => (a.short_stay_price || 0) - (b.short_stay_price || 0),
            render: (value: number | null) =>
                value !== null && value !== undefined
                    ? `₱${value.toLocaleString()} / 3hrs`
                    : "—",
        },
        {
            title: "Actions",
            key: "actions",
            align: "center" as const,
            render: (_: any, record: RoomType) => (
                <Space>
                    <Button
                        type="primary"
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        size="small"
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title={`Delete "${record.type_name}"?`}
                        description="This action cannot be undone."
                        onConfirm={() => deleteMutation.mutate(record.id)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button icon={<DeleteOutlined />} danger size="small">
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <Alert
                        message="Error Loading Data"
                        description={error.message || "Failed to load room types"}
                        type="error"
                        showIcon
                    />
                    <div className="mt-4 flex gap-2 justify-end">
                        <Button onClick={handleClose}>Go Back</Button>
                        <Button onClick={() => refetch()} type="primary">Retry</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <>
            {/* Backdrop with fade animation */}
            <div
                className={`fixed inset-0 bg-black transition-all duration-300 ease-out z-50 ${isVisible ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
                    }`}
                onClick={handleClose}
            />

            {/* Main Panel - Full Screen with slide-up animation */}
            <div
                className={`fixed bottom-0 left-0 right-0 top-0 bg-gray-50 z-50 transition-transform duration-300 ease-out ${isVisible ? 'transform translate-y-0' : 'transform translate-y-full'
                    }`}
                style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm flex-shrink-0">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <Button
                                    type="text"
                                    icon={<ArrowLeftOutlined />}
                                    onClick={handleClose}
                                    className="hover:bg-gray-100"
                                    size="large"
                                >
                                    Back to Rooms
                                </Button>
                                <div className="h-6 w-px bg-gray-300"></div>
                                <Title level={4} className="!mb-0 text-gray-800">
                                    Management Room Types
                                </Title>
                            </div>
                            <div className="flex items-center gap-3">
                                <Tag color="purple" className="text-sm px-3 py-1">
                                    Total: {roomTypes.length} types
                                </Tag>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 lg:px-8 py-6">
                        <Spin spinning={isLoading}>
                            <div className="space-y-6 max-w-7xl mx-auto">
                                {/* Room Types List */}
                                <Card
                                    className="shadow-sm"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-semibold">Room Types List</span>
                                            <Tag color="blue">{roomTypes.length} total</Tag>
                                        </div>
                                    }
                                    extra={
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={handleCreate}
                                            size="middle"
                                        >
                                            Add Room Type
                                        </Button>
                                    }
                                >
                                    <Table
                                        columns={columns}
                                        dataSource={roomTypes}
                                        rowKey="id"
                                        loading={isLoading}
                                        pagination={{
                                            pageSize: 10,
                                            showSizeChanger: true,
                                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                                            pageSizeOptions: ['10', '20', '50', '100']
                                        }}
                                        size="middle"
                                        scroll={{ x: 800 }}
                                        bordered
                                    />
                                </Card>
                            </div>
                        </Spin>
                    </div>
                </div>
            </div>

            {/* Create/Edit Room Type Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        {editingRoomType ? (
                            <EditOutlined className="text-blue-500" />
                        ) : (
                            <PlusOutlined className="text-green-500" />
                        )}
                        <span className="text-lg font-semibold">
                            {editingRoomType ? "Edit Room Type" : "Create New Room Type"}
                        </span>
                    </div>
                }
                open={isModalVisible}
                onCancel={handleModalClose}
                width={700}
                footer={null}
                maskClosable={false}
                destroyOnClose
                className="room-type-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className="mt-4"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <Form.Item
                            name="type_name"
                            label="Room Type Name"
                            rules={[
                                { required: true, message: "Please enter room type name" },
                                { min: 2, message: "At least 2 characters" },
                                { max: 50, message: "Max 50 characters" },
                            ]}
                        >
                            <Input
                                placeholder="e.g. Standard, Deluxe, Suite"
                                size="large"
                                autoFocus
                            />
                        </Form.Item>

                        <Form.Item
                            name="max_occupancy"
                            label="Maximum Occupancy"
                            rules={[
                                { required: true, message: "Please enter max occupancy" },
                                {
                                    validator: (_, value) => {
                                        const num = Number(value);
                                        if (!value && value !== 0) return Promise.reject("Required");
                                        if (num < 1) return Promise.reject("Must be at least 1");
                                        if (num > 20) return Promise.reject("Maximum is 20");
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <Input
                                type="number"
                                placeholder="Number of persons"
                                min={1}
                                max={20}
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="base_price"
                            label="Base Price (Overnight)"
                            rules={[
                                { required: true, message: "Please enter base price" },
                                {
                                    validator: (_, value) => {
                                        const num = Number(value);
                                        if (!value && value !== 0) return Promise.reject("Required");
                                        if (num < 0) return Promise.reject("Price must be positive");
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <Input
                                type="number"
                                placeholder="Price per night"
                                prefix="₱"
                                min={0}
                                step={100}
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="short_stay_price"
                            label="Short Stay Price (3 hours)"
                            rules={[
                                { required: true, message: "Please enter short stay price" },
                                {
                                    validator: (_, value) => {
                                        const num = Number(value);
                                        if (!value && value !== 0) return Promise.reject("Required");
                                        if (num < 0) return Promise.reject("Price must be positive");
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <Input
                                type="number"
                                placeholder="Price for 3 hours"
                                prefix="₱"
                                min={0}
                                step={50}
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="amenities"
                            label="Amenities"
                            rules={[
                                { required: true, message: "Please select at least one amenity" },
                            ]}
                            className="md:col-span-2"
                        >
                            <Select
                                mode="multiple"
                                placeholder="Select amenities"
                                size="large"
                                optionFilterProp="children"
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Button
                                            type="text"
                                            icon={<PlusCircleOutlined />}
                                            onClick={handleAmenityModalOpen}
                                            style={{ width: '100%', textAlign: 'left' }}
                                        >
                                            Add New Amenity
                                        </Button>
                                    </>
                                )}
                            >
                                {amenities.map((amenity) => (
                                    <Option key={amenity.id} value={amenity.id}>
                                        {amenity.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item name="description" label="Description" className="md:col-span-2">
                            <Input.TextArea
                                rows={3}
                                placeholder="Describe the room type features and amenities..."
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                        <Button
                            onClick={handleModalClose}
                            size="large"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={editingRoomType ? <SaveOutlined /> : <PlusOutlined />}
                            loading={createMutation.isPending || updateMutation.isPending}
                            size="large"
                        >
                            {editingRoomType ? "Update Room Type" : "Create Room Type"}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Create Amenity Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <PlusCircleOutlined className="text-green-500" />
                        <span className="text-lg font-semibold">Add New Amenity</span>
                    </div>
                }
                open={isAmenityModalVisible}
                onCancel={handleAmenityModalClose}
                width={500}
                footer={null}
                maskClosable={false}
                destroyOnClose
            >
                <Form
                    form={amenityForm}
                    layout="vertical"
                    onFinish={handleAmenitySubmit}
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label="Amenity Name"
                        rules={[
                            { required: true, message: "Please enter amenity name" },
                            { min: 2, message: "At least 2 characters" },
                            { max: 255, message: "Max 255 characters" },
                        ]}
                    >
                        <Input
                            placeholder="e.g. Free WiFi, Air Conditioning, TV"
                            size="large"
                            autoFocus
                        />
                    </Form.Item>

                    <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                        <Button
                            onClick={handleAmenityModalClose}
                            size="large"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<PlusOutlined />}
                            loading={createAmenityMutation.isPending}
                            size="large"
                        >
                            Add Amenity
                        </Button>
                    </div>
                </Form>
            </Modal>
        </>
    );
}