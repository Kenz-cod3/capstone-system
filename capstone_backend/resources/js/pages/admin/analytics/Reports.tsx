import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
    useLayoutEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Printer,
    CalendarRange,
    Search,
    Users,
    Hotel,
    CreditCard,
    AlertTriangle,
    LayoutDashboard,
    Calendar,
    Star,
    MessageSquare,
    DollarSign,
    Bed,
    Wrench,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    X,
    Menu,
    Eye,
    Settings,
} from "lucide-react";

import api from "@/services/api";
import logo from "../../../../images/logo.png";
import { cn } from "@/lib/utils";

// Report components
import DashboardReport from "./reportNav/DashboardReport";
import BookingReports from "./reportNav/BookingReports";
import GuestReports from "./reportNav/GuestReports";
import RevenueReports from "./reportNav/RevenueReports";
import TransactionReports from "./reportNav/TransactionReports";
import OccupancyReports from "./reportNav/OccupancyReports";
import HousekeepingReports from "./reportNav/HousekeepingReports";
import MaintenanceReports from "./reportNav/MaintenanceReports";
import IncidentReports from "./reportNav/IncidentReports";
import GuestReviews from "./reportNav/GuestReviews";
import InquiriesReports from "./reportNav/InquiriesReports";

// Sub-components
import ReportSettingsDrawer from "./components/ReportSettingsDrawer";
import { PrintPreviewButton } from "./components/PrintPreviewButton";

