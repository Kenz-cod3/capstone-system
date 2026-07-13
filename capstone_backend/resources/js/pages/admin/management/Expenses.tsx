// expenses.tsx
import React, { useState, useEffect } from "react";
import {
    Table,
    Select,
    message,
    Spin,
    DatePicker,
    Row,
    Col,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import api from "@/services/api";

const { RangePicker } = DatePicker;

interface Category {
    id: number;
    name: string;
}

interface Transaction {
    id: number;
    type: string;
    amount: number;
    category_id: number;
    category?: Category;
    user?: {
        id: number;
        first_name: string;
        last_name: string;
        role?: string;
    };
    description?: string;
    created_at: string;
}

export default function ExpensesPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalExpenses, setTotalExpenses] = useState<number>(0);
    const [totalDeposits, setTotalDeposits] = useState<number>(0);

    const fetchCategories = async () => {
        try {
            const res = await api.get("/cash-categories");
            const cats = (res.data || []);
            setCategories(cats);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to fetch categories");
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get("/cash");
            const allTransactions = (res.data || []);
            setTransactions(allTransactions);
            setFilteredTransactions(allTransactions);
            calculateTotals(allTransactions);
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to fetch transactions");
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (data: Transaction[]) => {
        const expenses = data
            .filter((t) => t.type === "pay_out")
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const deposits = data
            .filter((t) => t.type === "pay_in")
            .reduce((sum, t) => sum + Number(t.amount), 0);
        setTotalExpenses(expenses);
        setTotalDeposits(deposits);
    };

    const isDateInRange = (dateStr: string, startDate: Dayjs | null, endDate: Dayjs | null): boolean => {
        if (!startDate || !endDate) return true;

        const date = dayjs(dateStr);
        const start = startDate.startOf('day');
        const end = endDate.endOf('day');

        return (date.isAfter(start) && date.isBefore(end)) ||
            date.isSame(start) ||
            date.isSame(end);
    };

    const applyFilters = () => {
        let filtered = [...transactions];

        if (selectedCategory) {
            filtered = filtered.filter(
                (t) => t.category_id === parseInt(selectedCategory)
            );
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
            filtered = filtered.filter((t) =>
                isDateInRange(t.created_at, dateRange[0], dateRange[1])
            );
        }

        setFilteredTransactions(filtered);
        calculateTotals(filtered);
    };

    const resetFilters = () => {
        setSelectedCategory(null);
        setDateRange(null);
        setFilteredTransactions(transactions);
        calculateTotals(transactions);
    };

    const handleCategoryChange = (value: string | null) => {
        setSelectedCategory(value);
    };

    const handleDateRangeChange = (
        dates: [Dayjs | null, Dayjs | null] | null
    ) => {
        setDateRange(dates);
    };

    useEffect(() => {
        fetchCategories();
        fetchTransactions();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [selectedCategory, dateRange]);

    const columns = [
        {
            title: "Date & Time",
            dataIndex: "created_at",
            key: "date",
            render: (date: string) => (
                <span style={{ color: "#6b6960", fontSize: 12.5 }}>
                    {dayjs(date).format("MMM DD, YYYY • hh:mm A")}
                </span>
            ),
        },
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (type: string) => (
                type === "pay_in" 
                    ? <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-emerald-50 text-emerald-700">Deposit</span>
                    : <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-amber-50 text-amber-700">Expense</span>
            ),
        },
        {
            title: "Category",
            dataIndex: ["category", "name"],
            key: "category",
            render: (name: string, record: Transaction) => (
                record.type === "pay_in"
                    ? <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-emerald-50 text-emerald-700">{name || "Deposit"}</span>
                    : <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-amber-50 text-amber-700">{name || "—"}</span>
            ),
        },
        {
            title: "Person",
            key: "person",
            render: (_: any, record: Transaction) => {
                if (record.user) {
                    return (
                        <span className="font-medium text-gray-800">
                            {record.user.first_name} {record.user.last_name}
                        </span>
                    );
                }
                if (record.category?.name === "cash advance" && record.type === "pay_out") {
                    return <span className="text-gray-400">Unassigned</span>;
                }
                return <span className="text-gray-400">—</span>;
            },
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            render: (desc: string) => (
                <span className="text-gray-500 text-[13px]">
                    {desc || "Manual entry"}
                </span>
            ),
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            align: "right" as const,
            render: (amount: number, record: Transaction) => (
                record.type === "pay_in"
                    ? <span className="font-bold text-emerald-600 text-sm">+₱{Number(amount).toLocaleString()}</span>
                    : <span className="font-bold text-rose-600 text-sm">-₱{Number(amount).toLocaleString()}</span>
            ),
        },
    ];

    const netTotal = totalDeposits - totalExpenses;

    return (
        <div className="min-h-screen font-['DM_Sans',sans-serif]">
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-gray-900 mb-1 tracking-tight">Cash Transactions</h1>
                <p className="text-[13px] text-stone-500 font-normal">Track and monitor all cash deposits and expenses</p>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[150px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                            <span>Total Deposits</span>
                        </div>
                        <div className="text-[32px] font-bold text-emerald-700 m-0">₱{totalDeposits.toLocaleString()}</div>
                        <div className="text-xs text-stone-600 mt-2">{transactions.filter(t => t.type === "pay_in").length} deposit(s)</div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[150px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                            <span>Total Expenses</span>
                        </div>
                        <div className="text-[32px] font-bold text-rose-600 m-0">₱{totalExpenses.toLocaleString()}</div>
                        <div className="text-xs text-stone-600 mt-2">{transactions.filter(t => t.type === "pay_out").length} expense(s)</div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[150px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                            <span>Net Balance</span>
                        </div>
                        <div className={`text-[32px] font-bold m-0 ${netTotal >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            ₱{Math.abs(netTotal).toLocaleString()}
                        </div>
                        <div className="text-xs text-stone-600 mt-2">{dateRange ? "Filtered period" : "All time"}</div>
                    </div>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[150px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                            <span>Date Range</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            {dateRange && dateRange[0] && dateRange[1]
                                ? `${dateRange[0].format("MMM DD")} - ${dateRange[1].format("MMM DD, YYYY")}`
                                : "All Time"}
                        </div>
                        <div className="text-xs text-stone-600 mt-2">{dateRange ? "Filtered period" : "Showing all records"}</div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[150px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                            <span>Categories</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            {selectedCategory
                                ? categories.find(c => c.id === parseInt(selectedCategory))?.name || "Selected"
                                : "All Categories"}
                        </div>
                        <div className="text-xs text-stone-600 mt-2">{categories.length} available categories</div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[150px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                            <span>Total Records</span>
                        </div>
                        <div className="text-[28px] font-bold text-gray-900">{filteredTransactions.length}</div>
                        <div className="text-xs text-stone-600 mt-2">Transactions found</div>
                    </div>
                </Col>
            </Row>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-6 overflow-hidden">
                <div className="px-7 py-5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-base font-semibold text-gray-900 m-0">Transaction History</h2>
                    {/* <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl bg-rose-600 text-white text-[11px] font-semibold tracking-wide">
                        {filteredTransactions.length} records
                    </span> */}
                </div>

                <div className="p-7">
                    <div className="flex flex-wrap gap-4 items-end mb-6">
                        <div className="flex-1 min-w-[160px]">
                            <div className="block text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2">Category</div>
                            <Select
                                className="expenses-select w-full"
                                placeholder="All Categories"
                                value={selectedCategory}
                                onChange={handleCategoryChange}
                                allowClear
                                style={{ width: "100%" }}
                            >
                                {categories.map((c) => (
                                    <Select.Option key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>

                        <div className="flex-1 min-w-[160px]">
                            <div className="block text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2">Date Range</div>
                            <RangePicker
                                className="expenses-datepicker w-full"
                                value={dateRange}
                                onChange={handleDateRangeChange}
                                format="MMM DD, YYYY"
                                placeholder={["Start Date", "End Date"]}
                            />
                        </div>

                        <div className="flex-none">
                            <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 invisible">Reset</div>
                            <button className="h-[42px] px-5 rounded-lg border border-stone-200 bg-transparent text-sm font-medium text-stone-500 cursor-pointer transition-all duration-150 hover:border-gray-900 hover:text-gray-900 hover:bg-stone-50" onClick={resetFilters}>
                                Reset Filters
                            </button>
                        </div>
                    </div>

                    <Spin spinning={loading}>
                        {filteredTransactions.length === 0 && !loading ? (
                            <div className="text-center py-[60px] px-5 text-stone-400">
                                <div className="text-5xl mb-4">📋</div>
                                <div className="text-sm font-medium text-stone-500">No transaction records found</div>
                                <div className="text-xs text-stone-400 mt-2">Try adjusting your filters</div>
                            </div>
                        ) : (
                            <Table
                                className="expenses-table"
                                columns={columns}
                                dataSource={filteredTransactions}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `${total} total transactions`,
                                    style: { padding: "16px 0 0 0", margin: 0 },
                                }}
                                // scroll={{ x: 900 }}
                            />
                        )}
                    </Spin>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
                
                * {
                    font-family: 'DM Sans', sans-serif;
                }
                
                .expenses-select.ant-select,
                .expenses-select.ant-select-single,
                .expenses-select .ant-select-selector {
                    height: 42px !important;
                }
                
                .expenses-select .ant-select-selector {
                    border-radius: 15px !important;
                    border: 1.5px solid #e0ddd6 !important;
                    background: #fafaf8 !important;
                    height: 42px !important;
                    min-height: 42px !important;
                    padding: 0 14px !important;
                    font-size: 14px !important;
                    color: #1a1a18 !important;
                    display: flex !important;
                    align-items: center !important;
                }
                
                .expenses-select .ant-select-selection-placeholder {
                    color: #b0ae9f !important;
                    line-height: 40px !important;
                }
                
                .expenses-select .ant-select-selection-item {
                    line-height: 40px !important;
                    font-weight: 500 !important;
                }
                
                .expenses-datepicker.ant-picker {
                    border-radius: 15px !important;
                    border: 1.5px solid #e0ddd6 !important;
                    background: #fafaf8 !important;
                    height: 42px !important;
                    font-size: 14px !important;
                    padding: 0 14px !important;
                    width: 100%;
                }
                
                .expenses-datepicker.ant-picker:hover,
                .expenses-datepicker.ant-picker:focus-within {
                    border-color: #3eb489 !important;
                    box-shadow: 0 0 0 2px rgba(62,180,137,0.12) !important;
                }
                
                .expenses-datepicker .ant-picker-input input {
                    font-size: 14px !important;
                }
                
                .expenses-table .ant-table {
                    background: transparent !important;
                    font-size: 13.5px !important;
                }
                
                .expenses-table .ant-table-thead > tr > th {
                    background: #f8f7f4 !important;
                    border-bottom: 1px solid #e8e6df !important;
                    color: #8a8878 !important;
                    font-size: 10.5px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                    padding: 12px 16px !important;
                }
                
                .expenses-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #f2f0eb !important;
                    padding: 14px 16px !important;
                    color: #1a1a18 !important;
                    vertical-align: middle !important;
                }
                
                .expenses-table .ant-table-tbody > tr:hover > td {
                    background: #f9f8f5 !important;
                }
                
                .expenses-table .ant-table-tbody > tr:last-child > td {
                    border-bottom: none !important;
                }
            `}</style>
        </div>
    );
}