import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
    useLayoutEffect,
} from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    ChevronRight,
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
    Download,
    Filter,
    X,
    Menu,
    UserCheck,
    UserX,
    Eye,
    RectangleVertical,
    RectangleHorizontal,
} from "lucide-react";

import api from "@/services/api";
import logo from "../../../../images/logo.png";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Orientation = "portrait" | "landscape";

interface BookedRoomLite {
    id: number;
    status: string;
    check_in_date: string | null;
    check_out_date: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    subtotal?: number;
    room?: { id: number; room_number: string } | null;
}

interface BookingLite {
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

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

interface ReportSummary {
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
    };
}

interface TransactionRow {
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

interface TransactionSummary {
    total_records: number;
    total_revenue: number;
}

interface IncidentRow {
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

interface DashboardStats {
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

interface FinancialTrendPoint {
    name: string;
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
}

interface DashboardIndexResponse {
    stats: DashboardStats;
    financialTrend: FinancialTrendPoint[];
    occupancy: number;
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

interface GuestReport {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    total_stays: number;
    total_spent: number;
    last_visit: string;
}

interface ReviewReport {
    id: number;
    guest_name: string;
    room_number: string;
    rating: number;
    review: string;
    created_at: string;
    response?: string;
}

interface InquiryReport {
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

type TabKey =
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

interface ReportProps {
    start: string;
    end: string;
    searchQuery?: string;
    filterType?: string;
    onSearchChange?: (value: string) => void;
    isPrintPreview?: boolean;
    currentPreviewPage?: number;
    onPagesCountChange?: (count: number) => void;
    /** When false (default), confidential columns are stripped from print/preview. */
    includeGuestNames?: boolean;
    /** Paper orientation used by preview + print. */
    orientation?: Orientation;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * Rows per A4 page depending on orientation and whether this is the
 * last chunk (which must also fit the totals row, "End of Report" and
 * the signature block).
 */
function getRowsPerPage(
    orientation: Orientation,
    pageIndex: number,
    isLastChunk: boolean,
): number {
    if (orientation === "portrait") {
        if (isLastChunk) return pageIndex === 0 ? 14 : 14;
        return pageIndex === 0 ? 16 : 22;
    }
    // landscape
    if (isLastChunk) return 8;
    return pageIndex === 0 ? 8 : 13;
}

/**
 * Split rows into page chunks with the correct capacity for each
 * page index. The last chunk is capped so the footer elements fit.
 */
function paginateRows<T>(rows: T[], orientation: Orientation): T[][] {
    const chunks: T[][] = [];
    let i = 0;
    let pageIndex = 0;
    while (i < rows.length) {
        const remaining = rows.length - i;
        const capacity = getRowsPerPage(orientation, pageIndex, false);
        const wouldBeLast = remaining <= capacity;
        const cap = wouldBeLast
            ? getRowsPerPage(orientation, pageIndex, true)
            : capacity;
        const take = wouldBeLast ? Math.min(remaining, cap) : capacity;
        chunks.push(rows.slice(i, i + take));
        i += take;
        pageIndex += 1;
    }
    if (chunks.length === 0) chunks.push([]);
    return chunks;
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                */
/* -------------------------------------------------------------------------- */

const currency = (value: number | null | undefined) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(value ?? 0));

const currencyPlain = (value: number | null | undefined) =>
    new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));

const currencyCompact = (value: number | null | undefined) => {
    const num = Number(value ?? 0);
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 1_000_000_000)
        return `${sign}₱${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}₱${(abs / 1_000).toFixed(1)}K`;
    return `${sign}₱${abs.toFixed(0)}`;
};

const dateFmt = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const timeFmt = (value: string | null | undefined) => {
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

const guestName = (b: BookingLite) => {
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

const sentenceCase = (s: string | null | undefined) => {
    if (!s) return "—";
    const cleaned = s.replace(/_/g, " ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

const anonGuest = (index: number) =>
    `Guest ${String(index + 1).padStart(3, "0")}`;

async function apiGet<T>(url: string): Promise<T> {
    const response = await api.get<T>(url);
    return response.data;
}

async function fetchJson<T>(url: string): Promise<T> {
    return apiGet<T>(url);
}

/* -------------------------------------------------------------------------- */
/*  Pagination Component (on-screen only)                                     */
/* -------------------------------------------------------------------------- */

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
}

function Pagination({
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
                    className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50 disabled:opacity-40"
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
                                    : "border-gray-200 hover:bg-gray-50"
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
                    className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                    <ChevronRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar items                                                             */
/* -------------------------------------------------------------------------- */

interface ReportMenuItem {
    id: TabKey;
    label: string;
    icon: React.ReactNode;
    group: string;
}

const reportMenuItems: ReportMenuItem[] = [
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

/* -------------------------------------------------------------------------- */
/*  Date Range Filter                                                         */
/* -------------------------------------------------------------------------- */

function DateRangeFilter({
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

/* -------------------------------------------------------------------------- */
/*  Document Sheet                                                            */
/* -------------------------------------------------------------------------- */

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
    orientation: Orientation;
}

function DocumentSheet({
    reportTitle,
    periodText,
    generatedText,
    pageNumber,
    totalPages,
    isLastPage,
    children,
    summarySentence,
    containsPersonalInfo,
    orientation,
}: DocumentSheetProps) {
    return (
        <div className="doc-sheet" data-orientation={orientation}>
            <div className="doc-letterhead">
                <div className="doc-logo-wrap">
                    <img
                        src={logo}
                        alt="Hotel Logo"
                        className="doc-logo"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                                "none";
                        }}
                    />
                </div>
                <div className="doc-letterhead-text">
                    <div className="doc-hotel-name">
                        Lyn Enia's Traveler's Inn
                    </div>
                    <div className="doc-report-title">{reportTitle}</div>
                    <div className="doc-meta">
                        <span>Period: {periodText}</span>
                        <span className="doc-meta-sep">·</span>
                        <span>Generated: {generatedText}</span>
                    </div>
                    {containsPersonalInfo && (
                        <div className="doc-pii-notice">
                            Contains personal information
                        </div>
                    )}
                </div>
            </div>
            <div className="doc-rule" />

            {pageNumber === 1 && summarySentence && (
                <p className="doc-summary">{summarySentence}</p>
            )}

            <div className="doc-body">{children}</div>

            {isLastPage && (
                <div className="doc-signatures">
                    <div className="doc-signature-block">
                        <span className="doc-signature-label">
                            Prepared by:
                        </span>
                        <span className="doc-signature-line" />
                    </div>
                    <div className="doc-signature-block">
                        <span className="doc-signature-label">Noted by:</span>
                        <span className="doc-signature-line" />
                    </div>
                </div>
            )}

            <div className="doc-footer">
                <span>Lyn Enia's Traveler's Inn</span>
                <span className="doc-footer-center">
                    Confidential – For internal use
                </span>
                <span>
                    Page {pageNumber} of {totalPages}
                </span>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Document Table                                                            */
/* -------------------------------------------------------------------------- */

interface DocColumn<T> {
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

function DocumentTable<T>({
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
                                    whiteSpace: c.nowrap
                                        ? "nowrap"
                                        : undefined,
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
                <div className="doc-end-of-report">
                    *** End of Report ***
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  On-screen header                                                          */
/* -------------------------------------------------------------------------- */

function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
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
/*  DASHBOARD REPORT                                                          */
/* ========================================================================== */

function DashboardReport({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trend, setTrend] = useState<FinancialTrendPoint[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [occupancy, setOccupancy] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = start && end ? `?from=${start}&to=${end}` : "";
        fetchJson<DashboardIndexResponse>(`/dashboard${params}`)
            .then((data) => {
                if (cancelled) return;
                setStats(data.stats);
                setTrend(data.financialTrend || []);
                setRecentBookings(data.recentBookings || []);
                setOccupancy(data.occupancy || 0);
            })
            .catch((err) => console.error("Dashboard API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredTrend = useMemo(() => {
        if (!searchQuery) return trend;
        const q = searchQuery.toLowerCase();
        return trend.filter(
            (t) => t.name.toLowerCase().includes(q) || t.date.includes(q),
        );
    }, [trend, searchQuery]);

    const chunks = useMemo(
        () => paginateRows(filteredTrend, orientation),
        [filteredTrend, orientation],
    );
    const totalPages = Math.max(1, chunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPages);
        }
    }, [isPrintPreview, totalPages, onPagesCountChange]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const occupancyRate =
        stats && stats.rooms > 0
            ? Math.min((stats.bookings / stats.rooms) * 100, 100)
            : Math.min(occupancy, 100);

    const totalRevenue = filteredTrend.reduce((s, r) => s + r.revenue, 0);
    const totalExpenses = filteredTrend.reduce((s, r) => s + r.expenses, 0);
    const totalProfit = filteredTrend.reduce((s, r) => s + r.profit, 0);

    const today = new Date().toISOString().split("T")[0];
    const checkInsToday = recentBookings.filter((b: any) => {
        const ci = b.check_in_date
            ? new Date(b.check_in_date).toISOString().split("T")[0]
            : "";
        return ci === today && b.booking_status === "checked_in";
    }).length;
    const checkOutsToday = recentBookings.filter((b: any) => {
        const co = b.check_out_date
            ? new Date(b.check_out_date).toISOString().split("T")[0]
            : "";
        return co === today && b.booking_status === "checked_out";
    }).length;
    const pendingBookings = recentBookings.filter(
        (b: any) => b.booking_status === "pending",
    ).length;
    const roomsAvailable = stats
        ? Math.max(0, stats.rooms - stats.bookings)
        : 0;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const subtitle = `${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`;

    if (isPrintPreview) {
        const summary =
            `As of ${dateRangeText.toLowerCase() === "all dates" ? "all dates" : dateRangeText}, ` +
            `the property has ${stats?.guests ?? 0} registered guest${(stats?.guests ?? 0) === 1 ? "" : "s"} and ` +
            `${stats?.rooms ?? 0} room${(stats?.rooms ?? 0) === 1 ? "" : "s"} with an occupancy rate of ` +
            `${occupancyRate.toFixed(1)}%. Total revenue is ₱${currencyPlain(totalRevenue)} against expenses of ` +
            `₱${currencyPlain(totalExpenses)}, resulting in a net profit of ₱${currencyPlain(totalProfit)}. ` +
            `Today there are ${checkInsToday} check-in${checkInsToday === 1 ? "" : "s"} and ` +
            `${checkOutsToday} check-out${checkOutsToday === 1 ? "" : "s"} recorded, ` +
            `${pendingBookings} pending booking${pendingBookings === 1 ? "" : "s"}, and ${roomsAvailable} room${roomsAvailable === 1 ? "" : "s"} available.`;

        const columns: DocColumn<FinancialTrendPoint>[] = [
            { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
            { key: "date", label: "Period", weight: 4, render: (r) => r.name },
            {
                key: "revenue",
                label: "Revenue",
                weight: 3,
                align: "right",
                render: (r) => `₱${currencyPlain(r.revenue)}`,
            },
            {
                key: "expenses",
                label: "Expenses",
                weight: 3,
                align: "right",
                render: (r) => `₱${currencyPlain(r.expenses)}`,
            },
            {
                key: "profit",
                label: "Profit",
                weight: 3,
                align: "right",
                render: (r) => `₱${currencyPlain(r.profit)}`,
            },
        ];

        let startIdx = 0;
        return (
            <div className="space-y-4 print:space-y-0">
                {chunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === chunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Dashboard Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPages}
                                isLastPage={isLast}
                                summarySentence={summary}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<FinancialTrendPoint>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showTotal={isLast}
                                    totalLabel="Total Revenue"
                                    totalValue={totalRevenue}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    /* ── On-screen ── */
    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader title="Dashboard Report" subtitle={subtitle} />

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Guests
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats?.guests ?? 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Rooms
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats?.rooms ?? 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Occupancy Rate
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {occupancyRate.toFixed(1)}%
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Revenue
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(stats?.revenue)}
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                    <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                        Quick Stats
                    </h3>
                    <div className="space-y-2.5 print:space-y-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Check-ins Today
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {checkInsToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Check-outs Today
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {checkOutsToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Pending Bookings
                            </span>
                            <span className="bg-amber-500 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-amber-500 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {pendingBookings}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Rooms Available
                            </span>
                            <span className="bg-gray-600 text-white text-[11.5px] px-2.5 py-0.5 rounded-full print:bg-gray-600 print:text-white print:text-[9px] print:px-1.5 tabular-nums">
                                {roomsAvailable}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                    <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                        Revenue Summary
                    </h3>
                    <div className="space-y-2.5 print:space-y-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Total Revenue
                            </span>
                            <span className="font-medium text-[12.5px] text-gray-800 print:text-[10px] tabular-nums">
                                {currency(totalRevenue)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Total Expenses
                            </span>
                            <span className="font-medium text-[12.5px] text-orange-600 print:text-[10px] tabular-nums">
                                {currency(totalExpenses)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                Net Profit
                            </span>
                            <span
                                className={`font-medium text-[12.5px] ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} print:text-[10px] tabular-nums`}
                            >
                                {currency(totalProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 print:text-[11px]">
                    Recent Activity
                </h3>
                <p className="text-[12px] text-gray-500 mb-3 print:text-[9px] print:mb-1">
                    Latest updates and events
                </p>
                <div className="space-y-2.5 print:space-y-1">
                    {recentBookings.length === 0 ? (
                        <div className="text-center text-gray-400 py-3 text-[12px] print:text-[10px] print:py-1">
                            No recent activity
                        </div>
                    ) : (
                        recentBookings
                            .slice(0, 4)
                            .map((booking: any, index: number) => {
                                const guest =
                                    booking.walk_in_guest?.full_name ||
                                    `${booking.user?.first_name || ""} ${booking.user?.last_name || ""}`.trim() ||
                                    "Guest";
                                const room =
                                    booking.booked_rooms?.[0]?.room
                                        ?.room_number || "N/A";
                                const status =
                                    booking.booking_status || "pending";
                                const time = new Date(
                                    booking.updated_at,
                                ).toLocaleString("en-PH", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                });
                                let icon = (
                                    <UserCheck className="h-4 w-4 text-gray-600 print:h-3 print:w-3" />
                                );
                                let message = `${guest} checked in - Room ${room}`;
                                if (status === "checked_out") {
                                    icon = (
                                        <UserX className="h-4 w-4 text-red-400 print:h-3 print:w-3" />
                                    );
                                    message = `${guest} checked out - Room ${room}`;
                                } else if (status === "pending") {
                                    icon = (
                                        <Calendar className="h-4 w-4 text-amber-500 print:h-3 print:w-3" />
                                    );
                                    message = `New booking - ${guest} (Room ${room})`;
                                } else if (status === "confirmed") {
                                    icon = (
                                        <CreditCard className="h-4 w-4 text-gray-600 print:h-3 print:w-3" />
                                    );
                                    message = `Payment received - Booking #${booking.booking_reference}`;
                                } else if (status === "cancelled") {
                                    icon = (
                                        <AlertTriangle className="h-4 w-4 text-red-500 print:h-3 print:w-3" />
                                    );
                                    message = `Booking cancelled - ${guest} (Room ${room})`;
                                }
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 text-[12.5px] p-2 rounded-lg hover:bg-gray-50 print:hover:bg-transparent print:text-[10px] print:p-1"
                                    >
                                        {icon}
                                        <span className="text-gray-700">
                                            {message}
                                        </span>
                                        <span className="text-[11px] text-gray-400 ml-auto print:text-[9px]">
                                            {time}
                                        </span>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  BOOKING REPORTS                                                           */
/* ========================================================================== */

function BookingReports({
    start,
    end,
    searchQuery,
    onSearchChange,
    isPrintPreview,
    currentPreviewPage = 1,
    onPagesCountChange,
    includeGuestNames,
    orientation = "portrait",
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("all");
    const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery ?? "");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery ?? ""), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [start, end, debouncedSearch, statusFilter, bookingTypeFilter]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (bookingTypeFilter !== "all")
            params.set("booking_type", bookingTypeFilter);

        if (isPrintPreview) {
            params.set("page", "1");
            params.set("per_page", "1000");
        } else {
            params.set("page", String(currentPage));
            params.set("per_page", String(perPage));
        }

        fetchJson<ReportSummary>(`/reports?${params.toString()}`)
            .then((data) => !cancelled && setSummary(data))
            .catch((err) => {
                console.error("Booking API error:", err);
                if (!cancelled) setSummary(null);
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [
        start,
        end,
        debouncedSearch,
        statusFilter,
        bookingTypeFilter,
        currentPage,
        perPage,
        isPrintPreview,
    ]);

    const bookings = summary?.bookings?.data ?? [];
    const totalBookings =
        summary?.summary?.total_bookings ?? summary?.total_bookings ?? 0;
    const checkedIn = summary?.summary?.checked_in ?? summary?.checked_in ?? 0;
    const checkedOut = summary?.summary?.checked_out ?? 0;
    const pending = summary?.summary?.pending ?? 0;
    const cancelled = summary?.summary?.cancelled ?? 0;
    const refunded = summary?.summary?.refunded ?? 0;

    const bookingChunks = useMemo(
        () => paginateRows(bookings, orientation),
        [bookings, orientation],
    );
    const previewTotalPages = Math.max(1, bookingChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(previewTotalPages);
        }
    }, [isPrintPreview, previewTotalPages, onPagesCountChange]);

    if (loading && !summary) return <Skeleton className="h-64 w-full" />;

    const lastPage = summary?.bookings?.last_page ?? 1;
    const total = summary?.bookings?.total ?? 0;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const subtitle = `${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`;

    const columns: DocColumn<BookingLite>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "ref",
            label: "Reference",
            weight: 4,
            nowrap: true,
            render: (b) => b.booking_reference ?? b.id,
        },
        {
            key: "type",
            label: "Type",
            weight: 2,
            nowrap: true,
            render: (b) => sentenceCase(b.booking_type ?? "—"),
        },
        {
            key: "guest",
            label: "Guest",
            weight: 4,
            confidential: true,
            render: (b) => guestName(b),
        },
        {
            key: "rooms",
            label: "Room(s)",
            weight: 2,
            nowrap: true,
            render: (b) =>
                b.room_numbers ??
                b.rooms
                    ?.map((r) => r.room_number)
                    .filter(Boolean)
                    .join(", ") ??
                b.room_number ??
                "—",
        },
        {
            key: "status",
            label: "Status",
            weight: 3,
            nowrap: true,
            render: (b) =>
                sentenceCase(
                    b.aggregate_status ?? b.booking_status ?? "pending",
                ),
        },
        {
            key: "total",
            label: "Total",
            weight: 3,
            align: "right",
            nowrap: true,
            render: (b) => `₱${currencyPlain(b.total_price)}`,
        },
        {
            key: "in",
            label: "Check In",
            weight: 3,
            nowrap: true,
            render: (b) => {
                const v =
                    b.earliest_check_in ??
                    b.rooms?.[0]?.check_in_time ??
                    b.bookedRooms?.[0]?.check_in_time ??
                    b.rooms?.[0]?.check_in_date ??
                    b.bookedRooms?.[0]?.check_in_date;
                return b.earliest_check_in ||
                    b.rooms?.[0]?.check_in_time ||
                    b.bookedRooms?.[0]?.check_in_time
                    ? timeFmt(v)
                    : dateFmt(v);
            },
        },
        {
            key: "out",
            label: "Check Out",
            weight: 3,
            nowrap: true,
            render: (b) => {
                const v =
                    b.latest_check_out ??
                    b.rooms?.[0]?.check_out_time ??
                    b.bookedRooms?.[0]?.check_out_time ??
                    b.rooms?.[0]?.check_out_date ??
                    b.bookedRooms?.[0]?.check_out_date;
                return b.latest_check_out ||
                    b.rooms?.[0]?.check_out_time ||
                    b.bookedRooms?.[0]?.check_out_time
                    ? timeFmt(v)
                    : dateFmt(v);
            },
        },
    ];

    const totalAmountAll = bookings.reduce(
        (sum, b) => sum + Number(b.total_price ?? 0),
        0,
    );

    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;
    const summarySentence =
        `This report lists ${total} booking${total === 1 ? "" : "s"} for ${periodLower}: ` +
        `${checkedIn} checked in, ${checkedOut} checked out, ${pending} pending, ` +
        `${cancelled} cancelled, and ${refunded} refunded.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div
                className="space-y-4 print:space-y-0"
                data-loading={loading ? "true" : "false"}
            >
                {bookingChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === bookingChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Booking Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={previewTotalPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<BookingLite>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    emptyText="No bookings on this page."
                                    showTotal={isLast}
                                    totalLabel="Total Amount"
                                    totalValue={totalAmountAll}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    /* ── On-screen ── */
    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader title="Booking Reports" subtitle={subtitle} />

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Total Bookings
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {totalBookings}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Checked In
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {checkedIn}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Checked Out
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {checkedOut}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Pending
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {pending}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Cancelled
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {cancelled}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:mb-1">
                    <div>
                        <h3 className="text-[14px] font-semibold text-gray-800 print:text-[11px]">
                            Booking List
                        </h3>
                        <p className="text-[12px] text-gray-500 print:text-[9px]">
                            {total} booking(s) found
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 no-print">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search bookings..."
                                value={searchQuery}
                                onChange={(e) =>
                                    onSearchChange?.(e.target.value)
                                }
                                className="h-9 w-[200px] pl-8 text-[12px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 border border-gray-200 rounded px-2 text-[12px] focus:outline-none focus:border-gray-400 bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="checked_out">Checked Out</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <select
                            value={bookingTypeFilter}
                            onChange={(e) =>
                                setBookingTypeFilter(e.target.value)
                            }
                            className="h-9 border border-gray-200 rounded px-2 text-[12px] focus:outline-none focus:border-gray-400 bg-white"
                        >
                            <option value="all">All Types</option>
                            <option value="online">Online</option>
                            <option value="walk_in">Walk-in</option>
                        </select>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Reference
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Type
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Guest
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Room(s)
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Status
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Total
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Check In
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Check Out
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((b) => (
                                    <tr
                                        key={b.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-3 py-2 border border-gray-200 font-medium font-mono text-gray-900">
                                            {b.booking_reference ?? b.id}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(
                                                b.booking_type ?? "—",
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {guestName(b)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {b.room_numbers ??
                                                b.rooms
                                                    ?.map(
                                                        (r) => r.room_number,
                                                    )
                                                    .filter(Boolean)
                                                    .join(", ") ??
                                                b.room_number ??
                                                "—"}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            <span className="inline-flex items-center rounded border border-gray-300 px-1.5 py-0.5 text-[12px]">
                                                {sentenceCase(
                                                    b.aggregate_status ??
                                                        b.booking_status ??
                                                        "pending",
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-right font-medium tabular-nums text-gray-900">
                                            {currency(b.total_price)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {b.earliest_check_in ||
                                            b.rooms?.[0]?.check_in_time ||
                                            b.bookedRooms?.[0]?.check_in_time
                                                ? timeFmt(
                                                      b.earliest_check_in ??
                                                          b.rooms?.[0]
                                                              ?.check_in_time ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_in_time,
                                                  )
                                                : dateFmt(
                                                      b.rooms?.[0]
                                                          ?.check_in_date ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_in_date,
                                                  )}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {b.latest_check_out ||
                                            b.rooms?.[0]?.check_out_time ||
                                            b.bookedRooms?.[0]?.check_out_time
                                                ? timeFmt(
                                                      b.latest_check_out ??
                                                          b.rooms?.[0]
                                                              ?.check_out_time ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_out_time,
                                                  )
                                                : dateFmt(
                                                      b.rooms?.[0]
                                                          ?.check_out_date ??
                                                          b.bookedRooms?.[0]
                                                              ?.check_out_date,
                                                  )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {lastPage > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        total={total}
                        perPage={perPage}
                        onPageChange={(p) => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  GUEST REPORTS                                                             */
/* ========================================================================== */

function GuestReports({
    start,
    end,
    searchQuery,
    onSearchChange,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [guests, setGuests] = useState<GuestReport[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        new: 0,
        returning: 0,
        satisfaction: 0,
    });

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        params.set("page", "1");
        params.set("per_page", isPrintPreview ? "1000" : String(perPage));
        if (!isPrintPreview) params.set("page", String(currentPage));

        fetchJson<{ data: GuestReport[]; last_page?: number; total?: number }>(
            `/reports/guests?${params.toString()}`,
        )
            .then((data) => {
                if (!cancelled) {
                    setGuests(data.data);
                    setTotalRecords(data.total ?? data.data.length);
                    setStats({
                        total: data.total ?? data.data.length,
                        new: data.data.filter((g) => g.total_stays === 1)
                            .length,
                        returning: data.data.filter((g) => g.total_stays > 1)
                            .length,
                        satisfaction: 4.8,
                    });
                }
            })
            .catch((err) => console.error("Guest API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end, searchQuery, currentPage, perPage, isPrintPreview]);

    const filteredGuests = useMemo(() => {
        if (!searchQuery) return guests;
        const q = searchQuery.toLowerCase();
        return guests.filter(
            (g) =>
                `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
                g.email.toLowerCase().includes(q) ||
                g.phone.includes(q),
        );
    }, [guests, searchQuery]);

    const guestChunks = useMemo(
        () => paginateRows(filteredGuests, orientation),
        [filteredGuests, orientation],
    );
    const totalPreviewPages = Math.max(1, guestChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";

    const columns: DocColumn<GuestReport>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "anon",
            label: "Guest ID",
            weight: 3,
            render: (_g, i) => anonGuest(i),
        },
        {
            key: "name",
            label: "Guest Name",
            weight: 4,
            confidential: true,
            render: (g) => `${g.first_name} ${g.last_name}`,
        },
        {
            key: "email",
            label: "Email",
            weight: 4,
            confidential: true,
            render: (g) => g.email || "—",
        },
        {
            key: "phone",
            label: "Phone",
            weight: 3,
            confidential: true,
            render: (g) => g.phone || "—",
        },
        {
            key: "stays",
            label: "Total Stays",
            weight: 3,
            align: "right",
            render: (g) => g.total_stays,
        },
        {
            key: "spent",
            label: "Total Spent",
            weight: 3,
            align: "right",
            render: (g) => `₱${currencyPlain(g.total_spent)}`,
        },
    ];

    const totalSpentAll = filteredGuests.reduce(
        (s, g) => s + Number(g.total_spent ?? 0),
        0,
    );

    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;
    const summarySentence =
        `This report lists ${stats.total} guest${stats.total === 1 ? "" : "s"} for ${periodLower}. ` +
        `Of these, ${stats.new} ${stats.new === 1 ? "is a new guest" : "are new guests"} ` +
        `and ${stats.returning} ${stats.returning === 1 ? "is a returning guest" : "are returning guests"}, ` +
        `with an average satisfaction rating of ${stats.satisfaction.toFixed(1)} out of 5.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div className="space-y-4 print:space-y-0">
                {guestChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === guestChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Guest Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<GuestReport>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    emptyText="No guest data found."
                                    showTotal={isLast}
                                    totalLabel="Total Spent"
                                    totalValue={totalSpentAll}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    /* ── On-screen ── */
    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Guest Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Total Guests
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats.total}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        New Guests (30 days)
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats.new}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Returning Guests
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats.returning}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Guest Satisfaction
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {stats.satisfaction} ★
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <div className="flex items-center justify-between mb-3 print:mb-1">
                    <h3 className="text-[14px] font-semibold text-gray-800 print:text-[11px]">
                        Top Guests
                    </h3>
                    {!isPrintPreview && (
                        <div className="relative no-print">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search guests..."
                                value={searchQuery}
                                onChange={(e) =>
                                    onSearchChange?.(e.target.value)
                                }
                                className="h-9 w-[200px] pl-8 text-[12px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
                            />
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Guest Name
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Email
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Phone
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Total Stays
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Total Spent
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGuests.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No guest data found.
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.map((g) => (
                                    <tr key={g.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-200 font-medium text-gray-900">
                                            {g.first_name} {g.last_name}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {g.email}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {g.phone}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-right tabular-nums text-gray-900">
                                            {g.total_stays}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-right font-medium tabular-nums text-gray-900">
                                            {currency(g.total_spent)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    lastPage={Math.ceil(stats.total / perPage)}
                    total={stats.total}
                    perPage={perPage}
                    onPageChange={(p) => {
                        setCurrentPage(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onPerPageChange={(n) => {
                        setPerPage(n);
                        setCurrentPage(1);
                    }}
                />
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  REVENUE REPORTS                                                           */
/* ========================================================================== */

function RevenueReports({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trend, setTrend] = useState<FinancialTrendPoint[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = start && end ? `?from=${start}&to=${end}` : "";
        Promise.all([
            fetchJson<DashboardIndexResponse>("/dashboard"),
            params
                ? fetchJson<{ financialRangeTrend: FinancialTrendPoint[] }>(
                      `/dashboard/financial-range${params}`,
                  )
                : Promise.resolve(null),
        ])
            .then(([dash, range]) => {
                if (cancelled) return;
                setStats(dash.stats);
                setTrend(
                    range
                        ? range.financialRangeTrend
                        : dash.financialTrend || [],
                );
            })
            .catch((err) => console.error("Revenue API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    const filteredTrend = useMemo(() => {
        if (!searchQuery) return trend;
        const q = searchQuery.toLowerCase();
        return trend.filter(
            (t) => t.name.toLowerCase().includes(q) || t.date.includes(q),
        );
    }, [trend, searchQuery]);

    const trendChunks = useMemo(
        () => paginateRows(filteredTrend, orientation),
        [filteredTrend, orientation],
    );
    const totalPreviewPages = Math.max(1, trendChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const totalRevenue = filteredTrend.reduce((s, r) => s + r.revenue, 0);
    const totalExpenses = filteredTrend.reduce((s, r) => s + r.expenses, 0);
    const totalProfit = filteredTrend.reduce((s, r) => s + r.profit, 0);
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const columns: DocColumn<FinancialTrendPoint>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        { key: "date", label: "Date", weight: 3, render: (r) => r.name },
        {
            key: "revenue",
            label: "Revenue",
            weight: 3,
            align: "right",
            render: (r) => `₱${currencyPlain(r.revenue)}`,
        },
        {
            key: "expenses",
            label: "Expenses",
            weight: 3,
            align: "right",
            render: (r) => `₱${currencyPlain(r.expenses)}`,
        },
        {
            key: "profit",
            label: "Profit",
            weight: 3,
            align: "right",
            render: (r) => `₱${currencyPlain(r.profit)}`,
        },
        {
            key: "margin",
            label: "Margin",
            weight: 2,
            align: "right",
            render: (r) =>
                `${r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : "0.0"}%`,
        },
    ];

    const summarySentence =
        `Total revenue for ${periodLower} is ₱${currencyPlain(totalRevenue)} against ` +
        `expenses of ₱${currencyPlain(totalExpenses)}, resulting in a net profit of ` +
        `₱${currencyPlain(totalProfit)}.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div className="space-y-4 print:space-y-0">
                {trendChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === trendChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Revenue Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<FinancialTrendPoint>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showTotal={isLast}
                                    totalLabel="Total Revenue"
                                    totalValue={totalRevenue}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Revenue Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Revenue
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(totalRevenue)}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Expenses
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(totalExpenses)}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Net Profit
                    </div>
                    <div
                        className={`text-3xl font-semibold mt-2 print:text-[16px] print:mt-1 tabular-nums ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                        {currencyCompact(totalProfit)}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Average Daily Rate
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(
                            filteredTrend.length > 0
                                ? totalRevenue / filteredTrend.length
                                : 0,
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                    Revenue Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Date
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Revenue
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Expenses
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Profit
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Margin
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTrend.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No revenue data found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTrend.map((row) => {
                                    const margin =
                                        row.revenue > 0
                                            ? (row.profit / row.revenue) * 100
                                            : 0;
                                    return (
                                        <tr
                                            key={row.date}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                                {row.name}
                                            </td>
                                            <td className="px-3 py-2 border border-gray-200 text-right tabular-nums text-emerald-600">
                                                {currency(row.revenue)}
                                            </td>
                                            <td className="px-3 py-2 border border-gray-200 text-right tabular-nums text-orange-600">
                                                {currency(row.expenses)}
                                            </td>
                                            <td
                                                className={`px-3 py-2 border border-gray-200 text-right font-medium tabular-nums ${row.profit >= 0 ? "text-blue-600" : "text-red-600"}`}
                                            >
                                                {currency(row.profit)}
                                            </td>
                                            <td
                                                className={`px-3 py-2 border border-gray-200 text-right tabular-nums ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                            >
                                                {margin.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  TRANSACTION REPORTS                                                       */
/* ========================================================================== */

function TransactionReports({
    start,
    end,
    searchQuery,
    onSearchChange,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<TransactionRow[]>([]);
    const [summary, setSummary] = useState<TransactionSummary | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [lastPage, setLastPage] = useState(1);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        if (isPrintPreview) {
            params.set("page", "1");
            params.set("per_page", "1000");
        } else {
            params.set("page", String(currentPage));
            params.set("per_page", String(perPage));
        }

        Promise.all([
            fetchJson<Paginated<TransactionRow>>(
                `/reports/transactions?${params.toString()}`,
            ),
            fetchJson<TransactionSummary>("/reports/transactions/summary"),
        ])
            .then(([list, sum]) => {
                if (cancelled) return;
                setRows(list.data);
                setTotalRecords(list.total);
                setLastPage(list.last_page);
                setSummary(sum);
            })
            .catch((err) => console.error("Transaction API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end, currentPage, perPage, isPrintPreview]);

    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(
            (r) =>
                r.booking_reference.toLowerCase().includes(q) ||
                r.guest.toLowerCase().includes(q) ||
                (r.payment_method &&
                    r.payment_method.toLowerCase().includes(q)) ||
                r.booking_type.toLowerCase().includes(q),
        );
    }, [rows, searchQuery]);

    const txChunks = useMemo(
        () => paginateRows(filteredRows, orientation),
        [filteredRows, orientation],
    );
    const totalPreviewPages = Math.max(1, txChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading && rows.length === 0)
        return <Skeleton className="h-64 w-full" />;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const columns: DocColumn<TransactionRow>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "ref",
            label: "Reference",
            weight: 4,
            nowrap: true,
            render: (r) => r.booking_reference,
        },
        {
            key: "type",
            label: "Type",
            weight: 2,
            nowrap: true,
            render: (r) => sentenceCase(r.booking_type),
        },
        {
            key: "guest",
            label: "Guest",
            weight: 4,
            confidential: true,
            render: (r) => r.guest,
        },
        {
            key: "method",
            label: "Method",
            weight: 2,
            render: (r) => r.payment_method ?? "—",
        },
        {
            key: "amount",
            label: "Amount",
            weight: 3,
            align: "right",
            nowrap: true,
            render: (r) =>
                `₱${currencyPlain(r.payment_status === "paid" ? r.amount : 0)}`,
        },
        {
            key: "refunded",
            label: "Refunded",
            weight: 2,
            align: "right",
            nowrap: true,
            render: (r) =>
                r.refunded_amount > 0
                    ? `₱${currencyPlain(r.refunded_amount)}`
                    : "—",
        },
        {
            key: "date",
            label: "Date",
            weight: 3,
            nowrap: true,
            render: (r) => dateFmt(r.date),
        },
    ];

    const totalPaid = filteredRows.reduce(
        (s, r) => s + (r.payment_status === "paid" ? Number(r.amount ?? 0) : 0),
        0,
    );

    const summarySentence =
        `A total of ${summary?.total_records ?? filteredRows.length} transaction` +
        `${(summary?.total_records ?? filteredRows.length) === 1 ? "" : "s"} recorded for ${periodLower}, ` +
        `with a total collected revenue of ₱${currencyPlain(summary?.total_revenue ?? totalPaid)}.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div
                className="space-y-4 print:space-y-0"
                data-loading={loading ? "true" : "false"}
            >
                {txChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === txChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Transaction Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<TransactionRow>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showTotal={isLast}
                                    totalLabel="Total Amount"
                                    totalValue={totalPaid}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Transaction Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-2 print:grid-cols-2 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Transactions
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {summary?.total_records ?? 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 min-w-0">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px] truncate">
                        Total Revenue
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(summary?.total_revenue)}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <div className="flex items-center justify-between mb-3 print:mb-1">
                    <div>
                        <h3 className="text-[14px] font-semibold text-gray-800 print:text-[11px]">
                            Transaction List
                        </h3>
                        <p className="text-[12px] text-gray-500 print:text-[9px]">
                            {filteredRows.length} transaction(s) found
                        </p>
                    </div>
                    {!isPrintPreview && (
                        <div className="flex items-center gap-2 no-print">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                <Input
                                    placeholder="Search transactions..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        onSearchChange?.(e.target.value)
                                    }
                                    className="h-9 w-[200px] pl-8 text-[12px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export
                            </Button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Reference
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Type
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Guest
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Method
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Amount
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Refunded
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-200 font-medium font-mono text-gray-900">
                                            {r.booking_reference}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(r.booking_type)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {r.guest}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {r.payment_method ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-right tabular-nums text-gray-900">
                                            {currency(
                                                r.payment_status === "paid"
                                                    ? r.amount
                                                    : 0,
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-right tabular-nums text-gray-900">
                                            {r.refunded_amount > 0
                                                ? currency(r.refunded_amount)
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {dateFmt(r.date)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {lastPage > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        total={totalRecords}
                        perPage={perPage}
                        onPageChange={(p) => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  INCIDENT REPORTS                                                          */
/* ========================================================================== */

function IncidentReports({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<IncidentRow[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [lastPage, setLastPage] = useState(1);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        if (isPrintPreview) {
            params.set("page", "1");
            params.set("per_page", "1000");
        } else {
            params.set("page", String(currentPage));
            params.set("per_page", String(perPage));
        }

        fetchJson<Paginated<IncidentRow>>(
            `/reports/incidents?${params.toString()}`,
        )
            .then((data) => {
                if (cancelled) return;
                setRows(data.data);
                setTotalRecords(data.total);
                setLastPage(data.last_page);
            })
            .catch((err) => console.error("Incident API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end, currentPage, perPage, isPrintPreview]);

    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(
            (r) =>
                (r.room?.room_number &&
                    r.room.room_number.toLowerCase().includes(q)) ||
                r.report_type.toLowerCase().includes(q) ||
                r.status.toLowerCase().includes(q) ||
                r.note.toLowerCase().includes(q),
        );
    }, [rows, searchQuery]);

    const incChunks = useMemo(
        () => paginateRows(filteredRows, orientation),
        [filteredRows, orientation],
    );
    const totalPreviewPages = Math.max(1, incChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading && rows.length === 0)
        return <Skeleton className="h-64 w-full" />;

    const byType = {
        damaged: filteredRows.filter((r) => r.report_type === "damaged").length,
        lost: filteredRows.filter((r) => r.report_type === "lost").length,
        found: filteredRows.filter((r) => r.report_type === "found").length,
    };
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const columns: DocColumn<IncidentRow>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "room",
            label: "Room",
            weight: 2,
            nowrap: true,
            render: (r) => r.room?.room_number ?? "—",
        },
        {
            key: "type",
            label: "Type",
            weight: 2,
            render: (r) => sentenceCase(r.report_type),
        },
        {
            key: "status",
            label: "Status",
            weight: 2,
            render: (r) => sentenceCase(r.status),
        },
        {
            key: "note",
            label: "Note",
            weight: 6,
            wrap: true,
            render: (r) => r.note,
        },
        {
            key: "reportedBy",
            label: "Reported By",
            weight: 3,
            confidential: true,
            render: (r) =>
                r.cleaner
                    ? `${r.cleaner.first_name ?? ""} ${r.cleaner.last_name ?? ""}`.trim()
                    : "—",
        },
        {
            key: "reported",
            label: "Reported",
            weight: 3,
            nowrap: true,
            render: (r) => dateFmt(r.reported_at),
        },
    ];

    const summarySentence =
        `A total of ${filteredRows.length} incident${filteredRows.length === 1 ? "" : "s"} recorded for ${periodLower}: ` +
        `${byType.damaged} damaged, ${byType.lost} lost, and ${byType.found} found.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div
                className="space-y-4 print:space-y-0"
                data-loading={loading ? "true" : "false"}
            >
                {incChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === incChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Incident Report"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<IncidentRow>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Incident Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-3 print:grid-cols-3 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Damaged
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {byType.damaged}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Lost
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {byType.lost}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Found
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {byType.found}
                    </div>
                </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                    Incident List
                </h3>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Room
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Type
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Status
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Note
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Reported by
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Reported
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No incidents found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-200 font-medium text-gray-900">
                                            {r.room?.room_number ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(r.report_type)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(r.status)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 max-w-[200px] truncate text-gray-900">
                                            {r.note}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {r.cleaner
                                                ? `${r.cleaner.first_name ?? ""} ${r.cleaner.last_name ?? ""}`.trim()
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {dateFmt(r.reported_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {lastPage > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        total={totalRecords}
                        perPage={perPage}
                        onPageChange={(p) => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  GUEST REVIEWS                                                             */
/* ========================================================================== */

function GuestReviews({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<ReviewReport[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [lastPage, setLastPage] = useState(1);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        if (isPrintPreview) {
            params.set("page", "1");
            params.set("per_page", "1000");
        } else {
            params.set("page", String(currentPage));
            params.set("per_page", String(perPage));
        }

        fetchJson<{ data: ReviewReport[]; last_page?: number; total?: number }>(
            `/reports/reviews?${params.toString()}`,
        )
            .then((data) => {
                if (cancelled) return;
                setReviews(data.data);
                setTotalRecords(data.total ?? data.data.length);
                setLastPage(data.last_page ?? 1);
            })
            .catch((err) => console.error("Reviews API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end, searchQuery, currentPage, perPage, isPrintPreview]);

    const filteredReviews = useMemo(() => {
        if (!searchQuery) return reviews;
        const q = searchQuery.toLowerCase();
        return reviews.filter(
            (r) =>
                r.guest_name.toLowerCase().includes(q) ||
                r.room_number.toLowerCase().includes(q) ||
                r.review.toLowerCase().includes(q),
        );
    }, [reviews, searchQuery]);

    const reviewChunks = useMemo(
        () => paginateRows(filteredReviews, orientation),
        [filteredReviews, orientation],
    );
    const totalPreviewPages = Math.max(1, reviewChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading && reviews.length === 0)
        return <Skeleton className="h-64 w-full" />;

    const avgRating =
        filteredReviews.length > 0
            ? filteredReviews.reduce((s, r) => s + r.rating, 0) /
              filteredReviews.length
            : 0;
    const fiveStar = filteredReviews.filter((r) => r.rating === 5).length;
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const columns: DocColumn<ReviewReport>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "guest",
            label: "Guest",
            weight: 3,
            confidential: true,
            render: (r) => r.guest_name,
        },
        {
            key: "room",
            label: "Room",
            weight: 2,
            nowrap: true,
            render: (r) => r.room_number || "—",
        },
        {
            key: "rating",
            label: "Rating",
            weight: 2,
            align: "right",
            nowrap: true,
            render: (r) => `${r.rating} / 5`,
        },
        {
            key: "review",
            label: "Review",
            weight: 6,
            wrap: true,
            render: (r) => r.review,
        },
        {
            key: "date",
            label: "Date",
            weight: 3,
            nowrap: true,
            render: (r) => dateFmt(r.created_at),
        },
    ];

    const summarySentence =
        `A total of ${totalRecords || filteredReviews.length} review${(totalRecords || filteredReviews.length) === 1 ? "" : "s"} recorded for ${periodLower}, ` +
        `with an average rating of ${avgRating.toFixed(1)} out of 5. ` +
        `${fiveStar} review${fiveStar === 1 ? "" : "s"} received a 5-star rating.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div
                className="space-y-4 print:space-y-0"
                data-loading={loading ? "true" : "false"}
            >
                {reviewChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === reviewChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Guest Reviews"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<ReviewReport>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Guest Reviews"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Average Rating
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {avgRating.toFixed(1)} ★
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Total Reviews
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {totalRecords || filteredReviews.length}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        5-Star Reviews
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {fiveStar}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Response Rate
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        92%
                    </div>
                </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                    Recent Reviews
                </h3>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Guest
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Room
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Rating
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Review
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReviews.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No reviews found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReviews.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-200 font-medium text-gray-900">
                                            {r.guest_name}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {r.room_number}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 tabular-nums text-gray-900">
                                            {r.rating} / 5
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 max-w-[300px] truncate text-gray-900">
                                            {r.review}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {dateFmt(r.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {lastPage > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        total={totalRecords}
                        perPage={perPage}
                        onPageChange={(p) => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  INQUIRIES                                                                 */
/* ========================================================================== */

function InquiriesReports({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [inquiries, setInquiries] = useState<InquiryReport[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 25;

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setTimeout(() => {
            if (cancelled) return;
            setInquiries([
                {
                    id: 1,
                    guest_name: "Sarah Lee",
                    email: "sarah@email.com",
                    subject: "Late check-in request",
                    message: "I will be arriving after midnight. Is that okay?",
                    status: "in_progress",
                    priority: "medium",
                    created_at: "2026-08-26T18:30:00",
                },
                {
                    id: 2,
                    guest_name: "David Park",
                    email: "david@email.com",
                    subject: "Room upgrade inquiry",
                    message: "Is there a possibility to upgrade to a suite?",
                    status: "resolved",
                    priority: "low",
                    created_at: "2026-08-25T14:20:00",
                    responded_at: "2026-08-26T09:00:00",
                },
                {
                    id: 3,
                    guest_name: "Lisa Chen",
                    email: "lisa@email.com",
                    subject: "Special dietary request",
                    message: "I have food allergies. Need gluten-free options.",
                    status: "pending",
                    priority: "high",
                    created_at: "2026-08-24T10:15:00",
                },
            ]);
            setLoading(false);
        }, 1000);
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredInquiries = useMemo(() => {
        if (!searchQuery) return inquiries;
        const q = searchQuery.toLowerCase();
        return inquiries.filter(
            (i) =>
                i.guest_name.toLowerCase().includes(q) ||
                i.subject.toLowerCase().includes(q) ||
                i.message.toLowerCase().includes(q) ||
                i.email.toLowerCase().includes(q),
        );
    }, [inquiries, searchQuery]);

    const inqChunks = useMemo(
        () => paginateRows(filteredInquiries, orientation),
        [filteredInquiries, orientation],
    );
    const totalPreviewPages = Math.max(1, inqChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const pending = filteredInquiries.filter(
        (i) => i.status === "pending",
    ).length;
    const resolved = filteredInquiries.filter(
        (i) => i.status === "resolved",
    ).length;
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;
    const totalPages = Math.ceil(filteredInquiries.length / perPage);
    const paginatedInquiries = filteredInquiries.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage,
    );

    const columns: DocColumn<InquiryReport>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "guest",
            label: "Guest",
            weight: 4,
            confidential: true,
            render: (i) => i.guest_name,
        },
        {
            key: "subject",
            label: "Subject",
            weight: 6,
            wrap: true,
            render: (i) => i.subject,
        },
        {
            key: "status",
            label: "Status",
            weight: 2,
            nowrap: true,
            render: (i) => sentenceCase(i.status),
        },
        {
            key: "priority",
            label: "Priority",
            weight: 2,
            nowrap: true,
            render: (i) => sentenceCase(i.priority),
        },
        {
            key: "received",
            label: "Received",
            weight: 3,
            nowrap: true,
            render: (i) => dateFmt(i.created_at),
        },
    ];

    const summarySentence =
        `A total of ${filteredInquiries.length} inquir${filteredInquiries.length === 1 ? "y" : "ies"} recorded for ${periodLower}, ` +
        `with ${pending} pending and ${resolved} resolved.`;

    if (isPrintPreview) {
        let startIdx = 0;
        return (
            <div className="space-y-4 print:space-y-0">
                {inqChunks.map((chunk, idx) => {
                    const isCurrent = idx + 1 === currentPreviewPage;
                    const isLast = idx === inqChunks.length - 1;
                    const chunkStart = startIdx;
                    startIdx += chunk.length;
                    return (
                        <div
                            key={idx}
                            className="preview-only-pages"
                            style={{ display: isCurrent ? "block" : "none" }}
                        >
                            <DocumentSheet
                                reportTitle="Inquiries & Messages"
                                periodText={dateRangeText}
                                generatedText={new Date().toLocaleString(
                                    "en-PH",
                                )}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                orientation={orientation}
                            >
                                <DocumentTable<InquiryReport>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showEndOfReport={isLast}
                                    includeGuestNames={includeGuestNames}
                                />
                            </DocumentSheet>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Inquiries & Messages"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Total Inquiries
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {filteredInquiries.length}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Pending
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {pending}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Resolved
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {resolved}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Avg Response Time
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        2.5 hrs
                    </div>
                </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                    Inquiry List
                </h3>
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-[12px]"
                        style={{ minWidth: 900 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Guest
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Subject
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Status
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Priority
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Received
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedInquiries.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No inquiries found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedInquiries.map((i) => (
                                    <tr key={i.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-200 font-medium text-gray-900">
                                            {i.guest_name}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {i.subject}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(i.status)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-gray-900">
                                            {sentenceCase(i.priority)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-[11.5px] text-gray-700 whitespace-nowrap tabular-nums">
                                            {dateFmt(i.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        lastPage={totalPages}
                        total={filteredInquiries.length}
                        perPage={perPage}
                        onPageChange={(p) => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  OCCUPANCY REPORTS                                                         */
/* ========================================================================== */

function OccupancyReports({
    start,
    end,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        fetchJson(`/reports/occupancy?${params.toString()}`)
            .then((d) => !cancelled && setData(d))
            .catch((err) => console.error("Occupancy API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const occupancyData = data || {
        total_rooms: 0,
        occupied_rooms: 0,
        available_rooms: 0,
        reserved_rooms: 0,
        dirty_rooms: 0,
        cleaning_rooms: 0,
        maintenance_rooms: 0,
        occupancy_rate: 0,
        room_status: [],
    };
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const summarySentence =
        `Occupancy for ${periodLower}: ${occupancyData.total_rooms} total room${occupancyData.total_rooms === 1 ? "" : "s"}, ` +
        `${occupancyData.occupied_rooms} occupied, ${occupancyData.available_rooms} available, ` +
        `${occupancyData.reserved_rooms} reserved, ${occupancyData.dirty_rooms} dirty, ` +
        `${occupancyData.cleaning_rooms} being cleaned, ${occupancyData.maintenance_rooms} under maintenance. ` +
        `Occupancy rate is ${occupancyData.occupancy_rate}%.`;

    if (isPrintPreview) {
        const statusCols: DocColumn<any>[] = [
            { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
            {
                key: "name",
                label: "Room Status",
                weight: 6,
                render: (r) => r.name,
            },
            {
                key: "value",
                label: "Count",
                weight: 2,
                align: "right",
                render: (r) => r.value || 0,
            },
        ];
        return (
            <div className="space-y-4 print:space-y-0">
                <div className="preview-only-pages">
                    <DocumentSheet
                        reportTitle="Occupancy Report"
                        periodText={dateRangeText}
                        generatedText={new Date().toLocaleString("en-PH")}
                        pageNumber={1}
                        totalPages={1}
                        isLastPage
                        summarySentence={summarySentence}
                        containsPersonalInfo={includeGuestNames}
                        orientation={orientation}
                    >
                        <DocumentTable<any>
                            columns={statusCols}
                            rows={occupancyData.room_status || []}
                            emptyText="No room data available."
                            showEndOfReport
                            includeGuestNames={includeGuestNames}
                        />
                    </DocumentSheet>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Occupancy Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Total Rooms
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {occupancyData.total_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Occupied
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {occupancyData.occupied_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Available
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {occupancyData.available_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Occupancy Rate
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {occupancyData.occupancy_rate || 0}%
                    </div>
                </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2 print:page-break-inside-avoid">
                <h3 className="text-[14px] font-semibold text-gray-800 mb-3 print:text-[11px] print:mb-1">
                    Room Status
                </h3>
                <div className="grid gap-2 md:grid-cols-3 print:grid-cols-3">
                    {occupancyData.room_status &&
                    occupancyData.room_status.length > 0 ? (
                        occupancyData.room_status.map((status: any) => (
                            <div
                                key={status.name}
                                className="flex justify-between items-center border-b border-gray-100 pb-1.5 print:pb-0.5"
                            >
                                <span className="text-[12.5px] text-gray-600 print:text-[10px]">
                                    {status.name}
                                </span>
                                <span className="text-[12.5px] text-gray-800 print:text-[10px] tabular-nums">
                                    {status.value || 0}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-400 py-2 text-[12px] col-span-3 print:text-[10px] print:py-1">
                            No room data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  HOUSEKEEPING REPORTS                                                      */
/* ========================================================================== */

function HousekeepingReports({
    start,
    end,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        fetchJson(`/reports/housekeeping?${params.toString()}`)
            .then((d) => !cancelled && setData(d))
            .catch((err) => console.error("Housekeeping API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const housekeepingData = data || {
        total_dirty_rooms: 0,
        total_cleaning_rooms: 0,
        total_available_rooms: 0,
        total_reserved_rooms: 0,
        total_occupied_rooms: 0,
        total_maintenance_rooms: 0,
    };
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const rows = [
        { name: "Dirty Rooms", value: housekeepingData.total_dirty_rooms || 0 },
        {
            name: "Cleaning",
            value: housekeepingData.total_cleaning_rooms || 0,
        },
        {
            name: "Available",
            value: housekeepingData.total_available_rooms || 0,
        },
        {
            name: "Reserved",
            value: housekeepingData.total_reserved_rooms || 0,
        },
        {
            name: "Occupied",
            value: housekeepingData.total_occupied_rooms || 0,
        },
        {
            name: "Maintenance",
            value: housekeepingData.total_maintenance_rooms || 0,
        },
    ];

    const summarySentence =
        `Housekeeping status for ${periodLower}: ${housekeepingData.total_dirty_rooms || 0} dirty room${(housekeepingData.total_dirty_rooms || 0) === 1 ? "" : "s"}, ` +
        `${housekeepingData.total_cleaning_rooms || 0} being cleaned, ${housekeepingData.total_available_rooms || 0} available, ` +
        `${housekeepingData.total_reserved_rooms || 0} reserved, ${housekeepingData.total_occupied_rooms || 0} occupied, ` +
        `and ${housekeepingData.total_maintenance_rooms || 0} under maintenance.`;

    const columns: DocColumn<any>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "name",
            label: "Category",
            weight: 6,
            render: (r) => r.name,
        },
        {
            key: "value",
            label: "Count",
            weight: 2,
            align: "right",
            render: (r) => r.value,
        },
    ];

    if (isPrintPreview) {
        return (
            <div className="space-y-4 print:space-y-0">
                <div className="preview-only-pages">
                    <DocumentSheet
                        reportTitle="Housekeeping Report"
                        periodText={dateRangeText}
                        generatedText={new Date().toLocaleString("en-PH")}
                        pageNumber={1}
                        totalPages={1}
                        isLastPage
                        summarySentence={summarySentence}
                        containsPersonalInfo={includeGuestNames}
                        orientation={orientation}
                    >
                        <DocumentTable<any>
                            columns={columns}
                            rows={rows}
                            emptyText="No housekeeping data available."
                            showEndOfReport
                            includeGuestNames={includeGuestNames}
                        />
                    </DocumentSheet>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Housekeeping Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 grid-cols-3 print:grid-cols-3 print:gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Dirty Rooms
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {housekeepingData.total_dirty_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Cleaning
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {housekeepingData.total_cleaning_rooms || 0}
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Available
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {housekeepingData.total_available_rooms || 0}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  MAINTENANCE REPORTS                                                       */
/* ========================================================================== */

function MaintenanceReports({
    start,
    end,
    isPrintPreview,
    includeGuestNames,
    orientation = "portrait",
}: ReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (start) params.set("start_date", start);
        if (end) params.set("end_date", end);
        fetchJson(`/reports/maintenance?${params.toString()}`)
            .then((d) => !cancelled && setData(d))
            .catch((err) => console.error("Maintenance API error:", err))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [start, end]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const total = data?.total_maintenance_rooms || 0;
    const summarySentence =
        `As of ${periodLower}, ${total} room${total === 1 ? " is" : "s are"} currently under maintenance.`;

    const rows = [{ name: "Total Maintenance Rooms", value: total }];
    const columns: DocColumn<any>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        {
            key: "name",
            label: "Category",
            weight: 6,
            render: (r) => r.name,
        },
        {
            key: "value",
            label: "Count",
            weight: 2,
            align: "right",
            render: (r) => r.value,
        },
    ];

    if (isPrintPreview) {
        return (
            <div className="space-y-4 print:space-y-0">
                <div className="preview-only-pages">
                    <DocumentSheet
                        reportTitle="Maintenance Report"
                        periodText={dateRangeText}
                        generatedText={new Date().toLocaleString("en-PH")}
                        pageNumber={1}
                        totalPages={1}
                        isLastPage
                        summarySentence={summarySentence}
                        containsPersonalInfo={includeGuestNames}
                        orientation={orientation}
                    >
                        <DocumentTable<any>
                            columns={columns}
                            rows={rows}
                            emptyText="No maintenance data available."
                            showEndOfReport
                            includeGuestNames={includeGuestNames}
                        />
                    </DocumentSheet>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 print:space-y-2">
            <ScreenHeader
                title="Maintenance Reports"
                subtitle={`${dateRangeText} · Generated ${new Date().toLocaleString("en-PH")}`}
            />
            <div className="grid gap-4 md:grid-cols-1 print:grid-cols-1">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm print:shadow-none print:border print:border-gray-300 print:bg-white print:p-2">
                    <div className="text-[12px] text-gray-500 font-medium print:text-[9px]">
                        Total Maintenance Rooms
                    </div>
                    <div className="text-3xl font-semibold text-gray-800 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {total}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  MAIN REPORTS PAGE                                                         */
/* ========================================================================== */

const ORIENTATION_STORAGE_KEY = "reports:orientation";

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

    // Measure the real scrollbar gutter so the collapsed sidebar width
    // matches what the browser actually reserves, regardless of any
    // global scrollbar CSS that overrides ::-webkit-scrollbar sizing.
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [sbw, setSbw] = useState(4); // real scrollbar gutter width in px

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

    // Orientation with localStorage persistence.
    const [orientation, setOrientationState] = useState<Orientation>(() => {
        if (typeof window === "undefined") return "portrait";
        const saved = window.localStorage.getItem(ORIENTATION_STORAGE_KEY);
        if (saved === "portrait" || saved === "landscape") return saved;
        return "portrait";
    });

    const setOrientation = useCallback((o: Orientation) => {
        setOrientationState(o);
        try {
            window.localStorage.setItem(ORIENTATION_STORAGE_KEY, o);
        } catch {
            /* ignore */
        }
        setPreviewPage(1);
    }, []);

    const [previewPage, setPreviewPage] = useState(1);
    const [previewTotalPages, setPreviewTotalPages] = useState(1);

    // Mark every ancestor of the printable wrapper and hide their siblings
    // at print time. Works regardless of which element the app mounts on
    // (#root, #app, …).
    useEffect(() => {
        const markForPrint = () => {
            const wrapper =
                document.getElementById("printable-report-wrapper");
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
            const wrapper = document.getElementById(
                "printable-report-wrapper",
            );
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
            // Let React render the preview and start the per_page=1000 fetch.
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

    /* ── Desktop sidebar items (icon-collapsible, shadcn-style) ── */
    /*  Group headings collapse by HEIGHT (not -mt-8) so they never overlap
     *  the toggle button or the last item of the previous group.
     *  Each item is always wrapped in <Tooltip> (never conditionally) so
     *  buttons never remount mid-animation.
     *  Exact font sizes: 10.5px menu items, 8.5px headings, 9.5px tooltips. */
    const renderSidebarItems = () =>
        Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="space-y-1">
                {/* Group heading: collapses by height, inert when hidden,
                    exact 8.5px font size. */}
                <h3
                    className={cn(
                        "overflow-hidden whitespace-nowrap flex items-center px-3",
                        "transition-[height,opacity] duration-200 ease-linear",
                        "text-[8.5px] uppercase tracking-wider select-none text-gray-500 font-semibold",
                        "pointer-events-none",
                        sidebarCollapsed ? "h-0 opacity-0" : "h-8 opacity-100",
                    )}
                    aria-hidden={sidebarCollapsed}
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
                            {/* Fixed-size icon wrapper: keeps icon perfectly steady */}
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
                            {/* Label inherits 10.5px from button; stays mounted */}
                            <span
                                className={cn(
                                    "flex-1 text-left whitespace-nowrap overflow-hidden",
                                    "transition-opacity duration-200 ease-linear",
                                    sidebarCollapsed &&
                                        "opacity-0 pointer-events-none",
                                )}
                                aria-hidden={sidebarCollapsed}
                            >
                                {item.label}
                            </span>
                        </button>
                    );

                    // ALWAYS wrap in Tooltip so the button never remounts.
                    // TooltipContent hidden when expanded; 9.5px font.
                    return (
                        <Tooltip key={item.id}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent
                                side="right"
                                sideOffset={8}
                                hidden={!sidebarCollapsed}
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
            <style>{`
                /* ── Standard numeric font for data (0 ≠ O) ── */
                .reports-root,
                .reports-root table,
                .reports-root td,
                .reports-root th,
                .reports-root .tabular-nums {
                    font-family: Inter, "Segoe UI", Arial, Helvetica, sans-serif;
                    font-variant-numeric: tabular-nums;
                    font-feature-settings: "zero" 1;
                }

                /* ── Print Preview stage (screen only) ── */
                .print-preview-stage {
                    display: flex;
                    justify-content: center;
                    padding: 30px 0 60px 0;
                    background: #f5f5f5;
                    overflow-x: auto;
                }
                .print-preview-sheet-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .print-preview-nav-btn {
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
                .print-preview-nav-btn:hover:not(:disabled) {
                    background: #10b981;
                    color: white;
                    transform: scale(1.05);
                }
                .print-preview-nav-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                    border-color: #d1d5db;
                    color: #9ca3af;
                }

                /* ── Document sheet: shared by preview + print ── */
                .doc-sheet {
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
                .doc-sheet[data-orientation="portrait"] {
                    --sheet-w: 210mm;
                    --sheet-h: 296mm;
                    --content-w: 186mm;
                    width: 210mm;
                    height: 296mm;
                    padding: 12mm 12mm 14mm;
                    font-size: 9pt;
                }
                .doc-sheet[data-orientation="landscape"] {
                    --sheet-w: 297mm;
                    --sheet-h: 209mm;
                    --content-w: 267mm;
                    width: 297mm;
                    height: 209mm;
                    padding: 12mm 15mm 14mm;
                    font-size: 9.5pt;
                }

                /* Letterhead */
                .doc-letterhead {
                    display: flex;
                    align-items: flex-start;
                    gap: 6mm;
                    margin-bottom: 3mm;
                    position: relative;
                }
                .doc-logo-wrap { flex-shrink: 0; }
                .doc-logo {
                    max-height: 16mm;
                    max-width: 35mm;
                    object-fit: contain;
                }
                .doc-letterhead-text { flex: 1; }
                .doc-hotel-name {
                    font-size: 15pt;
                    font-weight: 700;
                    color: #111;
                    line-height: 1.15;
                    margin-bottom: 0.5mm;
                }
                .doc-report-title {
                    font-size: 12pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #111;
                    margin-bottom: 0.5mm;
                }
                .doc-meta {
                    font-size: 8.5pt;
                    color: #444;
                }
                .doc-meta-sep { margin: 0 2mm; }
                .doc-pii-notice {
                    margin-top: 1mm;
                    font-size: 8.5pt;
                    font-style: italic;
                    color: #b91c1c;
                }

                .doc-rule {
                    border-top: 1.5px solid #111;
                    margin-bottom: 4mm;
                }

                /* Summary paragraph (page 1 only) */
                .doc-summary {
                    font-size: 9.5pt;
                    line-height: 1.45;
                    color: #111;
                    text-align: justify;
                    margin: 0 0 4mm 0;
                }

                .doc-body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }

                /* Table */
                .doc-table-wrap { width: 100%; }
                .doc-table {
                    width: 100%;
                    border-collapse: collapse;
                    color: #111;
                    table-layout: fixed;
                    font-size: 9pt;
                }
                .doc-sheet[data-orientation="landscape"] .doc-table {
                    font-size: 9.5pt;
                }
                .doc-table thead th {
                    background: #f0f0f0;
                    font-size: 8.5pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                    color: #111;
                    padding: 1.8mm 2.2mm;
                    border-top: 1px solid #111;
                    border-bottom: 1px solid #111;
                    text-align: left;
                    white-space: nowrap;
                }
                .doc-sheet[data-orientation="landscape"] .doc-table thead th {
                    font-size: 9pt;
                    padding: 2mm 2.5mm;
                }
                .doc-table tbody td {
                    padding: 1.6mm 2.2mm;
                    border-bottom: 0.5px solid #999;
                    vertical-align: top;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .doc-sheet[data-orientation="landscape"] .doc-table tbody td {
                    padding: 1.8mm 2.5mm;
                }
                .doc-table tbody tr { break-inside: avoid; }

                /* Long-text cells may wrap to 2 lines. */
                .doc-wrap-2 {
                    white-space: normal !important;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .doc-empty {
                    text-align: center;
                    color: #666;
                    padding: 6mm 0 !important;
                    font-style: italic;
                }

                /* Totals row + end-of-report */
                .doc-total-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 4mm;
                    margin-top: 2.5mm;
                    padding-top: 2mm;
                    border-top: 1px solid #111;
                    font-size: 9.5pt;
                    color: #111;
                }
                .doc-total-label { font-weight: 700; }
                .doc-total-value {
                    font-weight: 700;
                    min-width: 30mm;
                    text-align: right;
                }
                .doc-end-of-report {
                    text-align: center;
                    font-size: 8.5pt;
                    color: #444;
                    margin-top: 3mm;
                    letter-spacing: 1px;
                }

                /* Signatures (last page) */
                .doc-signatures {
                    display: flex;
                    justify-content: space-between;
                    gap: 20mm;
                    margin-top: 6mm;
                    font-size: 9pt;
                }
                .doc-signature-block {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    max-width: 70mm;
                }
                .doc-signature-label { color: #444; margin-bottom: 5mm; }
                .doc-signature-line {
                    border-bottom: 0.5px solid #111;
                    height: 1px;
                }

                /* Footer (every page) */
                .doc-footer {
                    margin-top: 4mm;
                    padding-top: 2mm;
                    border-top: 0.5px solid #999;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 8pt;
                    color: #555;
                }
                .doc-footer-center {
                    font-style: italic;
                    color: #555;
                }

                /* Page-break rules live on the wrapper, not the sheet */
                .preview-only-pages {
                    break-after: page;
                    page-break-after: always;
                }
                .preview-only-pages:last-child {
                    break-after: auto;
                    page-break-after: auto;
                }

                /* ── Print rules ── */
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
                    .print-header { display: none !important; }
                }

                /* Sidebar + misc (unchanged) */
                .sidebar-white {
                    background: #ffffff;
                    border-right: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px rgba(0,0,0,.08);
                }
                .sidebar-white .active-tab {
                    background: #10b981 !important;
                    color: white !important;
                }
                .sidebar-white .menu-item:hover {
                    background: #d1fae5 !important;
                    color: #065f46 !important;
                }
                .white-badge { background: #6b7280; color: white; }
                .white-badge:hover { background: #4b5563; }
                .scrollbar-mint::-webkit-scrollbar { width: 6px; height: 6px; }
                .scrollbar-mint::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }

                /* ── Slim, always-visible scrollbar for the desktop sidebar ──
                 *  The collapsed width is driven by JS (measured gutter),
                 *  so the layout no longer depends on a fixed 4px value.
                 *  Chrome/Edge honor ::-webkit-scrollbar sizing only when
                 *  scrollbar-width/color are NOT set, so we force them
                 *  back to auto under @supports selector(::-webkit-scrollbar)
                 *  to override any global rule that would otherwise win. */
                .sidebar-scrollbar { scrollbar-gutter: stable; }
                @supports selector(::-webkit-scrollbar) {
                    .sidebar-scrollbar {
                        scrollbar-width: auto !important;
                        scrollbar-color: auto !important;
                    }
                }
                .sidebar-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                    background: transparent;
                }
                .sidebar-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                    margin: 8px 0;
                }
                .sidebar-scrollbar::-webkit-scrollbar-button {
                    display: none;
                    width: 0;
                    height: 0;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 9999px;
                }
                .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                /* Firefox only (it does not support ::-webkit-scrollbar) */
                @supports not selector(::-webkit-scrollbar) {
                    .sidebar-scrollbar {
                        scrollbar-width: thin;
                        scrollbar-color: #d1d5db transparent;
                    }
                }

                *:focus { outline: none !important; }
                *:focus-visible { outline: 2px solid #6b7280 !important; outline-offset: 2px !important; }
                .sidebar-white button:focus-visible {
                    outline: none !important;
                    box-shadow: inset 0 0 0 1.5px #10b981;
                }
            `}</style>

            {/* Dynamic @page size — must be a live style tag tied to state. */}
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
                                Review records using search, date filters, and
                                pagination
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
                            <Button
                                onClick={togglePrintPreview}
                                variant="outline"
                                className="gap-2 no-print focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm border-gray-200 hover:bg-gray-50"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                Print Preview
                            </Button>
                            <Button
                                onClick={handlePrint}
                                className="gap-2 no-print white-badge focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                            </Button>
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
                            · {orientation === "portrait" ? "Portrait" : "Landscape"} · A4 ·
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

                        {/* Orientation segmented control */}
                        <div className="inline-flex items-center rounded-md border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setOrientation("portrait")}
                                className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] transition-colors ${
                                    orientation === "portrait"
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                                title="Portrait"
                            >
                                <RectangleVertical className="h-3.5 w-3.5" />
                                Portrait
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrientation("landscape")}
                                className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] border-l border-gray-200 transition-colors ${
                                    orientation === "landscape"
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                                title="Landscape"
                            >
                                <RectangleHorizontal className="h-3.5 w-3.5" />
                                Landscape
                            </button>
                        </div>

                        <Button
                            onClick={togglePrintPreview}
                            variant="outline"
                            className="gap-2 focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm border-gray-200 hover:bg-gray-50"
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
                {!isPrintPreview && (
                    <div
                        ref={sidebarRef}
                        className={cn(
                            "sidebar-white sidebar-scrollbar no-print shrink-0 relative hidden lg:block",
                            "overflow-x-hidden overflow-y-auto",
                            "transition-[width] duration-200 ease-linear motion-reduce:transition-none",
                        )}
                        style={{
                            width: sidebarCollapsed ? 61 + sbw : 224,
                        }}
                    >
                        <div
                            className="sticky top-0 py-3 space-y-3"
                            style={{
                                paddingLeft: 12 + sbw / 2,
                                paddingRight: 12 - sbw / 2,
                            }}
                        >
                            {/* Collapse toggle: same layout as menu items,
                                relative z-10 so nothing can cover it.
                                9.5px label. */}
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
                                            sidebarCollapsed && "rotate-180",
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

                            {/* Single TooltipProvider wraps the entire list */}
                            <TooltipProvider delayDuration={0}>
                                {renderSidebarItems()}
                            </TooltipProvider>
                        </div>
                    </div>
                )}

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
                        {orientation === "portrait" ? "Portrait" : "Landscape"} · A4 ·
                        Page {previewPage} of {previewTotalPages}
                    </span>
                    <button
                        onClick={() => setOrientation(
                            orientation === "portrait" ? "landscape" : "portrait",
                        )}
                        className="ml-2 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-xs"
                    >
                        Switch
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
        </div>
    );
}