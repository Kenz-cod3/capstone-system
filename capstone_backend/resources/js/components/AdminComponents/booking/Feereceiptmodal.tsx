import { useRef, type CSSProperties, type ReactNode } from "react";
import { Modal } from "antd";
import { CheckCircleFilled, PrinterOutlined } from "@ant-design/icons";
import type {
    FeePaymentPayload,
    FeePaymentRequest,
    FeeType,
    PaymentMethod,
} from "./FeePaymentModal";

const HOTEL_NAME = "Travelers Inn";

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

const ITEM_LABEL: Record<FeeType, string> = {
    early_checkin: "Early Check-in Fee",
    late_checkout: "Late Check-out Fee",
    extension: "Stay Extension Fee",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
    cash: "Cash",
    qrph: "QRPH",
};

const STAY_LABEL: Record<"overnight" | "short_stay", string> = {
    overnight: "Overnight",
    short_stay: "Short Stay",
};

export interface FeeReceiptData {
    feeType: FeeType;
    amount: number;
    paymentMethod: PaymentMethod;
    /** QRPH reference number */
    reference?: string;
    /** Cash only */
    amountTendered?: number;
    guestName?: string;
    roomNumber?: string;
    /** e.g. "2 hours" for extensions */
    note?: string;
    /** From the server (booking-payments.receipt_number), if it returns one */
    receiptNumber?: string | null;
    /** ISO timestamp of when the payment was recorded */
    paidAt: string;

    // ---- extra details for a real-world receipt ----
    /** e.g. "Deluxe Room" */
    roomType?: string;
    stayType?: "overnight" | "short_stay";
    bookingReference?: string;
    checkInDate?: string;
    checkOutDate?: string;
    /** Staff/admin who received the payment */
    cashierName?: string;
}

/**
 * Builds receipt data from what the cashier just confirmed.
 * `apiResponse` is the `res.data` returned by POST /booking-payments (optional).
 * It's read for `receipt_number`, either at the top level or under `data`.
 */
export function buildFeeReceipt(
    request: FeePaymentRequest,
    payload: FeePaymentPayload,
    apiResponse?: any,
    cashierName?: string,
): FeeReceiptData {
    const payment = apiResponse?.data ?? apiResponse ?? {};

    return {
        feeType: request.feeType,
        amount: request.amount,
        paymentMethod: payload.payment_method,
        reference: payload.reference,
        amountTendered: payload.amount_tendered,
        guestName: request.guestName,
        roomNumber: request.roomNumber,
        note: request.note,
        receiptNumber: payment?.receipt_number ?? null,
        paidAt: new Date().toISOString(),

        roomType: request.roomType,
        stayType: request.stayType,
        bookingReference: request.bookingReference,
        checkInDate: request.checkInDate,
        checkOutDate: request.checkOutDate,
        cashierName: cashierName || undefined,
    };
}