/* ========================================================================== */
/*  SCOPED STYLES                                                             */
/*  All rules are prefixed with `.reports-root` so they never leak outside    */
/*  this component. Only intentional globals remain (@media print, and        */
/*  body.print-preview-active to hide the app shell during preview).          */
/* ========================================================================== */
const REPORT_STYLES = `
/* ---------- numeric font ---------- */
.reports-root,
.reports-root table,
.reports-root td,
.reports-root th,
.reports-root .tabular-nums {
    font-family: Inter, "Segoe UI", Arial, Helvetica, sans-serif;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "zero" 1;
}

/* ---------- Print Preview stage ---------- */
.reports-root .print-preview-stage {
    display: flex;
    justify-content: center;
    padding: 30px 0 60px 0;
    background: #f5f5f5;
    overflow-x: auto;
}
.reports-root .print-preview-sheet-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
}
.reports-root .print-preview-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    background: white;
    border: 2px solid #10b981;
    color: #10b981;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
}
.reports-root .print-preview-nav-btn:hover:not(:disabled) {
    background: #10b981;
    color: white;
    transform: scale(1.05);
}
.reports-root .print-preview-nav-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    border-color: #d1d5db;
    color: #9ca3af;
}

/* ---------- Document sheet ---------- */
.reports-root .doc-sheet {
    background: #ffffff;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    position: relative;
    display: flex;
    flex-direction: column;
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    box-sizing: border-box;
    overflow: hidden;
    line-height: 1.4;
}
.reports-root .doc-sheet[data-orientation="portrait"] {
    --sheet-w: 210mm;
    --sheet-h: 297mm;
    --content-w: 170mm;
    width: 210mm;
    height: 297mm;
    padding: 20mm;
    font-size: 9pt;
}
.reports-root .doc-sheet[data-orientation="landscape"] {
    --sheet-w: 297mm;
    --sheet-h: 210mm;
    --content-w: 257mm;
    width: 297mm;
    height: 210mm;
    padding: 20mm;
    font-size: 9.5pt;
}

/* ---------- Letterhead ---------- */
.reports-root .doc-letterhead {
    display: flex;
    align-items: flex-start;
    gap: 6mm;
    margin-bottom: 3mm;
    position: relative;
    flex-shrink: 0;
}
.reports-root .doc-logo-wrap { flex-shrink: 0; }
.reports-root .doc-logo {
    max-height: 14mm;
    max-width: 32mm;
    object-fit: contain;
}
.reports-root .doc-letterhead-text { flex: 1; }
.reports-root .doc-hotel-name {
    font-size: 15pt;
    font-weight: 700;
    color: #111;
    line-height: 1.15;
    margin-bottom: 0.5mm;
}
.reports-root .doc-report-title {
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #111;
    margin-bottom: 0.5mm;
}
.reports-root .doc-meta {
    font-size: 8.5pt;
    color: #444;
}
.reports-root .doc-meta-sep { margin: 0 2mm; }
.reports-root .doc-pii-notice {
    margin-top: 1mm;
    font-size: 8.5pt;
    font-style: italic;
    color: #b91c1c;
}
.reports-root .doc-rule {
    border-top: 1.5px solid #111;
    margin-bottom: 4mm;
    flex-shrink: 0;
}
.reports-root .doc-summary {
    font-size: 9.5pt;
    line-height: 1.45;
    color: #111;
    text-align: justify;
    margin: 0 0 4mm 0;
    flex-shrink: 0;
}
.reports-root .doc-last-summary {
    margin-top: 4mm;
    padding: 3mm 4mm;
    background: #f5f5f5;
    border-left: 3px solid #111;
    flex-shrink: 0;
}
.reports-root .doc-last-summary-title {
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #111;
    margin-bottom: 1.5mm;
}
.reports-root .doc-last-summary-text {
    font-size: 9pt;
    line-height: 1.4;
    color: #111;
    margin: 0;
    text-align: justify;
}
.reports-root .doc-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

/* ---------- Table ---------- */
.reports-root .doc-table-wrap { width: 100%; }
.reports-root .doc-table {
    width: 100%;
    border-collapse: collapse;
    color: #111;
    table-layout: fixed;
    font-size: 9pt;
}
.reports-root .doc-sheet[data-orientation="landscape"] .doc-table {
    font-size: 9.5pt;
}
.reports-root .doc-table thead th {
    background: #f0f0f0;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #111;
    padding: 1.4mm 2.2mm;
    border-top: 1px solid #111;
    border-bottom: 1px solid #111;
    text-align: left;
    white-space: nowrap;
    line-height: 1.25;
}
.reports-root .doc-sheet[data-orientation="landscape"] .doc-table thead th {
    font-size: 9pt;
    padding: 1.6mm 2.5mm;
}
.reports-root .doc-table tbody td {
    padding: 1.4mm 2.2mm;
    border-bottom: 0.5px solid #999;
    vertical-align: middle;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.25;
    height: 7mm;
}
.reports-root .doc-sheet[data-orientation="landscape"] .doc-table tbody td {
    padding: 1.6mm 2.5mm;
    height: 7mm;
}
.reports-root .doc-table tbody tr { break-inside: avoid; }
.reports-root .doc-wrap-2 {
    white-space: normal !important;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
.reports-root .doc-empty {
    text-align: center;
    color: #666;
    padding: 6mm 0 !important;
    font-style: italic;
}
.reports-root .doc-total-row {
    display: flex;
    justify-content: flex-end;
    gap: 4mm;
    margin-top: 2.5mm;
    padding-top: 2mm;
    border-top: 1px solid #111;
    font-size: 9.5pt;
    color: #111;
    flex-shrink: 0;
}
.reports-root .doc-total-label { font-weight: 700; }
.reports-root .doc-total-value {
    font-weight: 700;
    min-width: 30mm;
    text-align: right;
}
.reports-root .doc-end-of-report {
    text-align: center;
    font-size: 8.5pt;
    color: #444;
    margin-top: 3mm;
    letter-spacing: 1px;
    flex-shrink: 0;
}
.reports-root .doc-signatures {
    display: flex;
    justify-content: space-between;
    gap: 20mm;
    margin-top: auto;
    padding-top: 10mm;
    margin-bottom: 8mm;
    font-size: 9pt;
    flex-shrink: 0;
}
.reports-root .doc-signature-block {
    display: flex;
    flex-direction: column;
    flex: 0 0 65mm;
    max-width: 65mm;
}
.reports-root .doc-signature-label {
    color: #444;
    margin-bottom: 4mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.reports-root .doc-signature-line {
    border-bottom: 0.5px solid #111;
    height: 1px;
}
.reports-root .doc-footer {
    margin-top: 0;
    padding-top: 2.5mm;
    border-top: 0.5px solid #999;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: #555;
    flex-shrink: 0;
}
.reports-root .preview-only-pages {
    break-after: page;
    page-break-after: always;
}
.reports-root .preview-only-pages:last-child {
    break-after: auto;
    page-break-after: auto;
}

/* ---------- Sidebar (scoped) ---------- */
.reports-root .sidebar-white {
    background: #ffffff;
    border-right: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.reports-root .sidebar-white .active-tab {
    background: #10b981 !important;
    color: white !important;
}
.reports-root .sidebar-white .menu-item:hover {
    background: #d1fae5 !important;
    color: #065f46 !important;
}
.reports-root .white-badge {
    background: #6b7280;
    color: white;
}
.reports-root .white-badge:hover { background: #4b5563; }
.reports-root .scrollbar-mint::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
.reports-root .scrollbar-mint::-webkit-scrollbar-thumb {
    background: #10b981;
    border-radius: 10px;
}
.reports-root .sidebar-scrollbar { scrollbar-gutter: stable; }
@supports selector(::-webkit-scrollbar) {
    .reports-root .sidebar-scrollbar {
        scrollbar-width: auto !important;
        scrollbar-color: auto !important;
    }
}
.reports-root .sidebar-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
    background: transparent;
}
.reports-root .sidebar-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    margin: 8px 0;
}
.reports-root .sidebar-scrollbar::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
}
.reports-root .sidebar-scrollbar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 9999px;
}
.reports-root .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
}
@supports not selector(::-webkit-scrollbar) {
    .reports-root .sidebar-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #d1d5db transparent;
    }
}

/* ---------- Focus (scoped) ---------- */
.reports-root *:focus { outline: none !important; }
.reports-root *:focus-visible {
    outline: 2px solid #6b7280 !important;
    outline-offset: 2px !important;
}
.reports-root .reports-search-input:focus,
.reports-root .reports-search-input:focus-visible {
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35) !important;
    border-color: #10b981 !important;
}
.reports-root [data-radix-popper-content-wrapper] *:focus,
.reports-root [data-radix-popper-content-wrapper] *:focus-visible,
.reports-root [role="menu"]:focus,
.reports-root [role="menu"]:focus-visible,
.reports-root [role="listbox"]:focus,
.reports-root [role="listbox"]:focus-visible,
.reports-root [role="dialog"]:focus,
.reports-root [role="dialog"]:focus-visible {
    outline: none !important;
    box-shadow: none !important;
}
.reports-root .sidebar-white button:focus-visible {
    outline: none !important;
    box-shadow: inset 0 0 0 1.5px #10b981;
}

/* ---------- Print (GLOBAL by necessity) ---------- */
@media print {
    html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
    }
    .print-hide, .no-print { display: none !important; }
    .print-chain {
        display: block !important;
        position: static !important;
        width: auto !important;
        max-width: none !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: visible !important;
        transform: none !important;
        box-shadow: none !important;
        background: #fff !important;
    }
    .print-preview-stage,
    .print-preview-sheet-wrap {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
        background: #fff !important;
        overflow: visible !important;
    }
    .print-preview-nav-btn { display: none !important; }
    .preview-only-pages {
        display: block !important;
        break-after: page;
        page-break-after: always;
    }
    .preview-only-pages:last-child {
        break-after: auto;
        page-break-after: auto;
    }
    .doc-sheet {
        width: var(--sheet-w) !important;
        height: var(--sheet-h) !important;
        margin: 0 !important;
        box-shadow: none !important;
        overflow: hidden !important;
        break-inside: avoid;
    }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
    .doc-table thead { display: table-header-group !important; }
    .doc-table tr { break-inside: avoid !important; }
}
@media screen {
    .reports-root .print-header { display: none !important; }
}

/* ---------- GLOBAL app shell hide during preview (intentional) ---------- */
body.print-preview-active aside,
body.print-preview-active nav.app-sidebar,
body.print-preview-active .app-sidebar,
body.print-preview-active .main-sidebar,
body.print-preview-active .admin-sidebar,
body.print-preview-active [data-app-sidebar],
body.print-preview-active [data-sidebar] {
    display: none !important;
}
body.print-preview-active .app-header,
body.print-preview-active .admin-header,
body.print-preview-active [data-app-header] {
    display: none !important;
}
body.print-preview-active main,
body.print-preview-active .app-main,
body.print-preview-active .admin-main,
body.print-preview-active [data-app-main] {
    margin-left: 0 !important;
    padding-left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
}
`;

