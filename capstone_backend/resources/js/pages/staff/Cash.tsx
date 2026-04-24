import React, { useState, useEffect } from "react";
import {
    Form,
    Select,
    InputNumber,
    Button,
    Table,
    Card,
    Space,
    message,
    Spin,
    Typography,
    Tag,
    Popconfirm,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DollarOutlined,
    UndoOutlined,
} from "@ant-design/icons";
import api from "@/services/api";

const { Title, Text } = Typography;
const { Option } = Select;

export default function StaffCash() {
    const [form] = Form.useForm();
    const [amount, setAmount] = useState<number | null>(null);
    const [type, setType] = useState<string>("pay_out");
    const [category, setCategory] = useState<string>("");
    const [categories, setCategories] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<string>("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // 🔥 IMPORTANT PART ONLY (your file already okay, just fix this)
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [catRes, transRes, userRes] = await Promise.all([
                api.get("/cash-categories"),
                api.get("/cash"),
                api.get("/users"),
            ]);

            setCategories(catRes.data);
            setTransactions(transRes.data);

            // 🔥 IMPORTANT FIX (because UserController is paginated)
            setUsers(userRes.data.data);

        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // DEFAULT CATEGORY BASED ON TYPE
    useEffect(() => {
        if (categories.length === 0) return;

        if (type === "pay_in") {
            const c = categories.find((c) => c.name === "deposit");
            if (c) {
                setCategory(c.id);
                form.setFieldValue("category", c.id);
            }
        }

        if (type === "pay_out") {
            const c = categories.find((c) => c.name === "bill");
            if (c) {
                setCategory(c.id);
                form.setFieldValue("category", c.id);
            }
        }

        setSelectedRole("");
        setSelectedUser("");
        form.setFieldValue("selectedRole", "");
        form.setFieldValue("selectedUser", "");
    }, [type, categories, form]);

    const selectedCategory = categories.find((c) => c.id == category);
    const isCashAdvance =
        type === "pay_out" && selectedCategory?.name === "cash advance";

    // SUBMIT / UPDATE
    const handleSubmit = async () => {
        if (!amount || amount <= 0) {
            message.warning("Please enter a valid amount");
            return;
        }

        if (isCashAdvance && !selectedUser) {
            message.warning("Please select a person for cash advance");
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/cash/${editingId}`, {
                    type,
                    amount,
                    category_id: category,
                    recorded_by: selectedUser || null,
                });
                message.success("Transaction updated successfully");
            } else {
                await api.post("/cash", {
                    type,
                    amount,
                    category_id: category,
                    recorded_by: isCashAdvance ? selectedUser : null,
                    description: "Manual entry",
                });
                message.success("Transaction created successfully");
            }
            resetForm();
            fetchAll();
        } catch (err: any) {
            message.error(err.response?.data?.message || "Error saving transaction");
        } finally {
            setSubmitting(false);
        }
    };

    // DELETE TRANSACTION
    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await api.delete(`/cash/${id}`);
            message.success("Transaction deleted successfully");
            fetchAll();
        } catch (err: any) {
            message.error(err.response?.data?.message || "Error deleting transaction");
        } finally {
            setDeletingId(null);
        }
    };

    // EDIT CLICK
    const handleEdit = (record: any) => {
        setEditingId(record.id);
        setType(record.type);
        setCategory(record.category_id);
        setAmount(record.amount);

        form.setFieldsValue({
            type: record.type,
            category: record.category_id,
            amount: record.amount,
        });

        if (record.user) {
            setSelectedRole(record.user.role?.toLowerCase());
            setSelectedUser(record.user.id);
            form.setFieldsValue({
                selectedRole: record.user.role,
                selectedUser: record.user.id,
            });
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setAmount(null);
        setSelectedRole("");
        setSelectedUser("");
        form.resetFields();
        form.setFieldsValue({
            type: "pay_out",
        });
    };

    // TABLE COLUMNS
    const columns = [
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (type: string) => (
                <Tag color={type === "pay_in" ? "green" : "red"}>
                    {type === "pay_in" ? "Deposit" : "Expense"}
                </Tag>
            ),
        },
        {
            title: "Category",
            dataIndex: ["category", "name"],
            key: "category",
            render: (name: string) => name || "-",
        },
        {
            title: "Person",
            key: "person",
            render: (_: any, record: any) => {
                if (record.user) {
                    return `${record.user.first_name} ${record.user.last_name}`;
                }
                return "-";
            },
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            render: (amount: number) => (
                <Text strong style={{ color: amount > 0 ? "#10b981" : "#ef4444" }}>
                    ₱{amount.toLocaleString()}
                </Text>
            ),
        },
        {
            title: "Date",
            dataIndex: "created_at",
            key: "date",
            render: (date: string) => new Date(date).toLocaleString(),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete transaction"
                        description="Are you sure you want to delete this transaction?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingId === record.id}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* FORM CARD - TOP */}
            <Card
                title={
                    <Space>
                        <span>{editingId ? "Edit Transaction" : "New Transaction"}</span>
                    </Space>
                }
                extra={
                    editingId && (
                        <Button
                            type="link"
                            icon={<UndoOutlined />}
                            onClick={resetForm}
                            size="small"
                        >
                            Cancel Edit
                        </Button>
                    )
                }
                style={{ marginBottom: 24 }}
            >
                <Spin spinning={submitting}>
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{ type: "pay_out" }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                            <Form.Item
                                name="type"
                                label="Transaction Type"
                                rules={[{ required: true, message: "Please select type" }]}
                            >
                                <Select onChange={(value) => setType(value)}>
                                    <Option value="pay_in">
                                        Pay In
                                    </Option>
                                    <Option value="pay_out">
                                        Pay Out
                                    </Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="category"
                                label="Category"
                                rules={[{ required: true, message: "Please select category" }]}
                            >
                                <Select
                                    onChange={(value) => setCategory(value)}
                                    loading={categories.length === 0}
                                >
                                    {categories.map((c) => (
                                        <Option key={c.id} value={c.id}>
                                            {c.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="amount"
                                label="Amount"
                                rules={[
                                    { required: true, message: "Please enter amount" },
                                    { type: "number", min: 1, message: "Amount must be at least 1" },
                                ]}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    placeholder="Enter amount"
                                    prefix="₱"
                                    onChange={(value) => setAmount(value as number)}
                                />
                            </Form.Item>
                        </div>

                        {isCashAdvance && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                                <Form.Item name="selectedRole" label="Role">
                                    <Select
                                        onChange={(value) => {
                                            setSelectedRole(value);
                                            setSelectedUser("");
                                        }}
                                    >
                                        <Option value="staff">Staff</Option>
                                        <Option value="housekeeper">Housekeeper</Option>
                                        <Option value="cashier">Cashier</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item name="selectedUser" label="Person">
                                    <Select
                                        onChange={(value) => setSelectedUser(value)}
                                        disabled={!selectedRole}
                                        allowClear
                                        showSearch
                                        optionFilterProp="children"
                                    >
                                        {users
                                            .filter((u) => u.role === selectedRole)
                                            .map((u) => (
                                                <Option key={u.id} value={u.id}>
                                                    {u.first_name} {u.last_name}
                                                </Option>
                                            ))}
                                    </Select>
                                </Form.Item>
                            </div>
                        )}

                        <Form.Item>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleSubmit}
                                loading={submitting}
                                size="large"
                                style={{ minWidth: 200 }}
                            >
                                {editingId ? "Update Transaction" : "Create Transaction"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>

            {/* TABLE CARD - BOTTOM */}
            <Card
                title={
                    <Space>
                        <span>Transactions History</span>
                        <Tag color="blue">{transactions.length} records</Tag>
                    </Space>
                }
            >
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={transactions}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} transactions`,
                        }}
                        scroll={{ x: 800 }}
                    />
                </Spin>
            </Card>
        </div>
    );
}