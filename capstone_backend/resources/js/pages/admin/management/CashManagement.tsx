import React, { useState, useEffect } from "react";
import { message, Spin, Row, Col, Pagination } from "antd";

import dayjs from "dayjs";

import { UserOutlined, WalletOutlined } from "@ant-design/icons";

import api from "@/services/api";

// ─── INTERFACE DEFINITIONS ──────────────────────────────────────────────────────
interface Payment {
    id: number;
    amount: number;
    receiver?: {
        first_name?: string;
        last_name?: string;
    };
}

interface StaffCashSummary {
    staff: string;
    total_cash: number;
    transactions: number;
}

interface Shift {
    id: number;
    shift_number: string;
    opened_at: string;
    closed_at?: string | null;
    expected_cash?: number;
    starting_cash?: number;
    cash_payments?: number;
    handled_bookings?: number;
    staff_name?: string;
}

interface PaginatedShiftsResponse {
    current_page: number;
    data: Shift[];
    total: number;
    per_page: number;
    last_page: number;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function CashManagement() {
    // ─── STATE DECLARATIONS ──────────────────────────────────────────────────────
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalIncome, setTotalIncome] = useState<number>(0);
    const [staffSummary, setStaffSummary] = useState<StaffCashSummary[]>([]);
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    const [allShifts, setAllShifts] = useState<Shift[]>([]);

    // ─── PAGINATION STATE ────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalShifts, setTotalShifts] = useState<number>(0);
    const [shiftsPerPage] = useState<number>(10);

    // ─── FETCH CURRENT SHIFT (STAFF) ─────────────────────────────────────────────
    const fetchCurrentShift = async () => {
        try {
            const response = await api.get("/shift/current");
            const shiftData = response.data?.data || response.data;

            if (shiftData?.id) {
                setCurrentShift(shiftData);
            } else {
                setCurrentShift(null);
            }
        } catch (error: any) {
            if (
                error?.response?.status !== 403 &&
                error?.response?.status !== 404
            ) {
                console.error(error);
            }
            setCurrentShift(null);
        }
    };

    // ─── FETCH ALL SHIFTS WITH PAGINATION (ADMIN) ────────────────────────────────
    const fetchAllShifts = async (page: number = 1) => {
        try {
            const response = await api.get(`/shifts?page=${page}`);
            const paginatedData = response.data as PaginatedShiftsResponse;

            setAllShifts(paginatedData.data || []);
            setTotalShifts(paginatedData.total || 0);
            setCurrentPage(paginatedData.current_page || 1);
        } catch (error) {
            console.error(error);
            message.error("Failed to load shift records");
        }
    };

