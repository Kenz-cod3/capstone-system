import React from "react";
import {
    Modal,
    Button,
    Segmented,
    DatePicker,
    Select,
    Alert,
    Typography,
    message,
    Spin,
} from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import api from "@/services/api";

const { Text } = Typography;

const MINT_GREEN = "#10b981";
const MINT_GREEN_BG = "#ecfdf5";
const INK = "#0f172a";
const SLATE = "#64748b";
const BORDER = "#e8edf2";

type StayType = "overnight" | "short_stay";

export interface AddRoomTarget {
    bookingId: number;
    guestName?: string;
    bookingReference?: string;
    /** room ids already in this booking (hidden from the picker) */
    existingRoomIds?: number[];
}

interface AddRoomModalProps {
    open: boolean;
    target: AddRoomTarget | null;
    onClose: () => void;
    onAdded: () => void | Promise<void>;
    /** Collects payment first, then runs `run` (which creates the room) */
    onCharge?: (req: {
        amount: number;
        note: string;
        roomNumber?: string;
        run: () => Promise<void>;
    }) => void;
}

interface RoomOption {
    id: number;
    room_number: string;
    status?: string;
    type_name: string;
    base_price: number;
    short_stay_price: number | null;
    image_url?: string;
}

const normalizeRooms = (raw: any): RoomOption[] => {
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list.map((r: any) => {
        const rt = r.room_type ?? r.roomType ?? {};
        return {
            id: r.id,
            room_number: String(r.room_number ?? r.id),
            status: r.status,
            type_name: rt.type_name ?? "-",
            base_price: Number(rt.base_price ?? 0),
            short_stay_price:
                rt.short_stay_price !== null &&
                rt.short_stay_price !== undefined
                    ? Number(rt.short_stay_price)
                    : null,
            image_url: r.image_url,
        };
    });
};

