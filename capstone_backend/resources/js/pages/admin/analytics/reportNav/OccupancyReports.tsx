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

export default function OccupancyReports({
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
                        settings={settings}
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