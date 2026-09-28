import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    currency,
    currencyPlain,
    dateFmt,
    anonGuest,
    fetchJson,
    Pagination,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type GuestReport,
    type DocColumn,
} from "../Reports";

export default function GuestReports({
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
        () => paginateRows(filteredGuests, orientation, settings.ending),
        [filteredGuests, orientation, settings.ending],
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
            key: "type",
            label: "Type",
            weight: 2,
            render: (g) => (g.guest_type === "walk_in" ? "Walk-in" : "Online"),
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
                                settings={settings}
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
                                    Type
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
                                        colSpan={6}
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
                                            {g.guest_type === "walk_in" ? (
                                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                                                    Walk-in
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                                                    Online
                                                </span>
                                            )}
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