/* ========================================================================== */
/*  TYPES                                                                     */
/* ========================================================================== */

export type Orientation = "portrait" | "landscape";
export type ReportEnding = "none" | "signatures" | "summary_signatures";

export interface ReportSettings {
    orientation: Orientation;
    header: {
        showLogo: boolean;
        showHotelName: boolean;
        showReportTitle: boolean;
        showPeriod: boolean;
    };
    footer: {
        showHotelName: boolean;
        showPageNumber: boolean;
    };
    ending: ReportEnding;
    preparedBy: string;
    notedBy: string;
}

export const DEFAULT_SETTINGS: ReportSettings = {
    orientation: "portrait",
    header: {
        showLogo: true,
        showHotelName: true,
        showReportTitle: true,
        showPeriod: true,
    },
    footer: { showHotelName: true, showPageNumber: true },
    ending: "signatures",
    preparedBy: "",
    notedBy: "",
};

export interface BookedRoomLite {
    id: number;
    status: string;
    check_in_date: string | null;
    check_out_date: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    subtotal?: number;
    room?: { id: number; room_number: string } | null;
}

export interface BookingLite {
    id: number;
    booking_reference?: string;
    created_at: string;
    total_price?: number;
    booking_status?: string;
    aggregate_status?: string;
    booking_type?: "walk_in" | "online";
    room_number?: string;
    room_numbers?: string;
    guest_name?: string;
    earliest_check_in?: string | null;
    latest_check_out?: string | null;
    user?: { first_name?: string; last_name?: string } | null;
    walk_in_guest?: { first_name?: string; last_name?: string } | null;
    bookedRooms?: BookedRoomLite[];
    rooms?: Array<{
        id: number;
        room_number: string;
        status: string;
        stay_type: string;
        check_in_date: string | null;
        check_out_date: string | null;
        check_in_time: string | null;
        check_out_time: string | null;
        subtotal: number;
    }>;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export interface ReportSummary {
    total_revenue: number;
    total_bookings: number;
    checked_in: number;
    bookings: Paginated<BookingLite>;
    recent_bookings: BookingLite[];
    summary?: {
        total_bookings: number;
        checked_in: number;
        checked_out: number;
        pending: number;
        confirmed: number;
        cancelled: number;
        refunded: number;
        total_revenue?: number;
        walk_in_count?: number;
        online_count?: number;
    };
}

export interface TransactionRow {
    id: number;
    booking_reference: string;
    booking_type: string;
    guest: string;
    rooms: string;
    total_rooms: number;
    total_price: number;
    amount: number;
    payment_method: string | null;
    payment_date: string | null;
    payment_reference: string | null;
    payment_status: string | null;
    paid_amount: number | null;
    check_in_date: string | null;
    check_out_date: string | null;
    date: string;
    refunded_amount: number;
    cancelled_amount: number;
}

export interface TransactionSummary {
    total_records: number;
    total_revenue: number;
}

export interface IncidentRow {
    id: number;
    report_type: "damaged" | "lost" | "found";
    status: "pending" | "repairing" | "resolved";
    note: string;
    reported_at: string;
    resolved_at: string | null;
    room?: { room_number: string } | null;
    cleaner?: { first_name?: string; last_name?: string } | null;
    resolvedBy?: { first_name?: string; last_name?: string } | null;
    booking?: {
        user?: { first_name?: string; last_name?: string } | null;
        walkInGuest?: { first_name?: string; last_name?: string } | null;
    } | null;
}

export interface DashboardStats {
    guests: number;
    rooms: number;
    bookings: number;
    revenue: number;
    expenses: number;
    profit: number;
    revenue_change: number;
    expenses_change: number;
    profit_change: number;
}

export interface FinancialTrendPoint {
    name: string;
    date: string;
    gross_revenue?: number;
    refunds?: number;
    revenue: number;
    expenses: number;
    profit: number;
}

export interface DashboardIndexResponse {
    stats: DashboardStats;
    financialTrend: FinancialTrendPoint[];
    occupancy: number;
    quickStats?: {
        check_ins_today: number;
        check_outs_today: number;
        pending_bookings: number;
        rooms_available: number;
    };
    recentBookings?: any[];
    occupancyMetrics?: {
        current: number;
        status: string;
        alert: string | null;
    };
    roomStatus?: Array<{
        name: string;
        value: number;
        color: string;
    }>;
}

export interface GuestReport {
    id: number;
    guest_type: "online" | "walk_in";
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    total_stays: number;
    total_spent: number;
    last_visit: string;
}

export interface ReviewReport {
    id: number;
    guest_name: string;
    room_number: string;
    rating: number;
    review: string;
    created_at: string;
    response?: string;
}

export interface InquiryReport {
    id: number;
    guest_name: string;
    email: string;
    subject: string;
    message: string;
    status: "pending" | "in_progress" | "resolved";
    priority: "low" | "medium" | "high" | "urgent";
    created_at: string;
    responded_at?: string;
}

export type TabKey =
    | "dashboard"
    | "bookings"
    | "guests"
    | "revenue"
    | "transactions"
    | "occupancy"
    | "housekeeping"
    | "maintenance"
    | "incidents"
    | "reviews"
    | "inquiries";

export interface ReportProps {
    start: string;
    end: string;
    searchQuery?: string;
    filterType?: string;
    onSearchChange?: (value: string) => void;
    isPrintPreview?: boolean;
    currentPreviewPage?: number;
    onPagesCountChange?: (count: number) => void;
    includeGuestNames?: boolean;
    settings?: ReportSettings;
    orientation?: Orientation;
}

/* ========================================================================== */
/*  HELPERS                                                                   */
/* ========================================================================== */

export function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

export function getRowsPerPage(
    orientation: Orientation,
    pageIndex: number,
    isLastChunk: boolean,
    ending: ReportEnding = "signatures",
): number {
    if (orientation === "portrait") {
        if (isLastChunk) {
            if (ending === "none") return pageIndex === 0 ? 24 : 27;
            if (ending === "signatures") return pageIndex === 0 ? 18 : 22;
            return pageIndex === 0 ? 15 : 19;
        }
        return pageIndex === 0 ? 22 : 29;
    }
    if (isLastChunk) {
        if (ending === "none") return 10;
        if (ending === "signatures") return 7;
        return 5;
    }
    return pageIndex === 0 ? 8 : 13;
}

export function paginateRows<T>(
    rows: T[],
    orientation: Orientation,
    ending: ReportEnding = "signatures",
): T[][] {
    const chunks: T[][] = [];
    let i = 0;
    let pageIndex = 0;
    while (i < rows.length) {
        const remaining = rows.length - i;
        const capacity = getRowsPerPage(orientation, pageIndex, false, ending);
        const wouldBeLast = remaining <= capacity;
        const cap = wouldBeLast
            ? getRowsPerPage(orientation, pageIndex, true, ending)
            : capacity;
        const take = wouldBeLast ? Math.min(remaining, cap) : capacity;
        chunks.push(rows.slice(i, i + take));
        i += take;
        pageIndex += 1;
    }
    if (chunks.length === 0) chunks.push([]);
    return chunks;
}

/* ========================================================================== */
/*  FORMATTING                                                                */
/* ========================================================================== */

export const currency = (value: number | null | undefined) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(value ?? 0));

