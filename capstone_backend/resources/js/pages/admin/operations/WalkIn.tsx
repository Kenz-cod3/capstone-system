// src/pages/WalkIn.tsx
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Form,
    Input,
    Button,
    Card,
    Select,
    DatePicker,
    Space,
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

// ==================== ADD-ONS MODAL COMPONENT ====================
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

// ==================== MAIN WALK-IN COMPONENT ====================
function WalkInContent() {
    const queryClient = useQueryClient();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomsDetails, setSelectedRoomsDetails] = useState<
        SelectedRoom[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [gcashReference, setGcashReference] = useState("");
    const [bankReference, setBankReference] = useState("");
    const [fetchingRooms, setFetchingRooms] = useState(false);

    const [selectedGuest, setSelectedGuest] = useState<WalkInGuest | null>(
        null,
    );
    const [searchResults, setSearchResults] = useState<WalkInGuest[]>([]);
    const [searchingGuests, setSearchingGuests] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [newGuestForm, setNewGuestForm] = useState<{
        first_name: string;
        middle_name: string;
        last_name: string;
        contact_number: string;
        address: string;
    }>({
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

    // Receipt Modal State
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(
        null,
    );

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

            // SHOW RECENT 5 GUESTS
            if (!searchText || searchText.trim().length === 0) {
                res = await api.get("/walk-in-guests?per_page=5");

                setSearchResults(res.data.data || []);
            } else {
                // NORMAL SEARCH
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
            const newGuest = response.data;
            setSelectedGuest(newGuest);
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

    const addRoom = (
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
                nights: nights,
                subtotal: subtotal,
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

    const handleSubmit = async () => {
        if (!selectedGuest) {
            message.warning("Please select or add a guest");
            return;
        }
        if (selectedRoomsDetails.length === 0) {
            message.warning("Please select at least one room");
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
            const payload = {
                guest_id: selectedGuest.id,
                bookings: bookingsData,
                total_amount: totalAmount,
                payment_method: paymentMethod,
                gcash_reference:
                    paymentMethod === "gcash" ? gcashReference : null,
                bank_reference: paymentMethod === "bank" ? bankReference : null,
            };
            const response = await api.post("/walk-in-guests/checkin", payload);
            console.log("CHECK-IN RESPONSE");
            console.log(JSON.stringify(response.data, null, 2));

            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });

            message.success({
                content: `Check-in successful! Guest checked into ${selectedRoomsDetails.length} room(s)`,
                duration: 3,
                icon: <CheckCircle size={20} />,
            });

            // Show receipt modal instead of navigating
            const paymentId = response.data.payment_id;
            setCurrentPaymentId(paymentId);
            setShowReceiptModal(true);

            // Reset form but keep receipt modal open
            setSelectedGuest(null);
            setSelectedRoomsDetails([]);
            setSelectedRoomValue(null);
            setPreviewAmount(0);
            await fetchRooms();
        } catch (err: any) {
            console.error("Walk-in error:", err);
            message.error(
                err.response?.data?.message || "Failed to check in guest",
            );
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
                            {/* Guest Card - Collapsible */}
                            <GuestCard
                                selectedGuest={selectedGuest}
                                onSelectGuest={handleSelectGuest}
                                onNewGuest={handleNewGuestClick}
                                onClearGuest={handleClearGuest}
                                searchResults={searchResults}
                                onSearchGuests={searchGuests}
                                searchingGuests={searchingGuests}
                            />

                            {/* Add Room Section - Collapsible */}
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
                                                                    boxShadow:
                                                                        "inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
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
                                                            onClick={() => {
                                                                if (
                                                                    selectedRoomValue
                                                                ) {
                                                                    addRoom(
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

                            {/* Selected Rooms */}
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
                                                onChange={setPaymentMethod}
                                                style={{ width: "100%" }}
                                            >
                                                <Select.Option value="cash">
                                                    Cash
                                                </Select.Option>

                                                <Select.Option value="gcash">
                                                    GCash
                                                </Select.Option>

                                                <Select.Option value="bank">
                                                    Bank
                                                </Select.Option>
                                            </Select>

                                            {paymentMethod === "gcash" && (
                                                <Input
                                                    size="large"
                                                    placeholder="GCash Reference"
                                                    value={gcashReference}
                                                    onChange={(e) =>
                                                        setGcashReference(
                                                            e.target.value,
                                                        )
                                                    }
                                                    style={{ marginTop: 12 }}
                                                />
                                            )}

                                            {paymentMethod === "bank" && (
                                                <Input
                                                    size="large"
                                                    placeholder="Bank Reference"
                                                    value={bankReference}
                                                    onChange={(e) =>
                                                        setBankReference(
                                                            e.target.value,
                                                        )
                                                    }
                                                    style={{ marginTop: 12 }}
                                                />
                                            )}
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
                                    icon={<CreditCard size={16} />}
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={
                                        selectedRoomsDetails.length === 0 ||
                                        !selectedGuest
                                    }
                                    style={{
                                        background: primaryColor,
                                        borderColor: primaryColor,
                                        height: 52,
                                        fontSize: 16,
                                        fontWeight: 600,
                                    }}
                                >
                                    Complete Check-in (
                                    {formatCurrency(totalAmount)})
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
