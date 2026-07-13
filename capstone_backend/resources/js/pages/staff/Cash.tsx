import React, { useState, useEffect } from "react";
import {
    Form,
    Select,
    InputNumber,
    Space,
    message,
    Spin,
    Table,
    Popconfirm,
} from "antd";
import api from "@/services/api";

const { Option } = Select;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

  .sc-root {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
  }

  .sc-page-header {
    margin-bottom: 32px;
  }

  .sc-page-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #1a1a18;
    margin: 0 0 4px 0;
    letter-spacing: -0.5px;
  }

  .sc-page-subtitle {
    font-size: 13px;
    color: #8a8878;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .sc-card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e8e6df;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
    margin-bottom: 24px;
    overflow: hidden;
  }

  .sc-card-header {
    padding: 22px 28px 20px;
    border-bottom: 1px solid #eeece6;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sc-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a18;
    margin: 0;
  }

  .sc-card-body {
    padding: 28px;
  }

  .sc-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .sc-badge-edit {
    background: #fef3e2;
    color: #c17a00;
    border: 1px solid #fde5b0;
  }

  .sc-badge-new {
    background: #e8f5ee;
    color: #1e7a45;
    border: 1px solid #c3e6d1;
  }

  .sc-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 8px;
  }

  .sc-field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #8a8878;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .sc-segment {
    display: flex;
    background: #eeecea;
    border-radius: 10px;
    padding: 4px;
    gap: 2px;
  }

  .sc-segment-btn {
    flex: 1;
    padding: 9px 12px;
    border: none;
    border-radius: 7px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s ease;
    background: transparent;
    color: #6b6960;
  }

  .sc-segment-btn.active-payin {
    background: #1a1a18;
    color: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }

  .sc-segment-btn.active-payout {
    background: #b54040;
    color: #fff;
    box-shadow: 0 1px 4px rgba(181,64,64,0.25);
  }

  /* Fixed-height select so text is always vertically centred */
  .sc-select,
  .sc-select.ant-select,
  .sc-select.ant-select-single,
  .sc-select .ant-select-selector {
    height: 42px !important;
  }

  .sc-select {
    width: 100%;
  }

  .sc-select .ant-select-selector {
    border-radius: 15px !important;
    border: 1.5px solid #e0ddd6 !important;
    background: #fafaf8 !important;
    height: 42px !important;
    min-height: 42px !important;
    padding: 0 14px !important;
    font-family: 'DM Sans', sans-serif !important;
    font-size: 14px !important;
    color: #1a1a18 !important;
    box-shadow: none !important;
    transition: border-color 0.18s !important;
    display: flex !important;
    align-items: center !important;
  }

  .sc-select.ant-select-single .ant-select-selector .ant-select-selection-search {
    top: 0 !important;
    bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
  }

  .sc-select.ant-select-single .ant-select-selector .ant-select-selection-search-input {
    height: 100% !important;
  }

  .sc-select .ant-select-selector:hover,
  .sc-select.ant-select-focused .ant-select-selector {
    border-color: #3eb489 !important;
    box-shadow: 0 0 0 2px rgba(62,180,137,0.12) !important;
  }

  .sc-select .ant-select-selection-placeholder {
    color: #b0ae9f !important;
    line-height: 40px !important;
  }

  .sc-select .ant-select-selection-item {
    line-height: 40px !important;
    font-weight: 500 !important;
  }

  .sc-select.ant-select-disabled .ant-select-selector {
    background: #f5f5f3 !important;
    color: #c0bdb4 !important;
    border-color: #e8e6df !important;
    cursor: not-allowed !important;
  }

  /* Locked deposit display for pay_in */
  .sc-locked-category {
    display: flex;
    align-items: center;
    height: 42px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1.5px solid #c3e6d1;
    background: #f0faf5;
    color: #1e7a45;
    font-size: 14px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    gap: 8px;
  }

  .sc-locked-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3eb489;
    flex-shrink: 0;
  }

  /* InputNumber */
  .sc-input-number {
    width: 100% !important;
    border-radius: 10px !important;
    border: 1.5px solid #e0ddd6 !important;
    background: #fafaf8 !important;
    height: 42px !important;
    min-height: 42px !important;
    font-family: 'DM Sans', sans-serif !important;
    font-size: 14px !important;
    color: #1a1a18 !important;
    box-shadow: none !important;
    transition: border-color 0.18s !important;
    display: flex !important;
    align-items: center !important;
  }

  .sc-input-number .ant-input-number-handler-wrap {
    display: none !important;
  }

  .sc-input-number:hover,
  .sc-input-number:focus-within {
    border-color: #3eb489 !important;
    box-shadow: 0 0 0 2px rgba(62,180,137,0.12) !important;
  }

  .sc-input-number .ant-input-number-input {
    height: 40px !important;
    padding: 0 14px !important;
    font-weight: 500 !important;
    line-height: 40px !important;
  }

  .sc-input-number .ant-input-number-prefix {
    color: #8a8878 !important;
    font-weight: 600 !important;
    padding-left: 14px !important;
  }

  .sc-divider {
    border: none;
    border-top: 1px solid #eeece6;
    margin: 20px 0;
  }

  .sc-person-section {
    background: #fffdf7;
    border-radius: 12px;
    border: 1.5px dashed #e8d9a0;
    padding: 20px;
    margin-bottom: 20px;
    margin-top: 16px;
  }

  .sc-person-label {
    font-size: 11px;
    font-weight: 600;
    color: #c17a00;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sc-person-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c17a00;
  }

  /* Primary button — mint green */
  .sc-btn-primary {
    height: 44px;
    min-width: 200px;
    border-radius: 10px;
    background: #3eb489;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.18s ease;
    box-shadow: 0 2px 8px rgba(62,180,137,0.28);
    padding: 0 28px;
  }

  .sc-btn-primary:hover:not(:disabled) {
    background: #31a07a;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(62,180,137,0.38);
  }

  .sc-btn-primary:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .sc-btn-cancel {
    height: 32px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1.5px solid #e0ddd6;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #6b6960;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sc-btn-cancel:hover {
    border-color: #1a1a18;
    color: #1a1a18;
  }

  /* Table */
  .sc-table .ant-table {
    font-family: 'DM Sans', sans-serif !important;
    background: transparent !important;
    font-size: 13.5px !important;
  }

  .sc-table .ant-table-thead > tr > th {
    background: #f8f7f4 !important;
    border-bottom: 1px solid #e8e6df !important;
    color: #8a8878 !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    padding: 12px 16px !important;
  }

  .sc-table .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f2f0eb !important;
    padding: 14px 16px !important;
    color: #1a1a18 !important;
    vertical-align: middle !important;
  }

  .sc-table .ant-table-tbody > tr:hover > td {
    background: #f9f8f5 !important;
  }

  .sc-table .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }

  .sc-tag-payin {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    background: #e8f5ee;
    color: #1e7a45;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }

  .sc-tag-payout {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    background: #fdeaea;
    color: #b54040;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }

  .sc-amount-in {
    font-weight: 700;
    color: #1e7a45;
    font-size: 13.5px;
  }

  .sc-amount-out {
    font-weight: 700;
    color: #b54040;
    font-size: 13.5px;
  }

  .sc-action-edit {
    padding: 5px 10px;
    height: auto;
    border-radius: 6px;
    border: 1.5px solid #e0ddd6;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #1a1a18;
    cursor: pointer;
    transition: all 0.14s ease;
    display: inline-flex;
    align-items: center;
  }

  .sc-action-edit:hover {
    background: #1a1a18;
    color: #fff;
    border-color: #1a1a18;
  }

  .sc-action-delete {
    padding: 5px 10px;
    height: auto;
    border-radius: 6px;
    border: 1.5px solid #f0d0d0;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #b54040;
    cursor: pointer;
    transition: all 0.14s ease;
    display: inline-flex;
    align-items: center;
  }

  .sc-action-delete:hover:not(:disabled) {
    background: #b54040;
    color: #fff;
    border-color: #b54040;
  }

  .sc-action-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sc-count-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 12px;
    background: #3eb489;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.04em;
  }

  .sc-table .ant-pagination {
    font-family: 'DM Sans', sans-serif !important;
  }

  .sc-table .ant-pagination-item {
    border-radius: 8px !important;
    border-color: #e0ddd6 !important;
    font-family: 'DM Sans', sans-serif !important;
  }

  .sc-table .ant-pagination-item-active {
    background: #3eb489 !important;
    border-color: #3eb489 !important;
  }

  .sc-table .ant-pagination-item-active a {
    color: #fff !important;
  }
`;

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

    // Auto-set category when type changes
    useEffect(() => {
        if (categories.length === 0) return;

        if (type === "pay_in") {
            // Always lock to "deposit"
            const c = categories.find((c) => c.name === "deposit");
            if (c) { setCategory(c.id); form.setFieldValue("category", c.id); }
        } else {
            // Default pay_out to "bill"
            const c = categories.find((c) => c.name === "bill");
            if (c) { setCategory(c.id); form.setFieldValue("category", c.id); }
        }

        setSelectedRole("");
        setSelectedUser("");
        form.setFieldValue("selectedRole", "");
        form.setFieldValue("selectedUser", "");
    }, [type, categories, form]);

    const selectedCategory = categories.find((c) => c.id == category);
    const isCashAdvance = type === "pay_out" && selectedCategory?.name === "cash advance";

    // Categories available for pay_out (exclude "deposit")
    const payOutCategories = categories.filter((c) => c.name !== "deposit");

    const handleSubmit = async () => {
        if (!amount || amount <= 0) { message.warning("Please enter a valid amount"); return; }
        if (isCashAdvance && !selectedUser) { message.warning("Please select a person for cash advance"); return; }
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/cash/${editingId}`, {
                    type, amount, category_id: category, recorded_by: selectedUser || null,
                });
                message.success("Transaction updated successfully");
            } else {
                await api.post("/cash", {
                    type, amount, category_id: category,
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

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await api.delete(`/cash/${id}`);
            message.success("Transaction deleted successfully");
            fetchAll();
        } catch (err: any) {
            message.error(err.response?.data?.message || "Error deleting transaction");
        } finally { setDeletingId(null); }
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        setType(record.type);
        setCategory(record.category_id);
        setAmount(record.amount);
        form.setFieldsValue({ type: record.type, category: record.category_id, amount: record.amount });
        if (record.user) {
            setSelectedRole(record.user.role?.toLowerCase());
            setSelectedUser(record.user.id);
            form.setFieldsValue({ selectedRole: record.user.role, selectedUser: record.user.id });
        }
    };

    const resetForm = () => {
        setEditingId(null); setAmount(null);
        setSelectedRole(""); setSelectedUser("");
        form.resetFields();
        form.setFieldsValue({ type: "pay_out" });
        setType("pay_out");
    };

    const columns = [
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (t: string) =>
                t === "pay_in"
                    ? <span className="sc-tag-payin">Deposit</span>
                    : <span className="sc-tag-payout">Expense</span>,
        },
        {
            title: "Category",
            dataIndex: ["category", "name"],
            key: "category",
            render: (name: string) => (
                <span style={{ color: "#4a4a42", fontWeight: 500, textTransform: "capitalize" as const }}>
                    {name || "—"}
                </span>
            ),
        },
        {
            title: "Person",
            key: "person",
            render: (_: any, record: any) =>
                record.user
                    ? <span style={{ fontWeight: 500 }}>{record.user.first_name} {record.user.last_name}</span>
                    : <span style={{ color: "#b0ae9f" }}>—</span>,
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            render: (amount: number, record: any) => (
                <span className={record.type === "pay_in" ? "sc-amount-in" : "sc-amount-out"}>
                    {record.type === "pay_in" ? "+" : "-"}₱{Number(amount).toLocaleString()}
                </span>
            ),
        },
        {
            title: "Date",
            dataIndex: "created_at",
            key: "date",
            render: (date: string) => (
                <span style={{ color: "#6b6960", fontSize: 12.5 }}>
                    {new Date(date).toLocaleString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                    })}
                </span>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: any, record: any) => (
                <Space size={6}>
                    <button className="sc-action-edit" onClick={() => handleEdit(record)}>
                        Edit
                    </button>
                    <Popconfirm
                        title="Delete this transaction?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <button className="sc-action-delete" disabled={deletingId === record.id}>
                            {deletingId === record.id ? "Deleting..." : "Delete"}
                        </button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <style>{styles}</style>
            <div className="sc-root">
                {/* Page Header */}
                <div
                    className="sc-page-header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                    }}
                >
                    <div>
                        <h1 className="sc-page-title">
                            Cash Management
                        </h1>

                        <p className="sc-page-subtitle">
                            Record and track all cash transactions
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="sc-card">
                    <div className="sc-card-header">
                        <h2 className="sc-card-title">
                            {editingId ? "Edit Transaction" : "New Transaction"}
                        </h2>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className={editingId ? "sc-badge sc-badge-edit" : "sc-badge sc-badge-new"}>
                                {editingId ? "Editing" : "New Entry"}
                            </span>
                            {editingId && (
                                <button className="sc-btn-cancel" onClick={resetForm}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="sc-card-body">
                        <Spin spinning={submitting}>
                            <Form form={form} layout="vertical" initialValues={{ type: "pay_out" }}>

                                {/* Transaction Type Segment */}
                                <div style={{ marginBottom: 20 }}>
                                    <span className="sc-field-label">Transaction Type</span>
                                    <div className="sc-segment">
                                        <button
                                            type="button"
                                            className={`sc-segment-btn ${type === "pay_in" ? "active-payin" : ""}`}
                                            onClick={() => { setType("pay_in"); form.setFieldValue("type", "pay_in"); }}
                                        >
                                            Pay In
                                        </button>
                                        <button
                                            type="button"
                                            className={`sc-segment-btn ${type === "pay_out" ? "active-payout" : ""}`}
                                            onClick={() => { setType("pay_out"); form.setFieldValue("type", "pay_out"); }}
                                        >
                                            Pay Out
                                        </button>
                                    </div>
                                </div>

                                <div className="sc-form-grid">
                                    {/* Category */}
                                    <div>
                                        <span className="sc-field-label">Category</span>
                                        {type === "pay_in" ? (
                                            /* Pay In — locked to Deposit, no dropdown */
                                            <div className="sc-locked-category">
                                                <span className="sc-locked-dot" />
                                                Deposit
                                            </div>
                                        ) : (
                                            /* Pay Out — full dropdown excluding deposit */
                                            <Form.Item
                                                name="category"
                                                style={{ margin: 0 }}
                                                rules={[{ required: true, message: "Please select category" }]}
                                            >
                                                <Select
                                                    className="sc-select"
                                                    onChange={(value) => setCategory(value)}
                                                    loading={categories.length === 0}
                                                    placeholder="Select category"
                                                    style={{ width: "100%" }}
                                                >
                                                    {payOutCategories.map((c) => (
                                                        <Option key={c.id} value={c.id}>{c.name}</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        )}
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <span className="sc-field-label">Amount</span>
                                        <Form.Item
                                            name="amount"
                                            style={{ margin: 0 }}
                                            rules={[
                                                { required: true, message: "Please enter amount" },
                                                { type: "number", min: 1, message: "Amount must be at least 1" },
                                            ]}
                                        >
                                            <InputNumber
                                                className="sc-input-number"
                                                placeholder="0.00"
                                                prefix="₱"
                                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                parser={(value) => value!.replace(/,/g, "") as any}
                                                onChange={(value) => setAmount(value as number)}
                                            />
                                        </Form.Item>
                                    </div>
                                </div>

                                {/* Cash Advance — assign person */}
                                {isCashAdvance && (
                                    <div className="sc-person-section">
                                        <div className="sc-person-label">
                                            <span className="sc-person-dot" />
                                            Cash Advance — Assign Person
                                        </div>
                                        <div className="sc-form-grid">
                                            <div>
                                                <span className="sc-field-label">Role</span>
                                                <Form.Item name="selectedRole" style={{ margin: 0 }}>
                                                    <Select
                                                        className="sc-select"
                                                        placeholder="Select role"
                                                        onChange={(value) => {
                                                            setSelectedRole(value);
                                                            setSelectedUser("");
                                                            form.setFieldValue("selectedUser", undefined);
                                                        }}
                                                        style={{ width: "100%" }}
                                                    >
                                                        <Option value="staff">Staff</Option>
                                                        <Option value="housekeeper">Housekeeper</Option>
                                                        <Option value="cashier">Cashier</Option>
                                                    </Select>
                                                </Form.Item>
                                            </div>
                                            <div>
                                                <span className="sc-field-label">Person</span>
                                                <Form.Item name="selectedUser" style={{ margin: 0 }}>
                                                    <Select
                                                        className="sc-select"
                                                        placeholder="Select person"
                                                        onChange={(value) => setSelectedUser(value)}
                                                        disabled={!selectedRole}
                                                        allowClear
                                                        showSearch
                                                        optionFilterProp="children"
                                                        style={{ width: "100%" }}
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
                                        </div>
                                    </div>
                                )}

                                <hr className="sc-divider" />

                                <button
                                    type="button"
                                    className="sc-btn-primary"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? (editingId ? "Updating..." : "Creating...")
                                        : (editingId ? "Update Transaction" : "Create Transaction")}
                                </button>
                            </Form>
                        </Spin>
                    </div>
                </div>

                {/* Table Card */}
                <div className="sc-card">
                    <div className="sc-card-header">
                        <h2 className="sc-card-title">Transaction History</h2>
                        <span className="sc-count-badge">{transactions.length} records</span>
                    </div>
                    <div style={{ padding: "0 0 4px 0" }}>
                        <Spin spinning={loading}>
                            <Table
                                className="sc-table"
                                columns={columns}
                                dataSource={transactions}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `${total} total transactions`,
                                    style: { padding: "16px 24px", margin: 0 },
                                }}
                                // scroll={{ x: 800 }}
                            />
                        </Spin>
                    </div>
                </div>
            </div>
        </>
    );
}