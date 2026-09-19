import React from "react";
import { useNavigate } from "react-router-dom";
import {
    PhoneOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    TagOutlined,
    CopyOutlined,
    MoreOutlined,
    HistoryOutlined,
    BankOutlined,
    PrinterOutlined,
    EditOutlined,
    HomeOutlined,
    UserOutlined,
    TeamOutlined,
    MoonOutlined,
    WalletOutlined,
    MailOutlined,
    EnvironmentOutlined,
    IdcardOutlined,
    WarningOutlined,
    GiftOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    LeftOutlined,
} from "@ant-design/icons";
import {
    Card,
    Space,
    Tag,
    Button,
    Typography,
    Timeline,
    Avatar,
    Row,
    Col,
    Dropdown,
    message,
    Divider,
    Alert,
    Modal,
} from "antd";
import type { MenuProps } from "antd";
import bookingWatermark from "../../../../images/iconD.png";

const { Title, Text } = Typography;

const MINT_GREEN = "#10b981";
const MINT_GREEN_BG = "#ecfdf5";
const INK = "#0f172a";
const SLATE = "#64748b";
const BORDER = "#e8edf2";

export interface RoomDetail {
    id: number;
    room_number: string;
    room_type: string;
    rate_plan: string;
    rate: number;
    nights: number;
    guests: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    expected_checkout_at?: string | null;
    dates: string;
    status: string;
    image_url?: string;
    original_price?: number;
    refund_amount?: number;
    is_refunded?: boolean;

    is_extended?: boolean;
    is_early_checkin?: boolean;
    early_checkin_fee?: number;
    is_late_checkout?: boolean;
    late_checkout_fee?: number;
    checkout_status?: "ontime" | "overdue";
    key_returned?: boolean;
    overdue_started_at?: string | null;
    stay_type?: string;
    add_ons?: AddOnItem[];
}

export interface AddOnItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
}

export interface StaffAttribution {
    label: string;
    name: string;
    role?: string;
    is_override?: boolean;
    override_reason?: string;
}

export interface TimelineItem {
    title: string;
    description: string;
    time: string;
    by: string;
    by_role?: string;
    status?: string;
    old_status?: string;
    new_status?: string;
    is_override?: boolean;
    override_reason?: string;
}

export interface BookingData {
    id: string;
    reference: string;
    booked_on: string;
    status: string;
    guest_name: string;
    guest_phone: string;
    guest_email?: string;
    guest_address?: string;
    guest_id?: string;
    booking_type?: string;
    stay_type: string;
    check_in_date: string;
    check_in_time: string;
    check_out_date: string;
    check_out_time: string;
    total_rooms: number;
    adults: number;
    children: number;
    total_amount: number;
    rooms: RoomDetail[];
    payment_method: string;
    payment_status: string;
    amount_paid: number;
    paid_on?: string;
    payment_reference?: string;
    receipt_number?: string;
    notes: string;
    timeline: TimelineItem[];
    add_ons?: AddOnItem[];
    is_extended?: boolean;
    overdue_days?: number;
    overdue_since?: string | null;
    room_charges?: number;
    add_on_total?: number;
    staff_attribution?: StaffAttribution[];
    payment_received_by?: {
        name: string;
        role?: string;
    };
    refunded_by?: {
        name: string;
        role?: string;
    };
    total_refund_amount?: number;

    total_early_checkin_fee?: number;
    total_late_checkout_fee?: number;
    total_extension_fee?: number;
    extended_rooms_count?: number;
    overdue_rooms_count?: number;
    shift_name?: string;
    shift_start?: string;
    shift_end?: string;
}

export interface BookingDetailsProps {
    booking: BookingData;
    onAction?: (action: string) => void;
    backHref?: string;
    fromTab?: string;
    userRole?: string;
}

// ---- small shared building blocks -----------------------------------------

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text
        type="secondary"
        style={{ fontSize: "10.5px", letterSpacing: "0.2px" }}
    >
        {children}
    </Text>
);

const SectionCard: React.FC<{
    title: React.ReactNode;
    icon?: React.ReactNode;
    extra?: React.ReactNode;
    children: React.ReactNode;
    style?: React.CSSProperties;
    bodyPadding?: string | number;
    headerPadding?: string | number;
}> = ({
    title,
    icon,
    extra,
    children,
    style,
    bodyPadding = "16px",
    headerPadding,
}) => (
    <Card
        size="small"
        style={{
            borderRadius: "12px",
            border: `1px solid ${BORDER}`,
            background: "white",
            height: "100%",
            ...style,
        }}
        styles={{ body: { padding: bodyPadding } }}
    >
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                padding: headerPadding,
            }}
        >
            <Space size={7}>
                {icon}
                <span
                    style={{ fontSize: "13.5px", fontWeight: 600, color: INK }}
                >
                    {title}
                </span>
            </Space>
            {extra}
        </div>
        {children}
    </Card>
);

// -----------------------------------------------------------------------------

