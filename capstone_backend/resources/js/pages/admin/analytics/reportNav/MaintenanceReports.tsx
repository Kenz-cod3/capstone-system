import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SETTINGS,
    dateFmt,
    fetchJson,
    DocumentSheet,
    DocumentTable,
    ScreenHeader,
    type ReportProps,
    type DocColumn,
} from "../Reports";

export default function MaintenanceReports({
    start,
    end,
    isPrintPreview,
    includeGuestNames,
    settings = DEFAULT_SETTINGS,
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
    const summarySentence = `As of ${periodLower}, ${total} room${total === 1 ? " is" : "s are"} currently under maintenance.`;

    const rows = [{ name: "Total Maintenance Rooms", value: total }];
    const columns: DocColumn<any>[] = [
        { key: "no", label: "No.", weight: 1, render: (_r, i) => i + 1 },
        { key: "name", label: "Category", weight: 6, render: (r) => r.name },
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
                        settings={settings}
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