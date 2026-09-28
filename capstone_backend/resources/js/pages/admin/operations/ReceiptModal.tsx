// src/pages/operations/ReceiptModal.tsx
import { useEffect, useState } from "react";
import { message } from "antd";
import api from "@/services/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    printReceipt,
    searchPrinter,
    refreshPrinter,
    isSerialSupported,
    isPrinterConnected,
} from "./thermalPrinter";

export interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentId: string | null;
    // For a split payment checkout, pass all leg payment ids here instead.
    // Takes precedence over paymentId when non-empty.
    paymentIds?: (string | number)[];
}

type PrinterStatus = "checking" | "connected" | "disconnected" | "unsupported";

export default function ReceiptModal({
    isOpen,
    onClose,
    paymentId,
    paymentIds,
}: ReceiptModalProps) {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [printerStatus, setPrinterStatus] =
        useState<PrinterStatus>("checking");

    const idsToLoad =
        paymentIds && paymentIds.length > 0
            ? paymentIds
            : paymentId
              ? [paymentId]
              : [];

    const loadReceipts = async () => {
        if (idsToLoad.length === 0) return;
        setLoading(true);
        try {
            const results = await Promise.all(
                idsToLoad.map((id) =>
                    api.get(`/receipts/${id}`).then((res) => res.data),
                ),
            );
            setReceipts(results);
        } catch (err) {
            console.error(err);
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && idsToLoad.length > 0) {
            loadReceipts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, paymentId, JSON.stringify(paymentIds)]);

    // ---------- Printer ----------
    const checkPrinter = async () => {
        if (!isSerialSupported()) {
            setPrinterStatus("unsupported");
            return;
        }
        setPrinterStatus("checking");
        const ok = isPrinterConnected() || (await refreshPrinter());
        setPrinterStatus(ok ? "connected" : "disconnected");
    };

    useEffect(() => {
        if (isOpen) checkPrinter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleSearchPrinter = async () => {
        try {
            setPrinterStatus("checking");
            await searchPrinter();
            setPrinterStatus("connected");
            message.success("Printer connected");
        } catch (err: any) {
            setPrinterStatus("disconnected");
            if (err?.name === "NotFoundError") return; // picker closed
            message.error(err?.message || "Could not connect to printer");
        }
    };

    const handleRefresh = async () => {
        await Promise.all([loadReceipts(), checkPrinter()]);
        message.info("Refreshed");
    };

    const handlePrint = async () => {
        if (!receipts.length) {
            message.warning("Receipt data is not available yet.");
            return;
        }

        try {
            setPrinting(true);

            // PRINT THE ACTUAL CHECKOUT RECEIPT
            await printReceipt(receipts);

            setPrinterStatus("connected");

            message.success("Actual receipt sent to printer");
        } catch (err: any) {
            if (err?.name === "NotFoundError") {
                return;
            }

            console.error("Actual receipt printing error:", err);

            setPrinterStatus("disconnected");

            message.error(
                err?.message || "Could not print. Is the printer on?",
            );
        } finally {
            setPrinting(false);
        }
    };

    // Use the first receipt for shared booking-level fields (they share the
    // same booking in a split payment). Payment-specific fields (method,
    // reference, amount, cashier) are rendered per-leg below.
    const receipt = receipts[0] ?? null;
    const isSplit = receipts.length > 1;
    const totalAmount = receipts.reduce(
        (sum, r) => sum + (Number(r?.amount) || 0),
        0,
    );

    if (!isOpen) return null;

    // Friendly label for the payment method
    const paymentMethodLabel = (method: string | undefined): string => {
        switch (method) {
            case "cash":
                return "Cash";
            case "qrph":
                return "QR Ph";
            case "gcash":
                return "GCash";
            case "bank":
            case "bank_transfer":
                return "Bank Transfer";
            default:
                return method ?? "-";
        }
    };

    // Renders the reference number line for a given receipt/payment leg,
    // based on its payment method (gcash / bank / qrph each store their
    // reference in a different field).
    const renderPaymentReference = (r: any, keySuffix: string | number) => {
        if (r.payment_method === "gcash" && r.gcash_reference) {
            return (
                <div
                    className="flex justify-between"
                    key={`gcash-${keySuffix}`}
                >
                    <span className="text-gray-600">GCash Ref.</span>
                    <span>{r.gcash_reference}</span>
                </div>
            );
        }
        if (
            (r.payment_method === "bank" ||
                r.payment_method === "bank_transfer") &&
            r.bank_reference
        ) {
            return (
                <div className="flex justify-between" key={`bank-${keySuffix}`}>
                    <span className="text-gray-600">Bank Ref.</span>
                    <span>{r.bank_reference}</span>
                </div>
            );
        }
        if (r.payment_method === "qrph" && r.bank_reference) {
            return (
                <div className="flex justify-between" key={`qrph-${keySuffix}`}>
                    <span className="text-gray-600">QR Ph Ref.</span>
                    <span className="text-xs break-all">
                        {r.bank_reference}
                    </span>
                </div>
            );
        }
        return null;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white ring-0 focus:ring-0 focus-visible:ring-0 outline-none border border-gray-200 shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-center text-base font-semibold tracking-wide uppercase text-gray-800">
                        Official Receipt
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="text-center py-10 text-sm text-gray-500">
                        Loading receipt...
                    </div>
                ) : receipt ? (
                    <div
                        id="receipt-content"
                        className="bg-white text-gray-900 font-mono text-[13px] leading-relaxed px-2"
                    >
                        {/* Business Header */}
                        <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-400">
                            <h2 className="text-lg font-bold tracking-wide uppercase">
                                Lynn Ennia Travelers Inn
                            </h2>
                            <p className="text-xs text-gray-600 mt-1">
                                Official Receipt
                            </p>
                        </div>

                        {/* Transaction Details */}
                        <div className="space-y-1.5 pb-4 border-b border-dashed border-gray-400">
                            <div className="flex justify-between">
                                <span className="text-gray-600">
                                    {isSplit ? "Receipt Nos." : "Receipt No."}
                                </span>
                                <span className="font-semibold">
                                    {isSplit
                                        ? receipts
                                              .map((r) => r.receipt_number)
                                              .join(", ")
                                        : receipt.receipt_number}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">
                                    Booking Ref.
                                </span>
                                <span className="font-semibold">
                                    {receipt.booking?.booking_reference}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Date</span>
                                <span>
                                    {new Date(
                                        receipt.payment_date,
                                    ).toLocaleString()}
                                </span>
                            </div>

                            {!isSplit ? (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Payment Method
                                        </span>
                                        <span>
                                            {paymentMethodLabel(
                                                receipt.payment_method,
                                            )}
                                        </span>
                                    </div>
                                    {renderPaymentReference(receipt, "single")}
                                </>
                            ) : (
                                <div className="pt-1">
                                    <div className="text-gray-600 mb-1">
                                        Payment Breakdown
                                    </div>
                                    <div className="space-y-1 pl-2">
                                        {receipts.map((r, idx) => (
                                            <div key={r.id ?? idx}>
                                                <div className="flex justify-between">
                                                    <span>
                                                        {paymentMethodLabel(
                                                            r.payment_method,
                                                        )}
                                                    </span>
                                                    <span className="font-semibold">
                                                        ₱
                                                        {Number(
                                                            r.amount,
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                                {renderPaymentReference(r, idx)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span className="text-gray-600">Cashier</span>
                                <span>
                                    {receipt.receiver
                                        ? `${receipt.receiver.first_name} ${receipt.receiver.last_name}`
                                        : "-"}
                                </span>
                            </div>
                        </div>

                        {/* Room Details */}
                        {receipt.booking?.booked_rooms &&
                            receipt.booking.booked_rooms.length > 0 && (
                                <div className="py-4 border-b border-dashed border-gray-400">
                                    <p className="font-semibold uppercase text-xs tracking-wide text-gray-600 mb-2">
                                        Room Charges
                                    </p>
                                    {receipt.booking.booked_rooms.map(
                                        (room: any, index: number) => (
                                            <div
                                                key={index}
                                                className={`pb-3 ${
                                                    index !==
                                                    receipt.booking.booked_rooms
                                                        .length -
                                                        1
                                                        ? "border-b border-dashed border-gray-300 mb-3"
                                                        : ""
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-semibold">
                                                            Room{" "}
                                                            {
                                                                room.room
                                                                    ?.room_number
                                                            }
                                                        </div>

                                                        <div className="text-xs text-gray-500">
                                                            {
                                                                room.room
                                                                    ?.room_type
                                                                    ?.type_name
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="text-xs font-semibold uppercase text-gray-600">
                                                        {room.stay_type ===
                                                        "short_stay"
                                                            ? "Short Stay"
                                                            : "Overnight"}
                                                    </div>
                                                </div>

                                                <div className="mt-2 text-xs text-gray-600">
                                                    Scheduled Check-in:{" "}
                                                    {new Date(
                                                        room.check_in_date,
                                                    ).toLocaleDateString()}
                                                </div>

                                                {room.check_in_time && (
                                                    <div className="text-xs text-gray-600">
                                                        Actual Check-in:{" "}
                                                        {new Date(
                                                            room.check_in_time,
                                                        ).toLocaleString()}
                                                    </div>
                                                )}

                                                <div className="text-xs text-gray-600">
                                                    Scheduled Check-out:{" "}
                                                    {new Date(
                                                        room.check_out_date,
                                                    ).toLocaleDateString()}
                                                </div>

                                                {room.expected_checkout_at && (
                                                    <div className="text-xs text-amber-700 font-medium">
                                                        Expected Checkout:{" "}
                                                        {new Date(
                                                            room.expected_checkout_at,
                                                        ).toLocaleString()}
                                                    </div>
                                                )}

                                                {room.check_out_time && (
                                                    <div className="text-xs text-gray-600">
                                                        Actual Check-out:{" "}
                                                        {new Date(
                                                            room.check_out_time,
                                                        ).toLocaleString()}
                                                    </div>
                                                )}

                                                <div className="flex justify-between mt-2">
                                                    <span>Room Amount</span>

                                                    <span className="font-semibold">
                                                        ₱
                                                        {Number(
                                                            room.subtotal,
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}

                        {/* Add-ons */}
                        {receipt.booking?.booked_rooms?.some(
                            (room: any) => room.booking_add_ons?.length > 0,
                        ) && (
                            <div className="py-4 border-b border-dashed border-gray-400">
                                <p className="font-semibold uppercase text-xs tracking-wide text-gray-600 mb-2">
                                    Add-ons
                                </p>

                                {receipt.booking.booked_rooms.flatMap(
                                    (room: any) =>
                                        (room.booking_add_ons ?? []).map(
                                            (addon: any) => (
                                                <div
                                                    key={addon.id}
                                                    className="flex justify-between mb-1"
                                                >
                                                    <span>
                                                        Room{" "}
                                                        {room.room?.room_number}{" "}
                                                        •{" "}
                                                        {
                                                            addon.add_on
                                                                ?.add_on_name
                                                        }{" "}
                                                        x{addon.quantity}
                                                    </span>

                                                    <span>
                                                        ₱
                                                        {Number(
                                                            addon.subtotal,
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            ),
                                        ),
                                )}
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-4">
                            <span className="font-bold uppercase tracking-wide text-sm">
                                Total Amount
                            </span>
                            <span className="font-bold text-lg">
                                ₱
                                {(isSplit
                                    ? totalAmount
                                    : Number(receipt.amount)
                                ).toLocaleString()}
                            </span>
                        </div>

                        <div className="text-center text-[11px] text-gray-500 mt-6 pt-4 border-t border-dashed border-gray-400">
                            Thank you for staying with us.
                        </div>

                        {/* Printer controls */}
                        <div className="mt-6 space-y-2">
                            <div className="flex items-center text-xs">
                                <span className="flex items-center gap-1.5 text-gray-600">
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full ${
                                            printerStatus === "connected"
                                                ? "bg-green-500"
                                                : printerStatus === "checking"
                                                  ? "bg-amber-400"
                                                  : "bg-red-500"
                                        }`}
                                    />
                                    {printerStatus === "connected" &&
                                        "Printer connected"}
                                    {printerStatus === "checking" &&
                                        "Checking printer..."}
                                    {printerStatus === "disconnected" &&
                                        "Printer not connected"}
                                    {printerStatus === "unsupported" &&
                                        "Use Chrome or Edge for thermal printing"}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleSearchPrinter}
                                    disabled={printerStatus === "unsupported"}
                                    className="flex-1"
                                >
                                    Search Printer
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    Refresh
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handlePrint}
                                    disabled={
                                        printing ||
                                        printerStatus === "unsupported"
                                    }
                                    className="flex-1"
                                >
                                    {printing ? "Printing..." : "Print Receipt"}
                                </Button>
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-fcenter py-10 text-sm text-red-500">
                        Failed to load receipt
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
