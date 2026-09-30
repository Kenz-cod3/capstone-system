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
    ScanOutlined,
    CheckCircleFilled,
    LoadingOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import api from "@/services/api";

const QR_CREATE_URL = "/paymongo/qr/create";
const QR_STATUS_URL = (paymentIntentId: string) =>
    `/paymongo/qr/fee-status/${paymentIntentId}`;

const QR_LIFETIME_MS = 1800 * 1000 - 15 * 1000;
const QR_POLL_MS = 3000;

const GREEN = "#059669";
const GREEN_HOVER = "#047857";
const GREEN_BG = "#f0fdf4";
const GREEN_LIGHT = "#dcfce7";
const BORDER = "#e5e7eb";
const BORDER_FOCUS = "#10b981";
const MUTED = "#6b7280";
const DARK = "#111827";
const PLACEHOLDER = "#9ca3af";

export type FeeType = "early_checkin" | "late_checkout" | "extension";
export type PaymentMethod = "cash" | "qrph";

export interface FeePaymentPayload {
    payment_method: PaymentMethod;
    reference?: string;
    amount_tendered?: number;
    reason?: string;
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
    roomType?: string;
    stayType?: "overnight" | "short_stay";
    bookingReference?: string;
    checkInDate?: string;
    checkOutDate?: string;
    onSubmit: (payload: FeePaymentPayload) => Promise<void>;
}

export const recordFeePayment = async (
    bookingId: number,
    amount: number,
    p: FeePaymentPayload,
) => {
    if (p.payment_method === "qrph") return;
    return api.post("/booking-payments", {
        booking_id: bookingId,
        amount,
        payment_method: "cash",
        payment_status: "paid",
        gcash_reference: null,
        bank_reference: null,
    });
};

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

const CashIcon = ({ size = 18 }: { size?: number }) => (
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
        </button>
    );
}

interface QrSession {
    paymentIntentId: string;
    clientKey: string;
    imageUrl: string;
    testUrl?: string;
    expiresAt: number;
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

