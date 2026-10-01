// src/pages/cashier/OrderReceiptModal.tsx
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
import {
    printOrderReceipt,
    searchPrinter,
    refreshPrinter,
    isSerialSupported,
    isPrinterConnected,
    getQrLink,
} from "@/pages/admin/operations/thermalPrinter";

const HOTEL_NAME = "Lyn Enia Travelers Inn";
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

type PrinterStatus = "checking" | "connected" | "disconnected" | "unsupported";

export interface OrderReceiptItem {
    name: string;
    quantity: number;
    price: number;
}

export interface OrderReceiptData {
    orderId: number;
    orderNumber?: string | null;
    items: OrderReceiptItem[];
    total: number;
    paymentMethod: "cash" | "qrph" | "split";
    /** Cash actually paid toward the order */
    cashPaid: number;
    /** QRPH actually paid toward the order */
    qrPaid: number;
    /** Cash only: what the customer handed over */
    cashTendered?: number;
    change?: number;
    reference?: string | null;
    paidAt: string;
    cashierName?: string;
}

const METHOD_LABEL: Record<OrderReceiptData["paymentMethod"], string> = {
    cash: "Cash",
    qrph: "QRPH",
    split: "Cash + QRPH",
};

const peso = (n: number) =>
    `₱${(Number(n) || 0).toLocaleString(undefined, {
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

/* ---------- Receipt paper ---------- */

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

function ReceiptPaper({ receipt }: { receipt: OrderReceiptData }) {
    const orderLabel = receipt.orderNumber || `#${receipt.orderId}`;

    return (
        <div className="fee-receipt-paper" style={paperStyle}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {HOTEL_NAME}
                </div>
                <div style={{ fontSize: 11, color: SLATE_MUTED, marginTop: 2 }}>
                    Restaurant Receipt
                </div>
            </div>

            <div style={dividerStyle} />

            <Row label="Order no." value={orderLabel} strong />
            <Row label="Date" value={formatDateTime(receipt.paidAt)} />

            <div style={dividerStyle} />

            <div style={sectionTitleStyle}>Items</div>
            {receipt.items.map((item, idx) => (
                <div
                    key={idx}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "4px 0",
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {item.name}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: SLATE_MUTED,
                                marginTop: 1,
                            }}
                        >
                            {item.quantity} x {peso(item.price)}
                        </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {peso(item.price * item.quantity)}
                    </div>
                </div>
            ))}

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
                    {peso(receipt.total)}
                </span>
            </div>

            <div style={{ marginTop: 10 }}>
                <Row
                    label="Payment method"
                    value={METHOD_LABEL[receipt.paymentMethod]}
                />

                {receipt.paymentMethod === "cash" && (
                    <>
                        <Row
                            label="Amount received"
                            value={peso(
                                receipt.cashTendered ?? receipt.cashPaid,
                            )}
                        />
                        <Row label="Change" value={peso(receipt.change ?? 0)} />
                    </>
                )}

                {receipt.paymentMethod === "split" && (
                    <>
                        <Row label="Cash" value={peso(receipt.cashPaid)} />
                        <Row label="QRPH" value={peso(receipt.qrPaid)} />
                    </>
                )}

                {/* QRPH / Cash + QRPH: laging may Reference no. */}
                {receipt.paymentMethod !== "cash" && (
                    <Row
                        label="Reference no."
                        value={receipt.reference || "N/A"}
                    />
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
                Thank you for dining with us!
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

interface Props {
    receipt: OrderReceiptData | null;
    onClose: () => void;
}

export default function OrderReceiptModal({ receipt, onClose }: Props) {
    const [printing, setPrinting] = useState(false);
    const [printerStatus, setPrinterStatus] =
        useState<PrinterStatus>("checking");

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
        if (receipt) checkPrinter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receipt]);

    if (!receipt) return null;

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
        await checkPrinter();
        message.info("Refreshed");
    };

    const handlePrint = async () => {
        try {
            setPrinting(true);
            await printOrderReceipt(receipt);
            setPrinterStatus("connected");
            message.success("Receipt sent to printer");
        } catch (err: any) {
            if (err?.name === "NotFoundError") return;
            console.error("Order receipt printing error:", err);
            setPrinterStatus("disconnected");
            message.error(
                err?.message || "Could not print. Is the printer on?",
            );
        } finally {
            setPrinting(false);
        }
    };

    const itemCount = receipt.items.reduce((sum, i) => sum + i.quantity, 0);
    const orderLabel = receipt.orderNumber || `#${receipt.orderId}`;

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
            open
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
                    .fee-receipt-layout {
                        display: grid;
                        grid-template-columns: 340px 1fr;
                        gap: 24px;
                        align-items: stretch;
                    }
                    .fee-receipt-panel {
                        padding: 16px 10px;
                        border-radius: 12px;
                        background: ${MINT_GREEN_BG};
                        border: 1px solid ${MINT_GREEN_LIGHT};
                        max-height: 70vh;
                        overflow-y: auto;
                    }
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
                        word-break: break-word;
                    }
                    .fee-receipt-summary-meta strong {
                        color: ${SLATE_DARK};
                        font-weight: 600;
                    }
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

            <div className="fee-receipt-layout">
                {/* ---------- Left: receipt ---------- */}
                <div className="fee-receipt-panel">
                    <ReceiptPaper receipt={receipt} />
                </div>

                {/* ---------- Right: info + controls ---------- */}
                <div className="fee-receipt-side">
                    <div className="fee-receipt-head">
                        <div className="fee-receipt-head-icon">
                            <CheckCircleFilled />
                        </div>
                        <div>
                            <div className="fee-receipt-head-title">
                                Order completed
                            </div>
                            <div className="fee-receipt-head-sub">
                                Print the receipt for the customer or close this
                                window.
                            </div>
                        </div>
                    </div>

                    <div className="fee-receipt-summary">
                        <div className="fee-receipt-summary-label">
                            Restaurant order
                        </div>
                        <div className="fee-receipt-summary-amount">
                            {peso(receipt.total)}
                        </div>
                        <div className="fee-receipt-summary-meta">
                            <strong>
                                {itemCount} item{itemCount > 1 ? "s" : ""}
                            </strong>
                            {` · Order ${orderLabel}`}
                            <br />
                            Paid by{" "}
                            <strong>{METHOD_LABEL[receipt.paymentMethod]}</strong>
                            {receipt.paymentMethod !== "cash" &&
                                receipt.reference && (
                                    <>
                                        <br />
                                        Ref: <strong>{receipt.reference}</strong>
                                    </>
                                )}
                        </div>
                    </div>

                    <div className="fee-printer-card">
                        <div className="fee-printer-title">Thermal printer</div>
                        <div className="fee-printer-status" aria-live="polite">
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
        </Modal>
    );
}