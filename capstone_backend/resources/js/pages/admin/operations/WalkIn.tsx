// src/pages/WalkIn.tsx
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Input,
    Button,
    Card,
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
    Spin,
    AutoComplete,
    Badge,
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
    Calendar,
    Home,
    ChevronDown,
    ChevronRight,
    IdCard,
    QrCode,
    AlertTriangle,
    Loader2,
} from "lucide-react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import ReceiptModal from "./ReceiptModal";

const { Title, Text } = Typography;

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

// ==================== COLLAPSIBLE GUEST CARD ====================
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
    searchingGuests,
}: GuestCardProps) {
    const [expanded, setExpanded] = useState(!selectedGuest);

    useEffect(() => {
        if (!selectedGuest) {
            setExpanded(true);
        }
    }, [selectedGuest]);

    if (selectedGuest) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: "#ffffff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    marginBottom: 24,
                }}
            >
                <div
                    style={{
                        padding: "16px 20px",
                        background: "#f8f9fa",
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                    }}
                    onClick={() => setExpanded(!expanded)}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        <Avatar
                            icon={<User size={20} />}
                            style={{
                                background: "#059669",
                                width: 40,
                                height: 40,
                            }}
                        />
                        <div>
                            <Text
                                strong
                                style={{ fontSize: 16, color: "#111827" }}
                            >
                                {selectedGuest.full_name}
                            </Text>
                            <div style={{ fontSize: 12, color: "#6c757d" }}>
                                Selected Guest
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        {!expanded && (
                            <div style={{ display: "flex", gap: 8 }}>
                                {selectedGuest.contact_number && (
                                    <Tag
                                        icon={<Phone size={12} />}
                                        color="default"
                                    >
                                        {selectedGuest.contact_number}
                                    </Tag>
                                )}
                            </div>
                        )}
                        {expanded ? (
                            <ChevronDown size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                        <Button
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClearGuest();
                            }}
                            icon={<X size={14} />}
                        >
                            Change
                        </Button>
                    </div>
                </div>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: "hidden" }}
                        >
                            <div style={{ padding: 20 }}>
                                <Row gutter={[16, 16]}>
                                    {selectedGuest.contact_number && (
                                        <Col xs={24} sm={12}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <Phone
                                                    size={16}
                                                    style={{ color: "#059669" }}
                                                />
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{ fontSize: 12 }}
                                                    >
                                                        Contact Number
                                                    </Text>
                                                    <div>
                                                        <Text>
                                                            {
                                                                selectedGuest.contact_number
                                                            }
                                                        </Text>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    )}
                                    {selectedGuest.address && (
                                        <Col xs={24} sm={12}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <MapPin
                                                    size={16}
                                                    style={{ color: "#059669" }}
                                                />
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{ fontSize: 12 }}
                                                    >
                                                        Address
                                                    </Text>
                                                    <div>
                                                        <Text>
                                                            {
                                                                selectedGuest.address
                                                            }
                                                        </Text>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    )}
                                    <Col xs={24}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <IdCard
                                                size={16}
                                                style={{ color: "#059669" }}
                                            />
                                            <div>
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 12 }}
                                                >
                                                    Guest ID
                                                </Text>
                                                <div>
                                                    <Text code>
                                                        #{selectedGuest.id}
                                                    </Text>
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                marginBottom: 24,
            }}
        >
            <div
                style={{
                    padding: "16px 20px",
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar
                        icon={<User size={20} />}
                        style={{ background: "#9ca3af", width: 40, height: 40 }}
                    />
                    <div>
                        <Text strong style={{ fontSize: 16, color: "#111827" }}>
                            Guest Information
                        </Text>
                        <div style={{ fontSize: 12, color: "#6c757d" }}>
                            Select or add a guest
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ padding: 20 }}>
                <Row gutter={16}>
                    <Col xs={24} md={18}>
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
                                        style={{ padding: 8 }}
                                    >
                                        <div>
                                            <strong>{guest.full_name}</strong>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#6c757d",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            {guest.contact_number && (
                                                <span
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 4,
                                                    }}
                                                >
                                                    <Phone size={12} />
                                                    {guest.contact_number}
                                                </span>
                                            )}
                                            {guest.address && (
                                                <span
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 4,
                                                    }}
                                                >
                                                    <MapPin size={12} />
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
                                placeholder="Search existing guest by name, contact, or address..."
                                prefix={
                                    <Search
                                        size={16}
                                        style={{ color: "#9ca3af" }}
                                    />
                                }
                            />
                        </AutoComplete>
                    </Col>
                    <Col xs={24} md={6}>
                        <Button
                            size="large"
                            icon={<UserPlus size={16} />}
                            onClick={onNewGuest}
                            block
                            style={{ borderColor: "#e5e7eb" }}
                        >
                            New Guest
                        </Button>
                    </Col>
                </Row>
            </div>
        </motion.div>
    );
}

