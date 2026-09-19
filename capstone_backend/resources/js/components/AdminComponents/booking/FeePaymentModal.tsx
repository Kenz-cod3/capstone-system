import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Modal, InputNumber, Input, Avatar } from "antd";
import {
    HomeOutlined,
    TagOutlined,
    ScanOutlined,
    CheckCircleOutlined,
    CheckCircleFilled,
    LoadingOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import api from "@/services/api";

/**
 * ⚠️ Match these two with your routes/api.php
 * (PayMongoController@createQrPayment and PayMongoController@checkQrStatus)
 */
const QR_CREATE_URL = "/paymongo/qr/create";
const QR_STATUS_URL = (paymentIntentId: string) =>
    `/paymongo/qr/status/${paymentIntentId}`;

/** PayMongo QRPH is created with expiry_seconds = 1800 (30 min) */
const QR_LIFETIME_MS = 1800 * 1000 - 15 * 1000;
const QR_POLL_MS = 3000;

const MINT_GREEN = "#10b981";
const MINT_GREEN_STRONG = "#059669";
const MINT_GREEN_HOVER = "#047857";
const MINT_GREEN_BG = "#ecfdf5";
const MINT_GREEN_LIGHT = "#d1fae5";
const MINT_GREEN_DARK = "#047857";
const SLATE_BORDER = "#e8edf2";
const SLATE_INPUT_BORDER = "#e2e8f0";
const SLATE_MUTED = "#64748b";
const SLATE_DARK = "#0f172a";

export type FeeType = "early_checkin" | "late_checkout" | "extension";
export type PaymentMethod = "cash" | "qrph";

export interface FeePaymentPayload {
    payment_method: PaymentMethod;
    reference?: string; // QRPH reference number
    amount_tendered?: number; // cash only
    reason?: string; // admin override reason
}

export interface FeePaymentRequest {
    feeType: FeeType;
    amount: number;
    bookingId: number;
    guestName?: string;
    roomNumber?: string;
    note?: string;
    okText?: string;
    showReason?: boolean;

    // ---- extra details used by the receipt (FeeReceiptModal) ----
    roomType?: string;
    stayType?: "overnight" | "short_stay";
    bookingReference?: string;
    checkInDate?: string;
    checkOutDate?: string;

    /** Called after the user confirms. Throw to keep the modal open. */
    onSubmit: (payload: FeePaymentPayload) => Promise<void>;
}

/** Records the fee using your existing POST /booking-payments endpoint. */
export const recordFeePayment = (
    bookingId: number,
    amount: number,
    p: FeePaymentPayload,
) =>
    api.post("/booking-payments", {
        booking_id: bookingId,
        amount,
        payment_method: p.payment_method,
        payment_status: "paid",
        gcash_reference: null,
        // QRPH references go in bank_reference (same as the PayMongo webhook)
        bank_reference: p.payment_method === "qrph" ? p.reference : null,
    });

const FEE_META: Record<
    FeeType,
    { label: string; description: string; title: string; subtitle: string }
> = {
    early_checkin: {
        label: "Early Check-in Fee",
        description: "Additional fee for early check-in",
        title: "Complete Payment & Check In",
        subtitle:
            "Record the guest's payment to confirm the booking and check them in.",
    },
    late_checkout: {
        label: "Late Check-out Fee",
        description: "Additional fee for late check-out",
        title: "Complete Payment & Check Out",
        subtitle:
            "Record the guest's payment to settle the fee and check them out.",
    },
    extension: {
        label: "Stay Extension Fee",
        description: "Additional fee for extending the stay",
        title: "Complete Payment & Extend Stay",
        subtitle: "Record the guest's payment to confirm the extension.",
    },
};

const peso = (n: number) =>
    `₱${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

/** Banknote icon (antd has no matching "cash" glyph). Inherits currentColor. */
const CashIcon = ({ size = 30 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6 9.5v.01M18 14.5v.01" />
    </svg>
);

interface MethodOptionProps {
    selected: boolean;
    onSelect: () => void;
    icon: ReactNode;
    title: string;
    subtitle: string;
}

function MethodOption({
    selected,
    onSelect,
    icon,
    title,
    subtitle,
}: MethodOptionProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={`fee-option${selected ? " selected" : ""}`}
        >
            <span className="fee-option-icon">{icon}</span>
            <span className="fee-option-text">
                <span className="fee-option-title">{title}</span>
                <span className="fee-option-sub">{subtitle}</span>
            </span>
            <span className="fee-option-radio" aria-hidden="true" />
        </button>
    );
}

/* ---------- QRPH session ---------- */

interface QrSession {
    paymentIntentId: string;
    clientKey: string;
    imageUrl: string;
    testUrl?: string;
    expiresAt: number;
    /** Real PayMongo payment id (pay_...) once paid; falls back to the intent id */
    paymentReference?: string;
}

type QrPhase = "idle" | "loading" | "ready" | "paid" | "expired" | "error";

interface Props {
    request: FeePaymentRequest | null;
    onClose: () => void;
}

export default function FeePaymentModal({ request, onClose }: Props) {
    const [method, setMethod] = useState<PaymentMethod>("cash");
    const [tendered, setTendered] = useState<number | null>(null);
    const [reference, setReference] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // QRPH state
    const [manualRef, setManualRef] = useState(false);
    const [qr, setQr] = useState<QrSession | null>(null);
    const [qrPhase, setQrPhase] = useState<QrPhase>("idle");
    const [qrError, setQrError] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0);

    const genToken = useRef(0);
    const autoSubmitted = useRef(false);

    const amount = request?.amount ?? 0;
    const usingQr = method === "qrph" && !manualRef;

    // Reset everything whenever a new request is opened
    useEffect(() => {
        if (request) {
            setMethod("cash");
            setTendered(request.amount);
            setReference("");
            setReason("");
            setManualRef(false);
            setQr(null);
            setQrPhase("idle");
            setQrError("");
            autoSubmitted.current = false;
        }
    }, [request]);

    // Creates a dynamic QRPH through your Laravel backend (PayMongo)
    const generateQr = useCallback(async () => {
        if (!request) return;

        const token = ++genToken.current;
        autoSubmitted.current = false;
        setQr(null);
        setQrError("");
        setQrPhase("loading");

        try {
            const { data } = await api.post(QR_CREATE_URL, {
                booking_id: request.bookingId,
                amount: request.amount,
                fee_type: request.feeType,
            });

            if (token !== genToken.current) return; // outdated request

            setQr({
                paymentIntentId: data.payment_intent_id,
                clientKey: data.client_key,
                imageUrl: data.qr_image_url,
                testUrl: data.test_url || undefined,
                expiresAt: Date.now() + QR_LIFETIME_MS,
            });
            setQrPhase("ready");
        } catch (err: any) {
            if (token !== genToken.current) return;
            setQrError(
                err?.response?.data?.message ||
                    "Failed to generate the QRPH code.",
            );
            setQrPhase("error");
        }
    }, [request]);

    // Generate the QR as soon as the cashier picks QRPH
    useEffect(() => {
        if (!request || method !== "qrph") return;
        generateQr();
        return () => {
            genToken.current++; // cancel any in-flight request
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [method, request]);

    // Poll the payment status while the QR is waiting to be paid
    useEffect(() => {
        if (!qr || qrPhase !== "ready") return;

        let stopped = false;

        const tick = async () => {
            if (Date.now() > qr.expiresAt) {
                setQrPhase("expired");
                return;
            }

            try {
                const { data } = await api.get(
                    QR_STATUS_URL(qr.paymentIntentId),
                    { params: { client_key: qr.clientKey } },
                );

                if (stopped) return;

                if (data?.status === "succeeded") {
                    setQr((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  paymentReference:
                                      data.payment_id ?? prev.paymentIntentId,
                              }
                            : prev,
                    );
                    setQrPhase("paid");
                }
            } catch {
                // network hiccup: keep polling
            }
        };

        const id = window.setInterval(tick, QR_POLL_MS);
        return () => {
            stopped = true;
            window.clearInterval(id);
        };
    }, [qr, qrPhase]);

    // Countdown shown under the QR
    useEffect(() => {
        if (!qr || qrPhase !== "ready") return;

        const update = () =>
            setSecondsLeft(
                Math.max(0, Math.round((qr.expiresAt - Date.now()) / 1000)),
            );

        update();
        const id = window.setInterval(update, 1000);
        return () => window.clearInterval(id);
    }, [qr, qrPhase]);

    const change =
        method === "cash" ? Math.max(0, (tendered ?? 0) - amount) : 0;

    const isValid =
        method === "cash"
            ? (tendered ?? 0) + 0.001 >= amount
            : manualRef
              ? reference.trim().length > 0
              : qrPhase === "paid";

    async function handleOk() {
        if (!request || !isValid || submitting) return;

        setSubmitting(true);
        try {
            await request.onSubmit({
                payment_method: method,
                reference:
                    method === "qrph"
                        ? manualRef
                            ? reference.trim()
                            : (qr?.paymentReference ?? qr?.paymentIntentId)
                        : undefined,
                amount_tendered:
                    method === "cash"
                        ? (tendered ?? request.amount)
                        : undefined,
                reason: request.showReason && reason ? reason : undefined,
            });
        } finally {
            setSubmitting(false);
        }
    }

    // As soon as PayMongo says "succeeded", record the payment automatically.
    // If recording fails, the cashier can press the confirm button to retry.
    useEffect(() => {
        if (qrPhase === "paid" && !autoSubmitted.current) {
            autoSubmitted.current = true;
            handleOk();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrPhase]);

    if (!request) return null;

    const { feeType } = request;
    const meta = FEE_META[feeType];

    const initials =
        request.guestName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "G";

    const description = [meta.description, request.note]
        .filter(Boolean)
        .join(" · ");

    const selectMethod = (m: PaymentMethod) => {
        if (m === method || qrPhase === "paid") return;

        setMethod(m);
        setManualRef(false);
        setReference("");

        if (m !== "qrph") {
            setQr(null);
            setQrPhase("idle");
        }
    };

    const backToQr = () => {
        setManualRef(false);
        if (!qr || qrPhase === "error" || qrPhase === "expired") {
            generateQr();
        }
    };

    // Don't let the cashier close the window if the guest already paid but it isn't recorded yet
    const handleClose = () => {
        if (qrPhase === "paid" && !submitting) {
            Modal.confirm({
                title: "Payment not recorded yet",
                centered: true,
                okText: "Close anyway",
                cancelText: "Stay",
                okButtonProps: { danger: true },
                content: (
                    <div style={{ fontSize: 13 }}>
                        The guest already paid via QRPH but it hasn't been
                        saved. Reference:{" "}
                        <strong>
                            {qr?.paymentReference ?? qr?.paymentIntentId}
                        </strong>
                    </div>
                ),
                onOk: onClose,
            });
            return;
        }
        onClose();
    };

    const waitingForQr = usingQr && qrPhase !== "paid";
    const confirmBusy =
        submitting || (waitingForQr && qrPhase === "loading") ||
        (waitingForQr && qrPhase === "ready");

    const confirmLabel = waitingForQr
        ? qrPhase === "ready" || qrPhase === "loading"
            ? "Waiting for payment..."
            : (request.okText ?? "Confirm Payment")
        : (request.okText ?? "Confirm Payment");

    return (
        <Modal
            title={null}
            open
            centered
            width={520}
            maskClosable={false}
            onCancel={handleClose}
            footer={null}
            className="fee-payment-modal"
        >
            <style>
                {`
                    /* The Bookings page sets .ant-modal-content globally with !important,
                       so these selectors are scoped and use !important too. */
                    .fee-payment-modal .ant-modal-content {
                        border-radius: 16px !important;
                        padding: 28px !important;
                    }
                    .fee-payment-modal .ant-modal-close {
                        top: 24px;
                        right: 24px;
                    }

                    .fee-header {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding-right: 36px;
                        padding-bottom: 18px;
                        border-bottom: 1px solid ${SLATE_BORDER};
                    }
                    .fee-name {
                        font-size: 18px;
                        font-weight: 700;
                        color: ${SLATE_DARK};
                        line-height: 1.25;
                    }
                    .fee-room {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        margin-top: 2px;
                        font-size: 13px;
                        color: ${SLATE_MUTED};
                    }
                    .fee-title {
                        margin: 18px 0 4px;
                        font-size: 20px;
                        font-weight: 700;
                        color: ${SLATE_DARK};
                        line-height: 1.3;
                    }
                    .fee-subtitle {
                        margin-bottom: 16px;
                        font-size: 13px;
                        color: ${SLATE_MUTED};
                        line-height: 1.5;
                    }

                    .fee-amount-card {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        margin-bottom: 22px;
                        padding: 14px 18px;
                        border-radius: 12px;
                        background: ${MINT_GREEN_BG};
                        border: 1px solid ${MINT_GREEN_LIGHT};
                    }
                    .fee-amount-icon {
                        font-size: 22px;
                        color: ${MINT_GREEN_STRONG};
                        display: flex;
                    }
                    .fee-amount-info { flex: 1; min-width: 0; }
                    .fee-amount-label {
                        font-size: 15px;
                        font-weight: 600;
                        color: ${SLATE_DARK};
                    }
                    .fee-amount-desc {
                        margin-top: 1px;
                        font-size: 12px;
                        color: ${SLATE_MUTED};
                    }
                    .fee-amount-value {
                        font-size: 26px;
                        font-weight: 700;
                        color: ${MINT_GREEN_DARK};
                        white-space: nowrap;
                    }

                    .fee-section-label {
                        margin-bottom: 10px;
                        font-size: 15px;
                        font-weight: 600;
                        color: ${SLATE_DARK};
                    }

                    .fee-options {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .fee-option {
                        position: relative;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 16px 14px;
                        text-align: left;
                        font-family: inherit;
                        background: #fff;
                        border: 1px solid ${SLATE_INPUT_BORDER};
                        border-radius: 12px;
                        cursor: pointer;
                        transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
                    }
                    .fee-option:hover { border-color: ${MINT_GREEN}; }
                    .fee-option:focus-visible {
                        outline: 2px solid ${MINT_GREEN};
                        outline-offset: 2px;
                    }
                    .fee-option.selected {
                        border-color: ${MINT_GREEN};
                        background: ${MINT_GREEN_BG};
                        box-shadow: 0 0 0 1px ${MINT_GREEN};
                    }
                    .fee-option-icon {
                        display: flex;
                        flex-shrink: 0;
                        align-items: center;
                        justify-content: center;
                        width: 36px;
                        font-size: 30px;
                        color: #334155;
                        transition: color 0.15s ease;
                    }
                    .fee-option.selected .fee-option-icon { color: ${MINT_GREEN_STRONG}; }
                    .fee-option-text {
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
                    }
                    .fee-option-title {
                        font-size: 15px;
                        font-weight: 600;
                        color: ${SLATE_DARK};
                    }
                    .fee-option-sub {
                        margin-top: 1px;
                        font-size: 12px;
                        color: ${SLATE_MUTED};
                    }
                    .fee-option-radio {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 1.5px solid #cbd5e1;
                        background: #fff;
                        transition: all 0.15s ease;
                    }
                    .fee-option.selected .fee-option-radio {
                        border-color: ${MINT_GREEN_STRONG};
                        background: ${MINT_GREEN_STRONG};
                        box-shadow: inset 0 0 0 3.5px #fff;
                    }

                    .fee-field { margin-bottom: 12px; }

                    /* Amount received: peso addon + input */
                    .fee-amount-input { width: 100%; }
                    .fee-amount-input .ant-input-number-group-addon {
                        width: 52px;
                        padding: 0;
                        text-align: center;
                        font-size: 15px;
                        font-weight: 600;
                        color: #334155;
                        background: #f1f5f9;
                        border-color: ${SLATE_INPUT_BORDER};
                        border-radius: 10px 0 0 10px;
                    }
                    .fee-amount-input .ant-input-number {
                        border-color: ${SLATE_INPUT_BORDER};
                        border-radius: 0 10px 10px 0;
                    }
                    .fee-amount-input .ant-input-number-input {
                        height: 44px;
                        font-size: 15px;
                    }
                    .fee-amount-input .ant-input-number:focus-within {
                        border-color: ${MINT_GREEN};
                        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
                    }

                    .fee-input.ant-input,
                    .fee-input .ant-input {
                        border-radius: 10px;
                        font-size: 15px;
                        border-color: ${SLATE_INPUT_BORDER};
                    }
                    .fee-input.ant-input { height: 46px; }
                    .fee-input.ant-input:hover,
                    .fee-input.ant-input:focus {
                        border-color: ${MINT_GREEN};
                        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
                    }
                    .fee-textarea.ant-input {
                        border-radius: 10px;
                        font-size: 13px;
                    }

                    .fee-change {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: 10px;
                        padding: 12px 16px;
                        border-radius: 10px;
                        background: ${MINT_GREEN_BG};
                        font-size: 15px;
                        font-weight: 700;
                        color: ${MINT_GREEN_DARK};
                    }
                    .fee-error {
                        display: block;
                        margin-top: 6px;
                        font-size: 12px;
                        color: #dc2626;
                    }

                    /* ---- QRPH ---- */
                    .fee-qr {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 12px;
                        padding: 18px 16px;
                        border: 1px dashed ${SLATE_INPUT_BORDER};
                        border-radius: 12px;
                        background: #fff;
                    }
                    .fee-qr-box {
                        position: relative;
                        width: 220px;
                        height: 220px;
                        padding: 8px;
                        border: 1px solid ${SLATE_BORDER};
                        border-radius: 12px;
                        background: #fff;
                        box-sizing: border-box;
                    }
                    .fee-qr-img {
                        display: block;
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        transition: opacity 0.2s ease;
                    }
                    .fee-qr-box.paid .fee-qr-img { opacity: 0.12; }
                    .fee-qr-paid {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        font-size: 15px;
                        font-weight: 700;
                        color: ${MINT_GREEN_STRONG};
                    }
                    .fee-qr-paid .anticon { font-size: 44px; }
                    .fee-qr-placeholder {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        width: 220px;
                        min-height: 220px;
                        text-align: center;
                        font-size: 13px;
                        line-height: 1.5;
                        color: ${SLATE_MUTED};
                    }
                    .fee-qr-placeholder .anticon {
                        font-size: 28px;
                        color: ${MINT_GREEN_STRONG};
                    }
                    .fee-qr-placeholder.is-error { color: #dc2626; }
                    .fee-qr-status {
                        font-size: 13px;
                        color: ${SLATE_MUTED};
                        text-align: center;
                    }
                    .fee-qr-status strong { color: ${SLATE_DARK}; }
                    .fee-qr-links {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 6px 16px;
                    }
                    .fee-link {
                        padding: 0;
                        font-family: inherit;
                        font-size: 12px;
                        color: ${MINT_GREEN_STRONG};
                        background: none;
                        border: none;
                        text-decoration: underline;
                        cursor: pointer;
                    }
                    .fee-link:hover { color: ${MINT_GREEN_HOVER}; }

                    .fee-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        margin-top: 22px;
                    }
                    .fee-btn {
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
                        transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
                    }
                    .fee-btn:focus-visible {
                        outline: 2px solid ${MINT_GREEN};
                        outline-offset: 2px;
                    }
                    .fee-btn-small {
                        height: 36px;
                        padding: 0 14px;
                        font-size: 13px;
                    }
                    .fee-btn-cancel {
                        color: #334155;
                        background: #fff;
                        border: 1px solid ${SLATE_INPUT_BORDER};
                    }
                    .fee-btn-cancel:hover:not(:disabled) { border-color: ${MINT_GREEN}; color: ${MINT_GREEN_STRONG}; }
                    .fee-btn-confirm {
                        color: #fff;
                        background: ${MINT_GREEN_STRONG};
                        border: 1px solid ${MINT_GREEN_STRONG};
                    }
                    .fee-btn-confirm:hover:not(:disabled) {
                        background: ${MINT_GREEN_HOVER};
                        border-color: ${MINT_GREEN_HOVER};
                    }
                    .fee-btn:disabled { cursor: not-allowed; opacity: 0.5; }

                    @media (max-width: 520px) {
                        .fee-options { grid-template-columns: 1fr; }
                        .fee-footer { flex-direction: column-reverse; }
                        .fee-btn { width: 100%; }
                        .fee-btn-small { width: auto; }
                    }
                `}
            </style>

            {/* Guest header */}
            <div className="fee-header">
                <Avatar
                    size={48}
                    style={{
                        backgroundColor: MINT_GREEN_LIGHT,
                        color: MINT_GREEN_STRONG,
                        fontWeight: 700,
                        fontSize: 17,
                        flexShrink: 0,
                    }}
                >
                    {initials}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                    <div className="fee-name">
                        {request.guestName || "Guest"}
                    </div>
                    <div className="fee-room">
                        <HomeOutlined />
                        Room {request.roomNumber ?? "-"}
                    </div>
                </div>
            </div>

            <div className="fee-title">{meta.title}</div>
            <div className="fee-subtitle">{meta.subtitle}</div>

            {/* Fee due */}
            <div className="fee-amount-card">
                <span className="fee-amount-icon">
                    <TagOutlined />
                </span>
                <div className="fee-amount-info">
                    <div className="fee-amount-label">{meta.label}</div>
                    <div className="fee-amount-desc">{description}</div>
                </div>
                <div className="fee-amount-value">{peso(amount)}</div>
            </div>

            {/* Payment method */}
            <div className="fee-section-label" id="fee-method-label">
                Payment Method
            </div>
            <div
                className="fee-options"
                role="radiogroup"
                aria-labelledby="fee-method-label"
            >
                <MethodOption
                    selected={method === "cash"}
                    onSelect={() => selectMethod("cash")}
                    icon={<CashIcon />}
                    title="Cash"
                    subtitle="Pay with physical cash"
                />
                <MethodOption
                    selected={method === "qrph"}
                    onSelect={() => selectMethod("qrph")}
                    icon={<ScanOutlined />}
                    title="QRPH"
                    subtitle="Scan and pay via QRPH"
                />
            </div>

            {method === "cash" ? (
                <div className="fee-field">
                    <div className="fee-section-label">Amount Received</div>
                    <InputNumber
                        autoFocus
                        className="fee-amount-input"
                        addonBefore="₱"
                        controls={false}
                        min={0}
                        precision={2}
                        value={tendered}
                        onChange={(v) => setTendered(v)}
                        onPressEnter={handleOk}
                        status={!isValid ? "error" : undefined}
                    />
                    <div className="fee-change">
                        <span>Change</span>
                        <span>{peso(change)}</span>
                    </div>
                    {!isValid && (
                        <span className="fee-error">
                            Amount received is less than the amount due.
                        </span>
                    )}
                </div>
            ) : manualRef ? (
                <div className="fee-field">
                    <div className="fee-section-label">
                        QRPH Reference Number
                    </div>
                    <Input
                        autoFocus
                        className="fee-input"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        onPressEnter={handleOk}
                        placeholder="Enter reference number from the guest's receipt"
                    />
                    <div style={{ marginTop: 8 }}>
                        <button
                            type="button"
                            className="fee-link"
                            onClick={backToQr}
                        >
                            Back to QR code
                        </button>
                    </div>
                </div>
            ) : (
                <div className="fee-field">
                    <div className="fee-section-label">Scan to Pay</div>

                    <div className="fee-qr" aria-live="polite">
                        {qrPhase === "loading" && (
                            <div className="fee-qr-placeholder">
                                <LoadingOutlined />
                                <span>Generating QRPH...</span>
                            </div>
                        )}

                        {(qrPhase === "ready" || qrPhase === "paid") && qr && (
                            <>
                                <div
                                    className={`fee-qr-box${qrPhase === "paid" ? " paid" : ""}`}
                                >
                                    <img
                                        className="fee-qr-img"
                                        src={qr.imageUrl}
                                        alt="QRPH code"
                                    />
                                    {qrPhase === "paid" && (
                                        <div className="fee-qr-paid">
                                            <CheckCircleFilled />
                                            <span>Payment received</span>
                                        </div>
                                    )}
                                </div>

                                <div className="fee-qr-status">
                                    {qrPhase === "ready" ? (
                                        <>
                                            Waiting for payment of{" "}
                                            <strong>{peso(amount)}</strong>
                                            <br />
                                            Expires in{" "}
                                            <strong>
                                                {formatCountdown(secondsLeft)}
                                            </strong>
                                        </>
                                    ) : submitting ? (
                                        "Recording payment..."
                                    ) : (
                                        "Payment received. Press the button below to record it."
                                    )}
                                </div>
                            </>
                        )}

                        {(qrPhase === "error" || qrPhase === "expired") && (
                            <div
                                className={`fee-qr-placeholder${qrPhase === "error" ? " is-error" : ""}`}
                            >
                                <ReloadOutlined />
                                <span>
                                    {qrPhase === "expired"
                                        ? "This QR code has expired."
                                        : qrError}
                                </span>
                                <button
                                    type="button"
                                    className="fee-btn fee-btn-cancel fee-btn-small"
                                    onClick={generateQr}
                                >
                                    Generate new QR
                                </button>
                            </div>
                        )}

                        {qrPhase !== "paid" && (
                            <div className="fee-qr-links">
                                {qr?.testUrl && qrPhase === "ready" && (
                                    <a
                                        className="fee-link"
                                        href={qr.testUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open sandbox payment page
                                    </a>
                                )}
                                <button
                                    type="button"
                                    className="fee-link"
                                    onClick={() => setManualRef(true)}
                                >
                                    Enter reference manually
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {request.showReason && (
                <div className="fee-field" style={{ marginTop: 16 }}>
                    <div className="fee-section-label">
                        Reason for override{" "}
                        <span
                            style={{ fontWeight: 400, color: SLATE_MUTED }}
                        >
                            (optional)
                        </span>
                    </div>
                    <Input.TextArea
                        className="fee-textarea"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason for this override action..."
                    />
                </div>
            )}

            {/* Footer */}
            <div className="fee-footer">
                <button
                    type="button"
                    className="fee-btn fee-btn-cancel"
                    onClick={handleClose}
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="fee-btn fee-btn-confirm"
                    onClick={handleOk}
                    disabled={!isValid || submitting}
                >
                    {confirmBusy ? <LoadingOutlined /> : <CheckCircleOutlined />}
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}