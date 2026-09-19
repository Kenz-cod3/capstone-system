import { useState, useEffect } from "react";
import { Modal, Typography, Input, Avatar, Checkbox } from "antd";
import {
    CalendarOutlined,
    ClockCircleOutlined,
    HomeOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const MINT_GREEN = "#10b981";
const MINT_GREEN_BG = "#ecfdf5";
const MINT_GREEN_LIGHT = "#d1fae5";
const AMBER = "#b45309";
const AMBER_BG = "#fffbeb";
const AMBER_BORDER = "#fde68a";
const SLATE_BORDER = "#e8edf2";
const SLATE_MUTED = "#64748b";
const SLATE_DARK = "#0f172a";

export interface CheckInTarget {
    bookingId: number;
    bookedRoomId: number;
    roomNumber?: string;
    guestName?: string;
    // The date the guest actually booked/reserved for (BookingRow.check_in_date)
    scheduledCheckInDate: string;
    stayType?: "overnight" | "short_stay";
    earlyCheckInFee?: number;
    standardCheckInTime?: string; // "14:00" or "14:00:00"
}

interface CheckInModalProps {
    open: boolean;
    target: CheckInTarget | null;
    isAdmin: boolean;
    onClose: () => void;
    onConfirm: (payload: { reason?: string; fee?: number }) => Promise<void>;
}

export default function CheckInModal({
    open,
    target,
    isAdmin,
    onClose,
    onConfirm,
}: CheckInModalProps) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setReason("");
        }
    }, [open, target?.bookedRoomId]);

    if (!target) return null;

    const now = dayjs();
    const today = now.startOf("day");
    const scheduled = dayjs(target.scheduledCheckInDate).startOf("day");

    // Standard check-in time on the scheduled date
    const standardTime = target.standardCheckInTime ?? "14:00";
    const [hh = 14, mm = 0] = standardTime.split(":").map(Number);
    const standardCheckIn = scheduled.hour(hh).minute(mm);
    const standardLabel = dayjs(`2000-01-01 ${standardTime}`).format("h:mm A");

    const isShortStay = target.stayType === "short_stay";
    const isEarlyByDate = today.isBefore(scheduled, "day");
    const isEarlyByTime =
        today.isSame(scheduled, "day") && now.isBefore(standardCheckIn);

    // Same rules as the backend (short stays never pay an early fee)
    const isEarly = !isShortStay && (isEarlyByDate || isEarlyByTime);
    const daysEarly = isEarlyByDate ? scheduled.diff(today, "day") : 0;

    const fee = isEarly ? Number(target.earlyCheckInFee ?? 0) : 0;
    const needsFeeConfirm = fee > 0;
    const feeLabel = `₱${fee.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

    const initials =
        target.guestName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "G";

    const handleOk = async () => {
        setSubmitting(true);
        try {
            await onConfirm({
                reason: isAdmin ? reason || undefined : undefined,
                fee,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={null}
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText={
                needsFeeConfirm
                    ? "Continue to Payment"
                    : isEarly
                      ? "Confirm Early Check In"
                      : "Confirm Check In"
            }
            cancelText="Cancel"
            centered
            width={460}
            confirmLoading={submitting}
            okButtonProps={{
                style: {
                    background: MINT_GREEN,
                    borderColor: MINT_GREEN,
                    fontWeight: 600,
                },
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    paddingBottom: 16,
                    marginBottom: 16,
                    borderBottom: `1px solid ${SLATE_BORDER}`,
                }}
            >
                <Avatar
                    size={44}
                    style={{
                        backgroundColor: MINT_GREEN_LIGHT,
                        color: MINT_GREEN,
                        fontWeight: 700,
                        fontSize: 15,
                        flexShrink: 0,
                    }}
                >
                    {initials}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                    <Text
                        strong
                        style={{
                            fontSize: 16,
                            color: SLATE_DARK,
                            display: "block",
                            lineHeight: 1.3,
                        }}
                    >
                        {target.guestName || "Guest"}
                    </Text>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 2,
                        }}
                    >
                        <HomeOutlined
                            style={{ fontSize: 11, color: SLATE_MUTED }}
                        />
                        <Text style={{ fontSize: 12, color: SLATE_MUTED }}>
                            Room {target.roomNumber ?? "-"}
                        </Text>
                    </div>
                </div>
            </div>

            {/* Scheduled vs now */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        flex: 1,
                        border: `1px solid ${SLATE_BORDER}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginBottom: 3,
                        }}
                    >
                        <CalendarOutlined
                            style={{ fontSize: 11, color: SLATE_MUTED }}
                        />
                        <Text style={{ fontSize: 11, color: SLATE_MUTED }}>
                            Scheduled check-in
                        </Text>
                    </div>
                    <Text strong style={{ fontSize: 14, color: SLATE_DARK }}>
                        {scheduled.format("MMM D, YYYY")}
                    </Text>
                    <div style={{ fontSize: 11, color: SLATE_MUTED }}>
                        from {standardLabel}
                    </div>
                </div>

                <ArrowRightOutlined
                    style={{ fontSize: 13, color: "#cbd5e1", flexShrink: 0 }}
                />

                <div
                    style={{
                        flex: 1,
                        border: `1px solid ${isEarly ? AMBER_BORDER : MINT_GREEN}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        background: isEarly ? AMBER_BG : MINT_GREEN_BG,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginBottom: 3,
                        }}
                    >
                        <ClockCircleOutlined
                            style={{
                                fontSize: 11,
                                color: isEarly ? AMBER : MINT_GREEN,
                            }}
                        />
                        <Text
                            style={{
                                fontSize: 11,
                                color: isEarly ? AMBER : MINT_GREEN,
                            }}
                        >
                            Checking in now
                        </Text>
                    </div>
                    <Text
                        strong
                        style={{
                            fontSize: 14,
                            color: isEarly ? AMBER : "#065f46",
                        }}
                    >
                        {today.format("MMM D, YYYY")}
                    </Text>
                    <div
                        style={{
                            fontSize: 11,
                            color: isEarly ? AMBER : "#065f46",
                        }}
                    >
                        {now.format("h:mm A")}
                    </div>
                </div>
            </div>

            {/* Status note */}
            {isEarly ? (
                <div
                    style={{
                        borderRadius: 8,
                        border: `1px solid ${AMBER_BORDER}`,
                        background: AMBER_BG,
                        padding: "10px 12px",
                        marginBottom: isAdmin ? 16 : 4,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: "#92400e",
                            display: "block",
                        }}
                    >
                        {isEarlyByDate
                            ? `This is ${daysEarly} day${daysEarly !== 1 ? "s" : ""} ahead of the booked date.`
                            : `This is before the standard check-in time of ${standardLabel}.`}
                        {needsFeeConfirm ? (
                            <>
                                {" "}
                                An early check-in fee of{" "}
                                <strong>{feeLabel}</strong> will be added to the
                                total.
                            </>
                        ) : (
                            " No early check-in fee is set for this room type."
                        )}
                        {isEarlyByDate &&
                            " Stay dates will shift to start today."}
                    </Text>
                </div>
            ) : (
                <div
                    style={{
                        borderRadius: 8,
                        border: `1px solid ${MINT_GREEN}`,
                        background: MINT_GREEN_BG,
                        padding: "10px 12px",
                        marginBottom: isAdmin ? 16 : 4,
                    }}
                >
                    <Text style={{ fontSize: 12, color: "#065f46" }}>
                        {isShortStay
                            ? "Short stay — no early check-in fee applies."
                            : "Checking in on time — no early check-in fee applies."}
                    </Text>
                </div>
            )}

            {isAdmin && (
                <div>
                    <Text
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: SLATE_DARK,
                            display: "block",
                            marginBottom: 6,
                        }}
                    >
                        Reason for override
                        <Text style={{ fontWeight: 400, color: SLATE_MUTED }}>
                            {" "}
                            (optional)
                        </Text>
                    </Text>
                    <Input.TextArea
                        rows={2}
                        placeholder="Enter reason for this override action..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ fontSize: 12, borderRadius: 8 }}
                    />
                </div>
            )}
        </Modal>
    );
}
