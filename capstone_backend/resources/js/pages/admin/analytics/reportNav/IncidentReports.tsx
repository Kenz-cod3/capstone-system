import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    dateFmt,
    sentenceCase,
    fetchJson,
    Pagination,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type IncidentRow,
    type Paginated,
    type DocColumn,
} from "../Reports";

export default function IncidentReports({
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
        () => paginateRows(filteredRows, orientation, settings.ending),
        [filteredRows, orientation, settings.ending],
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
                                generatedText={new Date().toLocaleString("en-PH")}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                settings={settings}
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