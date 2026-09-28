// src/pages/WalkIn.tsx
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Input,
    Button,
    Select,
    DatePicker,
    Typography,
    Row,
    Col,
    Divider,
    Tag,
    message,
    Modal,
    Empty,
    AutoComplete,
    App,
    Avatar,
    Progress,
} from "antd";
import {
    User,
    Phone,
    MapPin,
    Users,
    Plus,
    Trash2,
    CreditCard,
    Search,
    UserPlus,
    X,
    Gift,
    Minus,
    CheckCircle,
    Home,
    ChevronDown,
    ChevronRight,
    QrCode,
    AlertTriangle,
    Loader2,
    ArrowRight,
} from "lucide-react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import ReceiptModal from "./ReceiptModal";

const { Title, Text } = Typography;

// ==================== DESIGN TOKENS ====================
const T = {
    primary: "#0f766e",
    primaryHover: "#0d5f59",
    primarySoft: "#f0fdfa",
    primaryBorder: "#99f6e4",
    ink: "#0f172a",
    inkSoft: "#334155",
    muted: "#64748b",
    faint: "#94a3b8",
    line: "#e2e8f0",
    lineSoft: "#f1f5f9",
    bg: "#f8fafc",
    white: "#ffffff",
    warn: "#b45309",
    warnSoft: "#fffbeb",
    warnBorder: "#fcd34d",
    danger: "#dc2626",
    radius: 10,
    radiusLg: 14,
};

const shadow = {
    card: "0 1px 2px rgba(15, 23, 42, 0.04)",
    raised: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

// ==================== HELPERS ====================
function formatPeso(amount: number): string {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Normalize any mobile input into a 10-digit local PH mobile (9XXXXXXXXX).
 * Strips non-digits, leading "63", or leading "0".
 */
function normalizeMobile(input: string): string {
    const digits = (input || "").replace(/\D/g, "");
    let local = digits;
    if (local.startsWith("63")) local = local.slice(2);
    if (local.startsWith("0")) local = local.slice(1);
    return local.slice(0, 10);
}

/**
 * Simple mobile validation:
 * - Must start with 9
 * - Must be exactly 10 digits (9XXXXXXXXX)
 */
function isValidMobileLocal(local: string): boolean {
    return /^9\d{9}$/.test(local);
}

/**
 * Live feedback helper:
 * - Show error if user has started typing (>= 1 digit)
 * - and the current value is NOT a valid 10-digit mobile
 */
function hasInvalidPrefix(local: string): boolean {
    return local.length > 0 && !isValidMobileLocal(local);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.muted,
                marginBottom: 6,
                letterSpacing: 0.1,
            }}
        >
            {children}
        </div>
    );
}

// ==================== TYPES ====================
interface Room {
    id: number;
    room_number: string;
    status: string;
    room_type?: {
        base_price: number;
        short_stay_price?: number;
        type_name?: string;
    };
}

interface AddOn {
    id: number;
    add_on_name: string;
    price: number;
}

interface SelectedAddOn {
    id: number;
    add_on_name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface SelectedRoom {
    id: number;
    room_number: string;
    room_type_name: string;
    price_per_unit: number;
    stay_type: "short_stay" | "overnight";
    check_in_date: string;
    check_out_date: string;
    nights: number;
    subtotal: number;
    addons: SelectedAddOn[];
}

interface WalkInGuest {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    full_name?: string;
    contact_number: string;
    address: string;
    created_by: number;
    created_at: string;
    updated_at: string;
}

interface QrSession {
    paymentIntentId: string;
    clientKey: string;
    qrImageUrl: string;
    expirySeconds: number;
    bookingId: number;
    testUrl?: string | null;
}

type QrStatus = "loading" | "waiting" | "succeeded" | "expired" | "error";

// Split payment is fixed to Cash + QR Ph only. Cash is paid on the spot;
// the QR Ph portion opens the same QR modal used for a pure QRPh walk-in.

// ==================== SECTION HEADER ====================
function SectionHeader({
    step,
    title,
    subtitle,
    right,
}: {
    step?: string;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {step && (
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: T.primarySoft,
                            color: T.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            border: `1px solid ${T.primaryBorder}`,
                        }}
                    >
                        {step}
                    </div>
                )}
                <div>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: T.ink,
                            letterSpacing: -0.1,
                        }}
                    >
                        {title}
                    </div>
                    {subtitle && (
                        <div
                            style={{
                                fontSize: 12,
                                color: T.muted,
                                marginTop: 2,
                            }}
                        >
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
            {right}
        </div>
    );
}

// ==================== GUEST CARD ====================
interface GuestCardProps {
    selectedGuest: WalkInGuest | null;
    onSelectGuest: (guest: WalkInGuest) => void;
    onNewGuest: () => void;
    onClearGuest: () => void;
    searchResults: WalkInGuest[];
    onSearchGuests: (searchText: string) => void;
    searchingGuests: boolean;
}

function GuestCard({
    selectedGuest,
    onSelectGuest,
    onNewGuest,
    onClearGuest,
    searchResults,
    onSearchGuests,
}: GuestCardProps) {
    if (selectedGuest) {
        return (
            <div
                style={{
                    background: T.white,
                    border: `1px solid ${T.line}`,
                    borderRadius: T.radiusLg,
                    padding: 20,
                    boxShadow: shadow.card,
                }}
            >
                <SectionHeader
                    step="1"
                    title="Guest"
                    subtitle="Verified guest information"
                    right={
                        <Button
                            type="text"
                            size="small"
                            onClick={onClearGuest}
                            icon={<X size={14} />}
                            style={{ color: T.muted, fontSize: 12 }}
                        >
                            Change
                        </Button>
                    }
                />

                <Divider
                    style={{ margin: "16px 0", borderColor: T.lineSoft }}
                />

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                    }}
                >
                    <Avatar
                        size={44}
                        icon={<User size={18} />}
                        style={{
                            background: T.primarySoft,
                            color: T.primary,
                            border: `1px solid ${T.primaryBorder}`,
                        }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: T.ink,
                                letterSpacing: -0.1,
                            }}
                        >
                            {selectedGuest.full_name}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: T.muted,
                                marginTop: 2,
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                            }}
                        >
                            {selectedGuest.contact_number && (
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <Phone size={11} />
                                    {selectedGuest.contact_number}
                                </span>
                            )}
                            {selectedGuest.address && (
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <MapPin size={11} />
                                    {selectedGuest.address}
                                </span>
                            )}
                        </div>
                    </div>
                    <Tag
                        style={{
                            background: T.lineSoft,
                            border: "none",
                            color: T.muted,
                            fontSize: 11,
                            borderRadius: 6,
                            padding: "2px 8px",
                            margin: 0,
                            fontWeight: 500,
                        }}
                    >
                        ID #{selectedGuest.id}
                    </Tag>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                background: T.white,
                border: `1px solid ${T.line}`,
                borderRadius: T.radiusLg,
                padding: 20,
                boxShadow: shadow.card,
            }}
        >
            <SectionHeader
                step="1"
                title="Guest"
                subtitle="Search existing or add a new guest"
            />

            <Divider style={{ margin: "16px 0", borderColor: T.lineSoft }} />

            <Row gutter={10}>
                <Col flex="auto">
                    <AutoComplete
                        style={{ width: "100%" }}
                        onSearch={onSearchGuests}
                        onFocus={() => onSearchGuests("")}
                        options={searchResults.map((guest) => ({
                            key: guest.id,
                            value: guest.full_name || "",
                            label: (
                                <div
                                    onClick={() => onSelectGuest(guest)}
                                    style={{ padding: "6px 4px" }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: T.ink,
                                            fontSize: 13,
                                        }}
                                    >
                                        {guest.full_name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: T.muted,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            marginTop: 2,
                                        }}
                                    >
                                        {guest.contact_number && (
                                            <span>
                                                <Phone
                                                    size={10}
                                                    style={{
                                                        marginRight: 3,
                                                        verticalAlign: -1,
                                                    }}
                                                />
                                                {guest.contact_number}
                                            </span>
                                        )}
                                        {guest.address && (
                                            <span
                                                style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: 200,
                                                }}
                                            >
                                                <MapPin
                                                    size={10}
                                                    style={{
                                                        marginRight: 3,
                                                        verticalAlign: -1,
                                                    }}
                                                />
                                                {guest.address}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ),
                        }))}
                        filterOption={false}
                    >
                        <Input
                            size="large"
                            placeholder="Search by name, contact, or address…"
                            prefix={
                                <Search size={14} style={{ color: T.faint }} />
                            }
                            style={{ borderRadius: T.radius }}
                        />
                    </AutoComplete>
                </Col>
                <Col>
                    <Button
                        size="large"
                        icon={<UserPlus size={15} />}
                        onClick={onNewGuest}
                        style={{
                            borderRadius: T.radius,
                            borderColor: T.line,
                            color: T.inkSoft,
                            fontWeight: 500,
                        }}
                    >
                        New
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

// ==================== ROOM CARD ====================
interface RoomCardProps {
    room: SelectedRoom;
    onRemove: (roomId: number) => void;
    onAddExtras: (roomId: number) => void;
    formatCurrency: (amount: number) => string;
    formatDate: (date: string) => string;
    calculateRoomTotal: (room: SelectedRoom) => number;
}

