import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Calendar as CalendarIcon,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import { DateRange } from "react-day-picker";
import { format, addMonths } from "date-fns";
import api from "@/services/api";

//-----TYPES----->
export interface ChartData {
    name: string;
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    year?: number;
}

type TimeRange =
    | "last7days"
    | "last30days"
    | "thismonth"
    | "thisyear"
    | "lastyear"
    | "custom";

//-----HELPER (SAFE NUMBER)----->
const toNumber = (val: number | string) => Number(val) || 0;

//-----HELPER FUNCTION TO CALCULATE PERCENTAGE CHANGE BETWEEN TWO PERIODS----->
const calculatePeriodChange = (
    currentData: ChartData[],
    previousData: ChartData[],
) => {
    const currentTotal = currentData.reduce(
        (sum, item) => sum + toNumber(item.revenue),
        0,
    );
    const previousTotal = previousData.reduce(
        (sum, item) => sum + toNumber(item.revenue),
        0,
    );

    if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
};

const calculateExpensesChange = (
    currentData: ChartData[],
    previousData: ChartData[],
) => {
    const currentTotal = currentData.reduce(
        (sum, item) => sum + toNumber(item.expenses),
        0,
    );
    const previousTotal = previousData.reduce(
        (sum, item) => sum + toNumber(item.expenses),
        0,
    );

    if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
};

//-----SPLIT DATA INTO TWO EQUAL HALVES FOR COMPARISON----->
const splitDataIntoPeriods = (data: ChartData[]) => {
    const midPoint = Math.floor(data.length / 2);
    const previousPeriod = data.slice(0, midPoint);
    const currentPeriod = data.slice(midPoint);
    return { previousPeriod, currentPeriod };
};

//-----GENERATE DATE RANGE FUNCTION----->
const generateDateRange = (startDate: Date, endDate: Date): string[] => {
    const dates: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
};

//-----MONTH CAPTION COMPONENT----->
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