    // ─── FETCH ALL PAYMENTS ──────────────────────────────────────────────────────
    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await api.get("/booking-payments");
            const data = response.data || [];
            setPayments(data);
            calculateTotals(data);
            calculateStaffSummary(data);
        } catch (error: any) {
            console.error(error);
            message.error(
                error.response?.data?.message ||
                    "Failed to load cash management",
            );
        } finally {
            setLoading(false);
        }
    };

    // ─── CALCULATE TOTAL INCOME ──────────────────────────────────────────────────
    const calculateTotals = (data: Payment[]) => {
        const total = data.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0,
        );
        setTotalIncome(total);
    };

    // ─── CALCULATE STAFF COLLECTION SUMMARY ──────────────────────────────────────
    const calculateStaffSummary = (data: Payment[]) => {
        const grouped: Record<string, StaffCashSummary> = {};

        data.forEach((payment) => {
            if (!payment.receiver) {
                return;
            }

            const staffName = payment.receiver
                ? `${payment.receiver.first_name || ""} ${payment.receiver.last_name || ""}`.trim()
                : "Unknown Staff";

            if (!grouped[staffName]) {
                grouped[staffName] = {
                    staff: staffName,
                    total_cash: 0,
                    transactions: 0,
                };
            }

            grouped[staffName].total_cash += Number(payment.amount);
            grouped[staffName].transactions += 1;
        });

        setStaffSummary(Object.values(grouped));
    };

    // ─── HANDLE PAGE CHANGE ──────────────────────────────────────────────────────
    const handlePageChange = (page: number) => {
        fetchAllShifts(page);
    };

    // ─── INITIAL DATA FETCH ──────────────────────────────────────────────────────
    useEffect(() => {
        fetchPayments();

        const role = localStorage.getItem("role")?.trim().toLowerCase();

        if (role === "staff") {
            fetchCurrentShift();
        }

        if (role === "admin") {
            fetchAllShifts(1);
        }
    }, []);

    // ─── DERIVED VALUES ──────────────────────────────────────────────────────────
    const uniqueStaffCount = staffSummary.length;
    const activeShifts = allShifts.filter((shift) => !shift.closed_at);
    const userRole = localStorage.getItem("role")?.toLowerCase();

    // ─── RENDER COMPONENT ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen font-['DM_Sans',sans-serif]">
            {/* ─── HEADER SECTION ─────────────────────────────────────────────── */}
            <div className="mb-5">
                <h1 className="text-[26px] font-bold text-gray-900 mb-1">
                    Cash Management
                </h1>
                <p className="text-[12px] text-stone-500">
                    Monitor cashier shifts and cash accountability
                </p>
            </div>

            {/* ─── TOP CARDS SECTION ──────────────────────────────────────────── */}
            <Row gutter={[16, 16]} className="mb-5">
                {/* TOTAL INCOME CARD */}
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 px-5 py-4">
                        <div className="text-[11px] font-semibold text-stone-500 uppercase flex items-center gap-2 mb-2">
                            <WalletOutlined className="text-emerald-600" />
                            <span>Total Income</span>
                        </div>
                        <div className="text-[30px] font-bold text-emerald-700">
                            ₱{totalIncome.toLocaleString()}
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                            {payments.length} transaction(s)
                        </div>
                    </div>
                </Col>

                {/* ACTIVE STAFF CARD */}
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 px-5 py-4">
                        <div className="text-[11px] font-semibold text-stone-500 uppercase flex items-center gap-2 mb-2">
                            <UserOutlined className="text-blue-600" />
                            <span>Active Staff</span>
                        </div>
                        <div className="text-[30px] font-bold text-gray-900">
                            {uniqueStaffCount}
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                            Staff with collections
                        </div>
                    </div>
                </Col>

                {/* EXPECTED CASH CARD */}
                <Col xs={24} sm={12} lg={8}>
                    <div className="bg-[#fffdf7] rounded-xl border border-amber-100 px-5 py-4">
                        <div className="text-[11px] font-semibold text-stone-500 uppercase flex items-center gap-2 mb-2">
                            <WalletOutlined className="text-emerald-600" />
                            <span>Expected Cash</span>
                        </div>
                        <div className="text-[30px] font-bold text-emerald-700">
                            ₱
                            {Number(
                                userRole === "admin"
                                    ? activeShifts.reduce(
                                          (sum, shift) =>
                                              sum +
                                              Number(shift.expected_cash || 0),
                                          0,
                                      )
                                    : currentShift?.expected_cash || 0,
                            ).toLocaleString()}
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                            {userRole === "admin"
                                ? `${activeShifts.length} active shift(s)`
                                : currentShift?.id
                                  ? `Shift #${currentShift.id}`
                                  : "No Active Shift"}
                        </div>
                    </div>
                </Col>
            </Row>

            {/* ─── STAFF COLLECTION SUMMARY SECTION ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-5 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Staff Collection Summary
                    </h2>
                    <span className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-full font-semibold">
                        {staffSummary.length} staff
                    </span>
                </div>

                <div className="p-5">
                    <Spin spinning={loading}>
                        <div className="space-y-2">
                            {staffSummary.map((staff) => (
                                <div
                                    key={staff.staff}
                                    className="flex justify-between items-center bg-stone-50 border border-stone-100 rounded-xl px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <UserOutlined className="text-emerald-600 text-sm" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 text-sm">
                                                {staff.staff}
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                {staff.transactions}{" "}
                                                transaction(s)
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-emerald-600 text-lg">
                                        ₱{staff.total_cash.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Spin>
                </div>
            </div>

            {/* ─── ACTIVE SHIFT MONITORING SECTION ────────────────────────────── */}
            {activeShifts.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-5 overflow-hidden">
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900">
                            Staff Shift Monitoring
                        </h2>
                        <span className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-full font-semibold">
                            {activeShifts.length} active
                        </span>
                    </div>

                    <div className="p-5 space-y-2">
                        {activeShifts.map((shift) => (
                            <div
                                key={shift.id}
                                className="flex justify-between items-center bg-stone-50 border border-stone-100 rounded-xl px-4 py-3"
                            >
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">
                                        {shift.staff_name}
                                    </div>
                                    <div className="text-xs text-stone-500 mt-1">
                                        Opened:{" "}
                                        {dayjs(shift.opened_at).format(
                                            "MMM DD, YYYY hh:mm A",
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-emerald-600 text-lg">
                                        ₱
                                        {Number(
                                            shift.expected_cash || 0,
                                        ).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-stone-500">
                                        ACTIVE SHIFT
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── SHIFT RECORDS SECTION WITH PAGINATION ──────────────────────── */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Staff Shift Records
                    </h2>
                    <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-semibold">
                        {totalShifts} records
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50 border-b border-stone-100">
                            <tr>
                                <th className="text-left px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Staff
                                </th>
                                <th className="text-left px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Shift No.
                                </th>
                                <th className="text-left px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Opened
                                </th>
                                <th className="text-left px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Closed
                                </th>
                                <th className="text-right px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Starting Cash
                                </th>
                                <th className="text-right px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Cash Payments
                                </th>
                                <th className="text-right px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Expected Cash
                                </th>
                                <th className="text-center px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {allShifts.map((shift) => (
                                <tr
                                    key={shift.id}
                                    className="border-b border-stone-100 hover:bg-stone-50"
                                >
                                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                        {shift.staff_name}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-stone-600">
                                        {shift.shift_number}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-stone-600">
                                        {dayjs(shift.opened_at).format(
                                            "MMM DD, YYYY hh:mm A",
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-stone-600">
                                        {shift.closed_at
                                            ? dayjs(shift.closed_at).format(
                                                  "MMM DD, YYYY hh:mm A",
                                              )
                                            : "-"}
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                                        ₱
                                        {Number(
                                            shift.starting_cash || 0,
                                        ).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-semibold text-blue-600">
                                        ₱
                                        {Number(
                                            shift.cash_payments || 0,
                                        ).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                                        ₱
                                        {Number(
                                            shift.expected_cash || 0,
                                        ).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        {shift.closed_at ? (
                                            <span className="bg-stone-200 text-stone-700 text-xs px-3 py-1 rounded-full">
                                                Closed
                                            </span>
                                        ) : (
                                            <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ─── PAGINATION CONTROLS ─────────────────────────────────────── */}
                {totalShifts > shiftsPerPage && (
                    <div className="px-5 py-4 border-t border-stone-100 flex justify-end">
                        <Pagination
                            current={currentPage}
                            total={totalShifts}
                            pageSize={shiftsPerPage}
                            onChange={handlePageChange}
                            showSizeChanger={false}
                            className="mt-2"
                        />
                    </div>
                )}
            </div>

            {/* ─── CUSTOM FONTS ────────────────────────────────────────────────── */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
                * {
                    font-family: 'DM Sans', sans-serif;
                }
            `}</style>
        </div>
    );
}