// ==================== COLLAPSIBLE ROOM CARD ====================
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
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                marginBottom: 12,
            }}
        >
            <div
                style={{
                    padding: "16px 20px",
                    background: "#fafbfc",
                    borderBottom: expanded ? "1px solid #e5e7eb" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                    }}
                >
                    <Avatar
                        icon={<Home size={20} />}
                        style={{ background: "#059669", width: 40, height: 40 }}
                    />
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                            }}
                        >
                            <Text
                                strong
                                style={{ fontSize: 16, color: "#111827" }}
                            >
                                Room {room.room_number}
                            </Text>
                            <Tag
                                color={
                                    room.stay_type === "short_stay"
                                        ? "orange"
                                        : "blue"
                                }
                            >
                                {room.stay_type === "short_stay"
                                    ? "Short Stay"
                                    : `Overnight (${room.nights} night${room.nights > 1 ? "s" : ""})`}
                            </Tag>
                            {room.addons.length > 0 && (
                                <Tag
                                    color="green"
                                    style={{
                                        background: "#ecfdf5",
                                        borderColor: "#d1fae5",
                                    }}
                                >
                                    {room.addons.length} Extras
                                </Tag>
                            )}
                        </div>
                        {!expanded && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#6c757d",
                                    marginTop: 4,
                                }}
                            >
                                <Calendar
                                    size={12}
                                    style={{ marginRight: 4 }}
                                />{" "}
                                {formatDate(room.check_in_date)} →{" "}
                                {formatDate(room.check_out_date)}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Text strong style={{ fontSize: 18, color: "#059669" }}>
                        {formatCurrency(total)}
                    </Text>
                    {expanded ? (
                        <ChevronDown size={16} />
                    ) : (
                        <ChevronRight size={16} />
                    )}
                    <Button
                        danger
                        size="small"
                        icon={<Trash2 size={14} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(room.id);
                        }}
                    >
                        Remove
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div style={{ padding: 20 }}>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                    <div
                                        style={{
                                            background: "#f8f9fa",
                                            padding: 12,
                                            borderRadius: 8,
                                            border: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                        >
                                            Stay Details
                                        </Text>
                                        <div style={{ marginTop: 8 }}>
                                            <div>
                                                <Text strong>Check-in:</Text>{" "}
                                                <Text>
                                                    {formatDate(
                                                        room.check_in_date,
                                                    )}
                                                </Text>
                                            </div>
                                            <div>
                                                <Text strong>Check-out:</Text>{" "}
                                                <Text>
                                                    {formatDate(
                                                        room.check_out_date,
                                                    )}
                                                </Text>
                                            </div>
                                            <div>
                                                <Text strong>Duration:</Text>{" "}
                                                <Text>
                                                    {room.stay_type ===
                                                    "short_stay"
                                                        ? "3 hours"
                                                        : `${room.nights} night(s)`}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div
                                        style={{
                                            background: "#f8f9fa",
                                            padding: 12,
                                            borderRadius: 8,
                                            border: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                        >
                                            Rate Breakdown
                                        </Text>
                                        <div style={{ marginTop: 8 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                }}
                                            >
                                                <Text>Room rate:</Text>
                                                <Text strong>
                                                    {formatCurrency(
                                                        room.subtotal,
                                                    )}
                                                </Text>
                                            </div>
                                            {room.addons.map((addon) => (
                                                <div
                                                    key={addon.id}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    <Text>
                                                        {addon.add_on_name} x
                                                        {addon.quantity}:
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            color: "#059669",
                                                        }}
                                                    >
                                                        +
                                                        {formatCurrency(
                                                            addon.subtotal,
                                                        )}
                                                    </Text>
                                                </div>
                                            ))}
                                            <Divider
                                                style={{ margin: "8px 0" }}
                                            />
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                }}
                                            >
                                                <Text strong>Total:</Text>
                                                <Text
                                                    strong
                                                    style={{
                                                        color: "#059669",
                                                        fontSize: 16,
                                                    }}
                                                >
                                                    {formatCurrency(total)}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                </Col>

                                <Col xs={24}>
                                    <Button
                                        icon={<Gift size={16} />}
                                        onClick={() => onAddExtras(room.id)}
                                        style={{
                                            width: "100%",
                                            borderColor: "#e5e7eb",
                                        }}
                                    >
                                        {room.addons.length > 0
                                            ? "Edit Extras & Amenities"
                                            : "Add Extras & Amenities"}
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
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
                    quantity: quantity,
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

    const handleConfirm = () => {
        const selectedList = Array.from(selected.values());
        onConfirm(selectedList);
        onClose();
    };

    return (
        <Modal
            title={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <span style={{ fontSize: "18px", fontWeight: 600 }}>
                        Add Extras & Amenities
                    </span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            width={600}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button
                    key="confirm"
                    type="primary"
                    onClick={handleConfirm}
                    style={{ background: "#059669", borderColor: "#059669" }}
                    icon={<CheckCircle size={16} />}
                >
                    Add to Booking
                </Button>,
            ]}
        >
            <div style={{ padding: "16px 0" }}>
                {loading ? (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: "48px",
                        }}
                    >
                        <Spin size="large" />
                    </div>
                ) : addOns.length === 0 ? (
                    <Empty description="No add-ons available" />
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                    >
                        {addOns.map((addon) => {
                            const selectedAddon = selected.get(addon.id);
                            const quantity = selectedAddon?.quantity || 0;

                            return (
                                <div
                                    key={addon.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "16px",
                                        background: "#f8f9fa",
                                        borderRadius: "8px",
                                        border: "1px solid #e9ecef",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                color: "#212529",
                                                marginBottom: "4px",
                                            }}
                                        >
                                            {addon.add_on_name}
                                        </div>
                                        <div
                                            style={{
                                                color: "#059669",
                                                fontWeight: 600,
                                            }}
                                        >
                                            ₱{addon.price.toLocaleString()}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                        }}
                                    >
                                        <Button
                                            size="small"
                                            icon={<Minus size={14} />}
                                            onClick={() =>
                                                updateQuantity(
                                                    addon,
                                                    quantity - 1,
                                                )
                                            }
                                            disabled={quantity === 0}
                                            style={{
                                                borderRadius: "6px",
                                                width: "32px",
                                                height: "32px",
                                            }}
                                        />
                                        <span
                                            style={{
                                                width: "40px",
                                                textAlign: "center",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {quantity}
                                        </span>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<Plus size={14} />}
                                            onClick={() =>
                                                updateQuantity(
                                                    addon,
                                                    quantity + 1,
                                                )
                                            }
                                            style={{
                                                borderRadius: "6px",
                                                width: "32px",
                                                height: "32px",
                                                background: "#059669",
                                                borderColor: "#059669",
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
                            marginTop: "24px",
                            paddingTop: "16px",
                            borderTop: "2px solid #e9ecef",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "16px",
                                    fontWeight: 500,
                                    color: "#6c757d",
                                }}
                            >
                                Selected items total:
                            </span>
                            <span
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "bold",
                                    color: "#059669",
                                }}
                            >
                                ₱
                                {getTotal().toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ==================== QR PH MODAL ====================
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
            width={520}
            onCancel={
                status === "succeeded" || status === "loading"
                    ? undefined
                    : onCancel
            }
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <QrCode size={20} color="#059669" />
                    <span style={{ fontWeight: 600 }}>
                        Scan to Pay via QR Ph
                    </span>
                </div>
            }
        >
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <Text type="secondary">Amount due</Text>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: "#059669",
                        marginBottom: 16,
                    }}
                >
                    {new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                    }).format(amount)}
                </div>

                {status === "loading" && (
                    <div style={{ padding: "48px 0" }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16, color: "#6c757d" }}>
                            Generating QR code…
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div style={{ padding: "24px 0" }}>
                        <AlertTriangle size={48} color="#dc2626" />
                        <div
                            style={{
                                marginTop: 12,
                                color: "#dc2626",
                                fontWeight: 600,
                            }}
                        >
                            {errorMessage || "Failed to generate QR code"}
                        </div>
                        <Button
                            type="primary"
                            onClick={onRegenerate}
                            style={{
                                marginTop: 16,
                                background: "#059669",
                                borderColor: "#059669",
                            }}
                        >
                            Try Again
                        </Button>
                    </div>
                )}

                {(status === "waiting" || status === "expired") && session && (
                    <>
                        <div
                            style={{
                                position: "relative",
                                display: "inline-block",
                                padding: 16,
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            }}
                        >
                            <img
                                src={session.qrImageUrl}
                                alt="QR Ph code"
                                style={{
                                    width: 280,
                                    height: 280,
                                    display: "block",
                                    opacity: status === "expired" ? 0.3 : 1,
                                    transition: "opacity 0.3s",
                                }}
                            />

                            {status === "waiting" && (
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: 12,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        background: "rgba(255,255,255,0.95)",
                                        padding: "6px 12px",
                                        borderRadius: 999,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                        animation:
                                            "qrPulse 1.5s ease-in-out infinite",
                                    }}
                                >
                                    <Loader2 size={14} className="qr-spin" />
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#059669",
                                        }}
                                    >
                                        Waiting for payment…
                                    </span>
                                </div>
                            )}

                            {status === "expired" && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                    }}
                                >
                                    <AlertTriangle size={40} color="#f59e0b" />
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            color: "#b45309",
                                            fontSize: 16,
                                        }}
                                    >
                                        QR Expired
                                    </div>
                                </div>
                            )}
                        </div>

                        {status === "waiting" && (
                            <>
                                <div style={{ marginTop: 16 }}>
                                    <Progress
                                        percent={percent}
                                        showInfo={false}
                                        strokeColor="#059669"
                                        trailColor="#e5e7eb"
                                        strokeWidth={6}
                                    />
                                </div>
                                <div
                                    style={{
                                        marginTop: 8,
                                        fontSize: 14,
                                        color: "#374151",
                                    }}
                                >
                                    Expires in{" "}
                                    <strong>
                                        {minutes}:
                                        {String(seconds).padStart(2, "0")}
                                    </strong>
                                </div>
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: 12,
                                        color: "#6c757d",
                                    }}
                                >
                                    Ask the guest to scan with their bank or
                                    e-wallet app.
                                </div>

                                {import.meta.env.DEV && session.testUrl && (
                                    <div
                                        style={{
                                            marginTop: 12,
                                            padding: "8px 12px",
                                            background: "#fffbeb",
                                            border: "1px dashed #f59e0b",
                                            borderRadius: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "#b45309",
                                                marginBottom: 4,
                                                fontWeight: 600,
                                            }}
                                        >
                                            SANDBOX TEST TOOL
                                        </div>

                                        <a
                                            href={session.testUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: 12,
                                                color: "#b45309",
                                                textDecoration: "underline",
                                            }}
                                        >
                                            Open PayMongo test payment page →
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
                                        background: "#059669",
                                        borderColor: "#059669",
                                        height: 44,
                                        fontWeight: 600,
                                    }}
                                    icon={<QrCode size={16} />}
                                >
                                    Generate New QR
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {status === "succeeded" && (
                    <div style={{ padding: "24px 0" }}>
                        <CheckCircle size={56} color="#059669" />
                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 18,
                                fontWeight: 700,
                                color: "#059669",
                            }}
                        >
                            Payment Confirmed!
                        </div>
                        <div style={{ marginTop: 4, color: "#6c757d" }}>
                            Finalizing check-in…
                        </div>
                    </div>
                )}
            </div>

            {status !== "succeeded" && status !== "loading" && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: 12,
                    }}
                >
                    <Button onClick={onCancel}>
                        Cancel &amp; Switch Payment
                    </Button>
                </div>
            )}

            <style>{`
                @keyframes qrPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .qr-spin {
                    animation: qrSpin 1s linear infinite;
                }
                @keyframes qrSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </Modal>
    );
}

// ==================== MAIN WALK-IN COMPONENT ====================
function WalkInContent() {
    const queryClient = useQueryClient();
    const { modal } = App.useApp();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomsDetails, setSelectedRoomsDetails] = useState<
        SelectedRoom[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "qrph">("cash");
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

    // Receipt modal
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(
        null,
    );

    // QR Ph modal state
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrSession, setQrSession] = useState<QrSession | null>(null);
    const [qrStatus, setQrStatus] = useState<QrStatus>("loading");
    const [qrSecondsLeft, setQrSecondsLeft] = useState(1800);
    const [qrTotalSeconds, setQrTotalSeconds] = useState(1800);
    const [qrErrorMessage, setQrErrorMessage] = useState<string>("");
    const [qrAmount, setQrAmount] = useState<number>(0);
    const [qrInFlight, setQrInFlight] = useState<boolean>(false);

    // Refs for timers/polling (avoid stale closures)
    const pollTimerRef = useRef<number | null>(null);
    const countdownTimerRef = useRef<number | null>(null);
    const qrSessionRef = useRef<QrSession | null>(null);
    const secondsLeftRef = useRef<number>(1800);
    const qrStatusRef = useRef<QrStatus>("loading");

    useEffect(() => {
        secondsLeftRef.current = qrSecondsLeft;
    }, [qrSecondsLeft]);

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

    useEffect(() => {
        return () => {
            clearQrTimers();
        };
    }, []);

    useEffect(() => {
        fetchRooms();
    }, []);

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

    useEffect(() => {
        fetchRooms();
    }, [selectedRoomsDetails]);

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
        if (!newGuestForm.first_name.trim() || !newGuestForm.last_name.trim()) {
            message.warning("Please enter first name and last name");
            return;
        }
        setSavingGuest(true);
        try {
            const response = await api.post(
                "/walk-in-guests/guest",
                newGuestForm,
            );
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

    const handleClearGuest = () => {
        setSelectedGuest(null);
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

    const getNightsCount = (checkIn: string, checkOut: string) => {
        return Math.max(1, dayjs(checkOut).diff(dayjs(checkIn), "day"));
    };

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
        if (stayType === "short_stay") {
            return pricePerUnit;
        } else {
            return pricePerUnit * getNightsCount(checkIn, checkOut);
        }
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
            message.success(`Extras added to room`);
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

    const calculateTotal = (): number => {
        return selectedRoomsDetails.reduce((sum, room) => {
            return Number(sum) + Number(calculateRoomTotalWithAddOns(room));
        }, 0);
    };

    const getCurrentRoomAddOns = (): SelectedAddOn[] => {
        if (currentRoomForAddOns === null) return [];
        const room = selectedRoomsDetails.find(
            (r) => r.id === currentRoomForAddOns,
        );
        return room?.addons || [];
    };

    const getCurrentRoomNumber = (): string => {
        if (currentRoomForAddOns === null) return "";
        const room = selectedRoomsDetails.find(
            (r) => r.id === currentRoomForAddOns,
        );
        return room?.room_number || "";
    };

    // ---------- QR Ph helpers ----------

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
        secondsLeftRef.current = seconds;

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
            // Stop if modal was dismissed or already done
            if (qrStatusRef.current !== "waiting") return;

            try {
                const res = await api.get(
                    `/paymongo/qr/status/${session.paymentIntentId}`,
                    { params: { client_key: session.clientKey } },
                );

                const status = res.data?.status as string;

                if (status === "succeeded") {
                    stopPolling();
                    stopCountdown();
                    setQrStatus("succeeded");

                    // Confirm on backend -> flips rooms to checked_in & payment to paid
                    const confirmRes = await api.post(
                        `/walk-in-guests/${session.bookingId}/confirm-qr`,
                        { payment_reference: res.data?.payment_id ?? null },
                    );

                    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                    queryClient.invalidateQueries({ queryKey: ["rooms"] });
                    queryClient.invalidateQueries({ queryKey: ["bookings"] });

                    message.success({
                        content: "QR Ph payment confirmed!",
                        duration: 3,
                    });

                    // Brief delay so the success state is visible
                    setTimeout(() => {
                        setQrModalOpen(false);
                        setQrStatus("loading");
                        setQrInFlight(false);
                        setQrSession(null);
                        qrSessionRef.current = null;

                        // Show receipt modal exactly like Cash
                        const paymentId =
                            confirmRes.data?.payment_id ?? res.data?.payment_id;

                        if (paymentId) {
                            setCurrentPaymentId(String(paymentId));
                            setShowReceiptModal(true);
                        }

                        // Reset form
                        setSelectedGuest(null);
                        setSelectedRoomsDetails([]);
                        setSelectedRoomValue(null);
                        setPreviewAmount(0);
                        fetchRooms();
                    }, 900);

                    return;
                }
            } catch (err: any) {
                console.warn("QR status poll failed", err?.message || err);
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
            title: "Cancel QR Ph payment?",
            content:
                "The booking is reserved but unpaid. You can switch to Cash, edit the booking, or retry QR Ph later.",
            okText: "Yes, cancel",
            okButtonProps: { danger: true },
            cancelText: "Keep waiting",
            onOk: () => {
                setQrModalOpen(false);
                setQrStatus("loading");
                setQrInFlight(false);
                setQrSession(null);
                qrSessionRef.current = null;

                // Leave the booking record as-is (pending). Admin can reconcile.
                setSelectedGuest(null);
                setSelectedRoomsDetails([]);
                setSelectedRoomValue(null);
                setPreviewAmount(0);
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

            const payload = {
                guest_id: selectedGuest.id,
                bookings: bookingsData,
                total_amount: totalAmount,
                payment_method: paymentMethod,
            };

            const response = await api.post("/walk-in-guests/checkin", payload);

            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });

            if (paymentMethod === "cash") {
                message.success({
                    content: `Check-in successful! Guest checked into ${selectedRoomsDetails.length} room(s)`,
                    duration: 3,
                    icon: <CheckCircle size={20} />,
                });

                const paymentId = response.data.payment_id;
                setCurrentPaymentId(paymentId);
                setShowReceiptModal(true);

                setSelectedGuest(null);
                setSelectedRoomsDetails([]);
                setSelectedRoomValue(null);
                setPreviewAmount(0);
                await fetchRooms();
            } else {
                // QR Ph: booking created as pending; now generate QR
                const bookingId = response.data.booking_id;
                setQrInFlight(true);
                setQrModalOpen(true);
                setQrAmount(totalAmount);
                await generateQr(bookingId, totalAmount);
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

    const handleCloseReceiptModal = () => {
        setShowReceiptModal(false);
        setCurrentPaymentId(null);
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return dayjs(date).format("MMM DD, YYYY");
    };

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
    const primaryColor = "#059669";
    const borderColor = "#e5e7eb";
    const bgGray = "#f9fafb";

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

    const completeDisabled =
        selectedRoomsDetails.length === 0 || !selectedGuest || qrInFlight;

    return (
        <div
            style={{
                minHeight: "100vh",
                position: "relative",
                top: "-25px",
                padding: "24px",
            }}
        >
            <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div style={{ marginBottom: 24 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                marginBottom: 24,
                            }}
                        >
                            <div
                                style={{
                                    background: primaryColor,
                                    padding: 12,
                                    borderRadius: 12,
                                    boxShadow:
                                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                }}
                            >
                                <Users size={28} color="white" />
                            </div>
                            <div>
                                <Title
                                    level={3}
                                    style={{ margin: 0, color: "#111827" }}
                                >
                                    Walk-In Guest Registration
                                </Title>
                                <Text type="secondary">
                                    Register and assign rooms with add-ons
                                </Text>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <Row gutter={[24, 24]}>
                    {/* Main Form */}
                    <Col xs={24} lg={16}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <GuestCard
                                selectedGuest={selectedGuest}
                                onSelectGuest={handleSelectGuest}
                                onNewGuest={handleNewGuestClick}
                                onClearGuest={handleClearGuest}
                                searchResults={searchResults}
                                onSearchGuests={searchGuests}
                                searchingGuests={searchingGuests}
                            />

                            {selectedGuest && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: 12,
                                        border: `1px solid ${borderColor}`,
                                        overflow: "hidden",
                                        marginBottom: 24,
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "16px 20px",
                                            background: "#f8f9fa",
                                            borderBottom: addRoomExpanded
                                                ? `1px solid ${borderColor}`
                                                : "none",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            cursor: "pointer",
                                        }}
                                        onClick={() =>
                                            setAddRoomExpanded(!addRoomExpanded)
                                        }
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 12,
                                            }}
                                        >
                                            <Avatar
                                                icon={<Plus size={20} />}
                                                style={{
                                                    background: "#059669",
                                                    width: 40,
                                                    height: 40,
                                                }}
                                            />
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: 16,
                                                        color: "#111827",
                                                    }}
                                                >
                                                    Add Room
                                                </Text>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#6c757d",
                                                    }}
                                                >
                                                    Select room and stay details
                                                </div>
                                            </div>
                                        </div>
                                        {addRoomExpanded ? (
                                            <ChevronDown size={16} />
                                        ) : (
                                            <ChevronRight size={16} />
                                        )}
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
                                                transition={{ duration: 0.3 }}
                                                style={{ overflow: "hidden" }}
                                            >
                                                <div style={{ padding: 20 }}>
                                                    <Row gutter={16}>
                                                        <Col xs={24} md={8}>
                                                            <div
                                                                style={{
                                                                    marginBottom: 8,
                                                                    color: "#374151",
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                Room
                                                            </div>
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
                                                                                        -{" "}
                                                                                        {formatCurrency(
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
                                                        </Col>
                                                        <Col xs={24} md={5}>
                                                            <div
                                                                style={{
                                                                    marginBottom: 8,
                                                                    color: "#374151",
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                Stay Type
                                                            </div>
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
                                                                    Short Stay
                                                                    (3hrs)
                                                                </Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col xs={24} md={5}>
                                                            <div
                                                                style={{
                                                                    marginBottom: 8,
                                                                    color: "#374151",
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                Check-in
                                                            </div>
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
                                                        </Col>
                                                        <Col xs={24} md={6}>
                                                            <div
                                                                style={{
                                                                    marginBottom: 8,
                                                                    color: "#374151",
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                Check-out
                                                            </div>
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
                                                        </Col>
                                                    </Row>

                                                    {selectedRoomValue &&
                                                        previewAmount > 0 && (
                                                            <div
                                                                style={{
                                                                    marginTop: 16,
                                                                    padding: 12,
                                                                    background:
                                                                        bgGray,
                                                                    borderRadius: 8,
                                                                    border: `1px solid ${borderColor}`,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "space-between",
                                                                    }}
                                                                >
                                                                    <Text
                                                                        strong
                                                                        style={{
                                                                            color: "#374151",
                                                                        }}
                                                                    >
                                                                        Preview
                                                                        Amount:
                                                                    </Text>
                                                                    <Text
                                                                        strong
                                                                        style={{
                                                                            color: primaryColor,
                                                                            fontSize: 18,
                                                                        }}
                                                                    >
                                                                        {formatCurrency(
                                                                            previewAmount,
                                                                        )}
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                        )}

                                                    <div
                                                        style={{
                                                            marginTop: 16,
                                                            textAlign: "right",
                                                        }}
                                                    >
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <Plus
                                                                    size={16}
                                                                />
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
                                                                } else {
                                                                    message.warning(
                                                                        "Select a room first",
                                                                    );
                                                                }
                                                            }}
                                                            style={{
                                                                background:
                                                                    primaryColor,
                                                                borderColor:
                                                                    primaryColor,
                                                            }}
                                                        >
                                                            Add Room
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {selectedRoomsDetails.length > 0 && (
                                <div>
                                    <div style={{ marginBottom: 16 }}>
                                        <Title
                                            level={5}
                                            style={{ color: "#374151" }}
                                        >
                                            Selected Rooms (
                                            {selectedRoomsDetails.length})
                                        </Title>
                                    </div>
                                    <AnimatePresence>
                                        {selectedRoomsDetails.map((room) => (
                                            <RoomCard
                                                key={room.id}
                                                room={room}
                                                onRemove={removeRoom}
                                                onAddExtras={openAddOnsForRoom}
                                                formatCurrency={formatCurrency}
                                                formatDate={formatDate}
                                                calculateRoomTotal={
                                                    calculateRoomTotalWithAddOns
                                                }
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    </Col>

                    {/* Summary Sidebar */}
                    <Col xs={24} lg={8}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card
                                style={{
                                    borderRadius: 12,
                                    border: `1px solid ${borderColor}`,
                                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                                    position: "sticky",
                                    top: 24,
                                }}
                            >
                                <Title
                                    level={5}
                                    style={{
                                        color: "#374151",
                                        marginBottom: 16,
                                    }}
                                >
                                    Payment Summary
                                </Title>

                                {selectedRoomsDetails.length > 0 ? (
                                    <>
                                        <div
                                            style={{
                                                maxHeight: 400,
                                                overflowY: "auto",
                                                marginBottom: 16,
                                            }}
                                        >
                                            {selectedRoomsDetails.map(
                                                (room) => {
                                                    const roomTotal =
                                                        calculateRoomTotalWithAddOns(
                                                            room,
                                                        );
                                                    return (
                                                        <div
                                                            key={room.id}
                                                            style={{
                                                                marginBottom: 16,
                                                                paddingBottom: 12,
                                                                borderBottom: `1px solid ${borderColor}`,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    justifyContent:
                                                                        "space-between",
                                                                    marginBottom: 8,
                                                                }}
                                                            >
                                                                <Text
                                                                    strong
                                                                    style={{
                                                                        color: "#111827",
                                                                    }}
                                                                >
                                                                    Room{" "}
                                                                    {
                                                                        room.room_number
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    strong
                                                                    style={{
                                                                        color: primaryColor,
                                                                    }}
                                                                >
                                                                    {formatCurrency(
                                                                        roomTotal,
                                                                    )}
                                                                </Text>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    marginLeft: 16,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "space-between",
                                                                        fontSize: 12,
                                                                        marginBottom: 4,
                                                                    }}
                                                                >
                                                                    <Text type="secondary">
                                                                        Room
                                                                        rate (
                                                                        {room.stay_type ===
                                                                        "short_stay"
                                                                            ? "Short Stay"
                                                                            : `${room.nights} night${room.nights > 1 ? "s" : ""}`}
                                                                        )
                                                                    </Text>
                                                                    <Text type="secondary">
                                                                        {formatCurrency(
                                                                            room.subtotal,
                                                                        )}
                                                                    </Text>
                                                                </div>
                                                                {room.addons.map(
                                                                    (addon) => (
                                                                        <div
                                                                            key={
                                                                                addon.id
                                                                            }
                                                                            style={{
                                                                                display:
                                                                                    "flex",
                                                                                justifyContent:
                                                                                    "space-between",
                                                                                fontSize: 12,
                                                                                marginTop: 4,
                                                                            }}
                                                                        >
                                                                            <Text type="secondary">
                                                                                {
                                                                                    addon.add_on_name
                                                                                }{" "}
                                                                                x
                                                                                {
                                                                                    addon.quantity
                                                                                }
                                                                            </Text>
                                                                            <Text
                                                                                type="secondary"
                                                                                style={{
                                                                                    color: "#059669",
                                                                                }}
                                                                            >
                                                                                +
                                                                                {formatCurrency(
                                                                                    addon.subtotal,
                                                                                )}
                                                                            </Text>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                            <Text
                                                                type="secondary"
                                                                style={{
                                                                    fontSize: 12,
                                                                    display:
                                                                        "block",
                                                                    marginTop: 8,
                                                                }}
                                                            >
                                                                <Calendar
                                                                    size={12}
                                                                    style={{
                                                                        marginRight: 4,
                                                                    }}
                                                                />{" "}
                                                                {formatDate(
                                                                    room.check_in_date,
                                                                )}{" "}
                                                                →{" "}
                                                                {formatDate(
                                                                    room.check_out_date,
                                                                )}
                                                            </Text>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>

                                        <div style={{ marginBottom: 20 }}>
                                            <div
                                                style={{
                                                    marginBottom: 8,
                                                    fontWeight: 600,
                                                    color: "#374151",
                                                }}
                                            >
                                                Payment Method
                                            </div>

                                            <Select
                                                size="large"
                                                value={paymentMethod}
                                                onChange={(value) =>
                                                    setPaymentMethod(
                                                        value as
                                                            | "cash"
                                                            | "qrph",
                                                    )
                                                }
                                                style={{ width: "100%" }}
                                            >
                                                <Select.Option value="cash">
                                                    Cash
                                                </Select.Option>
                                                <Select.Option value="qrph">
                                                    QR Ph
                                                </Select.Option>
                                            </Select>

                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    fontSize: 12,
                                                    color: "#6c757d",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                {paymentMethod === "cash" ? (
                                                    <>
                                                        <CreditCard
                                                            size={14}
                                                            color="#059669"
                                                        />
                                                        Instant — cash collected
                                                        at the counter.
                                                    </>
                                                ) : (
                                                    <>
                                                        <QrCode
                                                            size={14}
                                                            color="#059669"
                                                        />
                                                        Guest scans a dynamic QR
                                                        Ph. Check-in finalises
                                                        automatically once paid.
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Divider style={{ margin: "12px 0" }} />

                                        <div
                                            style={{
                                                textAlign: "right",
                                                marginBottom: 20,
                                            }}
                                        >
                                            <Text type="secondary">
                                                Total Amount
                                            </Text>
                                            <div
                                                style={{
                                                    fontSize: 36,
                                                    fontWeight: "bold",
                                                    color: primaryColor,
                                                    marginTop: 4,
                                                }}
                                            >
                                                {formatCurrency(totalAmount)}
                                            </div>
                                            <div
                                                style={{
                                                    marginTop: 12,
                                                    display: "flex",
                                                    gap: 8,
                                                    justifyContent: "flex-end",
                                                }}
                                            >
                                                <Badge
                                                    count={`${selectedRoomsDetails.filter((r) => r.stay_type === "short_stay").length} Short Stay`}
                                                    style={{
                                                        backgroundColor:
                                                            "#f59e0b",
                                                    }}
                                                />
                                                <Badge
                                                    count={`${selectedRoomsDetails.filter((r) => r.stay_type === "overnight").length} Overnight`}
                                                    style={{
                                                        backgroundColor:
                                                            "#3b82f6",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <Empty description="No rooms selected" />
                                )}

                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    icon={
                                        paymentMethod === "qrph" ? (
                                            <QrCode size={16} />
                                        ) : (
                                            <CreditCard size={16} />
                                        )
                                    }
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={completeDisabled}
                                    style={{
                                        background: primaryColor,
                                        borderColor: primaryColor,
                                        height: 52,
                                        fontSize: 16,
                                        fontWeight: 600,
                                    }}
                                >
                                    {paymentMethod === "qrph"
                                        ? `Generate QR & Check-in (${formatCurrency(totalAmount)})`
                                        : `Complete Check-in (${formatCurrency(totalAmount)})`}
                                </Button>

                                {!selectedGuest &&
                                    selectedRoomsDetails.length > 0 && (
                                        <div
                                            style={{
                                                marginTop: 12,
                                                textAlign: "center",
                                            }}
                                        >
                                            <Text type="danger">
                                                Please select a guest first
                                            </Text>
                                        </div>
                                    )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </div>

            {/* New Guest Modal */}
            <Modal
                title="Add New Guest"
                open={showGuestModal}
                onCancel={() => setShowGuestModal(false)}
                onOk={handleSaveNewGuest}
                confirmLoading={savingGuest}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    <Input
                        placeholder="First Name *"
                        value={newGuestForm.first_name}
                        onChange={(e) =>
                            setNewGuestForm({
                                ...newGuestForm,
                                first_name: e.target.value,
                            })
                        }
                        prefix={<User size={16} />}
                        size="large"
                    />
                    <Input
                        placeholder="Middle Name"
                        value={newGuestForm.middle_name}
                        onChange={(e) =>
                            setNewGuestForm({
                                ...newGuestForm,
                                middle_name: e.target.value,
                            })
                        }
                        prefix={<User size={16} />}
                        size="large"
                    />
                    <Input
                        placeholder="Last Name *"
                        value={newGuestForm.last_name}
                        onChange={(e) =>
                            setNewGuestForm({
                                ...newGuestForm,
                                last_name: e.target.value,
                            })
                        }
                        prefix={<User size={16} />}
                        size="large"
                    />
                    <Input
                        placeholder="Contact Number"
                        value={newGuestForm.contact_number}
                        onChange={(e) =>
                            setNewGuestForm({
                                ...newGuestForm,
                                contact_number: e.target.value,
                            })
                        }
                        prefix={<Phone size={16} />}
                        size="large"
                    />
                    <Input
                        placeholder="Address"
                        value={newGuestForm.address}
                        onChange={(e) =>
                            setNewGuestForm({
                                ...newGuestForm,
                                address: e.target.value,
                            })
                        }
                        prefix={<MapPin size={16} />}
                        size="large"
                    />
                </div>
            </Modal>

            {/* Add-Ons Modal */}
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

            {/* QR Ph Modal */}
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

            {/* Receipt Modal */}
            <ReceiptModal
                isOpen={showReceiptModal}
                onClose={handleCloseReceiptModal}
                paymentId={currentPaymentId}
            />
        </div>
    );
}

// ==================== EXPORT WITH APP WRAPPER ====================
export default function WalkIn() {
    return (
        <App>
            <WalkInContent />
        </App>
    );
}
