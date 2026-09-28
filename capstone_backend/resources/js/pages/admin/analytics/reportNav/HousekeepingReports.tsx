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

export default function HousekeepingReports({
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
        { name: "Cleaning", value: housekeepingData.total_cleaning_rooms || 0 },
        { name: "Available", value: housekeepingData.total_available_rooms || 0 },
        { name: "Reserved", value: housekeepingData.total_reserved_rooms || 0 },
        { name: "Occupied", value: housekeepingData.total_occupied_rooms || 0 },
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
                        reportTitle="Housekeeping Report"
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