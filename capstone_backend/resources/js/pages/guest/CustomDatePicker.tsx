import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface CustomDatePickerProps {
    label: string;
    value: string | undefined; // "YYYY-MM-DD"
    onChange: (date: string) => void;
    minDate?: string; // "YYYY-MM-DD"
    placeholder?: string;
    /**
     * Dates that are already booked for this room and cannot be
     * selected — "YYYY-MM-DD" strings, e.g. from expanding the
     * ranges returned by GET /rooms/{id}/booked-dates.
     */
    disabledDates?: Set<string> | string[];
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseISO = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    const y = parts[0] ?? new Date().getFullYear();
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    return new Date(y, m - 1, d);
};

const toISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const formatDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = parseISO(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
};

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const POPOVER_WIDTH = 300;

export default function CustomDatePicker({
    label,
    value,
    onChange,
    minDate,
    placeholder = "Select date",
    disabledDates,
}: CustomDatePickerProps) {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(() =>
        value ? parseISO(value) : minDate ? parseISO(minDate) : new Date(),
    );
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        openUp: boolean;
    }>({ top: 0, left: 0, openUp: false });

    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const bookedSet =
        disabledDates instanceof Set
            ? disabledDates
            : new Set(disabledDates ?? []);

    // Keep the visible month in sync whenever the selected value changes
    // from outside (e.g. check-in shifting check-out forward).
    useEffect(() => {
        if (value) setViewDate(parseISO(value));
    }, [value]);

    // Compute position of the floating calendar
    const updatePosition = () => {
        const btn = buttonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const popoverHeight = 380; // approx height, fine-tuned below
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < popoverHeight + 16;

        let left = rect.left;
        // Prevent overflowing on the right edge
        if (left + POPOVER_WIDTH > window.innerWidth - 8) {
            left = window.innerWidth - POPOVER_WIDTH - 8;
        }
        if (left < 8) left = 8;

        setCoords({
            top: openUp ? rect.top - 8 : rect.bottom + 8,
            left,
            openUp,
        });
    };

    // Reposition on open / resize / scroll
    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();

        const handle = () => updatePosition();
        window.addEventListener("resize", handle);
        window.addEventListener("scroll", handle, true);
        return () => {
            window.removeEventListener("resize", handle);
            window.removeEventListener("scroll", handle, true);
        };
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                popoverRef.current &&
                !popoverRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [open]);

    const min = minDate ? parseISO(minDate) : null;
    const selected = value ? parseISO(value) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const monthLabel = viewDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    // Build a 6-week (42 cell) grid including leading/trailing days
    // from the adjacent months, like the reference calendar.
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
        cells.push({
            date: new Date(year, month - 1, daysInPrevMonth - i),
            inMonth: false,
        });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    let next = 1;
    while (cells.length < 42) {
        cells.push({ date: new Date(year, month + 1, next), inMonth: false });
        next++;
    }

    const isPast = (d: Date) => (min ? d < min : false);
    const isBooked = (d: Date) => bookedSet.has(toISO(d));
    const isDisabled = (d: Date) => isPast(d) || isBooked(d);

    const selectDate = (d: Date) => {
        if (isDisabled(d)) return;
        onChange(toISO(d));
        setOpen(false);
    };

    const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const popover = open ? (
        <div
            ref={popoverRef}
            style={{
                position: "fixed",
                top: coords.openUp ? undefined : coords.top,
                bottom: coords.openUp
                    ? window.innerHeight - coords.top
                    : undefined,
                left: coords.left,
                width: POPOVER_WIDTH,
                zIndex: 9999,
            }}
            className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-4"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#0d2e1f]">
                    {monthLabel}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={goPrevMonth}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#eaf3ea] hover:text-[#1a4a35] transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={goNextMonth}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#eaf3ea] hover:text-[#1a4a35] transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-y-1">
                {WEEKDAYS.map((w) => (
                    <span
                        key={w}
                        className="text-[11px] font-medium text-gray-400 text-center py-1"
                    >
                        {w}
                    </span>
                ))}

                {cells.map(({ date, inMonth }, i) => {
                    const past = isPast(date);
                    const booked = !past && isBooked(date);
                    const disabled = past || booked;
                    const selectedDay = selected && isSameDay(date, selected);
                    const isToday = isSameDay(date, today);

                    let classes =
                        "relative w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm transition-colors ";
                    if (selectedDay) {
                        classes += "bg-[#0d2e1f] text-white font-semibold";
                    } else if (booked) {
                        classes +=
                            "bg-red-50 text-red-300 line-through cursor-not-allowed";
                    } else if (past) {
                        classes += "text-gray-300 cursor-not-allowed";
                    } else if (!inMonth) {
                        classes +=
                            "text-gray-300 hover:bg-gray-50 hover:text-gray-400";
                    } else if (isToday) {
                        classes +=
                            "border border-[#c9a96e] text-[#0d2e1f] font-medium hover:bg-[#eaf3ea]";
                    } else {
                        classes +=
                            "text-gray-700 hover:bg-[#eaf3ea] hover:text-[#1a4a35]";
                    }

                    return (
                        <button
                            key={i}
                            type="button"
                            disabled={disabled}
                            title={booked ? "Already booked" : undefined}
                            onClick={() => selectDate(date)}
                            className={classes}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            {bookedSet.size > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-200" />
                    <span className="text-[11px] text-gray-400">
                        Booked dates are unavailable
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <button
                    type="button"
                    onClick={() => {
                        onChange("");
                        setOpen(false);
                    }}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Clear
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const t = new Date();
                        t.setHours(0, 0, 0, 0);
                        setViewDate(t);
                        if (!isDisabled(t)) {
                            onChange(toISO(t));
                            setOpen(false);
                        }
                    }}
                    className="text-xs font-medium text-[#1a4a35] hover:text-[#0d2e1f] transition-colors"
                >
                    Today
                </button>
            </div>
        </div>
    ) : null;

    return (
        <div ref={containerRef} className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {label}
            </label>

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative w-full text-left pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all bg-white"
            >
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <span className={value ? "text-gray-700" : "text-gray-400"}>
                    {value ? formatDisplay(value) : placeholder}
                </span>
            </button>

            {typeof document !== "undefined" &&
                popover &&
                createPortal(popover, document.body)}
        </div>
    );
}