function RoomCard({
    room,
    onRemove,
    onAddExtras,
    formatCurrency,
    formatDate,
    calculateRoomTotal,
}: RoomCardProps) {
    const [expanded, setExpanded] = useState(false);
    const total = calculateRoomTotal(room);

    return (
        <div
            style={{
                background: T.white,
                border: `1px solid ${T.line}`,
                borderRadius: T.radius,
                marginBottom: 8,
                overflow: "hidden",
                transition: "border-color 0.15s",
            }}
        >
            <div
                style={{
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    gap: 12,
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: T.lineSoft,
                            color: T.inkSoft,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Home size={14} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: T.ink,
                                }}
                            >
                                Room {room.room_number}
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: T.muted,
                                    background: T.lineSoft,
                                    padding: "1px 7px",
                                    borderRadius: 5,
                                    fontWeight: 500,
                                }}
                            >
                                {room.stay_type === "short_stay"
                                    ? "Short stay"
                                    : `${room.nights} night${room.nights > 1 ? "s" : ""}`}
                            </span>
                            {room.addons.length > 0 && (
                                <span
                                    style={{
                                        fontSize: 11,
                                        color: T.primary,
                                        background: T.primarySoft,
                                        padding: "1px 7px",
                                        borderRadius: 5,
                                        fontWeight: 500,
                                    }}
                                >
                                    +{room.addons.length} extras
                                </span>
                            )}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: T.faint,
                                marginTop: 2,
                            }}
                        >
                            {formatDate(room.check_in_date)} →{" "}
                            {formatDate(room.check_out_date)}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <span
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: T.ink,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {formatCurrency(total)}
                    </span>
                    <div
                        style={{
                            color: T.faint,
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        {expanded ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                    </div>
                    <Button
                        type="text"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(room.id);
                        }}
                        icon={<Trash2 size={13} />}
                        style={{ color: T.faint }}
                    />
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div
                            style={{
                                padding: "0 16px 16px",
                                borderTop: `1px solid ${T.lineSoft}`,
                            }}
                        >
                            <div
                                style={{
                                    paddingTop: 14,
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 16,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: T.faint,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.5,
                                            marginBottom: 8,
                                        }}
                                    >
                                        Stay details
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: T.inkSoft,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span style={{ color: T.muted }}>
                                                Check-in
                                            </span>
                                            <span style={{ fontWeight: 500 }}>
                                                {formatDate(room.check_in_date)}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span style={{ color: T.muted }}>
                                                Check-out
                                            </span>
                                            <span style={{ fontWeight: 500 }}>
                                                {formatDate(
                                                    room.check_out_date,
                                                )}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span style={{ color: T.muted }}>
                                                Duration
                                            </span>
                                            <span style={{ fontWeight: 500 }}>
                                                {room.stay_type === "short_stay"
                                                    ? "3 hours"
                                                    : `${room.nights} night${room.nights > 1 ? "s" : ""}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: T.faint,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.5,
                                            marginBottom: 8,
                                        }}
                                    >
                                        Rate breakdown
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: T.inkSoft,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span style={{ color: T.muted }}>
                                                Room rate
                                            </span>
                                            <span style={{ fontWeight: 500 }}>
                                                {formatCurrency(room.subtotal)}
                                            </span>
                                        </div>
                                        {room.addons.map((addon) => (
                                            <div
                                                key={addon.id}
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                }}
                                            >
                                                <span
                                                    style={{ color: T.muted }}
                                                >
                                                    {addon.add_on_name} ×{" "}
                                                    {addon.quantity}
                                                </span>
                                                <span
                                                    style={{
                                                        fontWeight: 500,
                                                        color: T.primary,
                                                    }}
                                                >
                                                    +
                                                    {formatCurrency(
                                                        addon.subtotal,
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                paddingTop: 6,
                                                borderTop: `1px solid ${T.lineSoft}`,
                                                marginTop: 2,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    color: T.ink,
                                                }}
                                            >
                                                Total
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: T.ink,
                                                }}
                                            >
                                                {formatCurrency(total)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="small"
                                icon={<Gift size={13} />}
                                onClick={() => onAddExtras(room.id)}
                                style={{
                                    marginTop: 14,
                                    width: "100%",
                                    borderColor: T.line,
                                    color: T.inkSoft,
                                    fontSize: 12,
                                    borderRadius: 8,
                                    height: 32,
                                }}
                            >
                                {room.addons.length > 0
                                    ? "Edit extras"
                                    : "Add extras & amenities"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ==================== ADD-ONS MODAL ====================
interface AddOnsModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (selectedAddOns: SelectedAddOn[]) => void;
    initialSelected?: SelectedAddOn[];
    roomNumber?: string;
}

function AddOnsModal({
    visible,
    onClose,
    onConfirm,
    initialSelected = [],
    roomNumber,
}: AddOnsModalProps) {
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Map<number, SelectedAddOn>>(
        new Map(),
    );

    useEffect(() => {
        if (visible) {
            fetchAddOns();
            const initialMap = new Map<number, SelectedAddOn>();
            initialSelected.forEach((addon) => {
                initialMap.set(addon.id, { ...addon });
            });
            setSelected(initialMap);
        }
    }, [visible, initialSelected]);

    const fetchAddOns = async () => {
        setLoading(true);
        try {
            const res = await api.get("/add-ons");
            const data = Array.isArray(res.data)
                ? res.data
                : res.data.data || [];
            setAddOns(data);
        } catch (err) {
            console.error("Failed to fetch add-ons", err);
            message.error("Could not load add-ons");
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = (addon: AddOn, quantity: number) => {
        if (quantity <= 0) {
            setSelected((prev) => {
                const newMap = new Map(prev);
                newMap.delete(addon.id);
                return newMap;
            });
        } else {
            setSelected((prev) => {
                const newMap = new Map(prev);
                newMap.set(addon.id, {
                    id: addon.id,
                    add_on_name: addon.add_on_name,
                    quantity,
                    price: addon.price,
                    subtotal: Number(addon.price) * Number(quantity),
                });
                return newMap;
            });
        }
    };

    const getTotal = () => {
        let total = 0;
        selected.forEach((addon) => {
            total += addon.subtotal;
        });
        return total;
    };

    return (
        <Modal
            title={
                <div>
                    <div
                        style={{ fontSize: 15, fontWeight: 600, color: T.ink }}
                    >
                        Extras & amenities
                    </div>
                    {roomNumber && (
                        <div
                            style={{
                                fontSize: 12,
                                color: T.muted,
                                fontWeight: 400,
                                marginTop: 2,
                            }}
                        >
                            For room {roomNumber}
                        </div>
                    )}
                </div>
            }
            open={visible}
            onCancel={onClose}
            width={560}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button
                    key="confirm"
                    type="primary"
                    onClick={() => {
                        onConfirm(Array.from(selected.values()));
                        onClose();
                    }}
                    style={{
                        background: T.primary,
                        borderColor: T.primary,
                    }}
                >
                    Add to booking
                </Button>,
            ]}
        >
            <div style={{ padding: "8px 0" }}>
                {loading ? (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 56,
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                position: "relative",
                                width: 36,
                                height: 36,
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    border: `2.5px solid ${T.line}`,
                                }}
                            />
                            <div
                                className="qr-modal-spinner"
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    border: "2.5px solid transparent",
                                    borderTopColor: T.primary,
                                    borderRightColor: T.primary,
                                }}
                            />
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: T.muted,
                                fontWeight: 500,
                            }}
                        >
                            Loading add-ons…
                        </div>
                    </div>
                ) : addOns.length === 0 ? (
                    <Empty description="No add-ons available" />
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                        }}
                    >
                        {addOns.map((addon) => {
                            const selectedAddon = selected.get(addon.id);
                            const quantity = selectedAddon?.quantity || 0;
                            const active = quantity > 0;

                            return (
                                <div
                                    key={addon.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "12px 14px",
                                        background: active
                                            ? T.primarySoft
                                            : T.white,
                                        borderRadius: T.radius,
                                        border: `1px solid ${active ? T.primaryBorder : T.line}`,
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: T.ink,
                                            }}
                                        >
                                            {addon.add_on_name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: T.muted,
                                                marginTop: 2,
                                            }}
                                        >
                                            {formatPeso(addon.price)}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                        }}
                                    >
                                        <Button
                                            size="small"
                                            icon={<Minus size={12} />}
                                            onClick={() =>
                                                updateQuantity(
                                                    addon,
                                                    quantity - 1,
                                                )
                                            }
                                            disabled={quantity === 0}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 7,
                                                borderColor: T.line,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        />
                                        <span
                                            style={{
                                                width: 24,
                                                textAlign: "center",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                fontVariantNumeric:
                                                    "tabular-nums",
                                                color: T.ink,
                                            }}
                                        >
                                            {quantity}
                                        </span>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<Plus size={12} />}
                                            onClick={() =>
                                                updateQuantity(
                                                    addon,
                                                    quantity + 1,
                                                )
                                            }
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 7,
                                                background: T.primary,
                                                borderColor: T.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {getTotal() > 0 && (
                    <div
                        style={{
                            marginTop: 16,
                            paddingTop: 14,
                            borderTop: `1px solid ${T.line}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <span style={{ fontSize: 12, color: T.muted }}>
                            Subtotal
                        </span>
                        <span
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: T.ink,
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {formatPeso(getTotal())}
                        </span>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ==================== QR MODAL ====================
interface QrModalProps {
    open: boolean;
    status: QrStatus;
    session: QrSession | null;
    amount: number;
    secondsLeft: number;
    totalSeconds: number;
    errorMessage?: string;
    onCancel: () => void;
    onRegenerate: () => void;
}

function QrModal({
    open,
    status,
    session,
    amount,
    secondsLeft,
    totalSeconds,
    errorMessage,
    onCancel,
    onRegenerate,
}: QrModalProps) {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const percent =
        totalSeconds > 0 ? Math.max(0, (secondsLeft / totalSeconds) * 100) : 0;

    return (
        <Modal
            open={open}
            closable={status !== "succeeded" && status !== "loading"}
            maskClosable={false}
            keyboard={false}
            footer={null}
            width={420}
            centered
            onCancel={
                status === "succeeded" || status === "loading"
                    ? undefined
                    : onCancel
            }
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                        style={{
                            width: 26,
                            height: 26,
                            borderRadius: 7,
                            background: T.primarySoft,
                            color: T.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <QrCode size={14} />
                    </div>
                    <span
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: T.ink,
                        }}
                    >
                        QR Ph payment
                    </span>
                </div>
            }
        >
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
                <div
                    style={{
                        fontSize: 11,
                        color: T.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        fontWeight: 600,
                    }}
                >
                    Amount due
                </div>
                <div
                    style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: T.ink,
                        marginTop: 4,
                        marginBottom: 18,
                        letterSpacing: -0.5,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {formatPeso(amount)}
                </div>

                {status === "loading" && (
                    <div
                        style={{
                            padding: "56px 0 40px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                position: "relative",
                                width: 36,
                                height: 36,
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    border: `2.5px solid ${T.line}`,
                                }}
                            />
                            <div
                                className="qr-modal-spinner"
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    border: "2.5px solid transparent",
                                    borderTopColor: T.primary,
                                    borderRightColor: T.primary,
                                }}
                            />
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: T.muted,
                                fontWeight: 500,
                                letterSpacing: 0.1,
                            }}
                        >
                            Generating QR code…
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div style={{ padding: "20px 0" }}>
                        <AlertTriangle size={36} color={T.danger} />
                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 13,
                                color: T.danger,
                                fontWeight: 600,
                            }}
                        >
                            {errorMessage || "Failed to generate QR"}
                        </div>
                        <Button
                            type="primary"
                            onClick={onRegenerate}
                            style={{
                                marginTop: 16,
                                background: T.primary,
                                borderColor: T.primary,
                            }}
                        >
                            Try again
                        </Button>
                    </div>
                )}

                {(status === "waiting" || status === "expired") && session && (
                    <>
                        <div
                            style={{
                                position: "relative",
                                display: "inline-block",
                                padding: 12,
                                background: T.white,
                                border: `1px solid ${T.line}`,
                                borderRadius: T.radiusLg,
                            }}
                        >
                            <img
                                src={session.qrImageUrl}
                                alt="QR"
                                style={{
                                    width: 240,
                                    height: 240,
                                    display: "block",
                                    opacity: status === "expired" ? 0.22 : 1,
                                    transition: "opacity 0.3s",
                                }}
                            />

                            {status === "expired" && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 6,
                                    }}
                                >
                                    <AlertTriangle size={32} color={T.warn} />
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: T.warn,
                                            fontSize: 13,
                                        }}
                                    >
                                        QR expired
                                    </div>
                                </div>
                            )}
                        </div>

                        {status === "waiting" && (
                            <div
                                style={{
                                    marginTop: 14,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 10px",
                                    background: T.lineSoft,
                                    borderRadius: 999,
                                }}
                            >
                                <Loader2
                                    size={10}
                                    color={T.muted}
                                    className="qr-spin"
                                />
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: T.muted,
                                        letterSpacing: 0.3,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Waiting for payment
                                </span>
                            </div>
                        )}

                        {status === "waiting" && (
                            <>
                                <div style={{ marginTop: 16 }}>
                                    <Progress
                                        percent={percent}
                                        showInfo={false}
                                        strokeColor={T.primary}
                                        trailColor={T.lineSoft}
                                        strokeWidth={3}
                                    />
                                </div>
                                <div
                                    style={{
                                        marginTop: 10,
                                        fontSize: 12,
                                        color: T.inkSoft,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    Expires in{" "}
                                    <strong style={{ color: T.ink }}>
                                        {minutes}:
                                        {String(seconds).padStart(2, "0")}
                                    </strong>
                                </div>
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        color: T.faint,
                                    }}
                                >
                                    Guest scans with any bank or e-wallet app
                                </div>

                                {session.testUrl && (
                                    <div
                                        style={{
                                            marginTop: 14,
                                            padding: "8px 10px",
                                            background: T.warnSoft,
                                            border: `1px dashed ${T.warnBorder}`,
                                            borderRadius: 8,
                                            textAlign: "left",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: T.warn,
                                                fontWeight: 700,
                                                letterSpacing: 0.5,
                                                textTransform: "uppercase",
                                                marginBottom: 4,
                                            }}
                                        >
                                            Sandbox test tool
                                        </div>
                                        <a
                                            href={session.testUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: 11,
                                                color: T.warn,
                                                textDecoration: "underline",
                                            }}
                                        >
                                            Open PayMongo test page →
                                        </a>
                                    </div>
                                )}
                            </>
                        )}

                        {status === "expired" && (
                            <div style={{ marginTop: 16 }}>
                                <Button
                                    type="primary"
                                    onClick={onRegenerate}
                                    style={{
                                        background: T.primary,
                                        borderColor: T.primary,
                                        height: 38,
                                        fontWeight: 500,
                                    }}
                                    icon={<QrCode size={13} />}
                                >
                                    Generate new QR
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {status === "succeeded" && (
                    <div style={{ padding: "20px 0" }}>
                        <CheckCircle size={44} color={T.primary} />
                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 15,
                                fontWeight: 700,
                                color: T.ink,
                            }}
                        >
                            Payment confirmed
                        </div>
                        <div
                            style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: T.muted,
                            }}
                        >
                            Finalizing check-in…
                        </div>
                    </div>
                )}
            </div>

            {status !== "succeeded" && status !== "loading" && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        borderTop: `1px solid ${T.lineSoft}`,
                        paddingTop: 12,
                        marginTop: 4,
                    }}
                >
                    <Button
                        type="text"
                        onClick={onCancel}
                        style={{ color: T.muted, fontSize: 12 }}
                    >
                        Cancel & switch payment
                    </Button>
                </div>
            )}

            <style>{`
                @keyframes qrSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .qr-spin { animation: qrSpin 1s linear infinite; }

                @keyframes qrModalSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .qr-modal-spinner {
                    animation: qrModalSpin 0.7s linear infinite;
                }
            `}</style>
        </Modal>
    );
}