    const [manualRef, setManualRef] = useState(false);
    const [qr, setQr] = useState<QrSession | null>(null);
    const [qrPhase, setQrPhase] = useState<QrPhase>("idle");
    const [qrError, setQrError] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0);

    const genToken = useRef(0);
    const autoSubmitted = useRef(false);

    const amount = request?.amount ?? 0;
    const usingQr = method === "qrph" && !manualRef;

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

            if (token !== genToken.current) return;

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

    useEffect(() => {
        if (!request || method !== "qrph") return;
        generateQr();
        return () => {
            genToken.current++;
        };
    }, [method, request]);

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
                );

                if (stopped) return;

                if (data?.paid === true) {
                    setQr((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  paymentReference: prev.paymentIntentId,
                              }
                            : prev,
                    );
                    setQrPhase("paid");
                }
            } catch {
                // keep polling
            }
        };

        const id = window.setInterval(tick, QR_POLL_MS);
        return () => {
            stopped = true;
            window.clearInterval(id);
        };
    }, [qr, qrPhase]);

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

    useEffect(() => {
        if (qrPhase === "paid" && !autoSubmitted.current) {
            autoSubmitted.current = true;
            handleOk();
        }
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
        submitting ||
        (waitingForQr && qrPhase === "loading") ||
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
            width={460}
            maskClosable={false}
            onCancel={handleClose}
            footer={null}
            className="fee-payment-modal"
        >
            <style>
                {`
                    .fee-payment-modal .ant-modal-content {
                        border-radius: 12px !important;
                        padding: 24px !important;
                    }
                    .fee-payment-modal .ant-modal-close {
                        top: 20px;
                        right: 20px;
                        color: ${MUTED};
                    }
                    .fee-payment-modal .ant-modal-close:hover {
                        color: ${DARK};
                    }

                    /* Header */
                    .fee-header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding-right: 28px;
                        margin-bottom: 20px;
                    }
                    .fee-name {
                        font-size: 15px;
                        font-weight: 600;
                        color: ${DARK};
                        line-height: 1.3;
                    }
                    .fee-room {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        margin-top: 2px;
                        font-size: 12px;
                        color: ${MUTED};
                    }

                    /* Titles */
                    .fee-title {
                        margin: 0 0 4px;
                        font-size: 17px;
                        font-weight: 600;
                        color: ${DARK};
                        line-height: 1.35;
                    }
                    .fee-subtitle {
                        margin: 0 0 20px;
                        font-size: 13px;
                        color: ${MUTED};
                        line-height: 1.5;
                    }

                    /* Amount Card */
                    .fee-amount-card {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        margin-bottom: 20px;
                        padding: 14px 16px;
                        border-radius: 8px;
                        background: ${GREEN_BG};
                        border: 1px solid ${GREEN_LIGHT};
                    }
                    .fee-amount-info { flex: 1; min-width: 0; }
                    .fee-amount-label {
                        font-size: 13px;
                        font-weight: 500;
                        color: ${DARK};
                    }
                    .fee-amount-desc {
                        margin-top: 2px;
                        font-size: 12px;
                        color: ${MUTED};
                    }
                    .fee-amount-value {
                        font-size: 18px;
                        font-weight: 600;
                        color: ${GREEN};
                        white-space: nowrap;
                    }

                    /* Section Labels */
                    .fee-section-label {
                        margin-bottom: 8px;
                        font-size: 13px;
                        font-weight: 500;
                        color: ${DARK};
                    }

                    /* Method Options */
                    .fee-options {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin-bottom: 20px;
                    }
                    .fee-option {
                        position: relative;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 14px;
                        text-align: left;
                        font-family: inherit;
                        background: #fff;
                        border: 1px solid ${BORDER};
                        border-radius: 8px;
                        cursor: pointer;
                        transition: border-color 0.15s ease, background 0.15s ease;
                    }
                    .fee-option:hover {
                        border-color: ${BORDER_FOCUS};
                    }
                    .fee-option.selected {
                        border-color: ${BORDER_FOCUS};
                        background: ${GREEN_BG};
                    }
                    .fee-option-icon {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        width: 20px;
                        font-size: 18px;
                        color: ${MUTED};
                    }
                    .fee-option.selected .fee-option-icon {
                        color: ${GREEN};
                    }
                    .fee-option-text {
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
                    }
                    .fee-option-title {
                        font-size: 13px;
                        font-weight: 500;
                        color: ${DARK};
                    }
                    .fee-option-sub {
                        margin-top: 1px;
                        font-size: 11px;
                        color: ${MUTED};
                    }

                    /* Inputs */
                    .fee-field { margin-bottom: 16px; }

                    .fee-amount-input { width: 100%; }
                    .fee-amount-input .ant-input-number-group-addon {
                        width: 40px;
                        padding: 0;
                        text-align: center;
                        font-size: 13px;
                        color: ${MUTED};
                        background: #f9fafb;
                        border-color: ${BORDER};
                        border-radius: 8px 0 0 8px;
                    }
                    .fee-amount-input .ant-input-number {
                        border-color: ${BORDER};
                        border-radius: 0 8px 8px 0;
                    }
                    .fee-amount-input .ant-input-number-input {
                        height: 38px;
                        font-size: 14px;
                    }
                    .fee-amount-input .ant-input-number:focus-within {
                        border-color: ${BORDER_FOCUS};
                        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
                    }

                    .fee-input.ant-input {
                        height: 38px;
                        border-radius: 8px;
                        font-size: 13px;
                        border-color: ${BORDER};
                    }
                    .fee-input.ant-input:hover,
                    .fee-input.ant-input:focus {
                        border-color: ${BORDER_FOCUS};
                        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
                    }
                    .fee-textarea.ant-input {
                        border-radius: 8px;
                        font-size: 13px;
                        border-color: ${BORDER};
                        resize: none;
                    }
                    .fee-textarea.ant-input:hover,
                    .fee-textarea.ant-input:focus {
                        border-color: ${BORDER_FOCUS};
                        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
                    }

                    /* Change */
                    .fee-change {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: 8px;
                        padding: 10px 14px;
                        border-radius: 8px;
                        background: #f9fafb;
                        border: 1px solid ${BORDER};
                        font-size: 13px;
                        font-weight: 500;
                        color: ${DARK};
                    }
                    .fee-change span:last-child {
                        color: ${GREEN};
                    }
                    .fee-error {
                        display: block;
                        margin-top: 6px;
                        font-size: 12px;
                        color: #dc2626;
                    }

                    /* QRPH */
                    .fee-qr {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 12px;
                        padding: 16px;
                        border: 1px solid ${BORDER};
                        border-radius: 8px;
                        background: #fafafa;
                    }
                    .fee-qr-box {
                        position: relative;
                        width: 180px;
                        height: 180px;
                        padding: 6px;
                        border: 1px solid ${BORDER};
                        border-radius: 8px;
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
                    .fee-qr-box.paid .fee-qr-img { opacity: 0.1; }
                    .fee-qr-paid {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        font-size: 13px;
                        font-weight: 500;
                        color: ${GREEN};
                    }
                    .fee-qr-paid .anticon { font-size: 32px; }
                    .fee-qr-placeholder {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        width: 180px;
                        min-height: 180px;
                        text-align: center;
                        font-size: 12px;
                        line-height: 1.5;
                        color: ${MUTED};
                    }
                    .fee-qr-placeholder .anticon {
                        font-size: 24px;
                        color: ${GREEN};
                    }
                    .fee-qr-placeholder.is-error { color: #dc2626; }
                    .fee-qr-placeholder.is-error .anticon { color: #dc2626; }

                    .fee-qr-status {
                        font-size: 12px;
                        color: ${MUTED};
                        text-align: center;
                        line-height: 1.5;
                    }
                    .fee-qr-status strong { color: ${DARK}; }

                    .fee-link {
                        padding: 0;
                        font-family: inherit;
                        font-size: 12px;
                        color: ${GREEN};
                        background: none;
                        border: none;
                        text-decoration: underline;
                        cursor: pointer;
                    }
                    .fee-link:hover { color: ${GREEN_HOVER}; }

                    /* Footer */
                    .fee-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 24px;
                    }
                    .fee-btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        height: 38px;
                        padding: 0 16px;
                        font-family: inherit;
                        font-size: 13px;
                        font-weight: 500;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
                        border: 1px solid transparent;
                    }
                    .fee-btn-small {
                        height: 32px;
                        padding: 0 12px;
                        font-size: 12px;
                        border-radius: 6px;
                    }
                    .fee-btn-cancel {
                        color: ${DARK};
                        background: #fff;
                        border-color: ${BORDER};
                    }
                    .fee-btn-cancel:hover:not(:disabled) {
                        border-color: ${BORDER_FOCUS};
                        color: ${GREEN};
                    }
                    .fee-btn-confirm {
                        color: #fff;
                        background: ${GREEN};
                        border-color: ${GREEN};
                    }
                    .fee-btn-confirm:hover:not(:disabled) {
                        background: ${GREEN_HOVER};
                        border-color: ${GREEN_HOVER};
                    }
                    .fee-btn:disabled {
                        cursor: not-allowed;
                        opacity: 0.5;
                    }

                    @media (max-width: 480px) {
                        .fee-options { grid-template-columns: 1fr; }
                        .fee-footer { flex-direction: column-reverse; }
                        .fee-btn { width: 100%; }
                        .fee-btn-small { width: auto; }
                    }
                `}
            </style>

            <div className="fee-header">
                <Avatar
                    size={36}
                    style={{
                        backgroundColor: GREEN_LIGHT,
                        color: GREEN,
                        fontWeight: 600,
                        fontSize: 13,
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
                        <HomeOutlined style={{ fontSize: 11 }} />
                        Room {request.roomNumber ?? "-"}
                    </div>
                </div>
            </div>

            <div className="fee-title">{meta.title}</div>
            <div className="fee-subtitle">{meta.subtitle}</div>

            <div className="fee-amount-card">
                <div className="fee-amount-info">
                    <div className="fee-amount-label">{meta.label}</div>
                    <div className="fee-amount-desc">{description}</div>
                </div>
                <div className="fee-amount-value">{peso(amount)}</div>
            </div>

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
                    subtitle="Physical cash"
                />
                <MethodOption
                    selected={method === "qrph"}
                    onSelect={() => selectMethod("qrph")}
                    icon={<ScanOutlined />}
                    title="QRPH"
                    subtitle="Scan to pay"
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
                        placeholder="Enter reference number"
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
                                        "Payment received. Press confirm to record."
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

                        {qrPhase !== "paid" && qr?.testUrl && qrPhase === "ready" && (
                            <a
                                className="fee-link"
                                href={qr.testUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open sandbox payment page
                            </a>
                        )}
                    </div>
                </div>
            )}

            {request.showReason && (
                <div className="fee-field" style={{ marginTop: 16 }}>
                    <div className="fee-section-label">
                        Reason for override{" "}
                        <span style={{ fontWeight: 400, color: MUTED }}>
                            (optional)
                        </span>
                    </div>
                    <Input.TextArea
                        className="fee-textarea"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason..."
                    />
                </div>
            )}

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
                    {confirmBusy && <LoadingOutlined />}
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}