import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import {
    TrendingUp,
    Calendar,
    Users,
    UserCheck,
    Building2,
    AlertCircle,
    Loader2,
    PieChart,
    BarChart3,
    FileSpreadsheet,
    FileText,
    FileDown,
    Printer
} from "lucide-react";
import { Table, Tag, Button, Space, Card, Row, Col, Statistic, Tabs, Modal, message, DatePicker, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { ReloadOutlined, ExportOutlined, PrinterOutlined } from '@ant-design/icons';
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

interface BookedRoom {
    id: number;
    status: string;
    room: {
        room_number: string;
    };
}

interface Booking {
    id: number;
    booking_reference?: string;
    booking_type: 'online' | 'walk_in';
    booking_status: 'checked_in' | 'checked_out' | 'confirmed' | 'pending' | 'cancelled' | 'refunded';
    check_in_date: string;
    total_price: number;
    room_number?: string;
    walk_in_guest?: WalkInGuest;
    user?: User;
    booked_rooms?: BookedRoom[];
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

type PrintReportType = 'summary' | 'transactions' | 'full';
type ExportType = 'csv' | 'excel' | 'pdf' | null;

const { RangePicker } = DatePicker;

// ---------------------------------------------------------------------------
// PDF THEME — shared colors/helpers used by every generated report
// ---------------------------------------------------------------------------
const PDF_COLORS = {
    navy: [15, 23, 42] as const,
    slate: [71, 85, 105] as const,
    slateLight: [148, 163, 184] as const,
    green: [5, 150, 105] as const,
    greenLight: [209, 250, 229] as const,
    blue: [37, 99, 235] as const,
    blueLight: [219, 234, 254] as const,
    amber: [217, 119, 6] as const,
    amberLight: [254, 243, 199] as const,
    red: [220, 38, 38] as const,
    redLight: [254, 226, 226] as const,
    purple: [124, 58, 237] as const,
    border: [226, 232, 240] as const,
    bgSoft: [248, 250, 252] as const,
    white: [255, 255, 255] as const,
} as const;

// Helper to safely get color with fallback
const getColor = (color: readonly [number, number, number] | undefined): [number, number, number] => {
    if (!color) return [0, 0, 0];
    return [...color] as [number, number, number];
};

const STATUS_BADGE_MAP: Record<string, readonly [readonly [number, number, number], readonly [number, number, number]]> = {
    'CHECKED IN': [PDF_COLORS.blue, PDF_COLORS.blueLight],
    'CHECKED OUT': [PDF_COLORS.green, PDF_COLORS.greenLight],
    'CONFIRMED': [PDF_COLORS.blue, PDF_COLORS.blueLight],
    'PENDING': [PDF_COLORS.amber, PDF_COLORS.amberLight],
    'CANCELLED': [PDF_COLORS.red, PDF_COLORS.redLight],
    'REFUNDED': [PDF_COLORS.red, PDF_COLORS.redLight],
};

const generateReportId = () => `RPT-${dayjs().format('YYYYMMDD-HHmm')}`;

export default function Reports() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [filters, setFilters] = useState({
        start_date: "",
        end_date: "",
    });
    const [exportLoading, setExportLoading] = useState<ExportType>(null);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printReportType, setPrintReportType] = useState<PrintReportType>('full');

    // TanStack Query
    const { data, isLoading, refetch, isFetching, error } = useQuery<ReportsData>({
        queryKey: ["reports", filters, currentPage, perPage],
        queryFn: async () => {
            try {
                const res = await api.get("/reports", {
                    params: {
                        ...filters,
                        page: currentPage,
                        per_page: perPage,
                    },
                });
                return res.data;
            } catch (err) {
                message.error('Failed to fetch reports data');
                throw err;
            }
        },
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    // Memoized filtered transactions
    const filteredTransactions = useMemo(() => {
        if (!data?.bookings?.data) return [];
        
        if (statusFilter === "all") return data.bookings.data;
        
        return data.bookings.data.filter(
            (b: Booking) => b.booking_status === statusFilter
        );
    }, [data?.bookings?.data, statusFilter]);

    // Memoized additional stats
    const additionalStats = useMemo(() => {
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
    }, [data]);

    // Helper functions
    const getStatusColor = useCallback((status: string): string => {
        const colors: Record<string, string> = {
            "checked_in": "blue",
            "checked_out": "purple",
            "confirmed": "green",
            "pending": "yellow",
            "cancelled": "red",
            "refunded": "red"
        };
        return colors[status] || "default";
    }, []);

    const getBookingTypeColor = useCallback((type: string): string => {
        return type === "walk_in" ? "blue" : "green";
    }, []);

    const formatDate = useCallback((date: string): string => {
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }, []);

    const formatCurrency = useCallback((amount: number): string => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount || 0);
    }, []);

    const shouldShowPagination = useCallback(() => {
        const totalRecords = data?.bookings?.total || 0;
        return totalRecords > perPage;
    }, [data?.bookings?.total, perPage]);

    const handleDateRangeChange = useCallback((dates: any, dateStrings: [string, string]) => {
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
    }, []);

    // =========================================================================
    // EXPORT — CSV / Excel
    // =========================================================================
    const exportToCSV = useCallback(() => {
        const transactions = filteredTransactions;
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
            console.error('CSV export error:', error);
            message.error("Failed to export CSV");
        } finally {
            setExportLoading(null);
        }
    }, [filteredTransactions, formatDate]);

    const exportToExcel = useCallback(() => {
        const transactions = filteredTransactions;
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
            console.error('Excel export error:', error);
            message.error("Failed to export Excel");
        } finally {
            setExportLoading(null);
        }
    }, [filteredTransactions, formatDate]);

    // =========================================================================
    // PDF BUILDING BLOCKS
    // =========================================================================

    const addLetterhead = useCallback((doc: jsPDF, title: string, subtitle: string): number => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const navy = getColor(PDF_COLORS.navy);
        const green = getColor(PDF_COLORS.green);
        const slate = getColor(PDF_COLORS.slate);
        const white = getColor(PDF_COLORS.white);

        // top accent bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 2, 'F');

        // logo chip
        doc.setFillColor(...green);
        doc.roundedRect(14, 10, 10, 10, 2, 2, 'F');
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('LE', 19, 16.7, { align: 'center' });

        // brand name
        doc.setTextColor(...navy);
        doc.setFontSize(13);
        doc.text("LYN ENIA'S", 28, 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...green);
        doc.text("TRAVELER'S INN  \u00B7  Hotel Management System", 28, 19.5);

        // right-aligned title block
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...slate);
        doc.text('REPORTS & ANALYTICS', pageWidth - 14, 11.5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14.5);
        doc.setTextColor(...navy);
        doc.text(title, pageWidth - 14, 18, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(...slate);
        doc.text(subtitle, pageWidth - 14, 23, { align: 'right' });

        // divider
        doc.setDrawColor(...navy);
        doc.setLineWidth(0.6);
        doc.line(14, 27, pageWidth - 14, 27);

        return 33;
    }, []);

    const addMetaStrip = useCallback((doc: jsPDF, y: number): number => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const boxH = 12;
        const bgSoft = getColor(PDF_COLORS.bgSoft);
        const border = getColor(PDF_COLORS.border);
        const slateLight = getColor(PDF_COLORS.slateLight);
        const navy = getColor(PDF_COLORS.navy);

        doc.setFillColor(...bgSoft);
        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.rect(14, y, pageWidth - 28, boxH, 'FD');

        const generated = dayjs().format('MMMM D, YYYY \u00B7 h:mm A');
        const periodLabel = filters.start_date && filters.end_date
            ? `${filters.start_date} to ${filters.end_date}`
            : 'All Records';

        const cols = [
            { label: 'GENERATED ON', value: generated },
            { label: 'REPORT PERIOD', value: periodLabel },
            { label: 'SYSTEM', value: 'Hotel Management & Reservation System' },
        ];
        const colWidth = (pageWidth - 28) / 3;

        cols.forEach((c, i) => {
            const x = 14 + i * colWidth + 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.4);
            doc.setTextColor(...slateLight);
            doc.text(c.label, x, y + 4.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(...navy);
            doc.text(c.value, x, y + 9, { maxWidth: colWidth - 10 });
        });

        return y + boxH + 8;
    }, [filters]);

    const addSectionTitle = useCallback((doc: jsPDF, y: number, num: string, title: string, subtitle?: string): number => {
        const navy = getColor(PDF_COLORS.navy);
        const slateLight = getColor(PDF_COLORS.slateLight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...navy);
        doc.text(`${num}.  ${title}`, 14, y);

        let ny = y + 4.5;
        if (subtitle) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.3);
            doc.setTextColor(...slateLight);
            doc.text(subtitle, 14, ny);
            ny += 4;
        }
        return ny + 4;
    }, []);

    const addKPICards = useCallback((doc: jsPDF, y: number, kpis: { label: string; value: string; sub: string; color: readonly [number, number, number] }[]): number => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const gap = 4;
        const cardW = (pageWidth - 28 - gap * 3) / 4;
        const cardH = 22;
        const white = getColor(PDF_COLORS.white);
        const border = getColor(PDF_COLORS.border);
        const slate = getColor(PDF_COLORS.slate);
        const navy = getColor(PDF_COLORS.navy);
        const slateLight = getColor(PDF_COLORS.slateLight);

        kpis.forEach((k, i) => {
            const x = 14 + i * (cardW + gap);
            const color = getColor(k.color);

            doc.setFillColor(...white);
            doc.setDrawColor(...border);
            doc.setLineWidth(0.3);
            doc.rect(x, y, cardW, cardH, 'FD');

            doc.setFillColor(...color);
            doc.rect(x, y, 1, cardH, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.6);
            doc.setTextColor(...slate);
            doc.text(k.label, x + 4, y + 5.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(...navy);
            doc.text(k.value, x + 4, y + 13, { maxWidth: cardW - 6 });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.2);
            doc.setTextColor(...slateLight);
            doc.text(k.sub, x + 4, y + 18);
        });

        return y + cardH + 10;
    }, []);

    const addDistribution = useCallback((doc: jsPDF, y: number, online: number, walkin: number, total: number, barW = 110): number => {
        const navy = getColor(PDF_COLORS.navy);
        const slate = getColor(PDF_COLORS.slate);
        const border = getColor(PDF_COLORS.border);
        const green = getColor(PDF_COLORS.green);
        const blue = getColor(PDF_COLORS.blue);

        const rows: { label: string; value: number; color: [number, number, number] }[] = [
            { label: 'Online Bookings', value: online, color: green },
            { label: 'Walk-in Bookings', value: walkin, color: blue },
        ];

        let cy = y;
        rows.forEach((r) => {
            const pct = total > 0 ? r.value / total : 0;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.3);
            doc.setTextColor(...navy);
            doc.text(r.label, 14, cy);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.8);
            doc.setTextColor(...slate);
            doc.text(`${r.value} / ${total} (${(pct * 100).toFixed(1)}%)`, 14 + barW, cy, { align: 'right' });

            doc.setFillColor(...border);
            doc.rect(14, cy + 2, barW, 2.6, 'F');
            doc.setFillColor(...r.color);
            doc.rect(14, cy + 2, Math.max(2.5, barW * pct), 2.6, 'F');

            cy += 13;
        });

        return cy;
    }, []);

    const addQuickStats = useCallback((doc: jsPDF, x: number, y: number, w: number, stats: { label: string; value: string }[]): number => {
        const bgSoft = getColor(PDF_COLORS.bgSoft);
        const border = getColor(PDF_COLORS.border);
        const slate = getColor(PDF_COLORS.slate);
        const navy = getColor(PDF_COLORS.navy);

        let cy = y - 8;
        stats.forEach((s) => {
            doc.setFillColor(...bgSoft);
            doc.setDrawColor(...border);
            doc.setLineWidth(0.3);
            doc.rect(x, cy, w, 16, 'FD');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...slate);
            doc.text(s.label, x + 5, cy + 6);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.setTextColor(...navy);
            doc.text(s.value, x + 5, cy + 13);

            cy += 19;
        });
        return cy;
    }, []);

    const addTransactionsTable = useCallback((doc: jsPDF, y: number, transactions: Booking[]): number => {
        const navy = getColor(PDF_COLORS.navy);
        const border = getColor(PDF_COLORS.border);
        const white = getColor(PDF_COLORS.white);
        const bgSoft = getColor(PDF_COLORS.bgSoft);

        const body = transactions.map((b) => [
            b.booking_reference || `BOOK-${String(b.id).padStart(6, '0')}`,
            b.walk_in_guest?.guest_name || b.user?.name || 'Guest',
            b.booking_type === 'walk_in' ? 'Walk-in' : 'Online',
            (b.booking_status || '').replace('_', ' ').toUpperCase(),
            formatDate(b.check_in_date),
            formatCurrency(b.total_price),
        ]);

        (doc as any).autoTable({
            head: [['Booking Ref.', 'Guest', 'Type', 'Status', 'Check-in Date', 'Amount']],
            body,
            startY: y,
            margin: { left: 14, right: 14 },
            theme: 'grid',
            styles: {
                fontSize: 7.8,
                cellPadding: 3,
                textColor: navy,
                lineColor: border,
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: navy,
                textColor: white,
                fontSize: 7.6,
                fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: bgSoft },
            columnStyles: {
                5: { halign: 'right', fontStyle: 'bold' },
            },
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body' && hookData.column.index === 3) {
                    const val = String(hookData.cell.raw);
                    const pair = STATUS_BADGE_MAP[val];
                    if (pair) {
                        const [textColor, bgColor] = pair;
                        hookData.cell.styles.textColor = getColor(textColor);
                        hookData.cell.styles.fillColor = getColor(bgColor);
                        hookData.cell.styles.fontStyle = 'bold';
                    }
                }
            },
        });

        return (doc as any).lastAutoTable.finalY + 8;
    }, [formatDate, formatCurrency]);

    const addTotalRow = useCallback((doc: jsPDF, y: number, totalRevenue: number): number => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const navy = getColor(PDF_COLORS.navy);
        const green = getColor(PDF_COLORS.green);

        doc.setDrawColor(...navy);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 90, y, pageWidth - 14, y);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...navy);
        doc.text('TOTAL REVENUE', pageWidth - 90, y + 6);

        doc.setFontSize(11);
        doc.setTextColor(...green);
        doc.text(formatCurrency(totalRevenue), pageWidth - 14, y + 6, { align: 'right' });

        return y + 16;
    }, [formatCurrency]);

    const addNotes = useCallback((doc: jsPDF, y: number): number => {
        const navy = getColor(PDF_COLORS.navy);
        const slate = getColor(PDF_COLORS.slate);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...navy);
        doc.text('Notes', 14, y);

        let cy = y + 5;
        const notes = [
            'Amounts reflect confirmed and completed bookings for the selected period.',
            '"Checked In" reflects guests/rooms currently occupied at the time this report was generated.',
            'All monetary values are expressed in Philippine Peso (PHP).',
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.3);
        doc.setTextColor(...slate);

        notes.forEach((n) => {
            const lines = doc.splitTextToSize(`\u2022  ${n}`, doc.internal.pageSize.getWidth() - 28);
            doc.text(lines, 14, cy);
            cy += lines.length * 4 + 1;
        });

        return cy + 4;
    }, []);

    const addSignatures = useCallback((doc: jsPDF, y: number) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const slate = getColor(PDF_COLORS.slate);

        const colW = (pageWidth - 28 - 10) / 2;

        doc.setDrawColor(...slate);
        doc.setLineWidth(0.4);
        doc.line(14, y + 14, 14 + 60, y + 14);
        doc.line(14 + colW + 10, y + 14, 14 + colW + 10 + 60, y + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(...slate);
        doc.text('Prepared by \u2014 Front Desk / Admin', 14, y + 19);
        doc.text('Verified by \u2014 Management', 14 + colW + 10, y + 19);
    }, []);

    const addFootersToAllPages = useCallback((doc: jsPDF, reportId: string) => {
        const pageCount = doc.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const border = getColor(PDF_COLORS.border);
        const slateLight = getColor(PDF_COLORS.slateLight);

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            doc.setDrawColor(...border);
            doc.setLineWidth(0.3);
            doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.6);
            doc.setTextColor(...slateLight);
            doc.text(
                "Lyn Enia's Traveler's Inn  |  Reports & Analytics Module  |  Confidential \u2014 Internal Use Only",
                14, pageHeight - 12
            );
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
            doc.text(`Report ID: ${reportId}`, 14, pageHeight - 8);
        }
    }, []);

    const kpiData = useCallback((): { label: string; value: string; sub: string; color: readonly [number, number, number] }[] => [
        { label: 'TOTAL REVENUE', value: formatCurrency(data?.total_revenue || 0), sub: 'Total earnings', color: PDF_COLORS.green },
        { label: 'TOTAL BOOKINGS', value: String(data?.total_bookings || 0), sub: 'Total reservations', color: PDF_COLORS.blue },
        { label: 'CHECKED IN', value: String(data?.checked_in || 0), sub: 'Currently checked in', color: PDF_COLORS.purple },
        { label: 'AVG. REVENUE', value: formatCurrency(additionalStats.averageRevenue), sub: 'Per booking average', color: PDF_COLORS.amber },
    ], [data, additionalStats, formatCurrency]);

    // =========================================================================
    // PDF GENERATORS
    // =========================================================================

    const handlePrintSummary = useCallback(() => {
        setExportLoading('pdf');
        try {
            const doc = new jsPDF();
            let y = addLetterhead(doc, 'Financial & Booking Summary', `As of ${dayjs().format('MMMM D, YYYY')}`);
            y = addMetaStrip(doc, y);
            y = addSectionTitle(doc, y, '1', 'Executive Summary', 'Key performance indicators for the reporting period.');
            y = addKPICards(doc, y, kpiData());

            const sectionTop = addSectionTitle(doc, y, '2', 'Booking Type Distribution & Quick Stats');
            const barW = 110;
            const distEndY = addDistribution(
                doc, sectionTop,
                additionalStats.onlineVsWalkin.online,
                additionalStats.onlineVsWalkin.walkin,
                data?.total_bookings || 0,
                barW
            );
            const statsX = 14 + barW + 12;
            const statsW = doc.internal.pageSize.getWidth() - 14 - statsX;
            addQuickStats(doc, statsX, sectionTop, statsW, [
                { label: 'Total Guests', value: String(data?.bookings?.total || 0) },
                {
                    label: 'Completion Rate',
                    value: `${data?.total_bookings ? Math.round(((data?.checked_in || 0) / data.total_bookings) * 100) : 0}%`
                },
            ]);

            y = Math.max(distEndY, sectionTop + 40) + 8;
            y = addNotes(doc, y);
            addSignatures(doc, y);
            addFootersToAllPages(doc, generateReportId());

            doc.save(`summary-report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            message.success('Summary report generated!');
            setPrintModalOpen(false);
        } catch (error) {
            console.error('PDF generation error:', error);
            message.error('Failed to generate summary report');
        } finally {
            setExportLoading(null);
        }
    }, [addLetterhead, addMetaStrip, addSectionTitle, addKPICards, kpiData, addDistribution, addQuickStats, addNotes, addSignatures, addFootersToAllPages, data, additionalStats]);

    const handlePrintTransactions = useCallback(() => {
        const transactions = filteredTransactions;
        if (transactions.length === 0) {
            message.warning('No transactions to print');
            return;
        }

        setExportLoading('pdf');
        try {
            const doc = new jsPDF();
            let y = addLetterhead(doc, 'Transaction Report', `${transactions.length} record(s)`);
            y = addMetaStrip(doc, y);
            y = addSectionTitle(
                doc, y, '1', 'Transaction Report',
                `Showing ${transactions.length} of ${data?.bookings?.total || transactions.length} transactions.`
            );
            y = addTransactionsTable(doc, y, transactions);

            const total = transactions.reduce((sum, b) => sum + (b.total_price || 0), 0);
            addTotalRow(doc, y, total);
            addFootersToAllPages(doc, generateReportId());

            doc.save(`transaction-report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            message.success('Transaction report generated!');
            setPrintModalOpen(false);
        } catch (error) {
            console.error('PDF generation error:', error);
            message.error('Failed to generate transaction report');
        } finally {
            setExportLoading(null);
        }
    }, [filteredTransactions, addLetterhead, addMetaStrip, addSectionTitle, addTransactionsTable, addTotalRow, addFootersToAllPages, data]);

    const handlePrintFull = useCallback(() => {
        const transactions = filteredTransactions;
        setExportLoading('pdf');
        try {
            const doc = new jsPDF();
            const periodLabel = filters.start_date && filters.end_date
                ? `${filters.start_date} to ${filters.end_date}`
                : 'All Records';

            let y = addLetterhead(doc, 'Financial & Booking Summary Report', `Period: ${periodLabel}`);
            y = addMetaStrip(doc, y);

            y = addSectionTitle(doc, y, '1', 'Executive Summary', 'Key performance indicators across all bookings and revenue for the reporting period.');
            y = addKPICards(doc, y, kpiData());

            const sectionTop = addSectionTitle(doc, y, '2', 'Booking Type Distribution & Quick Stats');
            const barW = 110;
            const distEndY = addDistribution(
                doc, sectionTop,
                additionalStats.onlineVsWalkin.online,
                additionalStats.onlineVsWalkin.walkin,
                data?.total_bookings || 0,
                barW
            );
            const statsX = 14 + barW + 12;
            const statsW = doc.internal.pageSize.getWidth() - 14 - statsX;
            addQuickStats(doc, statsX, sectionTop, statsW, [
                { label: 'Total Guests', value: String(data?.bookings?.total || 0) },
                {
                    label: 'Completion Rate',
                    value: `${data?.total_bookings ? Math.round(((data?.checked_in || 0) / data.total_bookings) * 100) : 0}%`
                },
            ]);

            y = Math.max(distEndY, sectionTop + 40) + 8;
            y = addSectionTitle(
                doc, y, '3', 'Transaction Report',
                `Showing ${transactions.length} of ${data?.bookings?.total || transactions.length} transactions.`
            );
            y = addTransactionsTable(doc, y, transactions);
            y = addTotalRow(doc, y, data?.total_revenue || 0);
            y = addNotes(doc, y);

            if (y > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                y = 20;
            }
            addSignatures(doc, y);
            addFootersToAllPages(doc, generateReportId());

            doc.save(`full-report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            message.success('Full report generated!');
            setPrintModalOpen(false);
        } catch (error) {
            console.error('PDF generation error:', error);
            message.error('Failed to generate full report');
        } finally {
            setExportLoading(null);
        }
    }, [filteredTransactions, addLetterhead, addMetaStrip, addSectionTitle, addKPICards, kpiData, addDistribution, addQuickStats, addTransactionsTable, addTotalRow, addNotes, addSignatures, addFootersToAllPages, data, additionalStats, filters]);

    const handleGenerateSelectedPDF = useCallback(() => {
        if (printReportType === 'summary') handlePrintSummary();
        else if (printReportType === 'transactions') handlePrintTransactions();
        else handlePrintFull();
    }, [printReportType, handlePrintSummary, handlePrintTransactions, handlePrintFull]);

    // Dropdown items for export
    const exportMenuItems = useMemo<MenuProps['items']>(() => [
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
            label: 'PDF (choose report)',
            icon: <FileDown className="w-4 h-4" />,
            onClick: () => setPrintModalOpen(true),
        },
    ], [exportToCSV, exportToExcel]);

    // Table columns definition with useMemo
    const columns = useMemo<ColumnsType<Booking>>(() => [
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
    ], [getBookingTypeColor, getStatusColor, formatDate, formatCurrency]);

    // Print preview tabs with useMemo
    const printPreviewTabs = useMemo(() => [
        {
            key: 'summary',
            label: 'Summary Report',
            children: (
                <div>
                    <p className="text-sm text-gray-600 mb-3">
                        A one-page executive overview: revenue KPIs, booking-type distribution, and quick stats.
                        No line-by-line transaction table.
                    </p>
                    <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                        <li>Total Revenue, Total Bookings, Checked In, Average Revenue</li>
                        <li>Online vs Walk-in distribution bars</li>
                        <li>Total Guests &amp; Completion Rate</li>
                    </ul>
                </div>
            ),
        },
        {
            key: 'transactions',
            label: 'Transaction Report',
            children: (
                <div>
                    <p className="text-sm text-gray-600 mb-3">
                        A detailed table of every filtered transaction with colored status badges and a
                        total-revenue summary line.
                    </p>
                    <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                        <li>Booking Ref, Guest, Type, Status, Check-in Date, Amount</li>
                        <li>Respects your current status tab &amp; date range filter</li>
                        <li>Currently would include {filteredTransactions.length} record(s)</li>
                    </ul>
                </div>
            ),
        },
        {
            key: 'full',
            label: 'Full Report',
            children: (
                <div>
                    <p className="text-sm text-gray-600 mb-3">
                        Everything in one document — executive summary, distribution, quick stats,
                        the full transaction table, notes, and signature lines. Best for official records.
                    </p>
                    <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                        <li>Combines Summary + Transaction sections</li>
                        <li>Includes notes &amp; "Prepared by / Verified by" signature lines</li>
                        <li>Multi-page ready with header/footer on every page</li>
                    </ul>
                </div>
            ),
        },
    ], [filteredTransactions.length]);

    const handlePageInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const value = Number((e.target as HTMLInputElement).value);
            const lastPage = data?.bookings?.last_page || 1;
            if (value >= 1 && value <= lastPage) {
                setCurrentPage(value);
            }
        }
    }, [data?.bookings?.last_page]);

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Data</h2>
                    <p className="text-gray-500">Please try refreshing the page or contact support.</p>
                    <Button 
                        type="primary" 
                        onClick={() => refetch()} 
                        className="mt-4"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (!data && isLoading) {
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

                        <Button
                            icon={<PrinterOutlined />}
                            onClick={() => setPrintModalOpen(true)}
                        >
                            Print Report
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
                                            width: `${(additionalStats.onlineVsWalkin.online / (data?.total_bookings || 1)) * 100}%`
                                        }}
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
                                            width: `${(additionalStats.onlineVsWalkin.walkin / (data?.total_bookings || 1)) * 100}%`
                                        }}
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                All Transactions
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Showing {data?.bookings?.data?.length || 0} of {data?.bookings?.total || 0} transactions
                            </p>
                        </div>

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

                    <div style={{ marginBottom: 16 }}>
                        <Tabs
                            activeKey={statusFilter}
                            onChange={setStatusFilter}
                            items={[
                                { key: "all", label: "All" },
                                { key: "checked_out", label: "Checked Out" },
                                { key: "checked_in", label: "Checked In" },
                                { key: "confirmed", label: "Confirmed" },
                                { key: "pending", label: "Pending" },
                                { key: "cancelled", label: "Cancelled" },
                            ]}
                        />
                    </div>

                    <Table
                        columns={columns}
                        dataSource={filteredTransactions}
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

                    {shouldShowPagination() && (
                        <div className="flex items-center justify-between mt-4">
                            <button
                                disabled={!data?.bookings?.prev_page_url}
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Prev
                            </button>

                            <span className="text-sm text-gray-600">
                                Page {data?.bookings?.current_page || 1} of {data?.bookings?.last_page || 1}
                            </span>

                            <button
                                disabled={!data?.bookings?.next_page_url}
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Next
                            </button>

                            <div className="flex items-center gap-2">
                                <span className="text-sm">Go to</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={data?.bookings?.last_page || 1}
                                    placeholder="Page"
                                    className="w-16 px-2 py-1 border rounded"
                                    onKeyDown={handlePageInputKeyDown}
                                />
                            </div>
                        </div>
                    )}
                </Card>

                {/* Print / Export PDF Modal */}
                <Modal
                    title={
                        <Space>
                            <Printer className="w-4 h-4" />
                            <span>Print / Export Report</span>
                        </Space>
                    }
                    open={printModalOpen}
                    onCancel={() => setPrintModalOpen(false)}
                    width={560}
                    footer={[
                        <Button key="cancel" onClick={() => setPrintModalOpen(false)}>
                            Cancel
                        </Button>,
                        <Button
                            key="generate"
                            type="primary"
                            icon={<FileDown className="w-4 h-4" />}
                            loading={exportLoading === 'pdf'}
                            onClick={handleGenerateSelectedPDF}
                        >
                            Generate PDF
                        </Button>,
                    ]}
                >
                    <p className="text-sm text-gray-500 mb-4">
                        Choose which report you want to print or export as a PDF file.
                    </p>
                    <Tabs
                        activeKey={printReportType}
                        onChange={(key) => setPrintReportType(key as PrintReportType)}
                        items={printPreviewTabs}
                    />
                </Modal>
            </div>
        </div>
    );
}