const BookingDetails: React.FC<BookingDetailsProps> = ({
    booking,
    onAction,
    userRole = "staff",
}) => {
    const navigate = useNavigate();
    const [selectedRoom, setSelectedRoom] = React.useState<RoomDetail | null>(
        null,
    );
    const [roomDetailsVisible, setRoomDetailsVisible] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(Date.now());

    React.useEffect(() => {
        const interval = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => message.success("Copied to clipboard!"))
            .catch(() => message.error("Failed to copy"));
    };

    const formatDateTime = (datetime: string): string => {
        if (!datetime) return "-";
        return new Date(datetime).toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: "#faad14",
            CONFIRMED: MINT_GREEN,
            "CHECKED IN": "#1890ff",
            "CHECKED OUT": "#8c8c8c",
            CANCELLED: "#ff4d4f",
            REFUNDED: "#722ed1",
        };
        return colors[status] || "#8c8c8c";
    };

    const getStatusBg = (status: string) => {
        const bg: Record<string, string> = {
            PENDING: "#fff7e6",
            CONFIRMED: MINT_GREEN_BG,
            "CHECKED IN": "#e6f7ff",
            "CHECKED OUT": "#f5f5f5",
            CANCELLED: "#fff1f0",
            REFUNDED: "#f9f0ff",
        };
        return bg[status] || "#f5f5f5";
    };

    const getPaymentStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            PAID: MINT_GREEN,
            PENDING: "#faad14",
            REFUNDED: "#722ed1",
            FAILED: "#ff4d4f",
        };
        return colors[status] || "#8c8c8c";
    };

    // Get the main booking status (first room's status for actions)
    const getMainStatus = (): string => {
        const b = booking!;
        if (b.rooms && b.rooms.length > 0) {
            return b.rooms[0]!.status;
        }
        return b.status || "PENDING";
    };

    const mainStatus = getMainStatus();

    // Dynamic action menu based on status
    const getActionMenu = (): MenuProps => {
        const items: MenuProps["items"] = [];

        if (mainStatus === "PENDING") {
            items.push(
                {
                    key: "confirm",
                    label: "Confirm",
                    onClick: () => onAction && onAction("confirm"),
                },
                {
                    key: "cancel",
                    label: "Cancel Booking",
                    danger: true,
                    onClick: () => onAction && onAction("cancel"),
                },
            );
        }

        if (mainStatus === "CONFIRMED") {
            items.push(
                {
                    key: "checkin",
                    label: "Check In",
                    onClick: () => onAction && onAction("checkin"),
                },
                {
                    key: "cancel",
                    label: "Cancel Booking",
                    danger: true,
                    onClick: () => onAction && onAction("cancel"),
                },
            );
        }

        if (mainStatus === "CHECKED IN") {
            items.push(
                {
                    key: "checkout",
                    label: "Check Out",
                    onClick: () => onAction && onAction("checkout"),
                },
                {
                    key: "extend",
                    label: "Extend Stay",
                    onClick: () => onAction && onAction("extend"),
                },
                {
                    key: "refund",
                    label: "Refund Room",
                    danger: true,
                    onClick: () => onAction && onAction("refund"),
                },
            );
        }

        if (mainStatus === "CANCELLED") {
            items.push({
                key: "refund",
                label: "Refund Room",
                danger: true,
                onClick: () => onAction && onAction("refund"),
            });
        }

        if (userRole === "admin") {
            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => onAction && onAction("trash"),
            });
        }

        return { items };
    };

    // Room-specific action menu based on room status
    const getRoomActionMenu = (room: RoomDetail): MenuProps => {
        const items: MenuProps["items"] = [];

        items.push({
            key: `view_details:${room.id}`,
            label: (
                <span>
                    <InfoCircleOutlined style={{ marginRight: 8 }} />
                    View Details
                </span>
            ),
            onClick: () => {
                setSelectedRoom(room);
                setRoomDetailsVisible(true);
            },
        });

        items.push({ type: "divider" });

        const roomStatus = room.status;

        if (roomStatus === "PENDING") {
            items.push(
                {
                    key: `confirm:${room.id}`,
                    label: "Confirm",
                    onClick: () => onAction && onAction(`confirm:${room.id}`),
                },
                {
                    key: `cancel:${room.id}`,
                    label: "Cancel Booking",
                    danger: true,
                    onClick: () => onAction && onAction(`cancel:${room.id}`),
                },
            );
        }

        if (roomStatus === "CONFIRMED") {
            items.push(
                {
                    key: `checkin_room:${room.id}`,
                    label: "Check In",
                    onClick: () =>
                        onAction && onAction(`checkin_room:${room.id}`),
                },
                {
                    key: `cancel:${room.id}`,
                    label: "Cancel Booking",
                    danger: true,
                    onClick: () => onAction && onAction(`cancel:${room.id}`),
                },
            );
        }

        if (roomStatus === "CHECKED IN") {
            items.push(
                {
                    key: `checkout_room:${room.id}`,
                    label: "Check Out",
                    onClick: () =>
                        onAction && onAction(`checkout_room:${room.id}`),
                },
                {
                    key: `extend:${room.id}`,
                    label: "Extend Stay",
                    onClick: () => onAction && onAction(`extend:${room.id}`),
                },
                {
                    key: `refund:${room.id}`,
                    label: "Refund Room",
                    danger: true,
                    onClick: () => onAction && onAction(`refund:${room.id}`),
                },
            );
        }

        if (roomStatus === "CANCELLED") {
            items.push({
                key: `refund:${room.id}`,
                label: "Refund Room",
                danger: true,
                onClick: () => onAction && onAction(`refund:${room.id}`),
            });
        }

        if (userRole === "admin") {
            items.push({
                key: `remove_room:${room.id}`,
                label: "Remove Room",
                danger: true,
                onClick: () => onAction && onAction(`remove_room:${room.id}`),
            });
        }

        return { items };
    };

    const splitGuests = (guests: string) => {
        const parts = guests
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
        return {
            primary: parts[0] || guests,
            secondary: parts[1],
        };
    };

    const showsPaymentReference =
        booking.payment_method &&
        booking.payment_method.toUpperCase() !== "CASH" &&
        !!booking.payment_reference;

    const isRefunded = booking.payment_status?.toUpperCase() === "REFUNDED";
    const overdueDays = booking.overdue_days ?? 0;

    const overdueSince = booking.overdue_since
        ? new Date(booking.overdue_since).getTime()
        : null;

    const overdueDiff =
        overdueSince !== null ? Math.max(0, currentTime - overdueSince) : 0;

    const overdueTotalSeconds = Math.floor(overdueDiff / 1000);

    const overdueHours = Math.floor(overdueTotalSeconds / 3600);
    const overdueMinutes = Math.floor((overdueTotalSeconds % 3600) / 60);
    const overdueSeconds = overdueTotalSeconds % 60;

    const overdueTimer = `${String(overdueHours).padStart(2, "0")}:${String(
        overdueMinutes,
    ).padStart(2, "0")}:${String(overdueSeconds).padStart(2, "0")}`;

    const addOns = booking.add_ons ?? [];
    const roomCharges =
        booking.room_charges ??
        booking.rooms.reduce((sum, r) => sum + r.rate * r.nights, 0);
    const addOnTotal =
        booking.add_on_total ??
        addOns.reduce((sum, a) => sum + Number(a.subtotal ?? 0), 0);

    const totalRefundAmount =
        booking.total_refund_amount ??
        booking.rooms.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

    const totalEarlyCheckinFee = booking.total_early_checkin_fee ?? 0;
    const totalLateCheckoutFee = booking.total_late_checkout_fee ?? 0;
    const totalExtensionFee = booking.total_extension_fee ?? 0;

    const netAmount = roomCharges + addOnTotal - totalRefundAmount;

    const staffAttribution = booking.staff_attribution ?? [];

    // Render Room Details Modal
    const renderRoomDetailsModal = () => {
        if (!selectedRoom) return null;

        const isRoomRefunded = selectedRoom.is_refunded || false;
        const refundAmount = selectedRoom.refund_amount || 0;
        const roomTotal = selectedRoom.rate * selectedRoom.nights;
        const guests = splitGuests(selectedRoom.guests);

        let roomPaymentStatus = "PENDING";
        let roomPaymentColor = "#faad14";
        let roomPaymentBg = "#fff7e6";

        if (isRoomRefunded) {
            roomPaymentStatus = "REFUNDED";
            roomPaymentColor = "#ff4d4f";
            roomPaymentBg = "#fff1f0";
        } else if (
            selectedRoom.status === "CHECKED IN" ||
            selectedRoom.status === "CHECKED OUT" ||
            selectedRoom.status === "CONFIRMED"
        ) {
            roomPaymentStatus = "PAID";
            roomPaymentColor = MINT_GREEN;
            roomPaymentBg = MINT_GREEN_BG;
        } else if (selectedRoom.status === "CANCELLED") {
            roomPaymentStatus = "FAILED";
            roomPaymentColor = "#ff4d4f";
            roomPaymentBg = "#fff1f0";
        }

        return (
            <Modal
                title={
                    <Space size={8}>
                        <HomeOutlined style={{ color: MINT_GREEN }} />
                        <Text strong style={{ fontSize: "16px" }}>
                            Room {selectedRoom.room_number} Details
                        </Text>
                        {!isRoomRefunded && (
                            <Tag
                                style={{
                                    fontSize: "10px",
                                    borderRadius: "999px",
                                    border: "none",
                                    padding: "0 10px",
                                    background: getStatusBg(
                                        selectedRoom.status,
                                    ),
                                    color: getStatusColor(selectedRoom.status),
                                    fontWeight: 600,
                                }}
                            >
                                {selectedRoom.status}
                            </Tag>
                        )}
                        {isRoomRefunded && (
                            <Tag color="red" style={{ fontWeight: 600 }}>
                                REFUNDED
                            </Tag>
                        )}
                    </Space>
                }
                open={roomDetailsVisible}
                onCancel={() => {
                    setRoomDetailsVisible(false);
                    setSelectedRoom(null);
                }}
                footer={[
                    <Button
                        key="close"
                        onClick={() => {
                            setRoomDetailsVisible(false);
                            setSelectedRoom(null);
                        }}
                    >
                        Close
                    </Button>,
                ]}
                width={680}
                centered
                styles={{
                    body: {
                        position: "relative",
                        overflow: "hidden",
                        padding: "16px 24px",
                        maxHeight: "calc(100vh - 200px)",
                        overflowY: "auto",
                    },
                }}
            >
                <Divider style={{ margin: "8px 0 16px 0" }} />

                <Row gutter={16} align="stretch" style={{ minHeight: 240 }}>
                    <Col xs={24} md={10} style={{ display: "flex" }}>
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                minHeight: 240,
                                maxHeight: 300,
                                borderRadius: "10px",
                                overflow: "hidden",
                                background: MINT_GREEN_BG,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {selectedRoom.image_url ? (
                                <img
                                    src={selectedRoom.image_url}
                                    alt={selectedRoom.room_number}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            ) : (
                                <HomeOutlined
                                    style={{
                                        fontSize: "56px",
                                        color: MINT_GREEN,
                                    }}
                                />
                            )}
                        </div>
                    </Col>

                    <Col
                        xs={24}
                        md={14}
                        style={{ display: "flex", flexDirection: "column" }}
                    >
                        <div
                            style={{
                                border: `1px solid ${BORDER}`,
                                borderRadius: "8px",
                                overflow: "hidden",
                                marginBottom: 8,
                                flex: 1,
                            }}
                        >
                            <div
                                style={{
                                    background: "#fafbfc",
                                    padding: "4px 12px",
                                    borderBottom: `1px solid ${BORDER}`,
                                }}
                            >
                                <Space size={4}>
                                    <TagOutlined
                                        style={{
                                            fontSize: "11px",
                                            color: MINT_GREEN,
                                        }}
                                    />
                                    <Text strong style={{ fontSize: "11px" }}>
                                        Booking Information
                                    </Text>
                                </Space>
                            </div>
                            <div style={{ padding: "6px 12px" }}>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "2px 12px",
                                    }}
                                >
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Room Type
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {selectedRoom.room_type}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Rate Plan
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {selectedRoom.rate_plan}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Guests
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {guests.primary}
                                            </Text>
                                            {guests.secondary && (
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: "9px",
                                                        display: "block",
                                                    }}
                                                >
                                                    {guests.secondary}
                                                </Text>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Nights
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {selectedRoom.nights} Night
                                                {selectedRoom.nights > 1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Check-in
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {selectedRoom.dates.split(
                                                    " - ",
                                                )[0] || selectedRoom.dates}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Check-out
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {selectedRoom.dates.split(
                                                    " - ",
                                                )[1] || selectedRoom.dates}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                border: `1px solid ${isRoomRefunded ? "#ffccc7" : BORDER}`,
                                borderRadius: "8px",
                                overflow: "hidden",
                                position: "relative",
                                flex: 1,
                            }}
                        >
                            {isRoomRefunded && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform:
                                            "translate(-50%, -50%) rotate(-18deg)",
                                        zIndex: 10,
                                        pointerEvents: "none",
                                        border: "3px double #d9363e",
                                        color: "#d9363e",
                                        padding: "2px 14px",
                                        borderRadius: 4,
                                        fontSize: 18,
                                        fontWeight: 900,
                                        letterSpacing: 2,
                                        opacity: 0.2,
                                        background: "rgba(255,255,255,0.1)",
                                        textTransform: "uppercase",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    REFUNDED
                                </div>
                            )}

                            <div
                                style={{
                                    background: isRoomRefunded
                                        ? "#fff1f0"
                                        : "#fafbfc",
                                    padding: "4px 12px",
                                    borderBottom: `1px solid ${isRoomRefunded ? "#ffccc7" : BORDER}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Space size={4}>
                                    <BankOutlined
                                        style={{
                                            fontSize: "11px",
                                            color: isRoomRefunded
                                                ? "#ff4d4f"
                                                : MINT_GREEN,
                                        }}
                                    />
                                    <Text
                                        strong
                                        style={{
                                            fontSize: "11px",
                                            color: isRoomRefunded
                                                ? "#ff4d4f"
                                                : INK,
                                        }}
                                    >
                                        Payment Information
                                    </Text>
                                </Space>
                                {isRoomRefunded && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: "#ff4d4f",
                                            color: "white",
                                            borderRadius: "50%",
                                            width: 28,
                                            height: 28,
                                            fontSize: "7px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            boxShadow:
                                                "0 2px 8px rgba(255, 77, 79, 0.3)",
                                        }}
                                    >
                                        REFUNDED
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: "6px 12px" }}>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "2px 12px",
                                    }}
                                >
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Rate (per night)
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: "12px",
                                                    color: isRoomRefunded
                                                        ? "#8c8c8c"
                                                        : MINT_GREEN,
                                                }}
                                            >
                                                ₱
                                                {selectedRoom.rate.toLocaleString()}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Total Amount
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: "12px",
                                                    color: isRoomRefunded
                                                        ? "#8c8c8c"
                                                        : MINT_GREEN,
                                                }}
                                            >
                                                ₱{roomTotal.toLocaleString()}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Payment Method
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {booking.payment_method}
                                            </Text>
                                        </div>
                                    </div>
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Payment Status
                                        </Text>
                                        <div>
                                            <Tag
                                                style={{
                                                    fontSize: "8px",
                                                    borderRadius: "4px",
                                                    padding: "1px 8px",
                                                    border: "none",
                                                    background: roomPaymentBg,
                                                    color: roomPaymentColor,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {roomPaymentStatus}
                                            </Tag>
                                        </div>
                                    </div>
                                    {isRoomRefunded && refundAmount > 0 && (
                                        <>
                                            <div>
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: "8px",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.3px",
                                                    }}
                                                >
                                                    Refund Amount
                                                </Text>
                                                <div>
                                                    <Text
                                                        strong
                                                        style={{
                                                            color: "#ff4d4f",
                                                            fontSize: "12px",
                                                        }}
                                                    >
                                                        -₱
                                                        {refundAmount.toLocaleString()}
                                                    </Text>
                                                </div>
                                            </div>
                                            <div>
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: "8px",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.3px",
                                                    }}
                                                >
                                                    Net Amount
                                                </Text>
                                                <div>
                                                    <Text
                                                        strong
                                                        style={{
                                                            color: MINT_GREEN,
                                                            fontSize: "12px",
                                                        }}
                                                    >
                                                        ₱
                                                        {(
                                                            roomTotal -
                                                            refundAmount
                                                        ).toLocaleString()}
                                                    </Text>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Stay Adjustments section */}
                {(selectedRoom.is_extended ||
                    selectedRoom.is_early_checkin ||
                    selectedRoom.is_late_checkout ||
                    selectedRoom.checkout_status === "overdue" ||
                    selectedRoom.expected_checkout_at ||
                    selectedRoom.status === "CHECKED OUT") && (
                    <div
                        style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: "8px",
                            overflow: "hidden",
                            marginTop: 12,
                        }}
                    >
                        <div
                            style={{
                                background: "#fafbfc",
                                padding: "4px 12px",
                                borderBottom: `1px solid ${BORDER}`,
                            }}
                        >
                            <Space size={4}>
                                <ClockCircleOutlined
                                    style={{
                                        fontSize: "11px",
                                        color: MINT_GREEN,
                                    }}
                                />
                                <Text strong style={{ fontSize: "11px" }}>
                                    Stay Adjustments
                                </Text>
                            </Space>
                        </div>
                        <div style={{ padding: "6px 12px" }}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "2px 12px",
                                }}
                            >
                                {selectedRoom.is_extended && (
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Extended
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: "11px",
                                                    color: "#faad14",
                                                }}
                                            >
                                                Yes
                                            </Text>
                                        </div>
                                    </div>
                                )}
                                {selectedRoom.is_early_checkin && (
                                    <>
                                        <div>
                                            <Text
                                                type="secondary"
                                                style={{
                                                    fontSize: "8px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.3px",
                                                }}
                                            >
                                                Early Check-in
                                            </Text>
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#13c2c2",
                                                    }}
                                                >
                                                    Yes
                                                </Text>
                                            </div>
                                        </div>
                                        <div>
                                            <Text
                                                type="secondary"
                                                style={{
                                                    fontSize: "8px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.3px",
                                                }}
                                            >
                                                Early Check-in Fee
                                            </Text>
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#13c2c2",
                                                    }}
                                                >
                                                    ₱
                                                    {Number(
                                                        selectedRoom.early_checkin_fee ??
                                                            0,
                                                    ).toLocaleString()}
                                                </Text>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {selectedRoom.is_late_checkout && (
                                    <>
                                        <div>
                                            <Text
                                                type="secondary"
                                                style={{
                                                    fontSize: "8px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.3px",
                                                }}
                                            >
                                                Late Checkout
                                            </Text>
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#fa541c",
                                                    }}
                                                >
                                                    Yes
                                                </Text>
                                            </div>
                                        </div>
                                        <div>
                                            <Text
                                                type="secondary"
                                                style={{
                                                    fontSize: "8px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.3px",
                                                }}
                                            >
                                                Late Checkout Fee
                                            </Text>
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#fa541c",
                                                    }}
                                                >
                                                    ₱
                                                    {Number(
                                                        selectedRoom.late_checkout_fee ??
                                                            0,
                                                    ).toLocaleString()}
                                                </Text>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {selectedRoom.checkout_status && (
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Checkout Status
                                        </Text>
                                        <div>
                                            <Tag
                                                color={
                                                    selectedRoom.checkout_status ===
                                                    "overdue"
                                                        ? "red"
                                                        : "green"
                                                }
                                                style={{
                                                    fontSize: "8px",
                                                    borderRadius: "4px",
                                                    padding: "0 8px",
                                                }}
                                            >
                                                {selectedRoom.checkout_status.toUpperCase()}
                                            </Tag>
                                        </div>
                                    </div>
                                )}
                                {selectedRoom.expected_checkout_at && (
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Expected Checkout
                                        </Text>
                                        <div>
                                            <Text
                                                strong
                                                style={{ fontSize: "11px" }}
                                            >
                                                {formatDateTime(
                                                    selectedRoom.expected_checkout_at,
                                                )}
                                            </Text>
                                        </div>
                                    </div>
                                )}
                                {selectedRoom.status === "CHECKED OUT" && (
                                    <div>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: "8px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            Key Returned
                                        </Text>
                                        <div>
                                            <Tag
                                                color={
                                                    selectedRoom.key_returned
                                                        ? "green"
                                                        : "red"
                                                }
                                                style={{
                                                    fontSize: "8px",
                                                    borderRadius: "4px",
                                                    padding: "0 8px",
                                                }}
                                            >
                                                {selectedRoom.key_returned
                                                    ? "YES"
                                                    : "NO"}
                                            </Tag>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Per-room Add-ons section */}
                {selectedRoom.add_ons && selectedRoom.add_ons.length > 0 && (
                    <div
                        style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: "8px",
                            overflow: "hidden",
                            marginTop: 12,
                        }}
                    >
                        <div
                            style={{
                                background: "#fafbfc",
                                padding: "4px 12px",
                                borderBottom: `1px solid ${BORDER}`,
                            }}
                        >
                            <Space size={4}>
                                <GiftOutlined
                                    style={{
                                        fontSize: "11px",
                                        color: MINT_GREEN,
                                    }}
                                />
                                <Text strong style={{ fontSize: "11px" }}>
                                    Room Add-ons
                                </Text>
                            </Space>
                        </div>
                        <div style={{ padding: "6px 12px" }}>
                            {selectedRoom.add_ons.map((addon) => (
                                <div
                                    key={addon.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "4px 0",
                                        borderBottom: "1px solid #f1f5f9",
                                    }}
                                >
                                    <Text style={{ fontSize: "11px" }}>
                                        {addon.name} × {addon.quantity}
                                    </Text>
                                    <Text
                                        strong
                                        style={{
                                            fontSize: "11px",
                                            color: MINT_GREEN,
                                        }}
                                    >
                                        ₱{addon.subtotal.toLocaleString()}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        );
    };

    return (
        <div
            style={{
                background: "#f8fafc",
                minHeight: "100vh",
                padding: "20px 24px 40px",
            }}
        >
            {/* Page Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 18,
                }}
            >
                <div>
                    <Title
                        level={3}
                        style={{
                            margin: 0,
                            fontSize: "26px",
                            fontWeight: 700,
                            color: INK,
                        }}
                    >
                        Booking Details
                    </Title>
                    <div
                        style={{
                            marginTop: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Text strong style={{ fontSize: "13.5px", color: INK }}>
                            Reference: {booking.reference}
                        </Text>
                        <Button
                            type="text"
                            size="small"
                            icon={
                                <CopyOutlined
                                    style={{
                                        fontSize: "12px",
                                        color: "#94a3b8",
                                    }}
                                />
                            }
                            onClick={() => copyToClipboard(booking.reference)}
                            style={{ padding: "2px 4px", height: "auto" }}
                        />
                    </div>
                    <Text type="secondary" style={{ fontSize: "12.5px" }}>
                        Booked on {booking.booked_on}
                    </Text>
                </div>

                <Space size={10}>
                    <Button
                        icon={<LeftOutlined style={{ fontSize: "11px" }} />}
                        onClick={() => navigate(-1)}
                        style={{ borderRadius: "8px", fontSize: "13px" }}
                    >
                        Back
                    </Button>
                    <Button
                        icon={<PrinterOutlined />}
                        onClick={() => window.print()}
                        style={{ borderRadius: "8px", fontSize: "13px" }}
                    >
                        Print
                    </Button>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => onAction && onAction("edit")}
                        style={{
                            borderRadius: "8px",
                            fontSize: "13px",
                            background: MINT_GREEN,
                            borderColor: MINT_GREEN,
                        }}
                    >
                        Edit Booking
                    </Button>
                    <Dropdown menu={getActionMenu()} trigger={["click"]}>
                        <Button
                            icon={<MoreOutlined />}
                            style={{ borderRadius: "8px", fontSize: "13px" }}
                        >
                            More
                        </Button>
                    </Dropdown>
                </Space>
            </div>

            {/* Overdue banner */}
            {(booking.overdue_since || overdueDays > 0) && (
                <Alert
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    message={
                        <div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: "13px",
                                }}
                            >
                                Guest is Overdue
                            </div>

                            <div
                                style={{
                                    fontSize: "20px",
                                    fontWeight: 700,
                                    marginTop: 4,
                                    letterSpacing: "1px",
                                }}
                            >
                                {overdueTimer}
                            </div>
                        </div>
                    }
                    description={
                        <>
                            {overdueDays > 0
                                ? `Overdue by ${overdueDays} day${
                                      overdueDays > 1 ? "s" : ""
                                  }`
                                : "Guest has exceeded the expected checkout date."}
                            {(booking.overdue_rooms_count ?? 0) > 1 && (
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: "11px",
                                        fontWeight: 600,
                                    }}
                                >
                                    {booking.overdue_rooms_count} rooms are
                                    overdue
                                </div>
                            )}
                        </>
                    }
                    style={{
                        marginBottom: 18,
                        borderRadius: "10px",
                        fontSize: "12px",
                    }}
                />
            )}

            {/* Guest / Stay / Total summary bar */}
            <Card
                size="small"
                style={{
                    borderRadius: "12px",
                    border: `1px solid ${BORDER}`,
                    background: "white",
                    marginBottom: 18,
                    position: "relative",
                    overflow: "hidden",
                }}
                styles={{
                    body: {
                        padding: "18px 22px",
                        position: "relative",
                        zIndex: 1,
                    },
                }}
            >
                <img
                    src={bookingWatermark}
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        right: "-20px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        height: "220px",
                        width: "auto",
                        opacity: 0.12,
                        pointerEvents: "none",
                        zIndex: 0,
                    }}
                />

                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 28,
                        flexWrap: "wrap",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            minWidth: 200,
                        }}
                    >
                        <Avatar
                            style={{
                                backgroundColor: MINT_GREEN_BG,
                                color: MINT_GREEN,
                                fontSize: "18px",
                            }}
                            size={44}
                            icon={<UserOutlined />}
                        />
                        <div>
                            <Label>Guest</Label>
                            <div>
                                <Text
                                    strong
                                    style={{ fontSize: "14px", color: INK }}
                                >
                                    {booking.guest_name}
                                </Text>
                            </div>
                            <Text style={{ fontSize: "12px", color: SLATE }}>
                                {booking.guest_phone}
                            </Text>
                        </div>
                    </div>

                    <div>
                        <Label>Stay Type</Label>
                        <div style={{ marginTop: 6 }}>
                            <Tag
                                style={{
                                    background: MINT_GREEN_BG,
                                    color: MINT_GREEN,
                                    border: "none",
                                    borderRadius: "999px",
                                    padding: "1px 12px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                }}
                            >
                                {booking.stay_type}
                            </Tag>
                        </div>
                    </div>

                    <div>
                        <Label>Check-in</Label>
                        <div style={{ marginTop: 4 }}>
                            <Text
                                strong
                                style={{ fontSize: "13.5px", color: INK }}
                            >
                                {booking.check_in_date}
                            </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                            {booking.check_in_time}
                        </Text>
                    </div>

                    <div>
                        <Label>Check-out</Label>
                        <div style={{ marginTop: 4 }}>
                            <Text
                                strong
                                style={{ fontSize: "13.5px", color: INK }}
                            >
                                {booking.check_out_date}
                            </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                            {booking.check_out_time}
                        </Text>
                    </div>

                    <div>
                        <Label>Rooms</Label>
                        <div style={{ marginTop: 4 }}>
                            <Text
                                strong
                                style={{ fontSize: "13.5px", color: INK }}
                            >
                                {booking.total_rooms}
                            </Text>
                        </div>
                    </div>

                    <div>
                        <Label>Total Amount</Label>
                        <div style={{ marginTop: 4 }}>
                            <Text
                                strong
                                style={{
                                    fontSize: "20px",
                                    color: MINT_GREEN,
                                    fontWeight: 700,
                                }}
                            >
                                ₱{booking.total_amount.toLocaleString()}
                            </Text>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: `1px solid ${BORDER}`,
                        display: "flex",
                        gap: 40,
                        flexWrap: "wrap",
                    }}
                >
                    {booking.booking_type && (
                        <div>
                            <Label>Type</Label>
                            <div style={{ marginTop: 5 }}>
                                <Tag
                                    color={
                                        booking.booking_type === "online"
                                            ? "blue"
                                            : "green"
                                    }
                                    style={{
                                        fontSize: "11.5px",
                                        borderRadius: "6px",
                                        padding: "1px 10px",
                                    }}
                                >
                                    {booking.booking_type === "online"
                                        ? "Online"
                                        : "Walk-in"}
                                </Tag>
                            </div>
                        </div>
                    )}
                    {booking.guest_address && (
                        <div>
                            <Label>
                                <EnvironmentOutlined
                                    style={{ marginRight: 4 }}
                                />
                                Address
                            </Label>
                            <div style={{ marginTop: 5 }}>
                                <Text style={{ fontSize: "13px", color: INK }}>
                                    {booking.guest_address}
                                </Text>
                            </div>
                        </div>
                    )}
                    {booking.guest_email && (
                        <div>
                            <Label>
                                <MailOutlined style={{ marginRight: 4 }} />
                                Email
                            </Label>
                            <div style={{ marginTop: 5 }}>
                                <Text style={{ fontSize: "13px", color: INK }}>
                                    {booking.guest_email}
                                </Text>
                            </div>
                        </div>
                    )}
                    {booking.guest_id && (
                        <div>
                            <Label>
                                <IdcardOutlined style={{ marginRight: 4 }} />
                                ID
                            </Label>
                            <div style={{ marginTop: 5 }}>
                                <Text style={{ fontSize: "13px", color: INK }}>
                                    {booking.guest_id}
                                </Text>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Rooms (left) + Payment Summary (right) */}
            <Row gutter={[18, 18]} align="stretch">
                <Col xs={24} lg={16}>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            gap: 18,
                        }}
                    >
                        <SectionCard
                            title={`Rooms (${booking.total_rooms})`}
                            icon={
                                <HomeOutlined
                                    style={{
                                        fontSize: "13.5px",
                                        color: MINT_GREEN,
                                    }}
                                />
                            }
                            extra={
                                <Button
                                    size="small"
                                    icon={
                                        <PlusOutlined
                                            style={{ fontSize: "10px" }}
                                        />
                                    }
                                    style={{
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        color: MINT_GREEN,
                                        borderColor: MINT_GREEN,
                                    }}
                                >
                                    Add Room
                                </Button>
                            }
                            bodyPadding="0"
                            headerPadding="16px 16px 0 16px"
                            style={{
                                height: "auto",
                                flex: addOns.length > 0 ? "0 0 auto" : 1,
                            }}
                        >
                            {/* Header — Type & Rate removed */}
                            <div
                                className="room-row-grid"
                                style={{
                                    padding: "14px 16px 10px",
                                    marginTop: 12,
                                    background: "#fafbfc",
                                    borderTop: `1px solid ${BORDER}`,
                                    borderBottom: `1.5px solid ${BORDER}`,
                                }}
                            >
                                <Text className="room-col-header">Room</Text>
                                <Text className="room-col-header">Nights</Text>
                                <Text className="room-col-header">Guests</Text>
                                <Text className="room-col-header">
                                    Expected Checkout
                                </Text>
                                <Text className="room-col-header">Amount</Text>
                                <span />
                            </div>

                            {booking.rooms.map((room, index) => {
                                const guests = splitGuests(room.guests);
                                const isRoomRefunded =
                                    room.is_refunded || false;
                                const isLastRoom =
                                    index === booking.rooms.length - 1;

                                return (
                                    <div
                                        key={room.id ?? index}
                                        className="room-row-grid"
                                        style={{
                                            padding: isLastRoom
                                                ? "12px 16px 16px"
                                                : "12px 16px",
                                            borderBottom: isLastRoom
                                                ? "none"
                                                : "1px solid #f1f5f9",
                                            alignItems: "center",
                                            background: isRoomRefunded
                                                ? "#fff1f0"
                                                : "transparent",
                                        }}
                                    >
                                        {/* Room cell */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 52,
                                                    height: 40,
                                                    borderRadius: "8px",
                                                    overflow: "hidden",
                                                    flexShrink: 0,
                                                    background: MINT_GREEN_BG,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {room.image_url ? (
                                                    <img
                                                        src={room.image_url}
                                                        alt={room.room_number}
                                                        style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                        }}
                                                    />
                                                ) : (
                                                    <HomeOutlined
                                                        style={{
                                                            fontSize: "16px",
                                                            color: MINT_GREEN,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <Space size={6} align="center">
                                                    <Text
                                                        strong
                                                        style={{
                                                            fontSize: "13px",
                                                            color: INK,
                                                        }}
                                                    >
                                                        {room.room_number}
                                                    </Text>
                                                    {!isRoomRefunded && (
                                                        <Tag
                                                            style={{
                                                                fontSize: "9px",
                                                                borderRadius:
                                                                    "999px",
                                                                border: "none",
                                                                padding:
                                                                    "0 8px",
                                                                background:
                                                                    getStatusBg(
                                                                        room.status,
                                                                    ),
                                                                color: getStatusColor(
                                                                    room.status,
                                                                ),
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {room.status}
                                                        </Tag>
                                                    )}
                                                    {isRoomRefunded && (
                                                        <Tag
                                                            color="red"
                                                            style={{
                                                                fontSize: "8px",
                                                                borderRadius:
                                                                    "4px",
                                                                padding:
                                                                    "0 6px",
                                                            }}
                                                        >
                                                            REFUNDED
                                                        </Tag>
                                                    )}
                                                    {room.is_extended && (
                                                        <Tag
                                                            color="gold"
                                                            style={{
                                                                fontSize: "8px",
                                                                borderRadius:
                                                                    "4px",
                                                                padding:
                                                                    "0 6px",
                                                            }}
                                                        >
                                                            EXTENDED
                                                        </Tag>
                                                    )}
                                                    {room.is_early_checkin && (
                                                        <Tag
                                                            color="cyan"
                                                            style={{
                                                                fontSize: "8px",
                                                                borderRadius:
                                                                    "4px",
                                                                padding:
                                                                    "0 6px",
                                                            }}
                                                        >
                                                            EARLY
                                                        </Tag>
                                                    )}
                                                </Space>
                                                <div style={{ marginTop: 2 }}>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: "11px",
                                                        }}
                                                    >
                                                        {room.room_type}
                                                    </Text>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nights cell */}
                                        <Text
                                            style={{
                                                fontSize: "12px",
                                                color: INK,
                                            }}
                                        >
                                            {room.nights} Night
                                            {room.nights > 1 ? "s" : ""}
                                        </Text>

                                        {/* Guests cell */}
                                        <Text
                                            style={{
                                                fontSize: "12px",
                                                color: INK,
                                            }}
                                        >
                                            {guests.primary}
                                        </Text>

                                        {/* Expected Checkout cell */}
                                        <div>
                                            {room.expected_checkout_at ? (
                                                <>
                                                    <Text
                                                        strong
                                                        style={{
                                                            fontSize: "11px",
                                                            color:
                                                                room.checkout_status ===
                                                                "overdue"
                                                                    ? "#ff4d4f"
                                                                    : INK,
                                                        }}
                                                    >
                                                        {new Date(
                                                            room.expected_checkout_at,
                                                        ).toLocaleDateString(
                                                            "en-PH",
                                                            {
                                                                month: "short",
                                                                day: "numeric",
                                                            },
                                                        )}
                                                    </Text>
                                                    <br />
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: "10px",
                                                        }}
                                                    >
                                                        {new Date(
                                                            room.expected_checkout_at,
                                                        ).toLocaleTimeString(
                                                            "en-PH",
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            },
                                                        )}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: "11px" }}
                                                >
                                                    —
                                                </Text>
                                            )}
                                        </div>

                                        {/* Amount cell */}
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "13px",
                                                color: isRoomRefunded
                                                    ? "#8c8c8c"
                                                    : MINT_GREEN,
                                            }}
                                        >
                                            ₱
                                            {(
                                                room.rate * room.nights
                                            ).toLocaleString()}
                                        </Text>

                                        {/* Actions cell */}
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ textAlign: "right" }}
                                        >
                                            <Dropdown
                                                menu={getRoomActionMenu(room)}
                                                trigger={["click"]}
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<MoreOutlined />}
                                                    style={{ fontSize: "14px" }}
                                                />
                                            </Dropdown>
                                        </div>
                                    </div>
                                );
                            })}
                        </SectionCard>

                        {addOns.length > 0 && (
                            <SectionCard
                                title="Add-ons"
                                icon={
                                    <GiftOutlined
                                        style={{
                                            fontSize: "13.5px",
                                            color: MINT_GREEN,
                                        }}
                                    />
                                }
                                bodyPadding="0"
                                headerPadding="16px 16px 0 16px"
                                style={{ height: "auto", flex: 1 }}
                            >
                                <div
                                    className="addon-row-grid"
                                    style={{
                                        padding: "14px 16px 10px",
                                        marginTop: 12,
                                        background: "#fafbfc",
                                        borderTop: `1px solid ${BORDER}`,
                                        borderBottom: `1.5px solid ${BORDER}`,
                                    }}
                                >
                                    <Text className="room-col-header">
                                        Item
                                    </Text>
                                    <Text className="room-col-header">
                                        Price
                                    </Text>
                                    <Text className="room-col-header">Qty</Text>
                                    <Text className="room-col-header">
                                        Subtotal
                                    </Text>
                                </div>

                                {addOns.map((addon, index) => {
                                    const isLastAddon =
                                        index === addOns.length - 1;
                                    return (
                                        <div
                                            key={addon.id}
                                            className="addon-row-grid"
                                            style={{
                                                padding: isLastAddon
                                                    ? "12px 16px 16px"
                                                    : "12px 16px",
                                                borderBottom: isLastAddon
                                                    ? "none"
                                                    : "1px solid #f1f5f9",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: "12.5px",
                                                    color: INK,
                                                }}
                                            >
                                                {addon.name}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: "12px",
                                                    color: INK,
                                                }}
                                            >
                                                ₱{addon.price.toLocaleString()}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: "12px",
                                                    color: INK,
                                                }}
                                            >
                                                × {addon.quantity}
                                            </Text>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: "13px",
                                                    color: MINT_GREEN,
                                                }}
                                            >
                                                ₱
                                                {addon.subtotal.toLocaleString()}
                                            </Text>
                                        </div>
                                    );
                                })}
                            </SectionCard>
                        )}
                    </div>
                </Col>

                <Col xs={24} lg={8}>
                    <SectionCard
                        title="Payment Summary"
                        icon={
                            <BankOutlined
                                style={{
                                    fontSize: "13.5px",
                                    color: MINT_GREEN,
                                }}
                            />
                        }
                    >
                        <Row gutter={[16, 18]}>
                            <Col span={12}>
                                <Label>Method</Label>
                                <div style={{ marginTop: 6 }}>
                                    <Text
                                        strong
                                        style={{ fontSize: "13px", color: INK }}
                                    >
                                        {booking.payment_method}
                                    </Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <Label>Status</Label>
                                <div style={{ marginTop: 6 }}>
                                    <Tag
                                        style={{
                                            fontSize: "10px",
                                            borderRadius: "4px",
                                            padding: "1px 10px",
                                            border: "none",
                                            background: getStatusBg(
                                                booking.payment_status ===
                                                    "PAID"
                                                    ? "CONFIRMED"
                                                    : booking.payment_status,
                                            ),
                                            color: getPaymentStatusColor(
                                                booking.payment_status,
                                            ),
                                            fontWeight: 600,
                                        }}
                                    >
                                        {booking.payment_status}
                                    </Tag>
                                </div>
                            </Col>

                            {booking.paid_on && (
                                <Col span={12}>
                                    <Label>
                                        {isRefunded ? "Refund Date" : "Paid On"}
                                    </Label>
                                    <div style={{ marginTop: 6 }}>
                                        <Text
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            {booking.paid_on}
                                        </Text>
                                    </div>
                                </Col>
                            )}
                            <Col span={12}>
                                <Label>
                                    {isRefunded ? "Refund Amount" : "Amount"}
                                </Label>
                                <div style={{ marginTop: 6 }}>
                                    <Text
                                        strong
                                        style={{
                                            fontSize: "14px",
                                            color: isRefunded
                                                ? "#cf1322"
                                                : MINT_GREEN,
                                            fontWeight: 700,
                                        }}
                                    >
                                        ₱{booking.amount_paid.toLocaleString()}
                                    </Text>
                                </div>
                            </Col>

                            {isRefunded && booking.refunded_by ? (
                                <Col span={24}>
                                    <Label>Refunded By</Label>
                                    <div style={{ marginTop: 6 }}>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            {booking.refunded_by.name}
                                            {booking.refunded_by.role && (
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: "10.5px",
                                                        marginLeft: 4,
                                                    }}
                                                >
                                                    ({booking.refunded_by.role})
                                                </Text>
                                            )}
                                        </Text>
                                    </div>
                                </Col>
                            ) : booking.payment_received_by ? (
                                <Col span={24}>
                                    <Label>Received By</Label>
                                    <div style={{ marginTop: 6 }}>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            {booking.payment_received_by.name}
                                            {booking.payment_received_by
                                                .role && (
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: "10.5px",
                                                        marginLeft: 4,
                                                    }}
                                                >
                                                    (
                                                    {
                                                        booking
                                                            .payment_received_by
                                                            .role
                                                    }
                                                    )
                                                </Text>
                                            )}
                                        </Text>
                                    </div>
                                </Col>
                            ) : null}

                            {/* Shift Info */}
                            {booking.shift_name && (
                                <Col span={24}>
                                    <Label>Shift</Label>
                                    <div style={{ marginTop: 6 }}>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            {booking.shift_name}
                                            {booking.shift_start &&
                                                booking.shift_end && (
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: "10.5px",
                                                            marginLeft: 4,
                                                        }}
                                                    >
                                                        ({booking.shift_start} –{" "}
                                                        {booking.shift_end})
                                                    </Text>
                                                )}
                                        </Text>
                                    </div>
                                </Col>
                            )}

                            {showsPaymentReference && (
                                <Col span={24}>
                                    <Label>Reference No.</Label>
                                    <div
                                        style={{
                                            marginTop: 6,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            {booking.payment_reference}
                                        </Text>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={
                                                <CopyOutlined
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#94a3b8",
                                                    }}
                                                />
                                            }
                                            onClick={() =>
                                                copyToClipboard(
                                                    booking.payment_reference ||
                                                        "",
                                                )
                                            }
                                            style={{
                                                padding: "2px 4px",
                                                height: "auto",
                                            }}
                                        />
                                    </div>
                                </Col>
                            )}
                            {booking.receipt_number && (
                                <Col span={24}>
                                    <Label>Receipt No.</Label>
                                    <div style={{ marginTop: 6 }}>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            {booking.receipt_number}
                                        </Text>
                                    </div>
                                </Col>
                            )}
                        </Row>

                        <Divider style={{ margin: "16px 0 12px" }} />

                        <div>
                            <Label>Breakdown</Label>
                            <div style={{ marginTop: 10 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: "12.5px" }}
                                    >
                                        Room Charges
                                    </Text>
                                    <Text style={{ fontSize: "12.5px" }}>
                                        ₱
                                        {(
                                            roomCharges -
                                            totalEarlyCheckinFee -
                                            totalLateCheckoutFee
                                        ).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </Text>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: "12.5px" }}
                                    >
                                        Add-ons
                                    </Text>
                                    <Text style={{ fontSize: "12.5px" }}>
                                        ₱
                                        {addOnTotal.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </Text>
                                </div>

                                {/* Early Check-in Fee */}
                                {totalEarlyCheckinFee > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: "12.5px" }}
                                        >
                                            Early Check-in Fee
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: "12.5px",
                                                color: "#13c2c2",
                                            }}
                                        >
                                            ₱
                                            {totalEarlyCheckinFee.toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </Text>
                                    </div>
                                )}

                                {/* Late Checkout Fee */}
                                {totalLateCheckoutFee > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: "12.5px" }}
                                        >
                                            Late Checkout Fee
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: "12.5px",
                                                color: "#fa541c",
                                            }}
                                        >
                                            ₱
                                            {totalLateCheckoutFee.toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </Text>
                                    </div>
                                )}

                                {/* Extension Fee */}
                                {totalExtensionFee > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: "12.5px" }}
                                        >
                                            Extension Fee
                                            {booking.extended_rooms_count
                                                ? ` (${booking.extended_rooms_count} room${booking.extended_rooms_count > 1 ? "s" : ""})`
                                                : ""}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: "12.5px",
                                                color: "#faad14",
                                            }}
                                        >
                                            ₱
                                            {totalExtensionFee.toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </Text>
                                    </div>
                                )}

                                {totalRefundAmount > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                            paddingTop: 4,
                                            borderTop: "1px dashed #f0f0f0",
                                        }}
                                    >
                                        <Text
                                            type="danger"
                                            style={{ fontSize: "12.5px" }}
                                        >
                                            Refund Amount
                                        </Text>
                                        <Text
                                            type="danger"
                                            strong
                                            style={{ fontSize: "12.5px" }}
                                        >
                                            -₱
                                            {totalRefundAmount.toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </Text>
                                    </div>
                                )}

                                {booking.is_extended && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: "12.5px" }}
                                        >
                                            Extended Stay
                                        </Text>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: MINT_GREEN,
                                            }}
                                        >
                                            Yes
                                        </Text>
                                    </div>
                                )}

                                {totalRefundAmount > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 4,
                                            paddingTop: 4,
                                            borderTop: "1px dashed #f0f0f0",
                                        }}
                                    >
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: INK,
                                            }}
                                        >
                                            Net Amount
                                        </Text>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "13px",
                                                color: MINT_GREEN,
                                                fontWeight: 700,
                                            }}
                                        >
                                            ₱
                                            {netAmount.toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </Text>
                                    </div>
                                )}

                                <Divider style={{ margin: "10px 0" }} />
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Text
                                        strong
                                        style={{
                                            fontSize: "13.5px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Total
                                    </Text>
                                    <Text
                                        strong
                                        style={{
                                            fontSize: "17px",
                                            color: MINT_GREEN,
                                            fontWeight: 700,
                                        }}
                                    >
                                        ₱
                                        {booking.total_amount.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            },
                                        )}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </Col>
            </Row>

            {/* Notes | Staff | Timeline */}
            <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
                <Col xs={24} md={8}>
                    <SectionCard
                        title="Notes"
                        icon={
                            <TagOutlined
                                style={{
                                    fontSize: "13.5px",
                                    color: MINT_GREEN,
                                }}
                            />
                        }
                        extra={
                            <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                style={{ fontSize: "11.5px" }}
                            >
                                Add Note
                            </Button>
                        }
                    >
                        <Text style={{ fontSize: "12.5px", color: SLATE }}>
                            {booking.notes ||
                                "No special requests or notes for this booking."}
                        </Text>
                    </SectionCard>
                </Col>

                <Col xs={24} md={8}>
                    <SectionCard
                        title="Staff"
                        icon={
                            <UserOutlined
                                style={{
                                    fontSize: "13.5px",
                                    color: MINT_GREEN,
                                }}
                            />
                        }
                    >
                        {staffAttribution.length > 0 ? (
                            staffAttribution.map((entry, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        padding: "7px 0",
                                        borderBottom:
                                            index ===
                                            staffAttribution.length - 1
                                                ? "none"
                                                : "1px solid #f1f5f9",
                                    }}
                                >
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                    >
                                        {entry.label}
                                    </Text>
                                    <div style={{ textAlign: "right" }}>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: "12.5px",
                                                color: entry.is_override
                                                    ? "#ff4d4f"
                                                    : INK,
                                            }}
                                        >
                                            {entry.name}
                                            {entry.role && (
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: "10.5px",
                                                        marginLeft: 4,
                                                    }}
                                                >
                                                    ({entry.role})
                                                </Text>
                                            )}
                                            {entry.is_override && (
                                                <Tag
                                                    color="red"
                                                    style={{
                                                        fontSize: "8px",
                                                        marginLeft: 6,
                                                        borderRadius: "4px",
                                                        padding: "0 6px",
                                                    }}
                                                >
                                                    OVERRIDE
                                                </Tag>
                                            )}
                                        </Text>
                                        {entry.is_override &&
                                            entry.override_reason && (
                                                <div>
                                                    <Text
                                                        type="danger"
                                                        style={{
                                                            fontSize: "9.5px",
                                                        }}
                                                    >
                                                        Reason:{" "}
                                                        {entry.override_reason}
                                                    </Text>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div>
                                <Text
                                    type="secondary"
                                    style={{ fontSize: "12px" }}
                                >
                                    Handled by
                                </Text>
                                <div style={{ marginTop: 4 }}>
                                    <Text
                                        strong
                                        style={{ fontSize: "13px", color: INK }}
                                    >
                                        —
                                    </Text>
                                </div>
                            </div>
                        )}
                    </SectionCard>
                </Col>

                <Col xs={24} md={8}>
                    <SectionCard
                        title="Timeline"
                        icon={
                            <HistoryOutlined
                                style={{
                                    fontSize: "13.5px",
                                    color: MINT_GREEN,
                                }}
                            />
                        }
                    >
                        {booking.timeline.length > 0 ? (
                            <Timeline
                                items={booking.timeline.map((item, index) => {
                                    let color = "blue";
                                    if (item.is_override) {
                                        color = "red";
                                    } else if (item.status === "completed") {
                                        color = MINT_GREEN;
                                    } else if (
                                        item.new_status === "CHECKED IN"
                                    ) {
                                        color = "#1890ff";
                                    } else if (
                                        item.new_status === "CONFIRMED"
                                    ) {
                                        color = MINT_GREEN;
                                    } else if (item.new_status === "PENDING") {
                                        color = "#faad14";
                                    } else if (
                                        item.new_status === "CANCELLED" ||
                                        item.new_status === "REFUNDED"
                                    ) {
                                        color = "red";
                                    } else if (item.new_status === "ARCHIVED") {
                                        color = "#faad14";
                                    }

                                    return {
                                        key: index,
                                        color: color,
                                        children: (
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: "12.5px",
                                                        color: item.is_override
                                                            ? "#ff4d4f"
                                                            : INK,
                                                    }}
                                                >
                                                    {item.title}
                                                </Text>

                                                {item.description && (
                                                    <>
                                                        <br />
                                                        <Text
                                                            type="secondary"
                                                            style={{
                                                                fontSize:
                                                                    "10.5px",
                                                                background:
                                                                    item.is_override
                                                                        ? "#fff1f0"
                                                                        : "#f1f5f9",
                                                                padding:
                                                                    "1px 8px",
                                                                borderRadius:
                                                                    "4px",
                                                                display:
                                                                    "inline-block",
                                                                marginTop: 2,
                                                                color: item.is_override
                                                                    ? "#ff4d4f"
                                                                    : "#64748b",
                                                            }}
                                                        >
                                                            {item.description}
                                                        </Text>
                                                    </>
                                                )}

                                                {item.is_override &&
                                                    item.override_reason && (
                                                        <>
                                                            <br />
                                                            <Text
                                                                type="danger"
                                                                style={{
                                                                    fontSize:
                                                                        "10.5px",
                                                                }}
                                                            >
                                                                ⚠️ Override:{" "}
                                                                {
                                                                    item.override_reason
                                                                }
                                                            </Text>
                                                        </>
                                                    )}

                                                <br />
                                                <Text
                                                    style={{
                                                        fontSize: "11.5px",
                                                        color: SLATE,
                                                    }}
                                                >
                                                    {item.time}
                                                    {item.by &&
                                                        ` by ${item.by}`}
                                                    {item.by_role && (
                                                        <Text
                                                            type="secondary"
                                                            style={{
                                                                fontSize:
                                                                    "10px",
                                                                marginLeft: 4,
                                                            }}
                                                        >
                                                            ({item.by_role})
                                                        </Text>
                                                    )}
                                                </Text>
                                            </div>
                                        ),
                                    };
                                })}
                            />
                        ) : (
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                                No timeline entries available
                            </Text>
                        )}
                    </SectionCard>
                </Col>
            </Row>

            {/* Danger zone */}
            <div style={{ marginTop: 20 }}>
                <Button
                    danger
                    onClick={() => onAction && onAction("cancel")}
                    style={{ borderRadius: "8px", fontSize: "12.5px" }}
                >
                    Cancel Booking
                </Button>
            </div>

            {renderRoomDetailsModal()}

            <style>
                {`
                    /* ✅ 6 columns — Type & Rate removed, wider Amount */
                    .room-row-grid {
                        display: grid;
                        grid-template-columns:
                            minmax(260px, 3fr)     /* Room (image + badges + type) */
                            minmax(80px, 0.8fr)    /* Nights */
                            minmax(100px, 1fr)     /* Guests */
                            minmax(140px, 1.4fr)   /* Expected Checkout */
                            minmax(130px, 1.4fr)   /* Amount */
                            40px;                  /* Actions */
                        gap: 12px;
                        align-items: center;
                    }
                    .room-col-header {
                        font-size: 10.5px !important;
                        font-weight: 700 !important;
                        color: #475569 !important;
                        text-transform: uppercase;
                        letter-spacing: 0.4px;
                    }
                    .addon-row-grid {
                        display: grid;
                        grid-template-columns: 2fr 1fr 0.7fr 1fr;
                        gap: 10px;
                        align-items: center;
                    }
                    .ant-timeline-item-content {
                        font-size: 12px !important;
                    }
                    .ant-timeline-item-head {
                        width: 10px !important;
                        height: 10px !important;
                    }
                    @media (max-width: 900px) {
                        .room-row-grid {
                            grid-template-columns: minmax(180px, 1.6fr) 1fr 1fr 40px;
                        }
                        /* Hide Nights & Expected Checkout on mobile */
                        .room-row-grid > *:nth-child(2),
                        .room-row-grid > *:nth-child(4) {
                            display: none;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default BookingDetails;
