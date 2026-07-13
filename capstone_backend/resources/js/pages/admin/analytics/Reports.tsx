import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import {
    TrendingUp,
    Calendar,
    Users,
    CheckCircle,
    Clock,
    Filter,
    Download,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Building2,
    UserCheck,
    AlertCircle,
    Loader2,
    PieChart,
    BarChart3,
    FileSpreadsheet,
    FileText,
    FileDown
} from "lucide-react";
import { Table, Tag, Button, Space, Card, Row, Col, Statistic, Tabs, message, DatePicker, Dropdown, MenuProps } from 'antd';
import { ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Type definitions
interface WalkInGuest {
    guest_name: string;
}

interface User {
    name: string;
}

interface Booking {
    id: number;
    booking_type: 'online' | 'walk_in';
    booking_status: 'checked_in' | 'checked_out' | 'confirmed' | 'pending' | 'cancelled';
    check_in_date: string;
    total_price: number;
    room_number?: string;
    walk_in_guest?: WalkInGuest;
    user?: User;
}

interface PaginatedData {
    current_page: number;
    data: Booking[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

interface ReportsData {
    total_revenue: number;
    total_bookings: number;
    checked_in: number;
    bookings: PaginatedData;
    recent_bookings: Booking[];
}

const { RangePicker } = DatePicker;

export default function Reports() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [filters, setFilters] = useState({
        start_date: "",
        end_date: "",
    });
    const [exportLoading, setExportLoading] = useState<string | null>(null);

    // TanStack Query
    const { data, isLoading, refetch, isFetching } = useQuery<ReportsData>({
        queryKey: ["reports", filters, currentPage, perPage],
        queryFn: async () => {
            const res = await api.get("/reports", {
                params: {
                    ...filters,
                    page: currentPage,
                    per_page: perPage,
                },
            });
            return res.data;
        },

        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    const getFilteredTransactions = (): Booking[] => {
        if (!data?.bookings?.data) return [];

        if (statusFilter === "all") return data.bookings.data;

        return data.bookings.data.filter(
            (b: Booking) => b.booking_status === statusFilter
        );
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case "checked_in": return "blue";
            case "checked_out": return "purple";
            case "confirmed": return "green";
            case "pending": return "yellow";
            case "cancelled": return "red";
            default: return "default";
        }
    };

    const getBookingTypeColor = (type: string): string => {
        return type === "walk_in" ? "blue" : "green";
    };

    const formatDate = (date: string): string => {
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    // Export functions
    const exportToCSV = () => {
        const transactions = getFilteredTransactions();
        if (transactions.length === 0) {
            message.warning("No transactions to export");
            return;
        }

        setExportLoading('csv');
        try {
            const headers = ["Guest", "Booking Type", "Status", "Check In Date", "Total Amount"];
            const csvData = transactions.map((b: Booking) => [
                b.walk_in_guest?.guest_name || b.user?.name || "Guest",
                b.booking_type === "walk_in" ? "Walk-in" : "Online",
                b.booking_status?.replace("_", " ").toUpperCase(),
                formatDate(b.check_in_date),
                b.total_price
            ]);

            const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `reports_${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            message.success("CSV exported successfully!");
        } catch (error) {
            message.error("Failed to export CSV");
        } finally {
            setExportLoading(null);
        }
    };

    const exportToExcel = () => {
        const transactions = getFilteredTransactions();
        if (transactions.length === 0) {
            message.warning("No transactions to export");
            return;
        }

        setExportLoading('excel');
        try {
            const excelData = transactions.map((b: Booking) => ({
                'Guest': b.walk_in_guest?.guest_name || b.user?.name || "Guest",
                'Booking Type': b.booking_type === "walk_in" ? "Walk-in" : "Online",
                'Status': b.booking_status?.replace("_", " ").toUpperCase(),
                'Check In Date': formatDate(b.check_in_date),
                'Total Amount': b.total_price
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reports");
            
            // Auto-size columns
            const colWidths = [
                { wch: 20 }, // Guest
                { wch: 15 }, // Booking Type
                { wch: 15 }, // Status
                { wch: 20 }, // Check In Date
                { wch: 15 }, // Total Amount
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `reports_${new Date().toISOString().split("T")[0]}.xlsx`);
            message.success("Excel exported successfully!");
        } catch (error) {
            message.error("Failed to export Excel");
        } finally {
            setExportLoading(null);
        }
    };

    const exportToPDF = () => {
        const transactions = getFilteredTransactions();
        if (transactions.length === 0) {
            message.warning("No transactions to export");
            return;
        }

        setExportLoading('pdf');
        try {
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(18);
            doc.text('Reports Dashboard', 14, 22);
            
            // Add date range info
            doc.setFontSize(10);
            let dateInfo = 'All Transactions';
            if (filters.start_date && filters.end_date) {
                dateInfo = `Date Range: ${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`;
            }
            doc.text(dateInfo, 14, 30);
            
            // Add status filter info
            const statusLabel = statusFilter === 'all' ? 'All Status' : statusFilter.replace('_', ' ').toUpperCase();
            doc.text(`Status: ${statusLabel}`, 14, 36);
            
            // Add total count
            doc.text(`Total Records: ${transactions.length}`, 14, 42);
            
            // Create table
            const tableData = transactions.map((b: Booking) => [
                b.walk_in_guest?.guest_name || b.user?.name || "Guest",
                b.booking_type === "walk_in" ? "Walk-in" : "Online",
                b.booking_status?.replace("_", " ").toUpperCase(),
                formatDate(b.check_in_date),
                `₱${b.total_price.toFixed(2)}`
            ]);

            (doc as any).autoTable({
                head: [['Guest', 'Booking Type', 'Status', 'Check In Date', 'Total Amount']],
                body: tableData,
                startY: 48,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                },
                headStyles: {
                    fillColor: [249, 115, 22],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245],
                },
            });

            doc.save(`reports_${new Date().toISOString().split("T")[0]}.pdf`);
            message.success("PDF exported successfully!");
        } catch (error) {
            message.error("Failed to export PDF");
        } finally {
            setExportLoading(null);
        }
    };

    // Dropdown items for export
    const exportMenuItems: MenuProps['items'] = [
        {
            key: 'csv',
            label: 'CSV',
            icon: <FileText className="w-4 h-4" />,
            onClick: exportToCSV,
        },
        {
            key: 'excel',
            label: 'Excel',
            icon: <FileSpreadsheet className="w-4 h-4" />,
            onClick: exportToExcel,
        },
        {
            key: 'pdf',
            label: 'PDF',
            icon: <FileDown className="w-4 h-4" />,
            onClick: exportToPDF,
        },
    ];

    // Calculate additional stats
    const getAdditionalStats = () => {
        if (!data?.recent_bookings) return { averageRevenue: 0, onlineVsWalkin: { online: 0, walkin: 0 } };

        const bookings = data.recent_bookings;
        const totalRevenue = data.total_revenue || 0;
        const onlineBookings = bookings.filter((b: Booking) => b.booking_type === "online").length;
        const walkinBookings = bookings.filter((b: Booking) => b.booking_type === "walk_in").length;

        return {
            averageRevenue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
            onlineVsWalkin: {
                online: onlineBookings,
                walkin: walkinBookings
            }
        };
    };

    const additionalStats = getAdditionalStats();

    // Helper function to check if pagination should be shown
    const shouldShowPagination = () => {
        const totalRecords = data?.bookings?.total || 0;
        return totalRecords > perPage;
    };

    // Handle date range change
    const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
        if (dates) {
            setFilters({
                start_date: dateStrings[0],
                end_date: dateStrings[1],
            });
        } else {
            setFilters({
                start_date: "",
                end_date: "",
            });
        }
        setCurrentPage(1);
    };

    // Table columns definition
    const columns: ColumnsType<Booking> = [
        {
            title: 'Guest',
            dataIndex: 'id',
            key: 'guest',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>
                        {record.walk_in_guest?.guest_name || record.user?.name || "Guest"}
                    </div>
                    {record.room_number && (
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                            Room {record.room_number}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'booking_type',
            key: 'type',
            render: (type: string) => (
                <Tag color={getBookingTypeColor(type)}>
                    {type === "walk_in" ? "Walk-in" : "Online"}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'booking_status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status?.replace("_", " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Check In Date',
            dataIndex: 'check_in_date',
            key: 'check_in_date',
            render: (date: string) => formatDate(date),
        },
        {
            title: 'Total Amount',
            dataIndex: 'total_price',
            key: 'total_amount',
            render: (amount: number) => (
                <span style={{ fontWeight: 600 }}>
                    {formatCurrency(amount)}
                </span>
            ),
        },
    ];

    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading reports data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-orange-500" />
                            Reports Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Comprehensive overview of bookings, revenue, and transactions
                        </p>
                    </div>

                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => refetch()}
                            loading={isFetching}
                        >
                            Refresh
                        </Button>

                        <Dropdown 
                            menu={{ items: exportMenuItems }} 
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Button 
                                icon={<ExportOutlined />}
                                loading={!!exportLoading}
                            >
                                Export {exportLoading && `(${exportLoading.toUpperCase()})`}
                            </Button>
                        </Dropdown>
                    </Space>
                </div>

                {/* Stats Cards */}
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Revenue"
                                value={data?.total_revenue || 0}
                                precision={2}
                                valueStyle={{ color: '#3f8600' }}
                                formatter={(value) => formatCurrency(value as number)}
                            />
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                                Total earnings
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Bookings"
                                value={data?.total_bookings || 0}
                                prefix={<Users className="w-4 h-4 text-blue-600" />}
                            />
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                                Total reservations
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Checked In"
                                value={data?.checked_in || 0}
                                prefix={<UserCheck className="w-4 h-4 text-blue-600" />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                                Currently checked in
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Average Revenue"
                                value={additionalStats.averageRevenue}
                                precision={2}
                                prefix={<BarChart3 className="w-4 h-4 text-purple-600" />}
                                formatter={(value) => formatCurrency(value as number)}
                            />
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                                Per booking average
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Additional Stats Row */}
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card title={
                            <Space>
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span>Booking Type Distribution</span>
                            </Space>
                        }>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Online Bookings</span>
                                    <span className="font-semibold text-gray-900">{additionalStats.onlineVsWalkin.online}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-emerald-500 rounded-full h-2 transition-all"
                                        style={{
                                            width: `${(additionalStats.onlineVsWalkin.online / (data?.total_bookings || 1)) * 100}% 
                                        `}}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-sm text-gray-600">Walk-in Bookings</span>
                                    <span className="font-semibold text-gray-900">{additionalStats.onlineVsWalkin.walkin}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 rounded-full h-2 transition-all"
                                        style={{
                                            width: `${(additionalStats.onlineVsWalkin.walkin / (data?.total_bookings || 1)) * 100}% 
                                        `}}
                                    />
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        <Card title={
                            <Space>
                                <PieChart className="w-4 h-4 text-gray-400" />
                                <span>Quick Stats</span>
                            </Space>
                        }>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Statistic
                                        title="Total Guests"
                                        value={data?.bookings?.total || 0}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title="Completion Rate"
                                        value={data?.total_bookings && data?.total_bookings > 0
                                            ? Math.round(((data?.checked_in || 0) / data.total_bookings) * 100)
                                            : 0}
                                        suffix="%"
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>

                {/* Transactions Table */}
                <Card>
                    {/* Header with Title and Date Range Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                All Transactions
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Showing {data?.bookings?.data?.length || 0} of {data?.bookings?.total || 0} transactions
                            </p>
                        </div>

                        {/* Date Range Filter - Ant Design RangePicker */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">Date Range</span>
                            </div>

                            <RangePicker
                                onChange={handleDateRangeChange}
                                format="YYYY-MM-DD"
                                placeholder={['Start Date', 'End Date']}
                                size="middle"
                                style={{ minWidth: 240 }}
                                allowClear={true}
                            />
                        </div>
                    </div>

                    {/* Status Tabs */}
                    <div style={{ marginBottom: 16 }}>
                        <Tabs
                            activeKey={statusFilter}
                            onChange={setStatusFilter}
                            items={[
                                { key: "all", label: "All" },
                                { key: "checked_out", label: "Checked Out" },
                                { key: "checked_in", label: "Checked In" },
                            ]}
                        />
                    </div>

                    {/* TABLE */}
                    <Table
                        columns={columns}
                        dataSource={(data?.bookings?.data || []).filter((b: any) => {
                            if (statusFilter === "all") return true;
                            return b.booking_status === statusFilter;
                        })}
                        rowKey="id"
                        loading={isFetching}
                        pagination={false}
                        scroll={{ x: 800, y: 400 }}
                        locale={{
                            emptyText: (
                                <div className="flex flex-col items-center gap-2 py-12">
                                    <AlertCircle className="w-12 h-12 text-gray-300" />
                                    <p className="text-gray-500">No transactions found</p>
                                    <p className="text-xs text-gray-400">
                                        Try adjusting your filters or date range
                                    </p>
                                </div>
                            ),
                        }}
                    />

                    {/* CUSTOM PAGINATION - ONLY SHOW IF TOTAL > PAGE SIZE */}
                    {shouldShowPagination() && (
                        <div className="flex items-center justify-between mt-4">
                            {/* PREV */}
                            <button
                                disabled={!data?.bookings?.prev_page_url}
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Prev
                            </button>

                            {/* PAGE INFO */}
                            <span className="text-sm text-gray-600">
                                Page {data?.bookings?.current_page || 1} of {data?.bookings?.last_page || 1}
                            </span>

                            {/* NEXT */}
                            <button
                                disabled={!data?.bookings?.next_page_url}
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Next
                            </button>

                            {/* GO TO PAGE */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Go to</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={data?.bookings?.last_page || 1}
                                    placeholder="Page"
                                    className="w-16 px-2 py-1 border rounded"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            const value = Number((e.target as HTMLInputElement).value);
                                            if (
                                                value >= 1 &&
                                                value <= (data?.bookings?.last_page || 1)
                                            ) {
                                                setCurrentPage(value);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}