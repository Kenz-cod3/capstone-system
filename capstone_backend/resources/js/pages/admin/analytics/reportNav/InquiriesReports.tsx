import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    paginateRows,
    dateFmt,
    sentenceCase,
    Pagination,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type InquiryReport,
    type DocColumn,
} from "../Reports";

export default function InquiriesReports({
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
        () => paginateRows(filteredInquiries, orientation, settings.ending),
        [filteredInquiries, orientation, settings.ending],
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
                                generatedText={new Date().toLocaleString("en-PH")}
                                pageNumber={idx + 1}
                                totalPages={totalPreviewPages}
                                isLastPage={isLast}
                                summarySentence={summarySentence}
                                containsPersonalInfo={includeGuestNames}
                                settings={settings}
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