// ==================== MAIN COMPONENT ====================
function WalkInContent() {
    const queryClient = useQueryClient();
    const { modal } = App.useApp();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomsDetails, setSelectedRoomsDetails] = useState<
        SelectedRoom[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "qrph">("cash");
    const [paymentMode, setPaymentMode] = useState<"single" | "split">(
        "single",
    );

    const [splitCashAmount, setSplitCashAmount] = useState<number | null>(null);
    const [splitQrphAmount, setSplitQrphAmount] = useState<number | null>(null);
    const [fetchingRooms, setFetchingRooms] = useState(false);

    const [selectedGuest, setSelectedGuest] = useState<WalkInGuest | null>(
        null,
    );
    const [searchResults, setSearchResults] = useState<WalkInGuest[]>([]);
    const [searchingGuests, setSearchingGuests] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [newGuestForm, setNewGuestForm] = useState({
        first_name: "",
        middle_name: "",
        last_name: "",
        contact_number: "",
        address: "",
    });
    const [savingGuest, setSavingGuest] = useState(false);

    const [selectedRoomValue, setSelectedRoomValue] = useState<number | null>(
        null,
    );
    const [newRoomStayType, setNewRoomStayType] = useState<
        "short_stay" | "overnight"
    >("overnight");
    const [newRoomCheckIn, setNewRoomCheckIn] = useState<string>(
        dayjs().format("YYYY-MM-DD"),
    );
    const [newRoomCheckOut, setNewRoomCheckOut] = useState<string>(
        dayjs().add(1, "day").format("YYYY-MM-DD"),
    );
    const [previewAmount, setPreviewAmount] = useState<number>(0);
    const [addRoomExpanded, setAddRoomExpanded] = useState(true);

    const [showAddOnsModal, setShowAddOnsModal] = useState(false);
    const [currentRoomForAddOns, setCurrentRoomForAddOns] = useState<
        number | null
    >(null);

    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(
        null,
    );

    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrSession, setQrSession] = useState<QrSession | null>(null);
    const [qrStatus, setQrStatus] = useState<QrStatus>("loading");
    const [qrSecondsLeft, setQrSecondsLeft] = useState(1800);
    const [qrTotalSeconds, setQrTotalSeconds] = useState(1800);
    const [qrErrorMessage, setQrErrorMessage] = useState<string>("");
    const [qrAmount, setQrAmount] = useState<number>(0);
    const [qrInFlight, setQrInFlight] = useState<boolean>(false);

    const [pendingBookingId, setPendingBookingId] = useState<number | null>(
        null,
    );
    const [pendingAmount, setPendingAmount] = useState<number>(0);

    const pollTimerRef = useRef<number | null>(null);
    const countdownTimerRef = useRef<number | null>(null);
    const qrSessionRef = useRef<QrSession | null>(null);
    const qrStatusRef = useRef<QrStatus>("loading");

    useEffect(() => {
        qrStatusRef.current = qrStatus;
    }, [qrStatus]);

    const clearQrTimers = () => {
        if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    };

    useEffect(() => () => clearQrTimers(), []);
    useEffect(() => {
        fetchRooms();
    }, [selectedRoomsDetails]);

    const fetchRooms = async () => {
        try {
            setFetchingRooms(true);
            const res = await api.get("/rooms");
            let available = res.data.filter(
                (room: Room) => room.status === "available",
            );
            available = available.filter(
                (room: Room) =>
                    !selectedRoomsDetails.some((r) => r.id === room.id),
            );
            setRooms(available);
        } catch (err) {
            console.error("Failed to fetch rooms", err);
            message.error("Failed to load available rooms");
        } finally {
            setFetchingRooms(false);
        }
    };

    const searchGuests = async (searchText: string) => {
        setSearchingGuests(true);
        try {
            let res;
            if (!searchText || searchText.trim().length === 0) {
                res = await api.get("/walk-in-guests?per_page=5");
                setSearchResults(res.data.data || []);
            } else {
                res = await api.get(
                    `/walk-in-guests/search?q=${encodeURIComponent(searchText)}`,
                );
                setSearchResults(res.data || []);
            }
        } catch (err) {
            console.error("Failed to search guests", err);
        } finally {
            setSearchingGuests(false);
        }
    };

    const handleSelectGuest = (guest: WalkInGuest) => {
        setSelectedGuest(guest);
        setSearchResults([]);
        message.success(`Selected guest: ${guest.full_name}`);
    };

    const handleNewGuestClick = () => {
        setNewGuestForm({
            first_name: "",
            middle_name: "",
            last_name: "",
            contact_number: "",
            address: "",
        });
        setShowGuestModal(true);
    };

    const handleSaveNewGuest = async () => {
        const local = normalizeMobile(newGuestForm.contact_number);

        if (!newGuestForm.first_name.trim() || !newGuestForm.last_name.trim()) {
            message.warning("Please enter first name and last name");
            return;
        }

        if (local.length < 10) {
            message.warning(
                `Mobile number is too short — ${10 - local.length} more digit${10 - local.length > 1 ? "s" : ""} needed.`,
            );
            return;
        }

        if (local.length > 10) {
            message.warning(
                `Mobile number is too long — ${local.length - 10} extra digit${local.length - 10 > 1 ? "s" : ""}.`,
            );
            return;
        }

        if (!isValidMobileLocal(local)) {
            message.warning("Mobile number must start with 9.");
            return;
        }

        setSavingGuest(true);
        try {
            const response = await api.post("/walk-in-guests/guest", {
                ...newGuestForm,
                contact_number: `0${local}`,
            });
            setSelectedGuest(response.data);
            setShowGuestModal(false);
            message.success("Guest saved successfully!");
        } catch (err) {
            console.error("Failed to save guest", err);
            message.error("Failed to save guest");
        } finally {
            setSavingGuest(false);
        }
    };

    useEffect(() => {
        if (selectedRoomValue) {
            const room = rooms.find((r) => r.id === selectedRoomValue);
            if (room) {
                let amount = 0;
                if (newRoomStayType === "short_stay") {
                    amount =
                        room.room_type?.short_stay_price ||
                        room.room_type?.base_price ||
                        0;
                } else {
                    const nights = Math.max(
                        1,
                        dayjs(newRoomCheckOut).diff(
                            dayjs(newRoomCheckIn),
                            "day",
                        ),
                    );
                    amount = (room.room_type?.base_price || 0) * nights;
                }
                setPreviewAmount(amount);
            }
        } else {
            setPreviewAmount(0);
        }
    }, [
        selectedRoomValue,
        newRoomStayType,
        newRoomCheckIn,
        newRoomCheckOut,
        rooms,
    ]);

    const getNightsCount = (checkIn: string, checkOut: string) =>
        Math.max(1, dayjs(checkOut).diff(dayjs(checkIn), "day"));

    const calculateRoomSubtotal = (
        room: Room,
        stayType: "short_stay" | "overnight",
        checkIn: string,
        checkOut: string,
    ) => {
        const pricePerUnit =
            stayType === "short_stay"
                ? room.room_type?.short_stay_price ||
                  room.room_type?.base_price ||
                  0
                : room.room_type?.base_price || 0;
        if (stayType === "short_stay") return pricePerUnit;
        return pricePerUnit * getNightsCount(checkIn, checkOut);
    };

    const addRoom = async (
        roomId: number,
        stayType: "short_stay" | "overnight",
        checkIn: string,
        checkOut: string,
    ) => {
        const roomToAdd = rooms.find((r) => r.id === roomId);
        if (!roomToAdd) return;
        if (selectedRoomsDetails.some((r) => r.id === roomToAdd.id)) {
            message.warning("Room already selected");
            return;
        }

        try {
            const availabilityRes = await api.get(
                `/rooms/${roomId}/check-availability`,
                {
                    params: {
                        check_in_date: checkIn,
                        check_out_date: checkOut,
                        stay_type: stayType,
                    },
                },
            );

            if (!availabilityRes.data?.data?.available) {
                message.error(
                    availabilityRes.data?.data?.reason ||
                        "Room is already booked for the selected dates.",
                );
                return;
            }
        } catch (err) {
            console.error("Failed to verify room availability", err);
        }

        const pricePerUnit =
            stayType === "short_stay"
                ? roomToAdd.room_type?.short_stay_price ||
                  roomToAdd.room_type?.base_price ||
                  0
                : roomToAdd.room_type?.base_price || 0;
        const nights =
            stayType === "short_stay" ? 1 : getNightsCount(checkIn, checkOut);
        const subtotal = calculateRoomSubtotal(
            roomToAdd,
            stayType,
            checkIn,
            checkOut,
        );

        setSelectedRoomsDetails((prev) => [
            ...prev,
            {
                id: roomToAdd.id,
                room_number: roomToAdd.room_number,
                room_type_name: roomToAdd.room_type?.type_name || "Standard",
                price_per_unit: pricePerUnit,
                stay_type: stayType,
                check_in_date: checkIn,
                check_out_date: checkOut,
                nights,
                subtotal,
                addons: [],
            },
        ]);
        setSelectedRoomValue(null);
        setPreviewAmount(0);
        message.success(`Room ${roomToAdd.room_number} added`);
    };

    const removeRoom = (roomId: number) => {
        setSelectedRoomsDetails((prev) => prev.filter((r) => r.id !== roomId));
        message.info("Room removed");
    };

    const handleAddOnsConfirm = (selectedAddOns: SelectedAddOn[]) => {
        if (currentRoomForAddOns !== null) {
            setSelectedRoomsDetails((prev) =>
                prev.map((room) =>
                    room.id === currentRoomForAddOns
                        ? { ...room, addons: selectedAddOns }
                        : room,
                ),
            );
            setCurrentRoomForAddOns(null);
            message.success("Extras added");
        }
    };

    const openAddOnsForRoom = (roomId: number) => {
        setCurrentRoomForAddOns(roomId);
        setShowAddOnsModal(true);
    };

    const calculateRoomTotalWithAddOns = (room: SelectedRoom): number => {
        const roomSubtotal = Number(room.subtotal) || 0;
        const addOnsTotal =
            room.addons?.reduce(
                (sum, addon) => sum + (Number(addon.subtotal) || 0),
                0,
            ) || 0;
        return roomSubtotal + addOnsTotal;
    };

    const calculateTotal = (): number =>
        selectedRoomsDetails.reduce(
            (sum, room) => sum + calculateRoomTotalWithAddOns(room),
            0,
        );

    const getCurrentRoomAddOns = (): SelectedAddOn[] => {
        if (currentRoomForAddOns === null) return [];
        return (
            selectedRoomsDetails.find((r) => r.id === currentRoomForAddOns)
                ?.addons || []
        );
    };

    const getCurrentRoomNumber = (): string => {
        if (currentRoomForAddOns === null) return "";
        return (
            selectedRoomsDetails.find((r) => r.id === currentRoomForAddOns)
                ?.room_number || ""
        );
    };

    // ---------- Split payment helpers ----------

    // ---------- QR helpers ----------
    const stopPolling = () => {
        if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const stopCountdown = () => {
        if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    };

    const startCountdown = (seconds: number) => {
        stopCountdown();
        setQrTotalSeconds(seconds);
        setQrSecondsLeft(seconds);
        countdownTimerRef.current = window.setInterval(() => {
            setQrSecondsLeft((prev) => {
                if (prev <= 1) {
                    stopCountdown();
                    stopPolling();
                    setQrStatus("expired");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startPolling = (session: QrSession) => {
        stopPolling();
        pollTimerRef.current = window.setInterval(async () => {
            if (qrStatusRef.current !== "waiting") return;
            try {
                const res = await api.get(
                    `/paymongo/qr/status/${session.paymentIntentId}`,
                    { params: { client_key: session.clientKey } },
                );
                if (res.data?.status === "succeeded") {
                    stopPolling();
                    stopCountdown();
                    setQrStatus("succeeded");

                    const confirmRes = await api.post(
                        `/walk-in-guests/${session.bookingId}/confirm-qr`,
                        { payment_reference: res.data?.payment_id ?? null },
                    );

                    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                    queryClient.invalidateQueries({ queryKey: ["rooms"] });
                    queryClient.invalidateQueries({ queryKey: ["bookings"] });

                    message.success({
                        content: "QR Ph payment confirmed",
                        duration: 3,
                    });

                    setTimeout(() => {
                        setQrModalOpen(false);
                        setQrStatus("loading");
                        setQrInFlight(false);
                        setQrSession(null);
                        qrSessionRef.current = null;

                        const paymentId =
                            confirmRes.data?.payment_id ?? res.data?.payment_id;
                        if (paymentId) {
                            setCurrentPaymentId(String(paymentId));
                            setShowReceiptModal(true);
                        }

                        setSelectedGuest(null);
                        setSelectedRoomsDetails([]);
                        setSelectedRoomValue(null);
                        setPreviewAmount(0);
                        setPendingBookingId(null);
                        setPendingAmount(0);
                        fetchRooms();
                    }, 800);
                    return;
                }
            } catch (err: any) {
                console.warn("QR poll failed", err?.message || err);
            }
        }, 4000);
    };

    const generateQr = async (bookingId: number, amount: number) => {
        setQrStatus("loading");
        setQrErrorMessage("");
        setQrAmount(amount);
        try {
            const res = await api.post("/paymongo/qr/create", {
                booking_id: bookingId,
                amount,
            });
            const session: QrSession = {
                paymentIntentId: res.data.payment_intent_id,
                clientKey: res.data.client_key,
                qrImageUrl: res.data.qr_image_url,
                expirySeconds: res.data.expiry_seconds || 1800,
                bookingId,
                testUrl: res.data.test_url ?? null,
            };
            qrSessionRef.current = session;
            setQrSession(session);
            setQrStatus("waiting");
            startCountdown(session.expirySeconds);
            startPolling(session);
        } catch (err: any) {
            console.error("QR generation failed", err);
            setQrStatus("error");
            setQrErrorMessage(
                err?.response?.data?.message || "Failed to generate QR code",
            );
        }
    };

    const handleQrCancel = () => {
        stopPolling();
        stopCountdown();
        modal.confirm({
            title: "Cancel QR payment?",
            content:
                "The booking is reserved but unpaid. You can retry QR Ph or switch to Cash.",
            okText: "Yes, cancel",
            okButtonProps: { danger: true },
            cancelText: "Keep waiting",
            onOk: () => {
                setQrModalOpen(false);
                setQrStatus("loading");
                setQrInFlight(false);
                setQrSession(null);
                qrSessionRef.current = null;
                fetchRooms();
                queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            },
        });
    };

    const handleQrRegenerate = async () => {
        const current = qrSessionRef.current;
        if (!current) return;
        stopPolling();
        stopCountdown();
        await generateQr(current.bookingId, qrAmount);
    };

    // ---------- Submit ----------
    const handleSubmit = async () => {
        if (!selectedGuest) {
            message.warning("Please select or add a guest");
            return;
        }
        if (selectedRoomsDetails.length === 0) {
            message.warning("Please select at least one room");
            return;
        }
        if (qrInFlight) return;

        if (paymentMode === "split" && !splitIsValid) {
            message.warning(
                "Both Cash and QR Ph amounts must be filled in and must add up to the total amount.",
            );
            return;
        }

        if (
            paymentMode === "single" &&
            paymentMethod === "qrph" &&
            pendingBookingId &&
            pendingAmount > 0
        ) {
            setQrInFlight(true);
            setQrModalOpen(true);
            setQrAmount(pendingAmount);
            await generateQr(pendingBookingId, pendingAmount);
            return;
        }

        setLoading(true);
        try {
            const bookingsData = selectedRoomsDetails.map((room) => ({
                room_id: room.id,
                stay_type: room.stay_type,
                room_subtotal: room.subtotal,
                check_in_date: room.check_in_date,
                check_out_date: room.check_out_date,
                addons: room.addons.map((addon) => ({
                    id: addon.id,
                    quantity: addon.quantity,
                    price: addon.price,
                    subtotal: addon.subtotal,
                    name: addon.add_on_name,
                })),
            }));

            const totalAmount = calculateTotal();

            const payload: Record<string, unknown> = {
                guest_id: selectedGuest.id,
                bookings: bookingsData,
                total_amount: totalAmount,
            };

            if (paymentMode === "split") {
                payload.payments = [
                    { payment_method: "cash", amount: splitCashAmount },
                    { payment_method: "qrph", amount: splitQrphAmount },
                ];
            } else {
                payload.payment_method = paymentMethod;
            }

            const response = await api.post("/walk-in-guests/checkin", payload);

            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });

            const needsQr =
                (paymentMode === "split" &&
                    response.data.requires_qr_confirmation) ||
                (paymentMode === "single" && paymentMethod === "qrph");

            if (!needsQr) {
                message.success(
                    `Checked in to ${selectedRoomsDetails.length} room(s)`,
                );
                setCurrentPaymentId(response.data.payment_id);
                setShowReceiptModal(true);

                setSelectedGuest(null);
                setSelectedRoomsDetails([]);
                setSelectedRoomValue(null);
                setPreviewAmount(0);
                setPendingBookingId(null);
                setPendingAmount(0);
                setPaymentMode("single");
                setSplitCashAmount(null);
                setSplitQrphAmount(null);
                await fetchRooms();
            } else {
                const bookingId = response.data.booking_id;
                const qrAmountToCharge =
                    paymentMode === "split"
                        ? Number(response.data.qrph_amount) || 0
                        : totalAmount;

                setPendingBookingId(bookingId);
                setPendingAmount(qrAmountToCharge);
                setQrInFlight(true);
                setQrModalOpen(true);
                setQrAmount(qrAmountToCharge);
                await generateQr(bookingId, qrAmountToCharge);
            }
        } catch (err: any) {
            console.error("Walk-in error:", err);
            const status = err.response?.status;
            const errMsg =
                err.response?.data?.message || "Failed to check in guest";
            if (status === 409) {
                message.error({ content: errMsg, duration: 5 });
                await fetchRooms();
            } else if (status === 400) {
                message.warning(errMsg);
            } else {
                message.error(errMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string) => dayjs(date).format("MMM DD");

    const roomsByType = rooms.reduce(
        (acc, room) => {
            const typeName = room.room_type?.type_name || "Standard";
            if (!acc[typeName]) acc[typeName] = [];
            acc[typeName].push(room);
            return acc;
        },
        {} as Record<string, Room[]>,
    );

    const totalAmount = calculateTotal();

    const splitLegsTotal =
        (Number(splitCashAmount) || 0) + (Number(splitQrphAmount) || 0);
    const splitRemaining =
        Math.round((totalAmount - splitLegsTotal) * 100) / 100;
    const splitIsValid =
        (splitCashAmount || 0) > 0 &&
        (splitQrphAmount || 0) > 0 &&
        Math.abs(splitRemaining) < 0.01;

    const completeDisabled =
        selectedRoomsDetails.length === 0 ||
        !selectedGuest ||
        qrInFlight ||
        (paymentMode === "split" && !splitIsValid);

    const handleCheckInChange = (date: Dayjs | null) => {
        if (!date) return;
        const newDate = date.format("YYYY-MM-DD");
        setNewRoomCheckIn(newDate);
        if (newRoomStayType === "overnight") {
            setNewRoomCheckOut(
                dayjs(newDate).add(1, "day").format("YYYY-MM-DD"),
            );
        } else {
            setNewRoomCheckOut(newDate);
        }
    };

    const handleCheckOutChange = (date: Dayjs | null) => {
        if (!date) {
            if (newRoomStayType === "overnight") {
                setNewRoomCheckOut(
                    dayjs(newRoomCheckIn).add(1, "day").format("YYYY-MM-DD"),
                );
            } else {
                setNewRoomCheckOut(newRoomCheckIn);
            }
            return;
        }
        setNewRoomCheckOut(date.format("YYYY-MM-DD"));
    };

    const canAddRoom = !!selectedRoomValue && previewAmount > 0;

    // Live validation for the new-guest form
    const localMobile = normalizeMobile(newGuestForm.contact_number);
    const mobileIsValid = isValidMobileLocal(localMobile);
    const mobileHasBadPrefix = hasInvalidPrefix(localMobile);
    const guestFormIsValid =
        newGuestForm.first_name.trim() !== "" &&
        newGuestForm.last_name.trim() !== "" &&
        mobileIsValid;

    return (
        <div
            style={{
                minHeight: "100vh",
                background: T.bg,
                padding: "32px 24px 48px",
            }}
        >
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                {/* ── Header ── */}
                <div style={{ marginBottom: 28 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 11,
                                background: T.primary,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 8px rgba(15, 118, 110, 0.2)",
                            }}
                        >
                            <Users size={20} color="#fff" />
                        </div>
                        <div>
                            <Title
                                level={4}
                                style={{
                                    margin: 0,
                                    color: T.ink,
                                    letterSpacing: -0.3,
                                    fontWeight: 600,
                                }}
                            >
                                Walk-in Registration
                            </Title>
                            <Text style={{ color: T.muted, fontSize: 13 }}>
                                Register guest and assign rooms
                            </Text>
                        </div>
                    </div>
                </div>

                <Row gutter={[20, 20]}>
                    {/* ── Left column ── */}
                    <Col xs={24} lg={15}>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                            }}
                        >
                            <GuestCard
                                selectedGuest={selectedGuest}
                                onSelectGuest={handleSelectGuest}
                                onNewGuest={handleNewGuestClick}
                                onClearGuest={() => setSelectedGuest(null)}
                                searchResults={searchResults}
                                onSearchGuests={searchGuests}
                                searchingGuests={searchingGuests}
                            />

                            {/* ── Add Room ── */}
                            {selectedGuest && (
                                <div
                                    style={{
                                        background: T.white,
                                        border: `1px solid ${T.line}`,
                                        borderRadius: T.radiusLg,
                                        boxShadow: shadow.card,
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: 20,
                                            cursor: "pointer",
                                        }}
                                        onClick={() =>
                                            setAddRoomExpanded(!addRoomExpanded)
                                        }
                                    >
                                        <SectionHeader
                                            step="2"
                                            title="Add room"
                                            subtitle="Select room and stay details"
                                            right={
                                                <div
                                                    style={{
                                                        color: T.faint,
                                                        display: "flex",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {addRoomExpanded ? (
                                                        <ChevronDown
                                                            size={14}
                                                        />
                                                    ) : (
                                                        <ChevronRight
                                                            size={14}
                                                        />
                                                    )}
                                                </div>
                                            }
                                        />
                                    </div>

                                    <AnimatePresence>
                                        {addRoomExpanded && (
                                            <motion.div
                                                initial={{
                                                    height: 0,
                                                    opacity: 0,
                                                }}
                                                animate={{
                                                    height: "auto",
                                                    opacity: 1,
                                                }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ overflow: "hidden" }}
                                            >
                                                <div
                                                    style={{
                                                        padding: "0 20px 20px",
                                                        borderTop: `1px solid ${T.lineSoft}`,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            paddingTop: 18,
                                                            display: "grid",
                                                            gridTemplateColumns:
                                                                "1.4fr 1fr 1fr 1fr",
                                                            gap: 12,
                                                        }}
                                                    >
                                                        <div>
                                                            <FieldLabel>
                                                                Room
                                                            </FieldLabel>
                                                            <Select
                                                                size="large"
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                placeholder="Select room"
                                                                value={
                                                                    selectedRoomValue
                                                                }
                                                                onChange={
                                                                    setSelectedRoomValue
                                                                }
                                                                loading={
                                                                    fetchingRooms
                                                                }
                                                            >
                                                                {Object.entries(
                                                                    roomsByType,
                                                                ).map(
                                                                    ([
                                                                        typeName,
                                                                        typeRooms,
                                                                    ]) => (
                                                                        <Select.OptGroup
                                                                            key={
                                                                                typeName
                                                                            }
                                                                            label={
                                                                                typeName
                                                                            }
                                                                        >
                                                                            {typeRooms.map(
                                                                                (
                                                                                    room,
                                                                                ) => (
                                                                                    <Select.Option
                                                                                        key={
                                                                                            room.id
                                                                                        }
                                                                                        value={
                                                                                            room.id
                                                                                        }
                                                                                    >
                                                                                        Room{" "}
                                                                                        {
                                                                                            room.room_number
                                                                                        }{" "}
                                                                                        ·{" "}
                                                                                        {formatPeso(
                                                                                            room
                                                                                                .room_type
                                                                                                ?.base_price ||
                                                                                                0,
                                                                                        )}
                                                                                        /night
                                                                                    </Select.Option>
                                                                                ),
                                                                            )}
                                                                        </Select.OptGroup>
                                                                    ),
                                                                )}
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <FieldLabel>
                                                                Stay type
                                                            </FieldLabel>
                                                            <Select
                                                                size="large"
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                value={
                                                                    newRoomStayType
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) => {
                                                                    setNewRoomStayType(
                                                                        value,
                                                                    );
                                                                    if (
                                                                        value ===
                                                                        "short_stay"
                                                                    ) {
                                                                        setNewRoomCheckOut(
                                                                            newRoomCheckIn,
                                                                        );
                                                                    } else {
                                                                        setNewRoomCheckOut(
                                                                            dayjs(
                                                                                newRoomCheckIn,
                                                                            )
                                                                                .add(
                                                                                    1,
                                                                                    "day",
                                                                                )
                                                                                .format(
                                                                                    "YYYY-MM-DD",
                                                                                ),
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <Select.Option value="overnight">
                                                                    Overnight
                                                                </Select.Option>
                                                                <Select.Option value="short_stay">
                                                                    Short stay
                                                                </Select.Option>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <FieldLabel>
                                                                Check-in
                                                            </FieldLabel>
                                                            <DatePicker
                                                                size="large"
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                value={dayjs(
                                                                    newRoomCheckIn,
                                                                )}
                                                                onChange={
                                                                    handleCheckInChange
                                                                }
                                                                disabledDate={(
                                                                    current,
                                                                ) =>
                                                                    current &&
                                                                    current <
                                                                        dayjs().startOf(
                                                                            "day",
                                                                        )
                                                                }
                                                            />
                                                        </div>

                                                        <div>
                                                            <FieldLabel>
                                                                Check-out
                                                            </FieldLabel>
                                                            <DatePicker
                                                                size="large"
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                value={dayjs(
                                                                    newRoomCheckOut,
                                                                )}
                                                                onChange={
                                                                    handleCheckOutChange
                                                                }
                                                                disabled={
                                                                    newRoomStayType ===
                                                                    "short_stay"
                                                                }
                                                                disabledDate={(
                                                                    current,
                                                                ) =>
                                                                    current &&
                                                                    current <=
                                                                        dayjs(
                                                                            newRoomCheckIn,
                                                                        )
                                                                }
                                                            />
                                                        </div>
                                                    </div>

                                                    <div
                                                        style={{
                                                            marginTop: 14,
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems:
                                                                "center",
                                                            gap: 12,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: 12,
                                                                color: T.muted,
                                                            }}
                                                        >
                                                            {canAddRoom ? (
                                                                <>
                                                                    Preview:{" "}
                                                                    <span
                                                                        style={{
                                                                            fontWeight: 600,
                                                                            color: T.ink,
                                                                            fontVariantNumeric:
                                                                                "tabular-nums",
                                                                        }}
                                                                    >
                                                                        {formatPeso(
                                                                            previewAmount,
                                                                        )}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                "Select a room to see pricing"
                                                            )}
                                                        </div>
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <Plus
                                                                    size={13}
                                                                />
                                                            }
                                                            disabled={
                                                                !canAddRoom
                                                            }
                                                            onClick={async () => {
                                                                if (
                                                                    selectedRoomValue
                                                                ) {
                                                                    await addRoom(
                                                                        selectedRoomValue,
                                                                        newRoomStayType,
                                                                        newRoomCheckIn,
                                                                        newRoomCheckOut,
                                                                    );
                                                                }
                                                            }}
                                                            style={{
                                                                background:
                                                                    T.primary,
                                                                borderColor:
                                                                    T.primary,
                                                                fontWeight: 500,
                                                                borderRadius: 8,
                                                            }}
                                                        >
                                                            Add room
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* ── Selected Rooms ── */}
                            {selectedRoomsDetails.length > 0 && (
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: T.ink,
                                            }}
                                        >
                                            Rooms ({selectedRoomsDetails.length}
                                            )
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {selectedRoomsDetails.map((room) => (
                                            <RoomCard
                                                key={room.id}
                                                room={room}
                                                onRemove={removeRoom}
                                                onAddExtras={openAddOnsForRoom}
                                                formatCurrency={formatPeso}
                                                formatDate={formatDate}
                                                calculateRoomTotal={
                                                    calculateRoomTotalWithAddOns
                                                }
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* ── Right column (Summary) ── */}
                    <Col xs={24} lg={9}>
                        <div
                            style={{
                                position: "sticky",
                                top: 24,
                                background: T.white,
                                border: `1px solid ${T.line}`,
                                borderRadius: T.radiusLg,
                                boxShadow: shadow.card,
                                overflow: "hidden",
                            }}
                        >
                            <div style={{ padding: "18px 20px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: T.ink,
                                        }}
                                    >
                                        Summary
                                    </div>
                                    {selectedRoomsDetails.length > 0 && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: T.muted,
                                                background: T.lineSoft,
                                                padding: "2px 8px",
                                                borderRadius: 6,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {selectedRoomsDetails.length} room
                                            {selectedRoomsDetails.length > 1
                                                ? "s"
                                                : ""}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <Divider
                                style={{ margin: 0, borderColor: T.lineSoft }}
                            />

                            {selectedRoomsDetails.length > 0 ? (
                                <div
                                    style={{
                                        maxHeight: 320,
                                        overflowY: "auto",
                                        padding: "4px 20px",
                                    }}
                                >
                                    {selectedRoomsDetails.map((room) => {
                                        const roomTotal =
                                            calculateRoomTotalWithAddOns(room);
                                        return (
                                            <div
                                                key={room.id}
                                                style={{
                                                    padding: "12px 0",
                                                    borderBottom: `1px solid ${T.lineSoft}`,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: T.ink,
                                                        }}
                                                    >
                                                        Room {room.room_number}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            color: T.ink,
                                                            fontVariantNumeric:
                                                                "tabular-nums",
                                                        }}
                                                    >
                                                        {formatPeso(roomTotal)}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: T.muted,
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                    }}
                                                >
                                                    <span>
                                                        {room.stay_type ===
                                                        "short_stay"
                                                            ? "Short stay"
                                                            : `${room.nights} night${room.nights > 1 ? "s" : ""}`}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontVariantNumeric:
                                                                "tabular-nums",
                                                        }}
                                                    >
                                                        {formatPeso(
                                                            room.subtotal,
                                                        )}
                                                    </span>
                                                </div>
                                                {room.addons.map((addon) => (
                                                    <div
                                                        key={addon.id}
                                                        style={{
                                                            fontSize: 11,
                                                            color: T.muted,
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            marginTop: 3,
                                                        }}
                                                    >
                                                        <span>
                                                            {addon.add_on_name}{" "}
                                                            × {addon.quantity}
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: T.primary,
                                                                fontVariantNumeric:
                                                                    "tabular-nums",
                                                            }}
                                                        >
                                                            +
                                                            {formatPeso(
                                                                addon.subtotal,
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: "32px 20px" }}>
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    color: T.muted,
                                                }}
                                            >
                                                No rooms selected
                                            </span>
                                        }
                                    />
                                </div>
                            )}

                            {/* Payment method */}
                            {selectedRoomsDetails.length > 0 && (
                                <>
                                    <Divider
                                        style={{
                                            margin: 0,
                                            borderColor: T.lineSoft,
                                        }}
                                    />
                                    <div style={{ padding: "16px 20px" }}>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: T.faint,
                                                textTransform: "uppercase",
                                                letterSpacing: 0.5,
                                                marginBottom: 8,
                                            }}
                                        >
                                            Payment method
                                        </div>

                                        {/* Single / Split toggle */}
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 6,
                                                marginBottom: 10,
                                            }}
                                        >
                                            {[
                                                {
                                                    value: "single" as const,
                                                    label: "Single method",
                                                },
                                                {
                                                    value: "split" as const,
                                                    label: "Split payment",
                                                },
                                            ].map((opt) => {
                                                const active =
                                                    paymentMode === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() =>
                                                            setPaymentMode(
                                                                opt.value,
                                                            )
                                                        }
                                                        style={{
                                                            padding: "6px 10px",
                                                            background: active
                                                                ? T.ink
                                                                : T.lineSoft,
                                                            color: active
                                                                ? T.white
                                                                : T.muted,
                                                            border: "none",
                                                            borderRadius: 7,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            fontFamily:
                                                                "inherit",
                                                            transition:
                                                                "all 0.15s",
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {paymentMode === "single" && (
                                            <>
                                                <div
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateColumns:
                                                            "1fr 1fr",
                                                        gap: 8,
                                                    }}
                                                >
                                                    {[
                                                        {
                                                            value: "cash" as const,
                                                            label: "Cash",
                                                            icon: (
                                                                <CreditCard
                                                                    size={14}
                                                                />
                                                            ),
                                                        },
                                                        {
                                                            value: "qrph" as const,
                                                            label: "QR Ph",
                                                            icon: (
                                                                <QrCode
                                                                    size={14}
                                                                />
                                                            ),
                                                        },
                                                    ].map((option) => {
                                                        const active =
                                                            paymentMethod ===
                                                            option.value;
                                                        return (
                                                            <button
                                                                key={
                                                                    option.value
                                                                }
                                                                onClick={() =>
                                                                    setPaymentMethod(
                                                                        option.value,
                                                                    )
                                                                }
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    gap: 6,
                                                                    padding:
                                                                        "10px 12px",
                                                                    background:
                                                                        active
                                                                            ? T.primarySoft
                                                                            : T.white,
                                                                    border: `1px solid ${active ? T.primaryBorder : T.line}`,
                                                                    color: active
                                                                        ? T.primary
                                                                        : T.inkSoft,
                                                                    borderRadius: 8,
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    cursor: "pointer",
                                                                    transition:
                                                                        "all 0.15s",
                                                                    fontFamily:
                                                                        "inherit",
                                                                }}
                                                            >
                                                                {option.icon}
                                                                {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {pendingBookingId &&
                                                    paymentMethod ===
                                                        "qrph" && (
                                                        <div
                                                            style={{
                                                                marginTop: 10,
                                                                padding:
                                                                    "10px 12px",
                                                                background:
                                                                    T.warnSoft,
                                                                border: `1px solid ${T.warnBorder}`,
                                                                borderRadius: 8,
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems:
                                                                    "center",
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: T.warn,
                                                                    lineHeight: 1.3,
                                                                }}
                                                            >
                                                                Unpaid QR
                                                                booking{" "}
                                                                <strong>
                                                                    #
                                                                    {
                                                                        pendingBookingId
                                                                    }
                                                                </strong>
                                                            </div>
                                                            <Button
                                                                size="small"
                                                                onClick={async () => {
                                                                    if (
                                                                        !pendingBookingId
                                                                    )
                                                                        return;
                                                                    setQrInFlight(
                                                                        true,
                                                                    );
                                                                    setQrModalOpen(
                                                                        true,
                                                                    );
                                                                    setQrAmount(
                                                                        pendingAmount,
                                                                    );
                                                                    await generateQr(
                                                                        pendingBookingId,
                                                                        pendingAmount,
                                                                    );
                                                                }}
                                                                style={{
                                                                    background:
                                                                        T.white,
                                                                    borderColor:
                                                                        T.warnBorder,
                                                                    color: T.warn,
                                                                    fontSize: 11,
                                                                    height: 26,
                                                                    borderRadius: 6,
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                Regenerate
                                                            </Button>
                                                        </div>
                                                    )}
                                            </>
                                        )}

                                        {paymentMode === "split" && (
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        marginBottom: 6,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 64,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: T.inkSoft,
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 5,
                                                        }}
                                                    >
                                                        <CreditCard size={12} />
                                                        Cash
                                                    </div>
                                                    <Input
                                                        size="small"
                                                        type="number"
                                                        placeholder="0.00"
                                                        prefix="₱"
                                                        value={
                                                            splitCashAmount ??
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setSplitCashAmount(
                                                                e.target
                                                                    .value ===
                                                                    ""
                                                                    ? null
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                        style={{
                                                            flex: 1,
                                                            borderRadius: 7,
                                                        }}
                                                    />
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        marginBottom: 8,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 64,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: T.inkSoft,
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 5,
                                                        }}
                                                    >
                                                        <QrCode size={12} />
                                                        QR Ph
                                                    </div>
                                                    <Input
                                                        size="small"
                                                        type="number"
                                                        placeholder="0.00"
                                                        prefix="₱"
                                                        value={
                                                            splitQrphAmount ??
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setSplitQrphAmount(
                                                                e.target
                                                                    .value ===
                                                                    ""
                                                                    ? null
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                        style={{
                                                            flex: 1,
                                                            borderRadius: 7,
                                                        }}
                                                    />
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: 11,
                                                        padding: "6px 2px",
                                                        color:
                                                            Math.abs(
                                                                splitRemaining,
                                                            ) < 0.01
                                                                ? T.primary
                                                                : T.warn,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <span>
                                                        {Math.abs(
                                                            splitRemaining,
                                                        ) < 0.01
                                                            ? "Fully allocated"
                                                            : splitRemaining > 0
                                                              ? "Remaining"
                                                              : "Over by"}
                                                    </span>
                                                    <span>
                                                        {formatPeso(
                                                            Math.abs(
                                                                splitRemaining,
                                                            ),
                                                        )}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: 8,
                                                        fontSize: 10,
                                                        color: T.faint,
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    Cash is collected now. The
                                                    guest will scan a QR code
                                                    for the remaining amount
                                                    before check-in is
                                                    finalized.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Total + Action */}
                            {selectedRoomsDetails.length > 0 && (
                                <>
                                    <Divider
                                        style={{
                                            margin: 0,
                                            borderColor: T.lineSoft,
                                        }}
                                    />
                                    <div style={{ padding: "16px 20px 20px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "baseline",
                                                marginBottom: 14,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    color: T.muted,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Total amount
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 22,
                                                    fontWeight: 700,
                                                    color: T.ink,
                                                    letterSpacing: -0.4,
                                                    fontVariantNumeric:
                                                        "tabular-nums",
                                                }}
                                            >
                                                {formatPeso(totalAmount)}
                                            </span>
                                        </div>

                                        <Button
                                            type="primary"
                                            size="large"
                                            block
                                            icon={
                                                paymentMode === "single" &&
                                                paymentMethod === "qrph" ? (
                                                    <QrCode size={14} />
                                                ) : (
                                                    <ArrowRight size={14} />
                                                )
                                            }
                                            onClick={handleSubmit}
                                            loading={loading}
                                            disabled={completeDisabled}
                                            style={{
                                                background: T.primary,
                                                borderColor: T.primary,
                                                height: 44,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                borderRadius: 9,
                                                letterSpacing: 0.1,
                                            }}
                                        >
                                            {paymentMode === "single" &&
                                            paymentMethod === "qrph"
                                                ? pendingBookingId
                                                    ? "Retry QR payment"
                                                    : "Generate QR"
                                                : "Complete check-in"}
                                        </Button>

                                        {!selectedGuest && (
                                            <div
                                                style={{
                                                    marginTop: 10,
                                                    textAlign: "center",
                                                    fontSize: 11,
                                                    color: T.warn,
                                                }}
                                            >
                                                Select a guest to continue
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </Col>
                </Row>
            </div>

            {/* ── New Guest Modal ── */}
            <Modal
                open={showGuestModal}
                onCancel={() => setShowGuestModal(false)}
                footer={null}
                centered
                width={540}
                destroyOnHidden
                styles={
                    {
                        content: {
                            padding: 0,
                            overflow: "hidden",
                            borderRadius: 16,
                        },
                        body: {
                            padding: 0,
                        },
                    } as any
                }
            >
                <div>
                    {/* Modal header */}
                    <div
                        style={{
                            padding: "20px 24px 16px",
                            borderBottom: `1px solid ${T.lineSoft}`,
                            background: T.white,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: T.primarySoft,
                                    border: `1px solid ${T.primaryBorder}`,
                                    color: T.primary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <UserPlus size={19} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 17,
                                        fontWeight: 700,
                                        color: T.ink,
                                        lineHeight: 1.25,
                                    }}
                                >
                                    Add new guest
                                </div>
                                <div
                                    style={{
                                        marginTop: 3,
                                        fontSize: 12,
                                        color: T.muted,
                                    }}
                                >
                                    Enter the guest's information to continue.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal body */}
                    <div
                        style={{
                            padding: "20px 24px 8px",
                            background: T.white,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "16px 12px",
                            }}
                        >
                            <div>
                                <FieldLabel>
                                    First name{" "}
                                    <span style={{ color: T.danger }}>*</span>
                                </FieldLabel>
                                <Input
                                    size="large"
                                    placeholder="e.g. Juan"
                                    prefix={
                                        <User
                                            size={15}
                                            style={{ color: T.faint }}
                                        />
                                    }
                                    value={newGuestForm.first_name}
                                    onChange={(e) =>
                                        setNewGuestForm({
                                            ...newGuestForm,
                                            first_name: e.target.value,
                                        })
                                    }
                                    style={{
                                        height: 44,
                                        borderRadius: 9,
                                    }}
                                />
                            </div>

                            <div>
                                <FieldLabel>Middle name</FieldLabel>
                                <Input
                                    size="large"
                                    placeholder="Optional"
                                    value={newGuestForm.middle_name}
                                    onChange={(e) =>
                                        setNewGuestForm({
                                            ...newGuestForm,
                                            middle_name: e.target.value,
                                        })
                                    }
                                    style={{
                                        height: 44,
                                        borderRadius: 9,
                                    }}
                                />
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <FieldLabel>
                                    Last name{" "}
                                    <span style={{ color: T.danger }}>*</span>
                                </FieldLabel>
                                <Input
                                    size="large"
                                    placeholder="e.g. Dela Cruz"
                                    prefix={
                                        <User
                                            size={15}
                                            style={{ color: T.faint }}
                                        />
                                    }
                                    value={newGuestForm.last_name}
                                    onChange={(e) =>
                                        setNewGuestForm({
                                            ...newGuestForm,
                                            last_name: e.target.value,
                                        })
                                    }
                                    style={{
                                        height: 44,
                                        borderRadius: 9,
                                    }}
                                />
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <FieldLabel>
                                    Philippine mobile number{" "}
                                    <span style={{ color: T.danger }}>*</span>
                                </FieldLabel>

                                <Input
                                    size="large"
                                    prefix={
                                        <Phone
                                            size={15}
                                            style={{ color: T.faint }}
                                        />
                                    }
                                    addonBefore={
                                        <span
                                            style={{
                                                color: T.inkSoft,
                                                fontWeight: 600,
                                                fontSize: 13,
                                            }}
                                        >
                                            +63
                                        </span>
                                    }
                                    placeholder="9171234567"
                                    value={localMobile}
                                    inputMode="numeric"
                                    maxLength={10}
                                    status={
                                        localMobile.length > 0 && !mobileIsValid
                                            ? "error"
                                            : undefined
                                    }
                                    onChange={(e) => {
                                        const next = normalizeMobile(
                                            e.target.value,
                                        );
                                        setNewGuestForm({
                                            ...newGuestForm,
                                            contact_number: next
                                                ? `0${next}`
                                                : "",
                                        });
                                    }}
                                    style={{
                                        height: 44,
                                        borderRadius: 9,
                                    }}
                                />

                                {localMobile.length === 0 ? (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: T.muted,
                                        }}
                                    >
                                        Enter 10 digits after +63. Example:{" "}
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: T.inkSoft,
                                            }}
                                        >
                                            +63 9171234567
                                        </span>
                                    </div>
                                ) : localMobile.length < 10 ? (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: T.danger,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <AlertTriangle size={11} />
                                        Number is too short —{" "}
                                        {10 - localMobile.length} more digit
                                        {10 - localMobile.length > 1
                                            ? "s"
                                            : ""}{" "}
                                        needed.
                                    </div>
                                ) : localMobile.length > 10 ? (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: T.danger,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <AlertTriangle size={11} />
                                        Number is too long —{" "}
                                        {localMobile.length - 10} extra digit
                                        {localMobile.length - 10 > 1 ? "s" : ""}
                                        .
                                    </div>
                                ) : !mobileIsValid ? (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: T.danger,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <AlertTriangle size={11} />
                                        Mobile number must start with 9.
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: T.primary,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <CheckCircle size={11} />
                                        Valid mobile number
                                    </div>
                                )}
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <FieldLabel>Address</FieldLabel>
                                <Input.TextArea
                                    placeholder="Enter complete address"
                                    value={newGuestForm.address}
                                    onChange={(e) =>
                                        setNewGuestForm({
                                            ...newGuestForm,
                                            address: e.target.value,
                                        })
                                    }
                                    autoSize={{ minRows: 3, maxRows: 4 }}
                                    style={{
                                        borderRadius: 9,
                                        resize: "none",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modal footer */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 10,
                            padding: "16px 24px 20px",
                            background: T.white,
                            borderTop: `1px solid ${T.lineSoft}`,
                        }}
                    >
                        <Button
                            size="large"
                            onClick={() => setShowGuestModal(false)}
                            disabled={savingGuest}
                            style={{
                                minWidth: 100,
                                height: 42,
                                borderRadius: 9,
                                borderColor: T.line,
                                color: T.inkSoft,
                                fontWeight: 500,
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="primary"
                            size="large"
                            loading={savingGuest}
                            onClick={handleSaveNewGuest}
                            disabled={!guestFormIsValid || savingGuest}
                            style={{
                                minWidth: 130,
                                height: 42,
                                borderRadius: 9,
                                background: T.primary,
                                borderColor: T.primary,
                                fontWeight: 600,
                            }}
                        >
                            Save guest
                        </Button>
                    </div>
                </div>
            </Modal>

            <AddOnsModal
                visible={showAddOnsModal}
                onClose={() => {
                    setShowAddOnsModal(false);
                    setCurrentRoomForAddOns(null);
                }}
                onConfirm={handleAddOnsConfirm}
                initialSelected={getCurrentRoomAddOns()}
                roomNumber={getCurrentRoomNumber()}
            />

            <QrModal
                open={qrModalOpen}
                status={qrStatus}
                session={qrSession}
                amount={qrAmount}
                secondsLeft={qrSecondsLeft}
                totalSeconds={qrTotalSeconds}
                errorMessage={qrErrorMessage}
                onCancel={handleQrCancel}
                onRegenerate={handleQrRegenerate}
            />

            <ReceiptModal
                isOpen={showReceiptModal}
                onClose={() => {
                    setShowReceiptModal(false);
                    setCurrentPaymentId(null);
                }}
                paymentId={currentPaymentId}
            />
        </div>
    );
}

// ==================== EXPORT ====================
export default function WalkIn() {
    return (
        <App>
            <WalkInContent />
        </App>
    );
}
