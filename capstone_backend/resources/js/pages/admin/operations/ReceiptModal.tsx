// src/components/ReceiptModal.tsx
import { useEffect, useState } from "react";
import api from "@/services/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentId: string | null;
}

export default function ReceiptModal({
    isOpen,
    onClose,
    paymentId,
}: ReceiptModalProps) {
    const [receipt, setReceipt] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && paymentId) {
            loadReceipt();
        }
    }, [isOpen, paymentId]);

    const loadReceipt = async () => {
        if (!paymentId) return;
        setLoading(true);
        try {
            const res = await api.get(`/receipts/${paymentId}`);
            console.log(JSON.stringify(res.data, null, 2));
            setReceipt(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

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
                                    Receipt No.
                                </span>
                                <span className="font-semibold">
                                    {receipt.receipt_number}
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

                            <div className="flex justify-between">
                                <span className="text-gray-600">
                                    Payment Method
                                </span>
                                <span className="capitalize">
                                    {receipt.payment_method}
                                </span>
                            </div>

                            {receipt.payment_method === "gcash" &&
                                receipt.gcash_reference && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            GCash Ref.
                                        </span>
                                        <span>{receipt.gcash_reference}</span>
                                    </div>
                                )}

                            {receipt.payment_method === "bank_transfer" &&
                                receipt.bank_reference && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Bank Ref.
                                        </span>
                                        <span>{receipt.bank_reference}</span>
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
                                                    Check-in:{" "}
                                                    {new Date(
                                                        room.check_in_date,
                                                    ).toLocaleDateString()}
                                                </div>

                                                <div className="text-xs text-gray-600">
                                                    Check-out:{" "}
                                                    {new Date(
                                                        room.check_out_date,
                                                    ).toLocaleDateString()}
                                                </div>

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
                                ₱{Number(receipt.amount).toLocaleString()}
                            </span>
                        </div>

                        <div className="text-center text-[11px] text-gray-500 mt-6 pt-4 border-t border-dashed border-gray-400">
                            Thank you for staying with us.
                        </div>

                        <div className="mt-6 flex gap-2">
                            <Button onClick={handlePrint} className="flex-1">
                                Print Receipt
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
                ) : (
                    <div className="text-center py-10 text-sm text-red-500">
                        Failed to load receipt
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
