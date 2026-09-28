import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    dateFmt,
    fetchJson,
    Pagination,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type ReviewReport,
    type DocColumn,
} from "../Reports";

export default function GuestReviews({
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
        () => paginateRows(filteredReviews, orientation, settings.ending),
        [filteredReviews, orientation, settings.ending],
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
                                generatedText={new Date().toLocaleString("en-PH")}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                settings={settings}
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