export const currencyPlain = (value: number | null | undefined) =>
    new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));

export const currencyCompact = (value: number | null | undefined) => {
    const num = Number(value ?? 0);
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 1_000_000_000)
        return `${sign}₱${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}₱${(abs / 1_000).toFixed(1)}K`;
    return `${sign}₱${abs.toFixed(0)}`;
};

export const dateFmt = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export const timeFmt = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const guestName = (b: BookingLite) => {
    if (b.guest_name) return b.guest_name;
    if (b.booking_type === "online" || b.user) {
        return (
            `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`.trim() ||
            "—"
        );
    }
    return (
        `${b.walk_in_guest?.first_name ?? ""} ${b.walk_in_guest?.last_name ?? ""}`.trim() ||
        "—"
    );
};

export const sentenceCase = (s: string | null | undefined) => {
    if (!s) return "—";
    const cleaned = s.replace(/_/g, " ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

export const anonGuest = (index: number) =>
    `Guest ${String(index + 1).padStart(3, "0")}`;

export async function apiGet<T>(url: string): Promise<T> {
    const response = await api.get<T>(url);
    return response.data;
}

export async function fetchJson<T>(url: string): Promise<T> {
    return apiGet<T>(url);
}

/* ========================================================================== */
/*  PAGINATION                                                                */
/* ========================================================================== */

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
}

export function Pagination({
    currentPage,
    lastPage,
    total,
    perPage,
    onPageChange,
    onPerPageChange,
}: PaginationProps) {
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (lastPage <= maxVisible) {
            for (let i = 1; i <= lastPage; i++) pages.push(i);
        } else if (currentPage <= 3) {
            for (let i = 1; i <= 4; i++) pages.push(i);
            pages.push("...");
            pages.push(lastPage);
        } else if (currentPage >= lastPage - 2) {
            pages.push(1);
            pages.push("...");
            for (let i = lastPage - 3; i <= lastPage; i++) pages.push(i);
        } else {
            pages.push(1);
            pages.push("...");
            for (let i = currentPage - 1; i <= currentPage + 1; i++)
                pages.push(i);
            pages.push("...");
            pages.push(lastPage);
        }
        return pages;
    };

    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, total);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 no-print">
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
                <span>
                    Showing {startItem}–{endItem} of {total}
                </span>
                {onPerPageChange && (
                    <div className="flex items-center gap-1 ml-2">
                        <span>|</span>
                        <span>Per page:</span>
                        <select
                            value={perPage}
                            onChange={(e) =>
                                onPerPageChange(Number(e.target.value))
                            }
                            className="border border-gray-200 rounded px-1.5 py-0.5 text-[12px] focus:outline-none focus:border-gray-400"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="h-8 w-8 p-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers().map((page, index) =>
                    typeof page === "number" ? (
                        <Button
                            key={index}
                            variant={
                                currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className={`h-8 min-w-[32px] px-2 text-[12px] ${
                                currentPage === page
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span
                            key={index}
                            className="px-1 text-[12px] text-gray-400"
                        >
                            {page}
                        </span>
                    ),
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= lastPage}
                    className="h-8 w-8 p-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                >
                    <ChevronRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  MENU                                                                      */
/* ========================================================================== */

export interface ReportMenuItem {
    id: TabKey;
    label: string;
    icon: React.ReactNode;
    group: string;
}

export const reportMenuItems: ReportMenuItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        group: "Main",
    },
    {
        id: "bookings",
        label: "Booking Reports",
        icon: <Calendar className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "guests",
        label: "Guest Reports",
        icon: <Users className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "occupancy",
        label: "Occupancy Reports",
        icon: <Hotel className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "housekeeping",
        label: "Housekeeping",
        icon: <Bed className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "maintenance",
        label: "Maintenance",
        icon: <Wrench className="h-4 w-4" />,
        group: "Operations",
    },
    {
        id: "revenue",
        label: "Revenue Reports",
        icon: <DollarSign className="h-4 w-4" />,
        group: "Financial",
    },
    {
        id: "transactions",
        label: "Transaction Reports",
        icon: <CreditCard className="h-4 w-4" />,
        group: "Financial",
    },
    {
        id: "incidents",
        label: "Incident Reports",
        icon: <AlertTriangle className="h-4 w-4" />,
        group: "Safety",
    },
    {
        id: "reviews",
        label: "Guest Reviews",
        icon: <Star className="h-4 w-4" />,
        group: "Guest Experience",
    },
    {
        id: "inquiries",
        label: "Inquiries",
        icon: <MessageSquare className="h-4 w-4" />,
        group: "Guest Experience",
    },
];

/* ========================================================================== */
/*  DATE RANGE                                                                */
/* ========================================================================== */

export function DateRangeFilter({
    start,
    end,
    onChange,
}: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-end gap-3 print:hidden no-print">
            <div className="grid gap-1.5">
                <Label
                    htmlFor="start_date"
                    className="text-[11px] text-gray-500 font-medium"
                >
                    From
                </Label>
                <Input
                    id="start_date"
                    type="date"
                    value={start}
                    onChange={(e) => onChange(e.target.value, end)}
                    className="h-9 w-[160px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none text-[12px] shadow-sm"
                />
            </div>
            <div className="grid gap-1.5">
                <Label
                    htmlFor="end_date"
                    className="text-[11px] text-gray-500 font-medium"
                >
                    To
                </Label>
                <Input
                    id="end_date"
                    type="date"
                    value={end}
                    onChange={(e) => onChange(start, e.target.value)}
                    className="h-9 w-[160px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none text-[12px] shadow-sm"
                />
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  DOCUMENT SHEET                                                            */
/* ========================================================================== */

interface DocumentSheetProps {
    reportTitle: string;
    periodText: string;
    generatedText: string;
    pageNumber: number;
    totalPages: number;
    isLastPage: boolean;
    children: React.ReactNode;
    summarySentence?: string;
    containsPersonalInfo?: boolean;
    settings: ReportSettings;
}

export function DocumentSheet({
    reportTitle,
    periodText,
    generatedText,
    pageNumber,
    totalPages,
    isLastPage,
    children,
    summarySentence,
    containsPersonalInfo,
    settings,
}: DocumentSheetProps) {
    const { orientation, header, footer, ending } = settings;
    const showSummary =
        isLastPage && ending === "summary_signatures" && summarySentence;
    const showSignatures =
        isLastPage &&
        (ending === "signatures" || ending === "summary_signatures");
    const showHeaderBlock =
        header.showLogo ||
        header.showHotelName ||
        header.showReportTitle ||
        header.showPeriod;

    return (
        <div className="doc-sheet" data-orientation={orientation}>
            {showHeaderBlock && (
                <div className="doc-letterhead">
                    {header.showLogo && (
                        <div className="doc-logo-wrap">
                            <img
                                src={logo}
                                alt="Hotel Logo"
                                className="doc-logo"
                                onError={(e) => {
                                    (
                                        e.target as HTMLImageElement
                                    ).style.display = "none";
                                }}
                            />
                        </div>
                    )}
                    <div className="doc-letterhead-text">
                        {header.showHotelName && (
                            <div className="doc-hotel-name">
                                Lyn Enia's Traveler's Inn
                            </div>
                        )}
                        {header.showReportTitle && (
                            <div className="doc-report-title">
                                {reportTitle}
                            </div>
                        )}
                        {header.showPeriod && (
                            <div className="doc-meta">
                                <span>Period: {periodText}</span>
                                <span className="doc-meta-sep">·</span>
                                <span>Generated: {generatedText}</span>
                            </div>
                        )}
                        {containsPersonalInfo && (
                            <div className="doc-pii-notice">
                                Contains personal information
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showHeaderBlock && <div className="doc-rule" />}

            {pageNumber === 1 &&
                summarySentence &&
                ending !== "summary_signatures" && (
                    <p className="doc-summary">{summarySentence}</p>
                )}

            <div className="doc-body">
                {children}

                {showSummary && (
                    <div className="doc-last-summary">
                        <div className="doc-last-summary-title">Summary</div>
                        <p className="doc-last-summary-text">
                            {summarySentence}
                        </p>
                    </div>
                )}

                {showSignatures && (
                    <div className="doc-signatures">
                        <div className="doc-signature-block">
                            <span className="doc-signature-label">
                                Prepared by:
                                {settings.preparedBy
                                    ? ` ${settings.preparedBy}`
                                    : ""}
                            </span>
                            <span className="doc-signature-line" />
                        </div>
                        <div className="doc-signature-block">
                            <span className="doc-signature-label">
                                Noted by:
                                {settings.notedBy ? ` ${settings.notedBy}` : ""}
                            </span>
                            <span className="doc-signature-line" />
                        </div>
                    </div>
                )}
            </div>

            {(footer.showHotelName || footer.showPageNumber) && (
                <div className="doc-footer">
                    <span>
                        {footer.showHotelName
                            ? "Lyn Enia's Traveler's Inn"
                            : ""}
                    </span>
                    <span>
                        {footer.showPageNumber
                            ? `Page ${pageNumber} of ${totalPages}`
                            : ""}
                    </span>
                </div>
            )}
        </div>
    );
}

/* ========================================================================== */
/*  DOCUMENT TABLE                                                            */
/* ========================================================================== */

export interface DocColumn<T> {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    weight: number;
    nowrap?: boolean;
    confidential?: boolean;
    wrap?: boolean;
    render: (row: T, index: number) => React.ReactNode;
}

interface DocumentTableProps<T> {
    columns: DocColumn<T>[];
    rows: T[];
    startIndex?: number;
    emptyText?: string;
    showTotal?: boolean;
    totalLabel?: string;
    totalValue?: number;
    showEndOfReport?: boolean;
    includeGuestNames?: boolean;
}

export function DocumentTable<T>({
    columns,
    rows,
    startIndex = 0,
    emptyText = "No records found.",
    showTotal = false,
    totalLabel = "Total Amount",
    totalValue = 0,
    showEndOfReport = false,
    includeGuestNames = false,
}: DocumentTableProps<T>) {
    const visibleColumns = columns.filter(
        (c) => !c.confidential || includeGuestNames,
    );
    const totalWeight = visibleColumns.reduce(
        (sum, c) => sum + (c.weight || 1),
        0,
    );

    return (
        <div className="doc-table-wrap">
            <table className="doc-table">
                <colgroup>
                    {visibleColumns.map((c) => (
                        <col
                            key={c.key}
                            style={{
                                width: `${((c.weight || 1) / totalWeight) * 100}%`,
                            }}
                        />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        {visibleColumns.map((c) => (
                            <th
                                key={c.key}
                                style={{
                                    textAlign: c.align ?? "left",
                                    whiteSpace: c.nowrap ? "nowrap" : undefined,
                                }}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={visibleColumns.length}
                                className="doc-empty"
                            >
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr key={i}>
                                {visibleColumns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={c.wrap ? "doc-wrap-2" : ""}
                                        style={{
                                            textAlign: c.align ?? "left",
                                            whiteSpace:
                                                c.nowrap || !c.wrap
                                                    ? "nowrap"
                                                    : undefined,
                                        }}
                                    >
                                        {c.render(row, startIndex + i)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {showTotal && rows.length > 0 && (
                <div className="doc-total-row">
                    <span className="doc-total-label">{totalLabel}:</span>
                    <span className="doc-total-value">
                        ₱{currencyPlain(totalValue)}
                    </span>
                </div>
            )}

            {showEndOfReport && rows.length > 0 && (
                <div className="doc-end-of-report">*** End of Report ***</div>
            )}
        </div>
    );
}

/* ========================================================================== */
/*  SCREEN HEADER                                                             */
/* ========================================================================== */

export function ScreenHeader({
    title,
    subtitle,
}: {
    title: string;
    subtitle: string;
}) {
    return (
        <div className="print-header print-header-repeat">
            <div className="print-header-top">
                <div className="print-logo-container">
                    <img
                        src={logo}
                        alt="Hotel Logo"
                        className="print-logo"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                                "none";
                        }}
                    />
                </div>
                <div className="print-header-text">
                    <h1>{title}</h1>
                    <div className="subtitle">{subtitle}</div>
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  MAIN PAGE                                                                 */
/* ========================================================================== */

const SETTINGS_STORAGE_KEY = "reports:settings:v2";

export default function Reports() {
    const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [isPrintPreview, setIsPrintPreview] = useState(false);
    const [includeGuestNames, setIncludeGuestNames] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [settings, setSettings] = useState<ReportSettings>(() => {
        if (typeof window === "undefined") return DEFAULT_SETTINGS;
        try {
            const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (!raw) return DEFAULT_SETTINGS;
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                header: {
                    ...DEFAULT_SETTINGS.header,
                    ...(parsed.header || {}),
                },
                footer: {
                    ...DEFAULT_SETTINGS.footer,
                    ...(parsed.footer || {}),
                },
            };
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    /* Hide GLOBAL app sidebar during preview */
    useEffect(() => {
        if (isPrintPreview) {
            document.body.classList.add("print-preview-active");
        } else {
            document.body.classList.remove("print-preview-active");
        }
        return () => {
            document.body.classList.remove("print-preview-active");
        };
    }, [isPrintPreview]);

    const applySettings = useCallback((next: ReportSettings) => {
        setSettings((prev) => {
            if (
                prev.orientation === next.orientation &&
                prev.ending === next.ending &&
                prev.preparedBy === next.preparedBy &&
                prev.notedBy === next.notedBy &&
                prev.header.showLogo === next.header.showLogo &&
                prev.header.showHotelName === next.header.showHotelName &&
                prev.header.showReportTitle === next.header.showReportTitle &&
                prev.header.showPeriod === next.header.showPeriod &&
                prev.footer.showHotelName === next.footer.showHotelName &&
                prev.footer.showPageNumber === next.footer.showPageNumber
            ) {
                return prev;
            }

            if (
                prev.orientation !== next.orientation ||
                prev.ending !== next.ending
            ) {
                setPreviewPage(1);
            }

            try {
                window.localStorage.setItem(
                    SETTINGS_STORAGE_KEY,
                    JSON.stringify(next),
                );
            } catch {
                /* ignore */
            }

            return next;
        });
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        try {
            window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
        setPreviewPage(1);
    }, []);

    const orientation = settings.orientation;

    const sidebarRef = useRef<HTMLDivElement>(null);
    const [sbw, setSbw] = useState(4);

    useLayoutEffect(() => {
        const el = sidebarRef.current;
        if (!el) return;
        const measure = () => {
            const cs = getComputedStyle(el);
            const border =
                (parseFloat(cs.borderLeftWidth) || 0) +
                (parseFloat(cs.borderRightWidth) || 0);
            const w = Math.max(0, el.offsetWidth - el.clientWidth - border);
            setSbw((prev) => (prev === w ? prev : w));
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [isPrintPreview]);

    const [previewPage, setPreviewPage] = useState(1);
    const [previewTotalPages, setPreviewTotalPages] = useState(1);

    useEffect(() => {
        const markForPrint = () => {
            const wrapper = document.getElementById("printable-report-wrapper");
            if (!wrapper) return;
            let node: HTMLElement | null = wrapper;
            while (node && node !== document.body) {
                node.classList.add("print-chain");
                const parent: HTMLElement | null = node.parentElement;
                if (parent) {
                    Array.from(parent.children).forEach((sib) => {
                        if (sib !== node) sib.classList.add("print-hide");
                    });
                }
                node = parent;
            }
        };
        const unmark = () => {
            document
                .querySelectorAll(".print-chain, .print-hide")
                .forEach((el) =>
                    el.classList.remove("print-chain", "print-hide"),
                );
        };
        window.addEventListener("beforeprint", markForPrint);
        window.addEventListener("afterprint", unmark);
        return () => {
            window.removeEventListener("beforeprint", markForPrint);
            window.removeEventListener("afterprint", unmark);
            unmark();
        };
    }, []);

    const handleRangeChange = useCallback((s: string, e: string) => {
        setStart(s);
        setEnd(e);
    }, []);

    const waitForPrintable = useCallback(async () => {
        const t0 = Date.now();
        while (Date.now() - t0 < 10000) {
            const wrapper = document.getElementById("printable-report-wrapper");
            const ready =
                wrapper?.querySelector(".doc-sheet") &&
                !wrapper.querySelector(".animate-pulse") &&
                !wrapper.querySelector('[data-loading="true"]');
            if (ready) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        try {
            await (document as any).fonts?.ready;
        } catch {
            /* ignore */
        }
        const imgs = Array.from(
            document.querySelectorAll<HTMLImageElement>(
                "#printable-report-wrapper img",
            ),
        );
        await Promise.all(
            imgs.map((img) =>
                img.complete
                    ? Promise.resolve()
                    : new Promise((res) => {
                          img.onload = img.onerror = () => res(null);
                      }),
            ),
        );
        await new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
        );
    }, []);

    const handlePrint = useCallback(async () => {
        if (!isPrintPreview) {
            setIsPrintPreview(true);
            setPreviewPage(1);
            setPreviewTotalPages(1);
            await new Promise((r) => setTimeout(r, 150));
        }
        await waitForPrintable();
        window.print();
    }, [isPrintPreview, waitForPrintable]);

    const togglePrintPreview = useCallback(() => {
        setIsPrintPreview((prev) => !prev);
        setPreviewPage(1);
        setPreviewTotalPages(1);
    }, []);

    const toggleSidebar = () => setSidebarCollapsed((v) => !v);
    const toggleMobileMenu = () => setIsMobileMenuOpen((v) => !v);

    const groupedItems = reportMenuItems.reduce<
        Record<string, ReportMenuItem[]>
    >((acc, item) => {
        const group = item?.group;
        if (group) {
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
        }
        return acc;
    }, {});

    const renderContent = () => {
        const props: ReportProps = {
            start,
            end,
            searchQuery,
            filterType,
            onSearchChange: setSearchQuery,
            isPrintPreview,
            currentPreviewPage: previewPage,
            onPagesCountChange: setPreviewTotalPages,
            includeGuestNames,
            settings,
            orientation,
        };
        switch (activeTab) {
            case "dashboard":
                return <DashboardReport {...props} />;
            case "bookings":
                return <BookingReports {...props} />;
            case "guests":
                return <GuestReports {...props} />;
            case "revenue":
                return <RevenueReports {...props} />;
            case "transactions":
                return <TransactionReports {...props} />;
            case "occupancy":
                return <OccupancyReports {...props} />;
            case "housekeeping":
                return <HousekeepingReports {...props} />;
            case "maintenance":
                return <MaintenanceReports {...props} />;
            case "incidents":
                return <IncidentReports {...props} />;
            case "reviews":
                return <GuestReviews {...props} />;
            case "inquiries":
                return <InquiriesReports {...props} />;
            default:
                return <DashboardReport {...props} />;
        }
    };

    const effectivelyCollapsed = isPrintPreview ? false : sidebarCollapsed;

    const renderSidebarItems = () =>
        Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="space-y-1">
                <h3
                    className={cn(
                        "overflow-hidden whitespace-nowrap flex items-center px-3",
                        "transition-[height,opacity] duration-200 ease-linear",
                        "text-[8.5px] uppercase tracking-wider select-none text-gray-500 font-semibold",
                        "pointer-events-none",
                        effectivelyCollapsed
                            ? "h-0 opacity-0"
                            : "h-8 opacity-100",
                    )}
                    aria-hidden={effectivelyCollapsed}
                >
                    {group}
                </h3>

                {items.map((item) => {
                    const isActive = activeTab === item.id;

                    const button = (
                        <button
                            className={cn(
                                "flex w-full items-center gap-2 h-9 px-2 rounded-md overflow-hidden",
                                "text-[10.5px] leading-none",
                                "menu-item select-none transition-colors duration-150",
                                isActive
                                    ? "bg-emerald-500 text-white shadow-md"
                                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700",
                            )}
                            onClick={() => {
                                setActiveTab(item.id);
                                setPreviewPage(1);
                                setPreviewTotalPages(1);
                            }}
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                <span
                                    className={cn(
                                        isActive
                                            ? "text-white"
                                            : "text-gray-500",
                                    )}
                                >
                                    {item.icon}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    "flex-1 text-left whitespace-nowrap overflow-hidden",
                                    "transition-opacity duration-200 ease-linear",
                                    effectivelyCollapsed &&
                                        "opacity-0 pointer-events-none",
                                )}
                                aria-hidden={effectivelyCollapsed}
                            >
                                {item.label}
                            </span>
                        </button>
                    );

                    return (
                        <Tooltip key={item.id}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent
                                side="right"
                                sideOffset={8}
                                hidden={!effectivelyCollapsed}
                                className="text-[9.5px]"
                            >
                                <p>{item.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        ));

    const renderMobileSidebarItems = () =>
        Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="space-y-1 mb-4">
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider px-3 py-1 select-none">
                    {group}
                </h3>
                {items.map((item) => (
                    <button
                        key={item.id}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-all duration-200 select-none ${
                            activeTab === item.id
                                ? "bg-emerald-500 text-white shadow-md"
                                : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                            setPreviewPage(1);
                            setPreviewTotalPages(1);
                        }}
                    >
                        <span
                            className={
                                activeTab === item.id
                                    ? "text-white"
                                    : "text-gray-500"
                            }
                        >
                            {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                    </button>
                ))}
            </div>
        ));

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* ⬇️ SCOPED STYLES — rendered only while Reports is mounted */}
            <style>{REPORT_STYLES}</style>
            <style>{`@page { size: A4 ${orientation}; margin: 0; }`}</style>

            <div className="reports-root h-full flex flex-col">
                {!isPrintPreview && (
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 no-print flex-shrink-0">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
                                    Reports
                                </h1>
                                <p className="text-[12px] text-gray-500">
                                    Review records using search, date filters,
                                    and pagination
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                    <Input
                                        placeholder="Search reports..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="h-9 w-[200px] pl-8 border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none text-[12px] shadow-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <CalendarRange className="h-3.5 w-3.5" />
                                    <DateRangeFilter
                                        start={start}
                                        end={end}
                                        onChange={handleRangeChange}
                                    />
                                </div>
                                <PrintPreviewButton
                                    onPreview={togglePrintPreview}
                                    onPrint={handlePrint}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isPrintPreview && (
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 no-print flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-emerald-500" />
                            <span className="text-[13px] font-semibold text-gray-800">
                                Print Preview
                            </span>
                            <span className="text-[12px] text-gray-400">
                                Page {previewPage} of {previewTotalPages}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={includeGuestNames}
                                    onChange={(e) =>
                                        setIncludeGuestNames(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                />
                                Include guest names
                            </label>

                            <Button
                                onClick={() => setSettingsOpen(true)}
                                variant="outline"
                                className="gap-2 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                Report Settings
                            </Button>
                            <Button
                                onClick={togglePrintPreview}
                                variant="outline"
                                className="gap-2 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                                <X className="h-3.5 w-3.5" />
                                Exit Preview
                            </Button>
                            <Button
                                onClick={handlePrint}
                                className="gap-2 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print / PDF
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    {/* Desktop sidebar */}
                    <div
                        ref={sidebarRef}
                        className={cn(
                            "sidebar-white sidebar-scrollbar no-print shrink-0 relative hidden lg:block",
                            "overflow-x-hidden overflow-y-auto",
                            "transition-[width] duration-200 ease-linear motion-reduce:transition-none",
                        )}
                        style={{
                            width: isPrintPreview
                                ? 224 + sbw
                                : sidebarCollapsed
                                  ? 61 + sbw
                                  : 224,
                        }}
                    >
                        <div
                            className="sticky top-0 py-3 space-y-3"
                            style={{
                                paddingLeft: 12 + sbw / 2,
                                paddingRight: 12 - sbw / 2,
                            }}
                        >
                            {!isPrintPreview && (
                                <button
                                    type="button"
                                    onClick={toggleSidebar}
                                    aria-label={
                                        sidebarCollapsed
                                            ? "Expand sidebar"
                                            : "Collapse sidebar"
                                    }
                                    aria-expanded={!sidebarCollapsed}
                                    className={cn(
                                        "relative z-10 flex w-full items-center justify-start gap-2 h-9 px-2",
                                        "rounded-md overflow-hidden select-none cursor-pointer",
                                        "text-gray-500 hover:bg-emerald-50 hover:text-emerald-600",
                                        "transition-colors duration-150",
                                        "focus:ring-0 focus:outline-none",
                                    )}
                                >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                        <ChevronLeft
                                            className={cn(
                                                "h-4 w-4 transition-transform duration-200",
                                                sidebarCollapsed &&
                                                    "rotate-180",
                                            )}
                                        />
                                    </span>
                                    <span
                                        className={cn(
                                            "flex-1 text-left whitespace-nowrap overflow-hidden",
                                            "text-[9.5px]",
                                            "transition-opacity duration-200 ease-linear",
                                            sidebarCollapsed &&
                                                "opacity-0 pointer-events-none",
                                        )}
                                        aria-hidden={sidebarCollapsed}
                                    >
                                        Collapse
                                    </span>
                                </button>
                            )}

                            <TooltipProvider delayDuration={0}>
                                {renderSidebarItems()}
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Mobile sidebar */}
                    {!isPrintPreview && (
                        <>
                            <div
                                className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 text-gray-700 transition-transform duration-300 ease-out z-50 flex flex-col shadow-xl lg:hidden mobile-sidebar ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
                            >
                                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                                    <h2 className="font-semibold text-gray-800 text-[14px]">
                                        Reports
                                    </h2>
                                    <button
                                        onClick={toggleMobileMenu}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:ring-0 focus:outline-none"
                                    >
                                        <X className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>
                                <nav className="flex-1 py-4 px-3 overflow-y-auto sidebar-scrollbar">
                                    {renderMobileSidebarItems()}
                                </nav>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden h-8 w-8 rounded-md hover:bg-gray-100 focus:ring-0 focus:outline-none"
                                onClick={toggleMobileMenu}
                            >
                                <Menu className="h-4 w-4 text-gray-500" />
                            </Button>
                            {isMobileMenuOpen && (
                                <div
                                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                            )}
                        </>
                    )}

                    <div
                        className={`flex-1 min-w-0 overflow-y-auto ${!isPrintPreview ? "scrollbar-mint px-6 pb-6" : "px-0 pb-0"}`}
                        style={
                            isPrintPreview
                                ? { background: "#f5f5f5", padding: "0" }
                                : {}
                        }
                    >
                        <div
                            id="printable-report-wrapper"
                            className="print:pb-0 print:mb-0"
                        >
                            {isPrintPreview ? (
                                <div className="print-preview-stage">
                                    <div className="print-preview-sheet-wrap">
                                        <div className="no-print">
                                            <button
                                                className="print-preview-nav-btn"
                                                disabled={previewPage <= 1}
                                                onClick={() =>
                                                    setPreviewPage((p) =>
                                                        Math.max(1, p - 1),
                                                    )
                                                }
                                                title="Previous page"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                        </div>

                                        {renderContent()}

                                        <div className="no-print">
                                            <button
                                                className="print-preview-nav-btn"
                                                disabled={
                                                    previewPage >=
                                                    previewTotalPages
                                                }
                                                onClick={() =>
                                                    setPreviewPage((p) =>
                                                        Math.min(
                                                            previewTotalPages,
                                                            p + 1,
                                                        ),
                                                    )
                                                }
                                                title="Next page"
                                            >
                                                <ChevronRightIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                renderContent()
                            )}
                        </div>
                    </div>
                </div>

                {isPrintPreview && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-xs flex items-center gap-3 no-print z-50">
                        <span>📄 Print Preview</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-300">
                            Page {previewPage} of {previewTotalPages}
                        </span>
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="ml-2 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-xs"
                        >
                            ⚙ Settings
                        </button>
                        <button
                            onClick={togglePrintPreview}
                            className="ml-1 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-xs"
                        >
                            Exit Preview
                        </button>
                        <button
                            onClick={handlePrint}
                            className="ml-1 bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded text-white text-xs"
                        >
                            Print / PDF
                        </button>
                    </div>
                )}
            </div>

            <ReportSettingsDrawer
                open={settingsOpen}
                settings={settings}
                onClose={() => setSettingsOpen(false)}
                onApply={applySettings}
                onReset={resetSettings}
            />
        </div>
    );
}
