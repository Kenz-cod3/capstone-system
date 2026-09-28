import { useEffect, useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    currency,
    currencyPlain,
    currencyCompact,
    dateFmt,
    sentenceCase,
    fetchJson,
    Pagination,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type TransactionRow,
    type TransactionSummary,
    type Paginated,
    type DocColumn,
} from "../Reports";

export default function TransactionReports({
    start,
    end,
    searchQuery,
    onSearchChange,
    isPrintPreview,
    includeGuestNames,
    settings = DEFAULT_SETTINGS,
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const orientation = settings.orientation;
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
        () => paginateRows(filteredRows, orientation, settings.ending),
        [filteredRows, orientation, settings.ending],
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
                                settings={settings}
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
                                    className="reports-search-input h-9 w-[200px] pl-8 text-[12px] border-gray-200 focus:border-gray-400 focus:ring-0 focus:outline-none shadow-sm"
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