const peso = (n: number) =>
    `₱${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text
        type="secondary"
        style={{
            fontSize: 11,
            display: "block",
            marginBottom: 6,
            letterSpacing: "0.2px",
        }}
    >
        {children}
    </Text>
);

const AddRoomModal: React.FC<AddRoomModalProps> = ({
    open,
    target,
    onClose,
    onAdded,
    onCharge,
}) => {
    const [stayType, setStayType] = React.useState<StayType>("overnight");
    const [checkIn, setCheckIn] = React.useState<Dayjs>(dayjs().startOf("day"));
    const [checkOut, setCheckOut] = React.useState<Dayjs>(
        dayjs().startOf("day").add(1, "day"),
    );
    const [roomId, setRoomId] = React.useState<number | undefined>(undefined);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Reset every time the modal opens
    React.useEffect(() => {
        if (open) {
            setStayType("overnight");
            setCheckIn(dayjs().startOf("day"));
            setCheckOut(dayjs().startOf("day").add(1, "day"));
            setRoomId(undefined);
            setError(null);
            setSubmitting(false);
        }
    }, [open]);

    const { data: rooms = [], isLoading } = useQuery({
        queryKey: ["add-room-modal-rooms"],
        queryFn: async () => {
            const { data } = await api.get("/rooms");
            return normalizeRooms(data);
        },
        enabled: open,
    });

    const selectableRooms = React.useMemo(
        () =>
            rooms.filter(
                (r) =>
                    r.status !== "maintenance" &&
                    !(target?.existingRoomIds ?? []).includes(r.id),
            ),
        [rooms, target],
    );

    const selectedRoom = selectableRooms.find((r) => r.id === roomId);

    const nights =
        stayType === "short_stay"
            ? 1
            : Math.max(
                  1,
                  checkOut.startOf("day").diff(checkIn.startOf("day"), "day"),
              );

    const rate = selectedRoom
        ? stayType === "short_stay"
            ? (selectedRoom.short_stay_price ?? selectedRoom.base_price)
            : selectedRoom.base_price
        : 0;

    const subtotal = stayType === "short_stay" ? rate : rate * nights;

    const handleStayTypeChange = (value: StayType) => {
        setStayType(value);
        setError(null);
        if (value === "overnight" && !checkOut.isAfter(checkIn, "day")) {
            setCheckOut(checkIn.add(1, "day"));
        }
    };

    const handleCheckInChange = (d: Dayjs | null) => {
        if (!d) return;
        setCheckIn(d.startOf("day"));
        setError(null);
        if (!checkOut.isAfter(d, "day")) {
            setCheckOut(d.startOf("day").add(1, "day"));
        }
    };

    const handleSubmit = async () => {
        if (!target) return;
        if (!selectedRoom) {
            setError("Please select a room.");
            return;
        }

        setSubmitting(true);
        setError(null);

        const effectiveCheckOut =
            stayType === "short_stay" ? checkIn : checkOut;

        const payload = {
            booking_id: target.bookingId,
            room_id: selectedRoom.id,
            status: "pending",
            stay_type: stayType,
            check_in_date: checkIn.format("YYYY-MM-DD"),
            check_out_date: effectiveCheckOut.format("YYYY-MM-DD"),
            price_at_time_of_booking: rate,
            subtotal,
        };

        try {
            // 1. Dry run: make sure the room is free BEFORE taking any money
            await api.post("/booked-rooms", {
                ...payload,
                validate_only: true,
            });

            // 2. The real creation (runs after payment is collected)
            const isPaidUpfront = !!onCharge && subtotal > 0;

            const createRoom = async () => {
                await api.post("/booked-rooms", {
                    ...payload,
                    // Bayad na (onCharge) = confirmed na agad
                    status: isPaidUpfront ? "confirmed" : "pending",
                });
                message.success(`Room ${selectedRoom.room_number} added`);
                await onAdded();
            };

            if (onCharge && subtotal > 0) {
                onCharge({
                    amount: subtotal,
                    note:
                        stayType === "short_stay"
                            ? "Short stay"
                            : `${nights} night${nights > 1 ? "s" : ""}`,
                    roomNumber: selectedRoom.room_number,
                    run: createRoom,
                });
                onClose();
                return;
            }

            await createRoom();
            onClose();
        } catch (err: any) {
            const data = err?.response?.data;
            const firstValidation = data?.errors
                ? (Object.values(data.errors)[0] as string[])?.[0]
                : undefined;
            setError(firstValidation || data?.message || "Failed to add room.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={submitting ? undefined : onClose}
            centered
            width={480}
            destroyOnClose
            maskClosable={!submitting}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <HomeOutlined style={{ color: MINT_GREEN }} />
                    <Text strong style={{ fontSize: 16, color: INK }}>
                        Add Room
                    </Text>
                </div>
            }
            footer={[
                <Button key="cancel" onClick={onClose} disabled={submitting}>
                    Cancel
                </Button>,
                <Button
                    key="add"
                    type="primary"
                    loading={submitting}
                    disabled={!selectedRoom}
                    onClick={handleSubmit}
                    style={{ background: MINT_GREEN, borderColor: MINT_GREEN }}
                >
                    {onCharge && subtotal > 0
                        ? "Continue to Payment"
                        : "Add Room"}
                </Button>,
            ]}
        >
            <div style={{ padding: "4px 0" }}>
                {target?.guestName && (
                    <div
                        style={{
                            background: MINT_GREEN_BG,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 16,
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Adding to booking
                        </Text>
                        <div>
                            <Text strong style={{ fontSize: 13, color: INK }}>
                                {target.guestName}
                            </Text>
                            {target.bookingReference && (
                                <Text
                                    type="secondary"
                                    style={{ fontSize: 11, marginLeft: 8 }}
                                >
                                    {target.bookingReference}
                                </Text>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: 14 }}>
                    <FieldLabel>Stay Type</FieldLabel>
                    <Segmented
                        block
                        value={stayType}
                        onChange={(v) => handleStayTypeChange(v as StayType)}
                        options={[
                            { label: "Overnight", value: "overnight" },
                            { label: "Short Stay", value: "short_stay" },
                        ]}
                    />
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            stayType === "overnight" ? "1fr 1fr" : "1fr",
                        gap: 12,
                        marginBottom: 14,
                    }}
                >
                    <div>
                        <FieldLabel>Check-in Date</FieldLabel>
                        <DatePicker
                            value={checkIn}
                            onChange={handleCheckInChange}
                            allowClear={false}
                            format="MMM D, YYYY"
                            style={{ width: "100%" }}
                            disabledDate={(d) => d.isBefore(dayjs(), "day")}
                        />
                    </div>

                    {stayType === "overnight" && (
                        <div>
                            <FieldLabel>Check-out Date</FieldLabel>
                            <DatePicker
                                value={checkOut}
                                onChange={(d) => {
                                    if (d) {
                                        setCheckOut(d.startOf("day"));
                                        setError(null);
                                    }
                                }}
                                allowClear={false}
                                format="MMM D, YYYY"
                                style={{ width: "100%" }}
                                disabledDate={(d) => !d.isAfter(checkIn, "day")}
                            />
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: 14 }}>
                    <FieldLabel>Room</FieldLabel>
                    <Select
                        showSearch
                        value={roomId}
                        onChange={(v) => {
                            setRoomId(v);
                            setError(null);
                        }}
                        placeholder="Select a room"
                        loading={isLoading}
                        notFoundContent={
                            isLoading ? <Spin size="small" /> : "No rooms found"
                        }
                        style={{ width: "100%" }}
                        optionFilterProp="label"
                        options={selectableRooms.map((r) => ({
                            value: r.id,
                            label: `Room ${r.room_number} · ${r.type_name}`,
                        }))}
                        optionRender={(option) => {
                            const r = selectableRooms.find(
                                (x) => x.id === option.value,
                            );
                            if (!r) return option.label;
                            const price =
                                stayType === "short_stay"
                                    ? (r.short_stay_price ?? r.base_price)
                                    : r.base_price;
                            return (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                    }}
                                >
                                    <span>
                                        <strong>Room {r.room_number}</strong>
                                        <span
                                            style={{
                                                color: SLATE,
                                                marginLeft: 6,
                                                fontSize: 12,
                                            }}
                                        >
                                            {r.type_name}
                                        </span>
                                    </span>
                                    <span
                                        style={{
                                            color: MINT_GREEN,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {peso(price)}
                                    </span>
                                </div>
                            );
                        }}
                    />
                </div>

                {selectedRoom && (
                    <div
                        style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginBottom: 14,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                            }}
                        >
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {stayType === "short_stay"
                                    ? "Short stay rate"
                                    : `Rate × ${nights} night${nights > 1 ? "s" : ""}`}
                            </Text>
                            <Text style={{ fontSize: 12 }}>
                                {stayType === "short_stay"
                                    ? peso(rate)
                                    : `${peso(rate)} × ${nights}`}
                            </Text>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                paddingTop: 6,
                                borderTop: "1px dashed #e2e8f0",
                            }}
                        >
                            <Text strong style={{ fontSize: 13 }}>
                                Room Total
                            </Text>
                            <Text
                                strong
                                style={{ fontSize: 15, color: MINT_GREEN }}
                            >
                                {peso(subtotal)}
                            </Text>
                        </div>
                    </div>
                )}

                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message={error}
                        style={{ borderRadius: 8, fontSize: 12 }}
                    />
                )}
            </div>
        </Modal>
    );
};

export default AddRoomModal;
