import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { format, addMonths, subDays, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

interface OccupancyTrendItem {
    day: string;
    occupancy: number;
}

interface ChartDataItem {
    day: string;
    occupancy: number;
    fullDate?: string | undefined;
}

type TimeRange = "last7days" | "last30days" | "thismonth" | "thisyear" | "custom";

// ----- MONTH CAPTION COMPONENT ----->
const MonthCaption = ({
    displayMonth,
    onPrev,
    onNext,
    hidePrev,
    hideNext,
}: {
    displayMonth: Date;
    onPrev: () => void;
    onNext: () => void;
    hidePrev?: boolean;
    hideNext?: boolean;
}) => (
    <div className="flex items-center justify-between px-1 py-1">
        <button
            onClick={onPrev}
            style={{ visibility: hidePrev ? "hidden" : "visible" }}
            className="h-7 w-7 hover:bg-emerald-50 rounded-md flex items-center justify-center border border-gray-200 hover:border-emerald-200 transition-colors"
        >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-sm font-medium text-gray-800">
            {format(displayMonth, "MMMM yyyy")}
        </span>
        <button
            onClick={onNext}
            style={{ visibility: hideNext ? "hidden" : "visible" }}
            className="h-7 w-7 hover:bg-emerald-50 rounded-md flex items-center justify-center border border-gray-200 hover:border-emerald-200 transition-colors"
        >
            <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
    </div>
);

// ----- CUSTOM DATE RANGE PICKER ----->
const CustomRangePicker = ({
    onSelect,
    onClose,
    initialRange
}: {
    onSelect: (from: Date, to: Date) => void;
    onClose: () => void;
    initialRange: { from: Date | null; to: Date | null };
}) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: initialRange.from || undefined,
        to: initialRange.to || undefined
    });

    const [leftMonth, setLeftMonth] = useState<Date>(
        initialRange.from ?? new Date()
    );

    const rightMonth = addMonths(leftMonth, 1);

    const handleConfirm = () => {
        if (dateRange?.from && dateRange?.to) {
            onSelect(dateRange.from, dateRange.to);
        }
    };

    const quickSelect = (days: number) => {
        const to = new Date();
        const from = subDays(to, days - 1);
        setDateRange({ from, to });
        setLeftMonth(from);
    };

    const selectCurrentMonth = () => {
        const now = new Date();
        const from = startOfMonth(now);
        const to = endOfMonth(now);
        setDateRange({ from, to });
        setLeftMonth(from);
    };

    const durationDays =
        dateRange?.from && dateRange?.to
            ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24))
            : null;

    const sharedClassNames = {
        months: "flex",
        month: "space-y-2 w-full",
        caption: "hidden",
        caption_label: "hidden",
        nav: "hidden",
        table: "border-collapse mx-auto",
        head_row: "flex justify-center",
        head_cell: "text-gray-400 w-9 font-normal text-[11px] uppercase tracking-wider text-center py-1.5",
        row: "flex justify-center mt-1",
        cell: [
            "relative text-center text-sm p-0",
            "focus-within:relative focus-within:z-20",
            "[&:has(.rdp-day[aria-selected]:not(.rdp-day_outside))]:bg-emerald-100",
            "first:[&:has([aria-selected])]:rounded-l-full",
            "last:[&:has([aria-selected])]:rounded-r-full",
        ].join(" "),
        day: [
            "h-9 w-9 p-0 font-normal rounded-full transition-all duration-150 text-sm",
            "text-gray-700 aria-selected:opacity-100",
            "hover:bg-emerald-200 hover:text-emerald-900 hover:scale-105",
            "aria-disabled:hover:bg-transparent aria-disabled:hover:text-gray-400 aria-disabled:hover:scale-100",
        ].join(" "),
        day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white shadow-md shadow-emerald-200 scale-105 font-semibold rounded-full",
        day_today: "ring-2 ring-emerald-400 ring-offset-1 text-emerald-700 font-semibold rounded-full",
        day_outside: "opacity-20 blur-[1px] pointer-events-none select-none",
        day_disabled: "text-gray-300 opacity-30",
        day_range_middle: "aria-selected:bg-emerald-100 aria-selected:text-emerald-900 rounded-none",
        day_range_start: "rounded-full bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-200",
        day_range_end: "rounded-full bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-200",
        day_hidden: "invisible",
    };

    const sharedModifiersStyles = {
        selected: {
            backgroundColor: "#10b981",
            color: "white",
            fontWeight: "600",
            boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
        },
        range_middle: {
            backgroundColor: "#a7f3d0",
            color: "#064e3b",
            borderRadius: "0",
            fontWeight: "500",
        },
        range_start: {
            backgroundColor: "#059669",
            color: "white",
            borderRadius: "9999px",
            boxShadow: "0 2px 10px rgba(16,185,129,0.4)",
        },
        range_end: {
            backgroundColor: "#059669",
            color: "white",
            borderRadius: "9999px",
            boxShadow: "0 2px 10px rgba(16,185,129,0.4)",
        },
        today: {
            outline: "2px solid #34d399",
            outlineOffset: "2px",
        },
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-2xl overflow-hidden">
                <div className="flex items-start justify-between px-5 pt-5 pb-3">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Select Date Range</p>
                        {dateRange?.from && dateRange?.to ? (
                            <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                                {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400 mt-0.5">Choose start and end dates</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                    {[
                        { label: "Last 7 days", action: () => quickSelect(7) },
                        { label: "Last 30 days", action: () => quickSelect(30) },
                        { label: "This month", action: selectCurrentMonth },
                        { label: "Last 3 months", action: () => quickSelect(90) },
                        { label: "Last year", action: () => quickSelect(365) },
                    ].map(({ label, action }) => (
                        <button
                            key={label}
                            onClick={action}
                            className="text-xs px-3 py-1.5 rounded-md border border-emerald-200 bg-white text-emerald-700 font-medium hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="h-px bg-gray-100 mx-5" />

                <div className="px-5 py-4 flex gap-6 justify-center">
                    <div className="flex-1">
                        <MonthCaption
                            displayMonth={leftMonth}
                            onPrev={() => setLeftMonth(addMonths(leftMonth, -1))}
                            onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                            hideNext
                        />
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            month={leftMonth}
                            onMonthChange={setLeftMonth}
                            showOutsideDays
                            disabled={(date) => {
                                const start = new Date(leftMonth.getFullYear(), leftMonth.getMonth(), 1);
                                const end = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 0);
                                return date < start || date > end;
                            }}
                            className="border-0 p-0"
                            classNames={sharedClassNames}
                            modifiersStyles={sharedModifiersStyles}
                        />
                    </div>

                    <div className="w-px bg-gray-100 my-1" />

                    <div className="flex-1">
                        <MonthCaption
                            displayMonth={rightMonth}
                            onPrev={() => setLeftMonth(addMonths(leftMonth, -1))}
                            onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                            hidePrev
                        />
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            month={rightMonth}
                            onMonthChange={(m) => setLeftMonth(addMonths(m, -1))}
                            showOutsideDays
                            disabled={(date) => {
                                const start = new Date(rightMonth.getFullYear(), rightMonth.getMonth(), 1);
                                const end = new Date(rightMonth.getFullYear(), rightMonth.getMonth() + 1, 0);
                                return date < start || date > end;
                            }}
                            className="border-0 p-0"
                            classNames={sharedClassNames}
                            modifiersStyles={sharedModifiersStyles}
                        />
                    </div>
                </div>

                {dateRange?.from && dateRange?.to && (
                    <div className="mx-5 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <div className="flex gap-6">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Start date</p>
                                <p className="text-sm font-medium text-gray-800 mt-0.5">
                                    {format(dateRange.from, "MMM d, yyyy")}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">End date</p>
                                <p className="text-sm font-medium text-gray-800 mt-0.5">
                                    {format(dateRange.to, "MMM d, yyyy")}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Duration</p>
                                <p className="text-sm font-medium text-emerald-600 mt-0.5">{durationDays} days</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400">Total days</p>
                            <p className="text-2xl font-semibold text-emerald-600">{(durationDays ?? 0) + 1}</p>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-9 text-sm border-gray-200 text-gray-600 hover:bg-gray-100"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!dateRange?.from || !dateRange?.to}
                        className="flex-1 h-9 text-sm bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Apply Range
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ----- DROPDOWN MENU COMPONENT ----->
const DropdownMenu = ({
    options,
    value,
    onChange
}: {
    options: { value: TimeRange; label: string; subtext?: string }[];
    value: TimeRange;
    onChange: (value: TimeRange) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="gap-1 text-gray-500 text-xs hover:text-gray-700"
            >
                <CalendarIcon className="h-3.5 w-3.5" />
                {selectedOption?.label}
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${value === option.value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                                    }`}
                            >
                                <div className="text-sm font-medium">{option.label}</div>
                                {option.subtext && (
                                    <div className="text-xs text-gray-400">{option.subtext}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default function OccupancyTrendChart({
    data,
    activeRange: externalActiveRange,
    customRange: externalCustomRange,
    onRangeChange,
    onCustomRangeChange
}: {
    data: OccupancyTrendItem[];
    activeRange?: TimeRange;
    customRange?: { from: Date | null; to: Date | null };
    onRangeChange?: (range: TimeRange) => void;
    onCustomRangeChange?: (range: { from: Date | null; to: Date | null }) => void;
}) {
    // Internal state for when component is used standalone
    const [internalActiveRange, setInternalActiveRange] = useState<TimeRange>("last7days");
    const [internalCustomRange, setInternalCustomRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // Use external state if provided, otherwise use internal state
    const activeRange = externalActiveRange !== undefined ? externalActiveRange : internalActiveRange;
    const customRange = externalCustomRange !== undefined ? externalCustomRange : internalCustomRange;

    const setActiveRange = (range: TimeRange) => {
        if (onRangeChange) {
            onRangeChange(range);
        } else {
            setInternalActiveRange(range);
        }
    };

    const setCustomRange = (range: { from: Date | null; to: Date | null }) => {
        if (onCustomRangeChange) {
            onCustomRangeChange(range);
        } else {
            setInternalCustomRange(range);
        }
    };

    const currentYear = new Date().getFullYear();

    const rangeOptions = [
        { value: "last7days" as const, label: "Last 7 Days", subtext: "daily trend" },
        { value: "last30days" as const, label: "Last 30 Days", subtext: "monthly view" },
        { value: "thismonth" as const, label: "This Month", subtext: format(new Date(), "MMMM yyyy") },
        { value: "thisyear" as const, label: "This Year", subtext: `Jan ${currentYear} - Dec ${currentYear}` },
        { value: "custom" as const, label: "Custom Range", subtext: "select dates" },
    ];

    // Helper function to parse date from various formats
    const parseDateString = (dateStr: string | undefined): Date | null => {
        if (!dateStr) return null;
        
        try {
            // Try to parse as YYYY-MM-DD
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0] || "0");
                    const month = parseInt(parts[1] || "1") - 1;
                    const day = parseInt(parts[2] || "1");
                    const date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }

            // Try direct parsing
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }

            return null;
        } catch {
            return null;
        }
    };

    // Format date to YYYY-MM-DD for comparison
    const toDateKey = (date: Date): string => {
        return format(date, "yyyy-MM-dd");
    };

    // Filter occupancy data based on selected range
    const displayData: ChartDataItem[] = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Convert data to map for easy lookup
        const dataMap = new Map<string, number>();
        data.forEach(item => {
            if (item.day) {
                const parsedDate = parseDateString(item.day);
                if (parsedDate) {
                    const dateKey = toDateKey(parsedDate);
                    dataMap.set(dateKey, item.occupancy);
                }
            }
        });

        switch (activeRange) {
            case "last7days": {
                const result: ChartDataItem[] = [];
                for (let i = 6; i >= 0; i--) {
                    const date = subDays(today, i);
                    const dateKey = toDateKey(date);
                    const occupancy = dataMap.get(dateKey) ?? 0;

                    result.push({
                        day: format(date, "MMM d"),
                        occupancy: occupancy,
                        fullDate: dateKey
                    });
                }
                return result;
            }

            case "last30days": {
                const result: ChartDataItem[] = [];
                for (let i = 29; i >= 0; i--) {
                    const date = subDays(today, i);
                    const dateKey = toDateKey(date);
                    const occupancy = dataMap.get(dateKey) ?? 0;

                    result.push({
                        day: format(date, "MMM d"),
                        occupancy: occupancy,
                        fullDate: dateKey
                    });
                }
                return result;
            }

            case "thismonth": {
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const result: ChartDataItem[] = [];

                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentYear, currentMonth, day);
                    const dateKey = toDateKey(date);
                    const occupancy = dataMap.get(dateKey) ?? 0;

                    result.push({
                        day: format(date, "MMM d"),
                        occupancy: occupancy,
                        fullDate: dateKey
                    });
                }
                return result;
            }

            case "thisyear": {
                const monthlyData: ChartDataItem[] = [];
                for (let month = 0; month < 12; month++) {
                    const monthName = format(new Date(currentYear, month, 1), "MMM");

                    // Get all days in this month
                    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
                    let totalOccupancy = 0;
                    let daysWithData = 0;

                    for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(currentYear, month, day);
                        const dateKey = toDateKey(date);
                        const occupancy = dataMap.get(dateKey);
                        if (occupancy !== undefined) {
                            totalOccupancy += occupancy;
                            daysWithData++;
                        }
                    }

                    const avgOccupancy = daysWithData > 0
                        ? Math.round(totalOccupancy / daysWithData)
                        : 0;

                    monthlyData.push({
                        day: monthName,
                        occupancy: avgOccupancy,
                        fullDate: format(new Date(currentYear, month, 1), "yyyy-MM-dd")
                    });
                }
                return monthlyData;
            }

            case "custom":
                if (customRange.from && customRange.to) {
                    const result: ChartDataItem[] = [];
                    let currentDate = new Date(customRange.from);
                    const endDate = new Date(customRange.to);

                    while (currentDate <= endDate) {
                        const dateKey = toDateKey(currentDate);
                        const occupancy = dataMap.get(dateKey) ?? 0;

                        result.push({
                            day: format(currentDate, "MMM d"),
                            occupancy: occupancy,
                            fullDate: dateKey
                        });

                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    return result;
                }
                return [];

            default:
                return [];
        }
    }, [activeRange, data, customRange]);

    const handleRangeChange = (range: TimeRange) => {
        setActiveRange(range);
        if (range === "custom") {
            setShowCustomPicker(true);
        } else {
            setShowCustomPicker(false);
        }
    };

    const handleCustomDateSelect = (from: Date, to: Date) => {
        setCustomRange({ from, to });
        setShowCustomPicker(false);
    };

    // SAFETY: ensure no negative values (but allow values up to 100 naturally)
    const safeData = displayData.map(item => ({
        ...item,
        occupancy: Math.max(0, item.occupancy || 0), // No upper cap, just prevent negatives
    }));

    // Calculate dynamic width based on data length
    const getChartWidth = () => {
        const dataLength = safeData.length;

        if (activeRange === "custom" && dataLength > 15) {
            return `${Math.max(800, dataLength * 55)}px`;
        }

        if (activeRange === "last30days" && dataLength > 15) {
            return `${Math.max(800, dataLength * 50)}px`;
        }

        if (activeRange === "thismonth" && dataLength > 20) {
            return `${Math.max(800, dataLength * 45)}px`;
        }

        return '100%';
    };

    // Get X axis props based on data length
    const getXAxisProps = () => {
        const dataLength = safeData.length;

        if (activeRange === "custom" && dataLength > 15) {
            return {
                interval: Math.floor(dataLength / 10),
                angle: -45,
                height: 80,
                fontSize: 10
            };
        }

        if (activeRange === "last30days" && dataLength > 15) {
            return {
                interval: Math.floor(dataLength / 8),
                angle: -40,
                height: 70,
                fontSize: 10
            };
        }

        if (activeRange === "thismonth" && dataLength > 20) {
            return {
                interval: Math.floor(dataLength / 10),
                angle: -35,
                height: 65,
                fontSize: 10
            };
        }

        if (activeRange === "thisyear") {
            return {
                interval: 0,
                angle: 0,
                height: 40,
                fontSize: 11
            };
        }

        return {
            interval: 0,
            angle: -35,
            height: 60,
            fontSize: 11
        };
    };

    const xAxisProps = getXAxisProps();

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-5 flex items-center justify-center h-[300px] text-gray-400 text-sm border border-gray-100">
                No occupancy data available
            </div>
        );
    }

    // Get subtext for display
    const getRangeSubtext = () => {
        switch (activeRange) {
            case "last7days":
                return "Last 7 days trend";
            case "last30days":
                return "Last 30 days trend";
            case "thismonth":
                return format(new Date(), "MMMM yyyy");
            case "thisyear":
                return `Year to date (${currentYear})`;
            case "custom":
                if (customRange.from && customRange.to) {
                    return `${format(customRange.from, "MMM d, yyyy")} - ${format(customRange.to, "MMM d, yyyy")}`;
                }
                return "Custom date range";
            default:
                return "";
        }
    };

    // Get current average occupancy
    const averageOccupancy = safeData.length > 0
        ? Math.round(safeData.reduce((sum, item) => sum + (item.occupancy || 0), 0) / safeData.length)
        : 0;

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-200 flex flex-col h-full">
            {/* HEADER WITH DROPDOWN */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h2 className="text-lg font-semibold">Occupancy Trend</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{getRangeSubtext()}</p>
                </div>
                <DropdownMenu options={rangeOptions} value={activeRange} onChange={handleRangeChange} />
            </div>

            {/* AVERAGE OCCUPANCY METRIC */}
            {safeData.length > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-baseline justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Average Occupancy</p>
                            <p className="text-2xl font-bold text-emerald-600">{averageOccupancy}%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Total Days</p>
                            <p className="text-sm font-medium text-gray-700">{safeData.length} days</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM RANGE PICKER */}
            {showCustomPicker && (
                <CustomRangePicker
                    onSelect={handleCustomDateSelect}
                    onClose={() => {
                        setShowCustomPicker(false);
                        setActiveRange("last7days");
                    }}
                    initialRange={customRange}
                />
            )}

            {/* Horizontal scrollable chart container */}
            <div
                ref={chartContainerRef}
                className="w-full overflow-x-auto overflow-y-hidden"
                style={{
                    minHeight: '320px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                }}
            >
                <div
                    style={{
                        width: getChartWidth(),
                        minWidth: '100%',
                        height: '300px'
                    }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={safeData}>
                            {/* GRADIENT */}
                            <defs>
                                <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            {/* GRID */}
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                                vertical={false}
                            />

                            {/* X AXIS */}
                            <XAxis
                                dataKey="day"
                                stroke="#9ca3af"
                                fontSize={xAxisProps.fontSize}
                                tickLine={false}
                                axisLine={false}
                                interval={xAxisProps.interval}
                                angle={xAxisProps.angle}
                                textAnchor={xAxisProps.angle === 0 ? "middle" : "end"}
                                height={xAxisProps.height}
                                dy={xAxisProps.angle === 0 ? 10 : 5}
                            />

                            {/* Y AXIS - Changed to auto domain for realistic display */}
                            <YAxis
                                domain={[0, 'auto']}
                                tickFormatter={(val) => `${Math.round(val)}%`}
                                stroke="#9ca3af"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />

                            {/* TOOLTIP */}
                            <Tooltip
                                formatter={(value: any) => [
                                    `${Math.round(value || 0)}%`,
                                    "Occupancy Rate",
                                ]}
                                labelFormatter={(label) => {
                                    const dataPoint = safeData.find(d => d.day === label);
                                    if (dataPoint && dataPoint.fullDate) {
                                        const date = new Date(dataPoint.fullDate);
                                        if (!isNaN(date.getTime())) {
                                            return format(date, "MMMM d, yyyy");
                                        }
                                    }
                                    return label;
                                }}
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    padding: "8px 12px",
                                }}
                                labelStyle={{ color: "#374151", fontWeight: 600 }}
                            />

                            {/* AREA */}
                            <Area
                                type="monotone"
                                dataKey="occupancy"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#mintGradient)"
                                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                                connectNulls={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Horizontal scroll indicator for large ranges */}
            {(activeRange === "custom" && safeData.length > 15) ||
                (activeRange === "last30days" && safeData.length > 20) ||
                (activeRange === "thismonth" && safeData.length > 25) ? (
                <div className="text-center mt-3">
                    <p className="text-xs text-gray-400">
                        ← Scroll horizontally to see more data →
                        <span className="inline-block ml-2 text-emerald-500">({safeData.length} days)</span>
                    </p>
                </div>
            ) : null}
        </div>
    );
}