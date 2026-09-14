import { useEffect, useState } from "react";

interface Shift {
    id: number;
    shift_number: string;
    opened_at: string;
    starting_cash: number;
    expected_cash: number;
    handled_bookings: number;
}

interface CloseShiftModalProps {
    open: boolean;
    shift: Shift | null;
    onClose: () => void;
    onLogout: () => void;
}

export default function CloseShiftModal({
    open,
    shift,
    onClose,
    onLogout,
}: CloseShiftModalProps) {
    const [closeDate, setCloseDate] = useState("");

    useEffect(() => {
        if (open) {
            setCloseDate(
                new Date().toLocaleString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
            );
        }
    }, [open]);

    if (!open || !shift) {
        return null;
    }

    const formatMoney = (value: number) => {
        return Number(value || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

                {/* Header */}
                <div className="mb-5">
                    <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />

                        <h2 className="text-lg font-semibold text-gray-900">
                            Close Shift & Logout
                        </h2>
                    </div>

                    <p className="text-sm leading-6 text-gray-500">
                        Your shift is currently open. Please review the
                        shift details before logging out.
                    </p>
                </div>

                {/* Current Shift */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Current Shift
                    </p>

                    <div className="space-y-3">

                        {/* Shift Number */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Shift Number
                            </span>

                            <span className="text-right text-sm font-semibold text-gray-900">
                                {shift.shift_number}
                            </span>
                        </div>

                        {/* Opened Date */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Opened Date
                            </span>

                            <span className="text-right text-sm font-medium text-gray-700">
                                {formatDate(shift.opened_at)}
                            </span>
                        </div>

                        {/* Starting Cash */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Starting Cash
                            </span>

                            <span className="text-sm font-semibold text-green-600">
                                ₱{formatMoney(shift.starting_cash)}
                            </span>
                        </div>

                        {/* Expected Cash */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Expected Cash
                            </span>

                            <span className="text-sm font-semibold text-green-600">
                                ₱{formatMoney(shift.expected_cash)}
                            </span>
                        </div>

                        {/* Handled Bookings */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Handled Bookings
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {shift.handled_bookings || 0}
                            </span>
                        </div>

                    </div>
                </div>

                {/* Closing Details */}
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-500">
                        Closing Details
                    </p>

                    <div className="space-y-3">

                        {/* Close Date */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Close Date
                            </span>

                            <span className="text-right text-sm font-medium text-gray-700">
                                {closeDate}
                            </span>
                        </div>

                        {/* Closing Cash */}
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-500">
                                Closing Cash
                            </span>

                            <span className="text-sm font-bold text-red-600">
                                ₱{formatMoney(shift.expected_cash)}
                            </span>
                        </div>

                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-500">
                        Closing cash is automatically based on the
                        expected cash for this shift.
                    </p>
                </div>

                {/* Buttons */}
                <div className="mt-5 flex gap-3">

                    {/* Cancel */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        Cancel
                    </button>

                    {/* Close & Logout */}
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                        Close & Logout
                    </button>

                </div>
            </div>
        </div>
    );
}