//-----RANGE PICKER COMPONENT----->
const RangePicker = ({
    onSelect,
    onClose,
    initialRange,
}: {
    onSelect: (from: Date, to: Date) => void;
    onClose: () => void;
    initialRange: { from: Date | null; to: Date | null };
}) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: initialRange.from || undefined,
        to: initialRange.to || undefined,
    });

    const [leftMonth, setLeftMonth] = useState<Date>(
        initialRange.from ?? new Date(),
    );

    const rightMonth = addMonths(leftMonth, 1);

    const handleConfirm = () => {
        if (dateRange?.from && dateRange?.to) {
            onSelect(dateRange.from, dateRange.to);
        }
    };

    const quickSelect = (days: number) => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - days + 1);
        setDateRange({ from, to });
        setLeftMonth(from);
    };

    const selectCurrentWeek = () => {
        const now = new Date();
        const from = new Date(now);
        from.setDate(now.getDate() - now.getDay());
        const to = new Date(from);
        to.setDate(from.getDate() + 6);
        setDateRange({ from, to });
        setLeftMonth(from);
    };

    const selectCurrentMonth = () => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange({ from, to });
        setLeftMonth(from);
    };

    const durationDays =
        dateRange?.from && dateRange?.to
            ? Math.ceil(
                  (dateRange.to.getTime() - dateRange.from.getTime()) /
                      (1000 * 3600 * 24),
              )
            : null;

    const sharedClassNames = {
        months: "flex",
        month: "space-y-2 w-full",
        caption: "hidden",
        caption_label: "hidden",
        nav: "hidden",
        table: "border-collapse mx-auto",
        head_row: "flex justify-center",
        head_cell:
            "text-gray-400 w-9 font-normal text-[11px] uppercase tracking-wider text-center py-1.5",
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
        day_selected:
            "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white shadow-md shadow-emerald-200 scale-105 font-semibold rounded-full",
        day_today:
            "ring-2 ring-emerald-400 ring-offset-1 text-emerald-700 font-semibold rounded-full",
        day_outside: "opacity-20 blur-[1px] pointer-events-none select-none",
        day_disabled: "text-gray-300 opacity-30",
        day_range_middle:
            "aria-selected:bg-emerald-100 aria-selected:text-emerald-900 rounded-none",
        day_range_start:
            "rounded-full bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-200",
        day_range_end:
            "rounded-full bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-200",
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
                        <p className="text-sm font-medium text-gray-900">
                            Select Date Range
                        </p>
                        {dateRange?.from && dateRange?.to ? (
                            <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                                {format(dateRange.from, "MMM d, yyyy")} –{" "}
                                {format(dateRange.to, "MMM d, yyyy")}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400 mt-0.5">
                                Choose start and end dates
                            </p>
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
                        {
                            label: "Last 30 days",
                            action: () => quickSelect(30),
                        },
                        { label: "This week", action: selectCurrentWeek },
                        { label: "This month", action: selectCurrentMonth },
                        {
                            label: "Last 3 months",
                            action: () => quickSelect(90),
                        },
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
                            onPrev={() =>
                                setLeftMonth(addMonths(leftMonth, -1))
                            }
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
                                const start = new Date(
                                    leftMonth.getFullYear(),
                                    leftMonth.getMonth(),
                                    1,
                                );
                                const end = new Date(
                                    leftMonth.getFullYear(),
                                    leftMonth.getMonth() + 1,
                                    0,
                                );
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
                            onPrev={() =>
                                setLeftMonth(addMonths(leftMonth, -1))
                            }
                            onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                            hidePrev
                        />
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            month={rightMonth}
                            onMonthChange={(m) =>
                                setLeftMonth(addMonths(m, -1))
                            }
                            showOutsideDays
                            disabled={(date) => {
                                const start = new Date(
                                    rightMonth.getFullYear(),
                                    rightMonth.getMonth(),
                                    1,
                                );
                                const end = new Date(
                                    rightMonth.getFullYear(),
                                    rightMonth.getMonth() + 1,
                                    0,
                                );
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
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                                    Start date
                                </p>
                                <p className="text-sm font-medium text-gray-800 mt-0.5">
                                    {format(dateRange.from, "MMM d, yyyy")}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                                    End date
                                </p>
                                <p className="text-sm font-medium text-gray-800 mt-0.5">
                                    {format(dateRange.to, "MMM d, yyyy")}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                                    Duration
                                </p>
                                <p className="text-sm font-medium text-emerald-600 mt-0.5">
                                    {durationDays} days
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400">
                                Total days
                            </p>
                            <p className="text-2xl font-semibold text-emerald-600">
                                {(durationDays ?? 0) + 1}
                            </p>
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

//-----DROPDOWN MENU COMPONENT----->
const DropdownMenu = ({
    options,
    value,
    onChange,
}: {
    options: { value: TimeRange; label: string; subtext?: string }[];
    value: TimeRange;
    onChange: (value: TimeRange) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

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
                <ChevronDown
                    className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                                    value === option.value
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-gray-700"
                                }`}
                            >
                                <div className="text-sm font-medium">
                                    {option.label}
                                </div>
                                {option.subtext && (
                                    <div className="text-xs text-gray-400">
                                        {option.subtext}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

//-----CUSTOM LEGEND COMPONENT (BOTTOM)----->
const CustomLegend = () => {
    return (
        <div className="flex justify-center gap-6 mt-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
                <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#10b981" }}
                ></div>
                <span className="text-xs text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
                <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#ef4444" }}
                ></div>
                <span className="text-xs text-gray-600">Expenses</span>
            </div>
            <div className="flex items-center gap-2">
                <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#3b82f6" }}
                ></div>
                <span className="text-xs text-gray-600">Profit</span>
            </div>
        </div>
    );
};

//-----MAIN COMPONENT----->
interface RevenueChartProps {
    data: ChartData[];
    onRangeChange?: (
        range: TimeRange,
        customDates?: { from: Date; to: Date },
    ) => void;
    customRangeData?: ChartData[];
    yearlyData?: ChartData[];
    lastYearData?: ChartData[];
    role?: "admin" | "staff";
}

export default function RevenueChart({
    data,
    onRangeChange,
    customRangeData,
    yearlyData,
    lastYearData,
    role = "admin",
}: RevenueChartProps) {
    const [activeRange, setActiveRange] = useState<TimeRange>(
        role === "staff" ? "last7days" : "last7days",
    );
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState<{
        from: Date | null;
        to: Date | null;
    }>({
        from: null,
        to: null,
    });
    const [fetchedRangeData, setFetchedRangeData] = useState<
        ChartData[] | undefined
    >(undefined);
    const [isLoadingRange, setIsLoadingRange] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const rangeOptions = [
        {
            value: "last7days" as const,
            label: "Last 7 Days",
            subtext: "daily trend",
        },
        {
            value: "last30days" as const,
            label: "Last 30 Days",
            subtext: "monthly view",
        },
        {
            value: "thismonth" as const,
            label: "This Month",
            subtext: format(new Date(), "MMMM yyyy"),
        },
        {
            value: "thisyear" as const,
            label: "This Year",
            subtext: `Jan ${currentYear} - Dec ${currentYear}`,
        },
        {
            value: "lastyear" as const,
            label: "Last Year",
            subtext: `Jan ${lastYear} - Dec ${lastYear}`,
        },
        {
            value: "custom" as const,
            label: "Custom Range",
            subtext: "select dates",
        },
    ];

    const getRangeSubtext = (range: TimeRange): string => {
        const option = rangeOptions.find((opt) => opt.value === range);
        if (range === "custom" && customRange.from && customRange.to) {
            return `${format(customRange.from, "MMM d, yyyy")} - ${format(customRange.to, "MMM d, yyyy")}`;
        }
        if (range === "thismonth") {
            return format(new Date(), "MMMM yyyy");
        }
        if (range === "thisyear") {
            return `Jan ${currentYear} - Dec ${currentYear}`;
        }
        if (range === "lastyear") {
            return `Jan ${lastYear} - Dec ${lastYear}`;
        }
        return option?.subtext || "";
    };

    // Helper function to normalize date to YYYY-MM-DD
    const normalizeDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Fetch daily revenue/expenses/profit para sa napiling custom date range
    useEffect(() => {
        if (activeRange !== "custom" || !customRange.from || !customRange.to)
            return;

        const controller = new AbortController();

        const fetchRangeData = async () => {
            setIsLoadingRange(true);
            try {
                const fromStr = normalizeDate(customRange.from!);
                const toStr = normalizeDate(customRange.to!);

                const res = await api.get("/dashboard/financial-range", {
                    params: { from: fromStr, to: toStr },
                    signal: controller.signal,
                });

                const mapped: ChartData[] = (
                    res.data?.financialRangeTrend ?? []
                ).map((item: any) => ({
                    name: item.name,
                    date: item.date,
                    revenue: Number(item.revenue) || 0,
                    expenses: Number(item.expenses) || 0,
                    profit: Number(item.profit) || 0,
                }));

                setFetchedRangeData(mapped);
            } catch (err: any) {
                if (
                    err?.name !== "CanceledError" &&
                    err?.code !== "ERR_CANCELED"
                ) {
                    console.error("Error fetching financial range data:", err);
                    setFetchedRangeData(undefined);
                }
            } finally {
                setIsLoadingRange(false);
            }
        };

        fetchRangeData();

        return () => controller.abort();
    }, [activeRange, customRange.from, customRange.to]);

    const filterDataByRange = (
        data: ChartData[],
        range: TimeRange,
        customFrom?: Date,
        customTo?: Date,
    ): ChartData[] => {
        if (!data || data.length === 0) return [];

        switch (range) {
            case "last7days": {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 6);
                const sevenDaysAgoStr = normalizeDate(sevenDaysAgo);
                const todayStr = normalizeDate(today);

                const filtered = data.filter((item: ChartData) => {
                    if (!item.date) return false;
                    return (
                        item.date >= sevenDaysAgoStr && item.date <= todayStr
                    );
                });

                return [...filtered];
            }
            case "last30days": {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 29);
                const thirtyDaysAgoStr = normalizeDate(thirtyDaysAgo);
                const todayStr = normalizeDate(today);

                const filtered = data.filter((item: ChartData) => {
                    if (!item.date) return false;
                    return (
                        item.date >= thirtyDaysAgoStr && item.date <= todayStr
                    );
                });

                return [...filtered];
            }
            case "thismonth": {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const filtered = data.filter((item: ChartData) => {
                    if (!item.date) return false;
                    const parts = item.date.split("-");
                    const year = parts[0] ?? "0";
                    const month = parts[1] ?? "0";
                    return (
                        parseInt(year) === currentYear &&
                        parseInt(month) - 1 === currentMonth
                    );
                });
                return [...filtered];
            }
            case "thisyear": {
                return yearlyData && yearlyData.length > 0
                    ? [...yearlyData]
                    : [];
            }
            case "lastyear": {
                return lastYearData && lastYearData.length > 0
                    ? [...lastYearData]
                    : [];
            }
            case "custom":
                if (customFrom && customTo) {
                    const startDateStr = normalizeDate(customFrom);
                    const endDateStr = normalizeDate(customTo);

                    let filtered = data.filter((item: ChartData) => {
                        if (!item.date) return false;
                        return (
                            item.date >= startDateStr && item.date <= endDateStr
                        );
                    });

                    const allDatesInRange = generateDateRange(
                        customFrom,
                        customTo,
                    );

                    const dataMap = new Map();
                    filtered.forEach((item) => {
                        dataMap.set(item.date, item);
                    });

                    const completeData = allDatesInRange.map((date) => {
                        if (dataMap.has(date)) {
                            return { ...dataMap.get(date) };
                        } else {
                            const dateObj = new Date(date);
                            return {
                                name: format(dateObj, "MMM d"),
                                date: date,
                                revenue: 0,
                                expenses: 0,
                                profit: 0,
                            };
                        }
                    });

                    return completeData;
                }
                return [];
            default:
                return [...data];
        }
    };

    const displayData = useMemo(() => {
        let filtered: ChartData[] = [];

        if (activeRange === "custom") {
            const src = fetchedRangeData ?? customRangeData ?? data;
            filtered = filterDataByRange(
                src,
                "custom",
                customRange.from || undefined,
                customRange.to || undefined,
            );
        } else if (activeRange === "thisyear") {
            filtered = filterDataByRange(data, "thisyear");
        } else if (activeRange === "lastyear") {
            filtered = filterDataByRange(data, "lastyear");
        } else {
            filtered = filterDataByRange(data, activeRange);
        }

        const result = [...filtered];

        result.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
        });

        if (!result || result.length === 0) {
            const today = new Date();
            return Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() - (6 - i));
                const dateStr = normalizeDate(d);
                return {
                    name: d.toLocaleDateString("en-US", { weekday: "short" }),
                    date: dateStr,
                    revenue: 0,
                    expenses: 0,
                    profit: 0,
                };
            });
        }

        return result;
    }, [
        activeRange,
        data,
        customRangeData,
        fetchedRangeData,
        yearlyData,
        lastYearData,
        customRange,
    ]);

    // Split data into two halves for proper comparison
    const { previousPeriod, currentPeriod } = useMemo(() => {
        if (displayData.length === 0) {
            return { previousPeriod: [], currentPeriod: [] };
        }
        return splitDataIntoPeriods(displayData);
    }, [displayData]);

    // Calculate changes using period totals instead of first/last points
    const revenueChange = calculatePeriodChange(currentPeriod, previousPeriod);
    const expensesChange = calculateExpensesChange(
        currentPeriod,
        previousPeriod,
    );

    const totalRevenue = displayData.reduce(
        (sum, item) => sum + toNumber(item.revenue),
        0,
    );
    const totalExpenses = displayData.reduce(
        (sum, item) => sum + toNumber(item.expenses),
        0,
    );
    const totalProfit = displayData.reduce(
        (sum, item) => sum + toNumber(item.profit),
        0,
    );
    const profitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const handleRangeChange = (range: TimeRange) => {
        if (role === "staff") return;

        setActiveRange(range);

        if (range !== "custom") {
            setShowCalendar(false);
            onRangeChange?.(range);
        } else {
            setShowCalendar(true);
        }
    };

    const handleCustomDateSelect = (from: Date, to: Date) => {
        setCustomRange({ from, to });
        onRangeChange?.("custom", { from, to });
        setShowCalendar(false);
    };

    // Calculate dynamic tick interval and angle based on data length
    const getXAxisProps = () => {
        const dataLength = displayData.length;

        if (activeRange === "custom" && dataLength > 15) {
            return {
                interval: 0, // Changed from Math.floor(dataLength / 10) to 0 to show every day
                angle: -45,
                height: 80,
                fontSize: 10,
            };
        }

        if (
            activeRange === "last30days" ||
            (activeRange === "custom" && dataLength > 10)
        ) {
            return {
                interval: 0, // Changed from Math.floor(dataLength / 8) to 0 to show every day
                angle: -40,
                height: 70,
                fontSize: 10,
            };
        }

        if (activeRange === "thisyear" || activeRange === "lastyear") {
            return {
                interval: 0,
                angle: -35,
                height: 60,
                fontSize: 11,
            };
        }

        return {
            interval: 0,
            angle: -35,
            height: 60,
            fontSize: 11,
        };
    };

    const xAxisProps = getXAxisProps();

    // Format X-axis labels based on active range
    const formatXAxisLabel = (value: string, index: number) => {
        const date = new Date(value);

        if (activeRange === "last7days") {
            return date.toLocaleDateString("en-US", { weekday: "short" });
        }
        if (activeRange === "last30days") {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        }
        if (activeRange === "thismonth") {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        }
        if (activeRange === "thisyear" || activeRange === "lastyear") {
            return date.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            });
        }
        if (activeRange === "custom") {
            // For custom range, show month/day
            // If the range spans multiple years, also show the year
            const firstDateItem = displayData[0];
            const lastDateItem = displayData[displayData.length - 1];
            const firstDate = firstDateItem?.date
                ? new Date(firstDateItem.date)
                : null;
            const lastDate = lastDateItem?.date
                ? new Date(lastDateItem.date)
                : null;

            // Check if range spans multiple years
            if (
                firstDate &&
                lastDate &&
                firstDate.getFullYear() !== lastDate.getFullYear()
            ) {
                return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
            }
            // For single year range, just show month and day
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        }
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Revenue, Expenses & Profit
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {activeRange === "custom" && isLoadingRange
                            ? "Loading data..."
                            : getRangeSubtext(activeRange)}
                    </p>
                </div>
                {role === "admin" ? (
                    <DropdownMenu
                        options={rangeOptions}
                        value={activeRange}
                        onChange={handleRangeChange}
                    />
                ) : (
                    <span className="text-xs text-gray-400">Last 7 Days</span>
                )}
            </div>

            {role === "admin" && showCalendar && (
                <RangePicker
                    onSelect={handleCustomDateSelect}
                    onClose={() => {
                        setShowCalendar(false);
                        setActiveRange("last7days");
                    }}
                    initialRange={customRange}
                />
            )}

            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-100">
                <div>
                    <p className="text-xs text-gray-500 font-medium">
                        Total Revenue
                    </p>
                    <p className="text-xl font-bold text-emerald-600">
                        ₱{totalRevenue.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span
                            className={`text-xs ${revenueChange >= 0 ? "text-emerald-600" : "text-red-500"}`}
                        >
                            {revenueChange >= 0 ? "+" : ""}
                            {revenueChange.toFixed(1)}%
                        </span>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-gray-500 font-medium">
                        Total Expenses
                    </p>
                    <p className="text-xl font-bold text-red-500">
                        ₱{totalExpenses.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        <span
                            className={`text-xs ${expensesChange > 0 ? "text-red-500" : "text-emerald-600"}`}
                        >
                            {expensesChange >= 0 ? "+" : ""}
                            {expensesChange.toFixed(1)}%
                        </span>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-gray-500 font-medium">
                        Net Profit
                    </p>
                    <p
                        className={`text-xl font-bold ${totalProfit < 0 ? "text-red-500" : "text-blue-600"}`}
                    >
                        ₱{totalProfit.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-blue-600">
                            {profitMargin.toFixed(1)}% margin
                        </span>
                    </div>
                </div>
            </div>

            {/* Horizontal scrollable chart container */}
            <div
                ref={chartContainerRef}
                className="w-full overflow-x-auto overflow-y-hidden"
                style={{
                    minHeight: "420px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#cbd5e1 #f1f5f9",
                }}
            >
                <div
                    style={{
                        width:
                            activeRange === "custom" && displayData.length > 15
                                ? `${Math.max(800, displayData.length * 45)}px`
                                : "100%",
                        minWidth: "100%",
                        height: "380px",
                    }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={displayData}
                            margin={{
                                top: 10,
                                right: 30,
                                left: 10,
                                bottom: 10,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatXAxisLabel}
                                stroke="#9ca3af"
                                fontSize={xAxisProps.fontSize}
                                tickLine={false}
                                axisLine={false}
                                interval={xAxisProps.interval}
                                angle={xAxisProps.angle}
                                textAnchor="end"
                                height={xAxisProps.height}
                                dy={5}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) =>
                                    `₱${value.toLocaleString()}`
                                }
                                width={80}
                            />
                            <Tooltip
                                formatter={(value: any, name: any) => [
                                    `₱${Number(value)?.toLocaleString() || 0}`,
                                    name
                                        ? name.charAt(0).toUpperCase() +
                                          name.slice(1)
                                        : "",
                                ]}
                                labelFormatter={(label) => {
                                    const date = new Date(label);
                                    if (
                                        activeRange === "thisyear" ||
                                        activeRange === "lastyear"
                                    ) {
                                        return format(date, "MMMM yyyy");
                                    }
                                    return format(date, "MMM d, yyyy");
                                }}
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                }}
                                labelStyle={{ color: "#374151" }}
                            />
                            {/* REMOVED Legend from here - moving to bottom */}
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="Revenue"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                connectNulls={true}
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                name="Expenses"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                connectNulls={true}
                            />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                name="Profit"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                connectNulls={true}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Custom Legend at Bottom */}
            <CustomLegend />

            {/* Horizontal scroll indicator for custom range with many days */}
            {activeRange === "custom" && displayData.length > 15 && (
                <div className="text-center mt-2">
                    <p className="text-xs text-gray-400">
                        ← Scroll horizontally to see more data →
                        <span className="inline-block ml-2 text-emerald-500">
                            ({displayData.length} days)
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}