const peso = (n: number) =>
    `₱${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

const formatDate = (d?: string) =>
    d
        ? new Date(d).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "-";

/* ---------- Receipt paper (inline styles so it can be printed as-is) ---------- */

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

function ReceiptPaper({ receipt }: { receipt: FeeReceiptData }) {
    const change =
        receipt.paymentMethod === "cash"
            ? Math.max(
                  0,
                  (receipt.amountTendered ?? receipt.amount) - receipt.amount,
              )
            : 0;

    const roomValue = receipt.roomType
        ? `${receipt.roomNumber ?? "-"} · ${receipt.roomType}`
        : (receipt.roomNumber ?? "-");

    return (
        <div className="fee-receipt-paper" style={paperStyle}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {HOTEL_NAME}
                </div>
                <div style={{ fontSize: 11, color: SLATE_MUTED, marginTop: 2 }}>
                    Payment Receipt
                </div>
            </div>

            <div style={dividerStyle} />

            {receipt.receiptNumber && (
                <Row label="Receipt no." value={receipt.receiptNumber} strong />
            )}
            {receipt.bookingReference && (
                <Row label="Booking ref." value={receipt.bookingReference} />
            )}
            <Row label="Date" value={formatDateTime(receipt.paidAt)} />

            <div style={dividerStyle} />

            <Row label="Guest" value={receipt.guestName || "Guest"} />
            <Row label="Room" value={roomValue} />
            {receipt.stayType && (
                <Row label="Stay type" value={STAY_LABEL[receipt.stayType]} />
            )}
            {receipt.checkInDate && (
                <Row label="Check-in" value={formatDate(receipt.checkInDate)} />
            )}
            {receipt.checkOutDate && (
                <Row
                    label="Check-out"
                    value={formatDate(receipt.checkOutDate)}
                />
            )}

            <div style={dividerStyle} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                }}
            >
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {ITEM_LABEL[receipt.feeType]}
                    </div>
                    {receipt.note && (
                        <div
                            style={{
                                fontSize: 11,
                                color: SLATE_MUTED,
                                marginTop: 2,
                            }}
                        >
                            {receipt.note}
                        </div>
                    )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {peso(receipt.amount)}
                </div>
            </div>

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
                    {peso(receipt.amount)}
                </span>
            </div>

            <div style={{ marginTop: 10 }}>
                <Row
                    label="Payment method"
                    value={METHOD_LABEL[receipt.paymentMethod]}
                />
                {receipt.paymentMethod === "cash" ? (
                    <>
                        <Row
                            label="Amount received"
                            value={peso(
                                receipt.amountTendered ?? receipt.amount,
                            )}
                        />
                        <Row label="Change" value={peso(change)} />
                    </>
                ) : (
                    receipt.reference && (
                        <Row label="Reference no." value={receipt.reference} />
                    )
                )}
            </div>

            <div style={dividerStyle} />

            {receipt.cashierName && (
                <Row label="Received by" value={receipt.cashierName} />
            )}

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
        </div>
    );
}

/* ---------- Modal ---------- */

interface Props {
    receipt: FeeReceiptData | null;
    onClose: () => void;
}

export default function FeeReceiptModal({ receipt, onClose }: Props) {
    const paperRef = useRef<HTMLDivElement>(null);

    if (!receipt) return null;

    // Prints only the receipt paper, using a throwaway hidden iframe
    const handlePrint = () => {
        const node = paperRef.current;
        if (!node) return;

        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.cssText =
            "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
        document.body.appendChild(iframe);

        const win = iframe.contentWindow;
        const doc = win?.document;
        if (!win || !doc) {
            iframe.remove();
            return;
        }

        doc.open();
        doc.write(`<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        <style>
            @page { margin: 8mm; }
            html, body { margin: 0; padding: 0; background: #fff; }
            body { font-family: ${FONT_STACK}; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .fee-receipt-paper { border: none !important; margin: 0 auto !important; }
        </style>
    </head>
    <body>${node.outerHTML}</body>
</html>`);
        doc.close();

        win.onafterprint = () => iframe.remove();
        setTimeout(() => {
            win.focus();
            win.print();
        }, 200);
    };

    return (
        <Modal
            title={null}
            open
            centered
            width={440}
            footer={null}
            onCancel={onClose}
            className="fee-receipt-modal"
        >
            <style>
                {`
                    .fee-receipt-modal .ant-modal-content {
                        border-radius: 16px !important;
                        padding: 28px !important;
                    }
                    .fee-receipt-modal .ant-modal-close {
                        top: 24px;
                        right: 24px;
                    }

                    .fee-receipt-head {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding-right: 36px;
                        margin-bottom: 18px;
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
                    }

                    .fee-receipt-panel {
                        padding: 18px 12px;
                        border-radius: 12px;
                        background: ${MINT_GREEN_BG};
                        border: 1px solid ${MINT_GREEN_LIGHT};
                        max-height: 60vh;
                        overflow-y: auto;
                    }

                    .fee-receipt-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        margin-top: 22px;
                    }
                    .fee-receipt-btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        height: 46px;
                        padding: 0 24px;
                        font-family: inherit;
                        font-size: 15px;
                        font-weight: 600;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: background 0.15s ease, border-color 0.15s ease;
                    }
                    .fee-receipt-btn:focus-visible {
                        outline: 2px solid ${MINT_GREEN};
                        outline-offset: 2px;
                    }
                    .fee-receipt-btn-close {
                        color: #334155;
                        background: #fff;
                        border: 1px solid ${SLATE_INPUT_BORDER};
                    }
                    .fee-receipt-btn-close:hover {
                        border-color: ${MINT_GREEN};
                        color: ${MINT_GREEN_STRONG};
                    }
                    .fee-receipt-btn-print {
                        color: #fff;
                        background: ${MINT_GREEN_STRONG};
                        border: 1px solid ${MINT_GREEN_STRONG};
                    }
                    .fee-receipt-btn-print:hover {
                        background: ${MINT_GREEN_HOVER};
                        border-color: ${MINT_GREEN_HOVER};
                    }

                    @media (max-width: 520px) {
                        .fee-receipt-footer { flex-direction: column-reverse; }
                        .fee-receipt-btn { width: 100%; }
                    }
                `}
            </style>

            <div className="fee-receipt-head">
                <div className="fee-receipt-head-icon">
                    <CheckCircleFilled />
                </div>
                <div>
                    <div className="fee-receipt-head-title">
                        Payment recorded
                    </div>
                    <div className="fee-receipt-head-sub">
                        Print the receipt for the guest or close this window.
                    </div>
                </div>
            </div>

            <div className="fee-receipt-panel">
                <div ref={paperRef}>
                    <ReceiptPaper receipt={receipt} />
                </div>
            </div>

            <div className="fee-receipt-footer">
                <button
                    type="button"
                    className="fee-receipt-btn fee-receipt-btn-close"
                    onClick={onClose}
                >
                    Close
                </button>
                <button
                    type="button"
                    className="fee-receipt-btn fee-receipt-btn-print"
                    onClick={handlePrint}
                >
                    <PrinterOutlined />
                    Print Receipt
                </button>
            </div>
        </Modal>
    );
}