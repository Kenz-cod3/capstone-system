// src/pages/admin/management/PaymentLogs.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Select, Input, DatePicker, Spin, message, Row, Col } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import api from "@/services/api";

const { RangePicker } = DatePicker;

interface PaymentLog {
    id: number;
    event: string;
    payment_id: string;
    intent_id: string | null;
    booking_id: string | number | null;
    description: string | null;
    method: string | null;
    amount: string | number;
    fee: string | number;
    net_amount: string | number;
    status: string;
    paid_at: string | null;
    created_at: string;
}

const peso = (v: string | number) =>
    `₱${Number(v || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const METHOD_LABELS: Record<string, string> = {
    qrph: "QR Ph",
    gcash: "GCash",
    paymaya: "Maya",
    card: "Card",
    bank: "Bank",
};

const methodLabel = (m: string | null) =>
    m ? (METHOD_LABELS[m.toLowerCase()] ?? m) : "—";

const bookingRefOf = (row: PaymentLog) =>
    row.description?.match(/BOOK-[A-Z0-9]+/i)?.[0] ?? null;

export default function PaymentLogsPage() {
    const [rows, setRows] = useState<PaymentLog[]>([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [method, setMethod] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<
        [Dayjs | null, Dayjs | null] | null
    >(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get("/paymongo/payment-logs", {
                params: { per_page: 200 },
            });
            setRows(res.data?.data ?? []);
        } catch (error: any) {
            message.error(
                error.response?.data?.message || "Failed to load payment logs",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const methods = useMemo(
        () =>
            Array.from(
                new Set(rows.map((r) => r.method).filter(Boolean)),
            ) as string[],
        [rows],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((r) => {
            if (method && r.method !== method) return false;

            if (dateRange && dateRange[0] && dateRange[1]) {
                const d = dayjs(r.paid_at ?? r.created_at);
                if (
                    d.isBefore(dateRange[0].startOf("day")) ||
                    d.isAfter(dateRange[1].endOf("day"))
                ) {
                    return false;
                }
            }

            if (q) {
                const haystack = [
                    r.payment_id,
                    r.intent_id,
                    r.description,
                    r.booking_id,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            return true;
        });
    }, [rows, search, method, dateRange]);

    const totals = useMemo(() => {
        const gross = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
        const fees = filtered.reduce((s, r) => s + Number(r.fee || 0), 0);
        const net = filtered.reduce((s, r) => s + Number(r.net_amount || 0), 0);
        return { gross, fees, net };
    }, [filtered]);

    const hasFilters = !!search || !!method || !!dateRange;

    const resetFilters = () => {
        setSearch("");
        setMethod(null);
        setDateRange(null);
    };

    const copyId = async (id: string) => {
        try {
            await navigator.clipboard.writeText(id);
            message.success("Payment ID copied");
        } catch {
            message.error("Could not copy. Select the ID and copy it manually.");
        }
    };

    const columns = [
        {
            title: "Date & Time",
            dataIndex: "paid_at",
            key: "date",
            sorter: (a: PaymentLog, b: PaymentLog) =>
                dayjs(a.paid_at ?? a.created_at).valueOf() -
                dayjs(b.paid_at ?? b.created_at).valueOf(),
            defaultSortOrder: "descend" as const,
            render: (_: any, r: PaymentLog) => (
                <span style={{ color: "#6b6960", fontSize: 12.5 }}>
                    {dayjs(r.paid_at ?? r.created_at).format(
                        "MMM DD, YYYY • hh:mm A",
                    )}
                </span>
            ),
        },
        {
            title: "Booking",
            key: "booking",
            render: (_: any, r: PaymentLog) => {
                const ref = bookingRefOf(r);
                return ref ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-[12px] font-mono">
                        {ref}
                    </span>
                ) : (
                    <span className="text-gray-400">
                        {r.booking_id ? `#${r.booking_id}` : "—"}
                    </span>
                );
            },
        },
        {
            title: "Payment ID",
            dataIndex: "payment_id",
            key: "payment_id",
            render: (id: string) => (
                <button
                    type="button"
                    onClick={() => copyId(id)}
                    title="Click to copy"
                    className="font-mono text-[12px] text-stone-500 hover:text-emerald-700 bg-transparent border-0 p-0 cursor-pointer"
                >
                    {id}
                </button>
            ),
        },
        {
            title: "Method",
            dataIndex: "method",
            key: "method",
            render: (m: string | null) => (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-sky-50 text-sky-700">
                    {methodLabel(m)}
                </span>
            ),
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            align: "right" as const,
            sorter: (a: PaymentLog, b: PaymentLog) =>
                Number(a.amount) - Number(b.amount),
            render: (v: string | number) => (
                <span className="font-semibold text-gray-900 text-sm">
                    {peso(v)}
                </span>
            ),
        },
        {
            title: "Fee",
            dataIndex: "fee",
            key: "fee",
            align: "right" as const,
            render: (v: string | number) => (
                <span className="text-rose-500 text-[13px]">-{peso(v)}</span>
            ),
        },
        {
            title: "Net received",
            dataIndex: "net_amount",
            key: "net",
            align: "right" as const,
            render: (v: string | number) => (
                <span className="font-bold text-emerald-600 text-sm">
                    {peso(v)}
                </span>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (s: string) =>
                s === "paid" ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-emerald-50 text-emerald-700">
                        Paid
                    </span>
                ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium bg-amber-50 text-amber-700 capitalize">
                        {s}
                    </span>
                ),
        },
    ];

    return (
        <div className="paylogs-page min-h-screen">
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-gray-900 mb-1 tracking-tight">
                    Payment Logs
                </h1>
                <p className="text-[13px] text-stone-500 font-normal">
                    Every PayMongo payment confirmed by the webhook
                </p>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[140px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase">
                            Collected
                        </div>
                        <div className="text-[28px] font-bold text-gray-900">
                            {peso(totals.gross)}
                        </div>
                        <div className="text-xs text-stone-600">
                            Before PayMongo fees
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[140px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase">
                            Fees
                        </div>
                        <div className="text-[28px] font-bold text-rose-600">
                            {peso(totals.fees)}
                        </div>
                        <div className="text-xs text-stone-600">
                            Charged by PayMongo
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[140px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase">
                            Net received
                        </div>
                        <div className="text-[28px] font-bold text-emerald-700">
                            {peso(totals.net)}
                        </div>
                        <div className="text-xs text-stone-600">
                            Paid out to your bank account
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 p-5 h-full min-h-[140px] flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase">
                            Payments
                        </div>
                        <div className="text-[28px] font-bold text-gray-900">
                            {filtered.length}
                        </div>
                        <div className="text-xs text-stone-600">
                            {hasFilters ? "Matching your filters" : "All time"}
                        </div>
                    </div>
                </Col>
            </Row>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-6 overflow-hidden">
                <div className="px-7 py-5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-base font-semibold text-gray-900 m-0">
                        Payment history
                    </h2>
                    <button
                        className="h-9 px-4 rounded-lg border border-stone-200 bg-transparent text-[13px] font-medium text-stone-500 cursor-pointer transition-all duration-150 hover:border-gray-900 hover:text-gray-900 hover:bg-stone-50"
                        onClick={load}
                        disabled={loading}
                    >
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>

                <div className="p-7">
                    <div className="flex flex-wrap gap-4 items-end mb-6">
                        <div className="flex-[2] min-w-[220px]">
                            <div className="block text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2">
                                Search
                            </div>
                            <Input
                                className="paylogs-input"
                                placeholder="Payment ID, booking reference…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                allowClear
                            />
                        </div>

                        <div className="flex-1 min-w-[160px]">
                            <div className="block text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2">
                                Method
                            </div>
                            <Select
                                className="paylogs-select w-full"
                                placeholder="All methods"
                                value={method}
                                onChange={(v) => setMethod(v ?? null)}
                                allowClear
                                style={{ width: "100%" }}
                                options={methods.map((m) => ({
                                    value: m,
                                    label: methodLabel(m),
                                }))}
                            />
                        </div>

                        <div className="flex-1 min-w-[220px]">
                            <div className="block text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2">
                                Date range
                            </div>
                            <RangePicker
                                className="paylogs-datepicker w-full"
                                value={dateRange}
                                onChange={(d) => setDateRange(d)}
                                format="MMM DD, YYYY"
                                placeholder={["Start date", "End date"]}
                            />
                        </div>

                        <div className="flex-none">
                            <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mb-2 invisible">
                                Reset
                            </div>
                            <button
                                className="h-[42px] px-5 rounded-lg border border-stone-200 bg-transparent text-sm font-medium text-stone-500 cursor-pointer transition-all duration-150 hover:border-gray-900 hover:text-gray-900 hover:bg-stone-50"
                                onClick={resetFilters}
                            >
                                Reset filters
                            </button>
                        </div>
                    </div>

                    <Spin spinning={loading}>
                        {filtered.length === 0 && !loading ? (
                            <div className="text-center py-[60px] px-5">
                                <div className="text-sm font-medium text-stone-600">
                                    {hasFilters
                                        ? "No payments match your filters"
                                        : "No payments recorded yet"}
                                </div>
                                <div className="text-xs text-stone-400 mt-2">
                                    {hasFilters
                                        ? "Try a different search or date range."
                                        : "Paid QR Ph payments appear here as soon as PayMongo confirms them."}
                                </div>
                            </div>
                        ) : (
                            <Table
                                className="paylogs-table"
                                columns={columns}
                                dataSource={filtered}
                                rowKey="id"
                                scroll={{ x: 900 }}
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) =>
                                        `${total} total payments`,
                                    style: { padding: "16px 0 0 0", margin: 0 },
                                }}
                            />
                        )}
                    </Spin>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

                .paylogs-page,
                .paylogs-page * {
                    font-family: 'DM Sans', sans-serif;
                }
                .paylogs-page .font-mono {
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                }

                .paylogs-input.ant-input-affix-wrapper,
                .paylogs-input.ant-input {
                    border-radius: 15px !important;
                    border: 1.5px solid #e0ddd6 !important;
                    background: #fafaf8 !important;
                    height: 42px !important;
                    padding: 0 14px !important;
                    font-size: 14px !important;
                }
                .paylogs-input.ant-input-affix-wrapper:hover,
                .paylogs-input.ant-input-affix-wrapper-focused {
                    border-color: #3eb489 !important;
                    box-shadow: 0 0 0 2px rgba(62,180,137,0.12) !important;
                }

                .paylogs-select.ant-select .ant-select-selector {
                    border-radius: 15px !important;
                    border: 1.5px solid #e0ddd6 !important;
                    background: #fafaf8 !important;
                    height: 42px !important;
                    padding: 0 14px !important;
                    font-size: 14px !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .paylogs-select .ant-select-selection-placeholder,
                .paylogs-select .ant-select-selection-item {
                    line-height: 40px !important;
                }
                .paylogs-select .ant-select-selection-placeholder {
                    color: #b0ae9f !important;
                }

                .paylogs-datepicker.ant-picker {
                    border-radius: 15px !important;
                    border: 1.5px solid #e0ddd6 !important;
                    background: #fafaf8 !important;
                    height: 42px !important;
                    font-size: 14px !important;
                    padding: 0 14px !important;
                    width: 100%;
                }
                .paylogs-datepicker.ant-picker:hover,
                .paylogs-datepicker.ant-picker:focus-within {
                    border-color: #3eb489 !important;
                    box-shadow: 0 0 0 2px rgba(62,180,137,0.12) !important;
                }

                .paylogs-table .ant-table {
                    background: transparent !important;
                    font-size: 13.5px !important;
                }
                .paylogs-table .ant-table-thead > tr > th {
                    background: #f8f7f4 !important;
                    border-bottom: 1px solid #e8e6df !important;
                    color: #8a8878 !important;
                    font-size: 10.5px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                    padding: 12px 16px !important;
                }
                .paylogs-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #f2f0eb !important;
                    padding: 14px 16px !important;
                    color: #1a1a18 !important;
                    vertical-align: middle !important;
                }
                .paylogs-table .ant-table-tbody > tr:hover > td {
                    background: #f9f8f5 !important;
                }
                .paylogs-table .ant-table-tbody > tr:last-child > td {
                    border-bottom: none !important;
                }
            `}</style>
        </div>
    );
}