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
        };
    };
}

export default function ShiftStatusModal({
    open,
    onClose,
    onShiftChange,
}: ShiftStatusModalProps) {
    const [shift, setShift] = useState<Shift | null>(null);
    const [loading, setLoading] = useState(false);
    const [startingCash, setStartingCash] = useState("");
    const [closedCash, setClosedCash] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchShift = async () => {
        try {
            setLoading(true);

            const response = await api.get("/shift/current");

            setShift(response.data);
        } catch (error) {
            const apiError = error as ApiError;

            if (apiError.response?.status === 404) {
                setShift(null);
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

    const handleOpenShift = async () => {
        if (!startingCash) return;

        try {
            setProcessing(true);

            const response = await api.post("/shift/open", {
                starting_cash: Number(startingCash),
            });

            const newShift: Shift = response.data.data;

            setShift(newShift);
            setStartingCash("");

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

    const handleCloseShift = async () => {
        if (!closedCash || !shift) return;

        try {
            setProcessing(true);

            await api.post(`/shift/close/${shift.id}`, {
                closed_cash: Number(closedCash),
            });

            setShift(null);
            setClosedCash("");

            onShiftChange?.(null);

            onClose();
        } catch (error) {
            const apiError = error as ApiError;

            alert(
                apiError.response?.data?.message ||
                    "Failed to close shift."
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
                        {/* HEADER */}
                        <div className="mb-5">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500" />

                                <h2 className="text-lg font-semibold text-gray-900">
                                    Shift is Open
                                </h2>
                            </div>

                            <p className="text-sm text-gray-500">
                                You currently have an active shift.
                            </p>
                        </div>

                        {/* SHIFT DETAILS */}
                        <div className="space-y-3 rounded-xl border bg-gray-50 p-4">

                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Shift Number
                                </span>

                                <span className="text-right text-sm font-semibold">
                                    {shift.shift_number}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Starting Cash
                                </span>

                                <span className="font-semibold text-green-600">
                                    ₱
                                    {Number(
                                        shift.starting_cash || 0
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Expected Cash
                                </span>

                                <span className="font-semibold text-green-600">
                                    ₱
                                    {Number(
                                        shift.expected_cash || 0
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-gray-500">
                                    Handled Bookings
                                </span>

                                <span className="text-sm font-semibold">
                                    {shift.handled_bookings || 0}
                                </span>
                            </div>
                        </div>

                        {/* CLOSING CASH */}
                        <div className="mt-5">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Closing Cash
                            </label>

                            <input
                                type="number"
                                min="0"
                                value={closedCash}
                                onChange={(e) =>
                                    setClosedCash(e.target.value)
                                }
                                placeholder="Enter actual cash"
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>

                        {/* BOTTOM BUTTONS */}
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                View Only
                            </button>

                            <button
                                type="button"
                                onClick={handleCloseShift}
                                disabled={
                                    processing ||
                                    !closedCash
                                }
                                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing
                                    ? "Closing..."
                                    : "Close Shift"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* HEADER */}
                        <div className="mb-5">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-yellow-500" />

                                <h2 className="text-lg font-semibold text-gray-900">
                                    No Open Shift
                                </h2>
                            </div>

                            <p className="text-sm leading-6 text-gray-500">
                                You don't have an active shift.
                                You may open a shift or continue
                                in view-only mode.
                            </p>
                        </div>

                        {/* WARNING */}
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                            <p className="text-sm leading-6 text-yellow-800">
                                Without an open shift, you can view
                                bookings, but you cannot confirm
                                bookings.
                            </p>
                        </div>

                        {/* STARTING CASH */}
                        <div className="mt-5">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Starting Cash
                            </label>

                            <input
                                type="number"
                                min="0"
                                value={startingCash}
                                onChange={(e) =>
                                    setStartingCash(e.target.value)
                                }
                                placeholder="Enter starting cash"
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>

                        {/* BOTTOM BUTTONS */}
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                View Only
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenShift}
                                disabled={
                                    processing ||
                                    !startingCash
                                }
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