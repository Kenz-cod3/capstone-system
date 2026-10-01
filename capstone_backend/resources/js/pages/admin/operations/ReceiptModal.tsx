// src/pages/operations/ReceiptModal.tsx
import {
    useEffect,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { Modal, message } from "antd";
import {
    CheckCircleFilled,
    PrinterOutlined,
    SearchOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import api from "@/services/api";
import {
    printReceipt,
    searchPrinter,
    refreshPrinter,
    isSerialSupported,
    isPrinterConnected,
    getQrLink,
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

const HOTEL_NAME = "Lynn Ennia Travelers Inn";
const QR_LINK = getQrLink();

const MINT_GREEN = "#10b981";
const MINT_GREEN_STRONG = "#059669";
const MINT_GREEN_HOVER = "#047857";
const MINT_GREEN_BG = "#ecfdf5";
const MINT_GREEN_LIGHT = "#d1fae5";
const SLATE_BORDER = "#e8edf2";
const SLATE_INPUT_BORDER = "#e2e8f0";
const SLATE_MUTED = "#64748b";
const SLATE_DARK = "#0f172a";

const FONT_STACK =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/* ---------- Helpers ---------- */

const peso = (n: number) =>
    `₱${(Number(n) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDateTime = (d?: string) =>
    d
        ? new Date(d).toLocaleString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
          })
        : "-";

const formatDate = (d?: string) =>
    d
        ? new Date(d).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "-";

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

// gcash / bank / qrph each store their reference in a different field
const getPaymentReference = (
    r: any,
): { label: string; value: string } | null => {
    if (r?.payment_method === "gcash" && r.gcash_reference) {
        return { label: "GCash ref.", value: r.gcash_reference };
    }
    if (
        (r?.payment_method === "bank" ||
            r?.payment_method === "bank_transfer") &&
        r.bank_reference
    ) {
        return { label: "Bank ref.", value: r.bank_reference };
    }
    if (r?.payment_method === "qrph" && r.bank_reference) {
        return { label: "QR Ph ref.", value: r.bank_reference };
    }
    return null;
};

/* ---------- Receipt paper (inline styles) ---------- */

const paperStyle: CSSProperties = {
    width: 300,
    maxWidth: "100%",
    margin: "0 auto",
    padding: "22px 20px",
    background: "#fff",
    border: `1px solid ${SLATE_BORDER}`,
    borderRadius: 10,
    fontFamily: FONT_STACK,
    color: SLATE_DARK,
    boxSizing: "border-box",
};

const dividerStyle: CSSProperties = {
    borderTop: "1px dashed #cbd5e1",
    margin: "14px 0",
};

const sectionTitleStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: SLATE_MUTED,
    marginBottom: 6,
};

function Row({
    label,
    value,
    strong,
}: {
    label: string;
    value: ReactNode;
    strong?: boolean;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                padding: "3px 0",
                fontSize: 12,
            }}
        >
            <span style={{ color: SLATE_MUTED }}>{label}</span>
            <span
                style={{
                    fontWeight: strong ? 700 : 500,
                    textAlign: "right",
                    wordBreak: "break-word",
                }}
            >
                {value}
            </span>
        </div>
    );
}

function ReceiptPaper({
    receipts,
    totalAmount,
}: {
    receipts: any[];
    totalAmount: number;
}) {
    const receipt = receipts[0];
    const isSplit = receipts.length > 1;
    const rooms: any[] = receipt?.booking?.booked_rooms ?? [];
    const hasAddOns = rooms.some((room) => room.booking_add_ons?.length > 0);

    const cashier = receipt?.receiver
        ? `${receipt.receiver.first_name} ${receipt.receiver.last_name}`
        : null;

    return (
        <div className="fee-receipt-paper" style={paperStyle}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {HOTEL_NAME}
                </div>
                <div style={{ fontSize: 11, color: SLATE_MUTED, marginTop: 2 }}>
                    Official Receipt
                </div>
            </div>

            <div style={dividerStyle} />

            <Row
                label={isSplit ? "Receipt nos." : "Receipt no."}
                value={
                    isSplit
                        ? receipts.map((r) => r.receipt_number).join(", ")
                        : receipt.receipt_number
                }
                strong
            />
            {receipt.booking?.booking_reference && (
                <Row
                    label="Booking ref."
                    value={receipt.booking.booking_reference}
                />
            )}
            <Row label="Date" value={formatDateTime(receipt.payment_date)} />

            {/* Room charges */}
            {rooms.length > 0 && (
                <>
                    <div style={dividerStyle} />
                    <div style={sectionTitleStyle}>Room charges</div>

                    {rooms.map((room: any, index: number) => (
                        <div
                            key={room.id ?? index}
                            style={{
                                paddingBottom:
                                    index !== rooms.length - 1 ? 10 : 0,
                                marginBottom:
                                    index !== rooms.length - 1 ? 10 : 0,
                                borderBottom:
                                    index !== rooms.length - 1
                                        ? "1px dashed #e2e8f0"
                                        : "none",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Room {room.room?.room_number}
                                    </div>
                                    {room.room?.room_type?.type_name && (
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: SLATE_MUTED,
                                                marginTop: 1,
                                            }}
                                        >
                                            {room.room.room_type.type_name}
                                        </div>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: SLATE_MUTED,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {room.stay_type === "short_stay"
                                        ? "Short Stay"
                                        : "Overnight"}
                                </div>
                            </div>

                            <div style={{ marginTop: 4 }}>
                                <Row
                                    label="Check-in"
                                    value={formatDate(room.check_in_date)}
                                />
                                {room.check_in_time && (
                                    <Row
                                        label="Actual check-in"
                                        value={formatDateTime(
                                            room.check_in_time,
                                        )}
                                    />
                                )}
                                <Row
                                    label="Check-out"
                                    value={formatDate(room.check_out_date)}
                                />
                                {room.expected_checkout_at && (
                                    <Row
                                        label="Expected checkout"
                                        value={formatDateTime(
                                            room.expected_checkout_at,
                                        )}
                                    />
                                )}
                                {room.check_out_time && (
                                    <Row
                                        label="Actual check-out"
                                        value={formatDateTime(
                                            room.check_out_time,
                                        )}
                                    />
                                )}
                                <Row
                                    label="Room amount"
                                    value={peso(room.subtotal)}
                                    strong
                                />
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Add-ons */}
            {hasAddOns && (
                <>
                    <div style={dividerStyle} />
                    <div style={sectionTitleStyle}>Add-ons</div>
                    {rooms.flatMap((room: any) =>
                        (room.booking_add_ons ?? []).map((addon: any) => (
                            <Row
                                key={addon.id}
                                label={`Room ${room.room?.room_number} · ${addon.add_on?.add_on_name} x${addon.quantity}`}
                                value={peso(addon.subtotal)}
                            />
                        )),
                    )}
                </>
            )}

            <div style={dividerStyle} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                }}
            >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Total paid
                </span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>
                    {peso(totalAmount)}
                </span>
            </div>

            {/* Payment info */}
            <div style={{ marginTop: 10 }}>
                {!isSplit ? (
                    <>
                        <Row
                            label="Payment method"
                            value={paymentMethodLabel(receipt.payment_method)}
                        />
                        {(() => {
                            const ref = getPaymentReference(receipt);
                            return ref ? (
                                <Row label={ref.label} value={ref.value} />
                            ) : null;
                        })()}
                    </>
                ) : (
                    <>
                        <div style={{ ...sectionTitleStyle, marginTop: 4 }}>
                            Payment breakdown
                        </div>
                        {receipts.map((r, idx) => {
                            const ref = getPaymentReference(r);
                            return (
                                <div key={r.id ?? idx}>
                                    <Row
                                        label={paymentMethodLabel(
                                            r.payment_method,
                                        )}
                                        value={peso(r.amount)}
                                        strong
                                    />
                                    {ref && (
                                        <Row
                                            label={ref.label}
                                            value={ref.value}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            <div style={dividerStyle} />

            {cashier && <Row label="Received by" value={cashier} />}

            <div
                style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: SLATE_MUTED,
                    lineHeight: 1.5,
                    marginTop: 10,
                }}
            >
                Thank you for staying with us!
            </div>

            {QR_LINK && (
                <>
                    <div style={dividerStyle} />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <QRCodeSVG value={QR_LINK} size={90} level="M" />
                        <div style={{ fontSize: 10, color: SLATE_MUTED }}>
                            Scan to visit us
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ---------- Modal ---------- */

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
            await printReceipt(receipts);
            setPrinterStatus("connected");
            message.success("Receipt sent to printer");
        } catch (err: any) {
            if (err?.name === "NotFoundError") return;
            console.error("Receipt printing error:", err);
            setPrinterStatus("disconnected");
            message.error(
                err?.message || "Could not print. Is the printer on?",
            );
        } finally {
            setPrinting(false);
        }
    };

    if (!isOpen) return null;

    // Shared booking-level fields come from the first receipt (all legs of a
    // split payment belong to the same booking).
    const receipt = receipts[0] ?? null;
    const isSplit = receipts.length > 1;
    const totalAmount = receipts.reduce(
        (sum, r) => sum + (Number(r?.amount) || 0),
        0,
    );
    const roomCount = receipt?.booking?.booked_rooms?.length ?? 0;

    const paidByLabel = isSplit
        ? receipts.map((r) => paymentMethodLabel(r.payment_method)).join(" + ")
        : paymentMethodLabel(receipt?.payment_method);

    const dotColor =
        printerStatus === "connected"
            ? "#22c55e"
            : printerStatus === "checking"
              ? "#fbbf24"
              : "#ef4444";

    const statusText: Record<PrinterStatus, string> = {
        connected: "Printer connected",
        checking: "Checking printer...",
        disconnected: "Printer not connected",
        unsupported: "Use Chrome or Edge for thermal printing",
    };

    return (
        <Modal
            title={null}
            open={isOpen}
            centered
            width={820}
            footer={null}
            onCancel={onClose}
            className="fee-receipt-modal"
        >
            <style>
                {`
                    .fee-receipt-modal .ant-modal-content {
                        border-radius: 16px !important;
                        padding: 24px !important;
                    }
                    .fee-receipt-modal .ant-modal-close {
                        top: 20px;
                        right: 20px;
                    }

                    /* ---------- Landscape layout ---------- */
                    .fee-receipt-layout {
                        display: grid;
                        grid-template-columns: 340px 1fr;
                        gap: 24px;
                        align-items: stretch;
                    }

                    /* Left: receipt */
                    .fee-receipt-panel {
                        padding: 16px 10px;
                        border-radius: 12px;
                        background: ${MINT_GREEN_BG};
                        border: 1px solid ${MINT_GREEN_LIGHT};
                        max-height: 70vh;
                        overflow-y: auto;
                    }

                    /* Right: info + controls */
                    .fee-receipt-side {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        min-width: 0;
                        padding-right: 28px;
                    }

                    .fee-receipt-head {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                    }
                    .fee-receipt-head-icon {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background: ${MINT_GREEN_LIGHT};
                        color: ${MINT_GREEN_STRONG};
                        font-size: 24px;
                    }
                    .fee-receipt-head-title {
                        font-size: 20px;
                        font-weight: 700;
                        color: ${SLATE_DARK};
                        line-height: 1.3;
                    }
                    .fee-receipt-head-sub {
                        margin-top: 2px;
                        font-size: 13px;
                        color: ${SLATE_MUTED};
                        line-height: 1.4;
                    }

                    /* Summary card */
                    .fee-receipt-summary {
                        padding: 14px 16px;
                        border-radius: 12px;
                        background: ${MINT_GREEN_BG};
                        border: 1px solid ${MINT_GREEN_LIGHT};
                    }
                    .fee-receipt-summary-label {
                        font-size: 12px;
                        color: ${SLATE_MUTED};
                    }
                    .fee-receipt-summary-amount {
                        margin-top: 2px;
                        font-size: 28px;
                        font-weight: 700;
                        color: ${MINT_GREEN_STRONG};
                        line-height: 1.2;
                    }
                    .fee-receipt-summary-meta {
                        margin-top: 6px;
                        font-size: 12px;
                        color: ${SLATE_MUTED};
                        line-height: 1.5;
                    }
                    .fee-receipt-summary-meta strong {
                        color: ${SLATE_DARK};
                        font-weight: 600;
                    }

                    /* Printer card */
                    .fee-printer-card {
                        padding: 14px 16px;
                        border: 1px solid ${SLATE_BORDER};
                        border-radius: 12px;
                        background: #fff;
                    }
                    .fee-printer-title {
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                        color: ${SLATE_MUTED};
                        margin-bottom: 8px;
                    }
                    .fee-printer-status {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 13px;
                        color: ${SLATE_DARK};
                    }
                    .fee-printer-dot {
                        width: 9px;
                        height: 9px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }
                    .fee-printer-actions {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin-top: 12px;
                    }

                    /* Action buttons */
                    .fee-receipt-actions {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        margin-top: auto;
                    }

                    .fee-receipt-btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        height: 42px;
                        padding: 0 16px;
                        font-family: inherit;
                        font-size: 14px;
                        font-weight: 600;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: background 0.15s ease, border-color 0.15s ease;
                    }
                    .fee-receipt-btn-lg {
                        height: 48px;
                        font-size: 15px;
                    }
                    .fee-receipt-btn:focus-visible {
                        outline: 2px solid ${MINT_GREEN};
                        outline-offset: 2px;
                    }
                    .fee-receipt-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .fee-receipt-btn-close {
                        color: #334155;
                        background: #fff;
                        border: 1px solid ${SLATE_INPUT_BORDER};
                    }
                    .fee-receipt-btn-close:hover:not(:disabled) {
                        border-color: ${MINT_GREEN};
                        color: ${MINT_GREEN_STRONG};
                    }
                    .fee-receipt-btn-print {
                        color: #fff;
                        background: ${MINT_GREEN_STRONG};
                        border: 1px solid ${MINT_GREEN_STRONG};
                    }
                    .fee-receipt-btn-print:hover:not(:disabled) {
                        background: ${MINT_GREEN_HOVER};
                        border-color: ${MINT_GREEN_HOVER};
                    }

                    /* ---------- Small screens: stack ---------- */
                    @media (max-width: 760px) {
                        .fee-receipt-layout {
                            grid-template-columns: 1fr;
                        }
                        .fee-receipt-side {
                            padding-right: 0;
                        }
                        .fee-receipt-panel {
                            max-height: 50vh;
                        }
                    }
                `}
            </style>

            {loading ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px 0",
                        fontSize: 14,
                        color: SLATE_MUTED,
                    }}
                >
                    Loading receipt...
                </div>
            ) : !receipt ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px 0",
                        fontSize: 14,
                        color: "#ef4444",
                    }}
                >
                    Failed to load receipt
                </div>
            ) : (
                <div className="fee-receipt-layout">
                    {/* ---------- Left: receipt ---------- */}
                    <div className="fee-receipt-panel">
                        <ReceiptPaper
                            receipts={receipts}
                            totalAmount={totalAmount}
                        />
                    </div>

                    {/* ---------- Right: info + controls ---------- */}
                    <div className="fee-receipt-side">
                        <div className="fee-receipt-head">
                            <div className="fee-receipt-head-icon">
                                <CheckCircleFilled />
                            </div>
                            <div>
                                <div className="fee-receipt-head-title">
                                    Payment recorded
                                </div>
                                <div className="fee-receipt-head-sub">
                                    Print the receipt for the guest or close
                                    this window.
                                </div>
                            </div>
                        </div>

                        <div className="fee-receipt-summary">
                            <div className="fee-receipt-summary-label">
                                {isSplit
                                    ? "Check-in payment (split)"
                                    : "Check-in payment"}
                            </div>
                            <div className="fee-receipt-summary-amount">
                                {peso(totalAmount)}
                            </div>
                            <div className="fee-receipt-summary-meta">
                                {roomCount > 0 && (
                                    <>
                                        <strong>
                                            {roomCount} room
                                            {roomCount > 1 ? "s" : ""}
                                        </strong>
                                        {receipt.booking?.booking_reference &&
                                            ` · ${receipt.booking.booking_reference}`}
                                        <br />
                                    </>
                                )}
                                Paid by <strong>{paidByLabel}</strong>
                            </div>
                        </div>

                        <div className="fee-printer-card">
                            <div className="fee-printer-title">
                                Thermal printer
                            </div>
                            <div
                                className="fee-printer-status"
                                aria-live="polite"
                            >
                                <span
                                    className="fee-printer-dot"
                                    style={{ background: dotColor }}
                                />
                                {statusText[printerStatus]}
                            </div>
                            <div className="fee-printer-actions">
                                <button
                                    type="button"
                                    className="fee-receipt-btn fee-receipt-btn-close"
                                    onClick={handleSearchPrinter}
                                    disabled={printerStatus === "unsupported"}
                                >
                                    <SearchOutlined />
                                    Search Printer
                                </button>
                                <button
                                    type="button"
                                    className="fee-receipt-btn fee-receipt-btn-close"
                                    onClick={handleRefresh}
                                    disabled={loading}
                                >
                                    <ReloadOutlined />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="fee-receipt-actions">
                            <button
                                type="button"
                                className="fee-receipt-btn fee-receipt-btn-lg fee-receipt-btn-print"
                                onClick={handlePrint}
                                disabled={
                                    printing || printerStatus === "unsupported"
                                }
                            >
                                <PrinterOutlined />
                                {printing ? "Printing..." : "Print Receipt"}
                            </button>

                            <button
                                type="button"
                                className="fee-receipt-btn fee-receipt-btn-close"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}