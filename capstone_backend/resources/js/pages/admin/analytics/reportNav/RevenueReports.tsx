import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    currency,
    currencyPlain,
    currencyCompact,
    dateFmt,
    fetchJson,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type DashboardStats,
    type FinancialTrendPoint,
    type DashboardIndexResponse,
    type DocColumn,
} from "../Reports";

export default function RevenueReports({
    start,
    end,
    searchQuery,
    isPrintPreview,
    includeGuestNames,
    settings = DEFAULT_SETTINGS,
    currentPreviewPage = 1,
    onPagesCountChange,
}: ReportProps) {
    const orientation = settings.orientation;
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
        () => paginateRows(filteredTrend, orientation, settings.ending),
        [filteredTrend, orientation, settings.ending],
    );
    const totalPreviewPages = Math.max(1, trendChunks.length);

    useEffect(() => {
        if (isPrintPreview && onPagesCountChange) {
            onPagesCountChange(totalPreviewPages);
        }
    }, [isPrintPreview, totalPreviewPages, onPagesCountChange]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const totalGrossRevenue = filteredTrend.reduce(
        (s, r) => s + (r.gross_revenue ?? r.revenue),
        0,
    );
    const totalRefunds = filteredTrend.reduce(
        (s, r) => s + (r.refunds ?? 0),
        0,
    );
    const totalRevenue = filteredTrend.reduce((s, r) => s + r.revenue, 0);
    const totalExpenses = filteredTrend.reduce((s, r) => s + r.expenses, 0);
    const totalProfit = filteredTrend.reduce((s, r) => s + r.profit, 0);
    const dateRangeText =
        start && end ? `${dateFmt(start)} – ${dateFmt(end)}` : "All dates";
    const periodLower =
        dateRangeText.toLowerCase() === "all dates"
            ? "all dates"
            : dateRangeText;

    const marginLabel = (r: FinancialTrendPoint) =>
        r.revenue !== 0 ? `${((r.profit / r.revenue) * 100).toFixed(1)}%` : "—";

    const columns: DocColumn<FinancialTrendPoint>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        { key: "date", label: "Date", weight: 3, render: (r) => r.name },
        {
            key: "gross",
            label: "Gross Revenue",
            weight: 3,
            align: "right",
            render: (r) => `₱${currencyPlain(r.gross_revenue ?? r.revenue)}`,
        },
        {
            key: "refunds",
            label: "Refunds",
            weight: 3,
            align: "right",
            render: (r) => `₱${currencyPlain(r.refunds ?? 0)}`,
        },
        {
            key: "revenue",
            label: "Net Revenue",
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
            render: (r) => marginLabel(r),
        },
    ];

    const summarySentence =
        `Gross revenue for ${periodLower} was ₱${currencyPlain(totalGrossRevenue)}, with ` +
        `₱${currencyPlain(totalRefunds)} in refunds, for net revenue of ₱${currencyPlain(totalRevenue)}. ` +
        `Against expenses of ₱${currencyPlain(totalExpenses)}, this resulted in a net profit of ` +
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
                                settings={settings}
                            >
                                <DocumentTable<FinancialTrendPoint>
                                    columns={columns}
                                    rows={chunk}
                                    startIndex={chunkStart}
                                    showTotal={isLast}
                                    totalLabel="Total Net Revenue"
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
                        Net Revenue
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
                        Refunds
                    </div>
                    <div className="text-3xl font-semibold text-red-600 mt-2 print:text-[16px] print:mt-1 tabular-nums">
                        {currencyCompact(totalRefunds)}
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
                        style={{ minWidth: 1100 }}
                    >
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-left border border-gray-200">
                                    Date
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Gross Revenue
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Refunds
                                </th>
                                <th className="text-[11px] font-semibold uppercase tracking-[0.03em] text-gray-600 px-3 py-2 text-right border border-gray-200">
                                    Net Revenue
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
                                        colSpan={7}
                                        className="text-center text-gray-400 py-4 text-[12px]"
                                    >
                                        No revenue data found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTrend.map((row) => {
                                    const hasMargin = row.revenue !== 0;
                                    const margin = hasMargin
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
                                                {currency(
                                                    row.gross_revenue ??
                                                        row.revenue,
                                                )}
                                            </td>
                                            <td className="px-3 py-2 border border-gray-200 text-right tabular-nums text-red-600">
                                                {row.refunds
                                                    ? `(${currency(row.refunds)})`
                                                    : currency(0)}
                                            </td>
                                            <td
                                                className={`px-3 py-2 border border-gray-200 text-right tabular-nums font-medium ${row.revenue >= 0 ? "text-gray-900" : "text-red-600"}`}
                                            >
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
                                                className={`px-3 py-2 border border-gray-200 text-right tabular-nums ${!hasMargin ? "text-gray-400" : margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                            >
                                                {hasMargin
                                                    ? `${margin.toFixed(1)}%`
                                                    : "—"}
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
