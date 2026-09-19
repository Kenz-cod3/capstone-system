import { useState, useEffect } from "react";
import {
    Modal,
    Radio,
    InputNumber,
    DatePicker,
    Input,
    Typography,
    Space,
    Alert,
} from "antd";
import type { RadioChangeEvent } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

const MINT_GREEN = "#10b981";

export interface ExtendStayTarget {
    bookingId: number;
    bookedRoomId: number;
    roomNumber?: string;
    guestName?: string;
    // ISO string of the current expected checkout, if known
    expectedCheckoutAt?: string | null;
    extensionFee?: number; // per-hour rate
}

interface ExtendStayModalProps {
    open: boolean;
    target: ExtendStayTarget | null;
    isAdmin: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        hours: number;
        reason?: string;
        fee: number;
    }) => Promise<void>;
}

type ExtendMode = "hours" | "datetime";

export default function ExtendStayModal({
    open,
    target,
    isAdmin,
    onClose,
    onConfirm,
}: ExtendStayModalProps) {
    const [mode, setMode] = useState<ExtendMode>("hours");
    const [hours, setHours] = useState<number>(1);
    const [selectedDateTime, setSelectedDateTime] = useState<Dayjs | null>(
        null,
    );
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Reset form state each time the modal opens for a new target
    useEffect(() => {
        if (open) {
            setMode("hours");
            setHours(1);
            setSelectedDateTime(null);
            setReason("");
        }
    }, [open, target?.bookedRoomId]);

    // The point in time we're extending FROM (current expected checkout, or now)
    const baseTime =
        target?.expectedCheckoutAt &&
        dayjs(target.expectedCheckoutAt).isAfter(dayjs())
            ? dayjs(target.expectedCheckoutAt)
            : dayjs();

    // When in "pick date & time" mode, derive the hours to send from the
    // difference between the chosen datetime and the base time.
    const computedHoursFromDateTime = selectedDateTime
        ? Math.max(1, Math.ceil(selectedDateTime.diff(baseTime, "minute") / 60))
        : 0;

    const effectiveHours = mode === "hours" ? hours : computedHoursFromDateTime;

    const ratePerHour = Number(target?.extensionFee ?? 100);
    const fee = ratePerHour * effectiveHours;
    const feeLabel = `₱${fee.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

    const handleModeChange = (e: RadioChangeEvent) => {
        setMode(e.target.value);
    };

    const handleOk = async () => {
        if (mode === "datetime" && !selectedDateTime) {
            return;
        }

        if (effectiveHours < 1) {
            return;
        }

        setSubmitting(true);
        try {
            await onConfirm({
                hours: effectiveHours,
                reason: isAdmin ? reason || undefined : undefined,
                fee,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title="Extend Stay"
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText={fee > 0 ? "Continue to Payment" : "Extend"}
            cancelText="Cancel"
            centered
            width={440}
            confirmLoading={submitting}
            okButtonProps={{
                style: { background: MINT_GREEN, borderColor: MINT_GREEN },
                disabled:
                    (mode === "datetime" && !selectedDateTime) ||
                    effectiveHours < 1,
            }}
        >
            <div style={{ padding: "8px 0" }}>
                {target && (
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Room
                        </Text>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {target.roomNumber ?? "-"}
                            {target.guestName ? ` — ${target.guestName}` : ""}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Current expected checkout
                    </Text>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {baseTime.format("MMM D, YYYY h:mm A")}
                    </div>
                </div>

                <Radio.Group
                    value={mode}
                    onChange={handleModeChange}
                    style={{ marginBottom: 16, display: "flex", gap: 8 }}
                >
                    <Radio.Button
                        value="hours"
                        style={{ flex: 1, textAlign: "center" }}
                    >
                        By Hours
                    </Radio.Button>
                    <Radio.Button
                        value="datetime"
                        style={{ flex: 1, textAlign: "center" }}
                    >
                        Pick Date & Time
                    </Radio.Button>
                </Radio.Group>

                {mode === "hours" ? (
                    <div style={{ marginBottom: 16 }}>
                        <Text
                            style={{
                                fontSize: 12,
                                display: "block",
                                marginBottom: 6,
                            }}
                        >
                            Extend by (hours)
                        </Text>
                        <InputNumber
                            min={1}
                            max={24}
                            value={hours}
                            onChange={(val) => setHours(val ?? 1)}
                            style={{ width: "100%" }}
                        />
                    </div>
                ) : (
                    <div style={{ marginBottom: 16 }}>
                        <Text
                            style={{
                                fontSize: 12,
                                display: "block",
                                marginBottom: 6,
                            }}
                        >
                            New checkout date & time
                        </Text>
                        <DatePicker
                            showTime
                            value={selectedDateTime}
                            onChange={(val) => setSelectedDateTime(val)}
                            disabledDate={(current) =>
                                current && current.isBefore(baseTime, "day")
                            }
                            style={{ width: "100%" }}
                            format="MMM D, YYYY h:mm A"
                        />
                        {selectedDateTime && (
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 11,
                                    display: "block",
                                    marginTop: 6,
                                }}
                            >
                                This adds approximately{" "}
                                {computedHoursFromDateTime} hour
                                {computedHoursFromDateTime !== 1 ? "s" : ""} to
                                the current checkout time.
                            </Text>
                        )}
                    </div>
                )}

                <Alert
                    type="info"
                    showIcon
                    message={
                        effectiveHours < 1
                            ? "Pick a new checkout date and time to see the extension fee."
                            : fee > 0
                              ? `Extension fee: ${feeLabel} (₱${ratePerHour.toLocaleString()} × ${effectiveHours} hr). You'll be asked to collect payment next.`
                              : "No extension fee applies."
                    }
                    style={{ fontSize: 11, marginBottom: isAdmin ? 16 : 0 }}
                />

                {isAdmin && (
                    <div>
                        <Text
                            style={{
                                fontSize: 12,
                                display: "block",
                                marginBottom: 6,
                            }}
                        >
                            Reason for override (optional)
                        </Text>
                        <Input.TextArea
                            rows={2}
                            placeholder="Enter reason for this override action..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            style={{ fontSize: "11px" }}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
