import { useEffect, useState } from "react";
import api from "@/services/api";

interface Shift {
    id: number;
    shift_number: string;
    opened_at: string;
    starting_cash: number;
    expected_cash: number;
    handled_bookings: number;
}

interface PreviousShift {
    shift_number: string;
    closed_at: string;
    closed_cash: number;
}

interface ShiftStatusModalProps {
    open: boolean;
    onClose: () => void;
    onShiftChange?: (shift: Shift | null) => void;
}

interface ApiError {
    response?: {
        status?: number;
        data?: {
            message?: string;
            starting_cash?: number;
            previous_shift?: PreviousShift | null;
        };
    };
}

export default function ShiftStatusModal({
    open,
    onClose,
    onShiftChange,
}: ShiftStatusModalProps) {
    const [shift, setShift] = useState<Shift | null>(null);
    const [previousShift, setPreviousShift] =
        useState<PreviousShift | null>(null);

    const [loading, setLoading] = useState(false);
    const [startingCash, setStartingCash] = useState("");
    const [processing, setProcessing] = useState(false);

    // Get current shift
    const fetchShift = async () => {
        try {
            setLoading(true);

            const response = await api.get("/shift/current");

            setShift(response.data);
            setPreviousShift(null);
        } catch (error) {
            const apiError = error as ApiError;

            if (apiError.response?.status === 404) {
                setShift(null);

                const data = apiError.response?.data;

                setPreviousShift(data?.previous_shift ?? null);
                setStartingCash("");
            } else {
                console.error("Failed to fetch shift:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchShift();
        }
    }, [open]);

    // Open shift
    const handleOpenShift = async () => {
        try {
            setProcessing(true);

            const response = await api.post("/shift/open", {
                starting_cash: Number(
                    previousShift?.closed_cash ?? 0
                ),
            });

            const newShift: Shift = response.data.data;

            // Change modal from "No Open Shift"
            // to "Shift is Open"
            setShift(newShift);

            onShiftChange?.(newShift);
        } catch (error) {
            const apiError = error as ApiError;

            alert(
                apiError.response?.data?.message ||
                    "Failed to open shift."
            );
        } finally {
            setProcessing(false);
        }
    };

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                {loading ? (
                    <div className="py-10 text-center">
                        <p className="text-sm text-gray-500">
                            Checking shift status...
                        </p>
                    </div>
                ) : shift ? (
                    <>
                        {/* Header */}
                        <div className="mb-5">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500" />

                                <h2 className="text-lg font-semibold text-gray-900">
                                    Shift is Open
                                </h2>
                            </div>

                            <p className="text-sm text-gray-500">
                                Your shift is currently open.
                            </p>
                        </div>

                        {/* Shift details */}
                        <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
                            {/* Shift Number */}
                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Shift Number
                                </span>

                                <span className="text-right text-sm font-semibold text-gray-900">
                                    {shift.shift_number}
                                </span>
                            </div>

                            {/* Starting Cash */}
                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Starting Cash
                                </span>

                                <span className="font-semibold text-green-600">
                                    ₱
                                    {Number(
                                        shift.starting_cash || 0
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>

                            {/* Expected Cash */}
                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Expected Cash
                                </span>

                                <span className="font-semibold text-green-600">
                                    ₱
                                    {Number(
                                        shift.expected_cash || 0
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
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

                        {/* OK */}
                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                OK
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Header */}
                        <div className="mb-5">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-yellow-500" />

                                <h2 className="text-lg font-semibold text-gray-900">
                                    No Open Shift
                                </h2>
                            </div>

                            <p className="text-sm leading-6 text-gray-500">
                                You don't have an active shift.
                            </p>
                        </div>

                        {/* Warning */}
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                            <p className="text-sm leading-6 text-yellow-800">
                                Without an open shift, you can view
                                bookings, but you cannot confirm
                                bookings.
                            </p>
                        </div>

                        {/* Previous Shift */}
                        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Previous Shift
                            </p>

                            {previousShift ? (
                                <div className="space-y-3">
                                    {/* Shift Number */}
                                    <div className="flex justify-between gap-4">
                                        <span className="text-sm text-gray-500">
                                            Shift Number
                                        </span>

                                        <span className="text-right text-sm font-semibold text-gray-900">
                                            {
                                                previousShift.shift_number
                                            }
                                        </span>
                                    </div>

                                    {/* Closed Date */}
                                    <div className="flex justify-between gap-4">
                                        <span className="text-sm text-gray-500">
                                            Closed Date
                                        </span>

                                        <span className="text-right text-sm font-medium text-gray-700">
                                            {new Date(
                                                previousShift.closed_at
                                            ).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Closing Cash */}
                                    <div className="flex justify-between gap-4">
                                        <span className="text-sm text-gray-500">
                                            Closing Cash
                                        </span>

                                        <span className="text-sm font-bold text-green-600">
                                            ₱
                                            {Number(
                                                previousShift.closed_cash ||
                                                    0
                                            ).toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No previous shift found.
                                </p>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="mt-5 flex gap-3">
                            {/* View Only */}
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                View Only
                            </button>

                            {/* Open Shift */}
                            <button
                                type="button"
                                onClick={handleOpenShift}
                                disabled={processing}
                                className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing
                                    ? "Opening..."
                                    : "Open Shift"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}