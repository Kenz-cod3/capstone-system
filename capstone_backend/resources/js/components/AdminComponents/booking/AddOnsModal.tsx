import { useEffect, useMemo, useState } from "react";
import { Modal, Select, InputNumber, Button, Typography, message } from "antd";
import {
    CreditCardOutlined,
    PlusOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import api from "@/services/api";

const { Text } = Typography;

const MINT_GREEN = "#10b981";
const MINT_GREEN_BG = "#ecfdf5";

export interface AddOnsTarget {
    bookingId: number;
    bookedRoomId: number;
    roomNumber?: string;
    guestName?: string;
}

export interface CurrentAddOn {
    id: number; // booking_add_ons.id
    quantity: number;
    subtotal: number;
    add_on: { id: number; add_on_name: string; price: number };
}

interface AddOnOption {
    id: number;
    add_on_name: string;
    price: number | string;
    stock: number;
}

interface CartLine {
    addOnId: number;
    name: string;
    price: number;
    quantity: number;
}

interface Props {
    open: boolean;
    target: AddOnsTarget | null;
    /** Not shown in this modal. Kept optional so existing callers still compile. */
    currentAddOns?: CurrentAddOn[];
    onClose: () => void;
    /** Called after a successful add so the parent can refetch */
    onChanged: () => void | Promise<void>;
    /**
     * Opens the payment modal ONCE for the whole list. Stock is NOT deducted yet.
     * `run` is executed only after the payment is confirmed.
     * `addOnId` / `quantity` are only sent when the list has a single item
     * (lets the server check the stock before generating a QR).
     */
    onCharge: (req: {
        amount: number;
        note: string;
        addOnId?: number;
        quantity?: number;
        run: () => Promise<void>;
    }) => void;
}

const peso = (n: number) =>
    `₱${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function AddOnsModal({
    open,
    target,
    onClose,
    onChanged,
    onCharge,
}: Props) {
    const [options, setOptions] = useState<AddOnOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>();
    const [quantity, setQuantity] = useState<number>(1);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [busy, setBusy] = useState(false);

    // Returns the fresh list so callers can read the latest stock right away
    const loadOptions = async (): Promise<AddOnOption[]> => {
        setLoadingOptions(true);
        try {
            const { data } = await api.get<AddOnOption[]>("/add-ons");
            const list = data ?? [];
            setOptions(list);
            return list;
        } catch {
            message.error("Failed to load add-ons");
            return [];
        } finally {
            setLoadingOptions(false);
        }
    };

    useEffect(() => {
        if (open) {
            setSelectedId(undefined);
            setQuantity(1);
            setCart([]);
            loadOptions();
        }
    }, [open]);

    const inCart = (addOnId: number) =>
        cart.find((l) => l.addOnId === addOnId)?.quantity ?? 0;

    // Stock that is still free after what is already in the list
    const remainingOf = (o: AddOnOption) => Number(o.stock) - inCart(o.id);

    const selected = useMemo(
        () => options.find((o) => o.id === selectedId),
        [options, selectedId],
    );

    const selectedRemaining = selected ? remainingOf(selected) : 0;

    const cartTotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const cartQty = cart.reduce((sum, l) => sum + l.quantity, 0);

    const errMsg = (err: any, fallback: string) =>
        err?.response?.data?.errors?.quantity?.[0] ||
        err?.response?.data?.errors?.booked_room_id?.[0] ||
        err?.response?.data?.message ||
        fallback;

    // Stock changed on the server, so refresh the list and return it
    const afterChange = async (): Promise<AddOnOption[]> => {
        const [list] = await Promise.all([loadOptions(), onChanged()]);
        return list;
    };

    const stockOf = (addOnId: number) =>
        Number(options.find((o) => o.id === addOnId)?.stock ?? 0);

    // ---- list actions ----

    const addToList = () => {
        if (!selected) {
            message.warning("Please select an add-on.");
            return;
        }

        if (quantity > selectedRemaining) {
            message.error(
                selectedRemaining <= 0
                    ? `${selected.add_on_name} has no more stock to add.`
                    : `Only ${selectedRemaining} more ${selected.add_on_name} available.`,
            );
            return;
        }

        setCart((prev) => {
            const exists = prev.find((l) => l.addOnId === selected.id);
            if (exists) {
                return prev.map((l) =>
                    l.addOnId === selected.id
                        ? { ...l, quantity: l.quantity + quantity }
                        : l,
                );
            }
            return [
                ...prev,
                {
                    addOnId: selected.id,
                    name: selected.add_on_name,
                    price: Number(selected.price),
                    quantity,
                },
            ];
        });

        setSelectedId(undefined);
        setQuantity(1);
    };

    const setLineQty = (addOnId: number, qty: number) => {
        setCart((prev) =>
            prev.map((l) =>
                l.addOnId === addOnId ? { ...l, quantity: qty } : l,
            ),
        );
    };

    const removeLine = (addOnId: number) => {
        setCart((prev) => prev.filter((l) => l.addOnId !== addOnId));
    };

    // ---- payment ----

    // Footer "Payment" button: checks the latest stock for EVERY item, opens
    // ONE payment for the whole list, and only AFTER the payment is confirmed
    // the stock is deducted.
    const handlePay = async () => {
        if (!target) return;

        if (cart.length === 0) {
            message.warning("Please add at least one item.");
            return;
        }

        const lines = cart.map((l) => ({ ...l }));
        const amount = lines.reduce((s, l) => s + l.price * l.quantity, 0);

        // Check the latest stock BEFORE opening payment (nothing is deducted here)
        setBusy(true);
        const fresh = await loadOptions();
        setBusy(false);

        for (const line of lines) {
            const available = Number(
                fresh.find((o) => o.id === line.addOnId)?.stock ?? 0,
            );
            if (available < line.quantity) {
                message.error(
                    available <= 0
                        ? `${line.name} is out of stock.`
                        : `Only ${available} ${line.name} left in stock.`,
                );
                // Keep the list in sync with what is really available
                setCart((prev) =>
                    prev
                        .map((l) =>
                            l.addOnId === line.addOnId
                                ? { ...l, quantity: Math.min(l.quantity, available) }
                                : l,
                        )
                        .filter((l) => l.quantity > 0),
                );
                return;
            }
        }

        // Lines that were already saved. If a later line fails and the cashier
        // confirms again, these are skipped so nothing is added twice.
        const done = new Set<number>();

        // Runs only AFTER the payment is confirmed (or right away if free).
        const run = async () => {
            for (const line of lines) {
                if (done.has(line.addOnId)) continue;

                try {
                    await api.post("/booking-addons", {
                        booked_room_id: target.bookedRoomId,
                        add_on_id: line.addOnId,
                        quantity: line.quantity,
                    });
                    done.add(line.addOnId);
                } catch (err: any) {
                    if (done.size > 0) {
                        // Some items were already saved, show the new stock
                        await afterChange().catch(() => undefined);
                    }
                    message.error(
                        `${line.name}: ${errMsg(err, "Failed to add add-on")}`,
                    );
                    throw err;
                }
            }

            setCart([]);
            setSelectedId(undefined);
            setQuantity(1);
            await afterChange();

            message.success(
                lines.length === 1
                    ? `${lines[0]!.name} x${lines[0]!.quantity} added`
                    : `${lines.length} add-ons added`,
            );
        };

        if (amount > 0) {
            const single = lines.length === 1 ? lines[0] : undefined;

            onCharge({
                amount,
                note: lines.map((l) => `${l.name} x${l.quantity}`).join(", "),
                addOnId: single?.addOnId,
                quantity: single?.quantity,
                run,
            });
            return;
        }

        setBusy(true);
        try {
            await run();
        } catch {
            // message already shown
        } finally {
            setBusy(false);
        }
    };

    // ---- Footer: summary on the left, Cancel + Payment on the right ----
    const footer = (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
            }}
        >
            <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                {cart.length > 0 ? (
                    <>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {cartQty} item{cartQty > 1 ? "s" : ""} ·{" "}
                            {cart.length} add-on{cart.length > 1 ? "s" : ""}
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: MINT_GREEN,
                            }}
                        >
                            {peso(cartTotal)}
                        </div>
                    </>
                ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        No item added
                    </Text>
                )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    type="primary"
                    icon={<CreditCardOutlined />}
                    loading={busy}
                    disabled={cart.length === 0}
                    onClick={handlePay}
                >
                    {cartTotal > 0 ? "Payment" : "Add"}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            title="Add Add-ons"
            open={open}
            onCancel={onClose}
            centered
            width={520}
            footer={footer}
        >
            <div style={{ padding: "4px 0" }}>
                {/* Header info */}
                <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Guest
                        </Text>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {target?.guestName ?? "-"}
                        </div>
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Room
                        </Text>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {target?.roomNumber ?? "-"}
                        </div>
                    </div>
                </div>

                {/* Choose item */}
                <div
                    style={{
                        background: MINT_GREEN_BG,
                        borderRadius: 10,
                        padding: 12,
                    }}
                >
                    <Text strong style={{ fontSize: 12 }}>
                        Choose an item
                    </Text>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <Select
                            showSearch
                            placeholder="Select add-on"
                            loading={loadingOptions}
                            value={selectedId}
                            onChange={(v) => {
                                setSelectedId(v);
                                setQuantity(1);
                            }}
                            optionFilterProp="label"
                            style={{ flex: 1 }}
                            options={options.map((o) => ({
                                value: o.id,
                                label: `${o.add_on_name} - ${peso(Number(o.price))} (${remainingOf(o)} left)`,
                                disabled: remainingOf(o) <= 0,
                            }))}
                        />
                        <InputNumber
                            min={1}
                            max={Math.max(1, selectedRemaining)}
                            value={quantity}
                            onChange={(v) => setQuantity(Number(v) || 1)}
                            disabled={!selected}
                            style={{ width: 70 }}
                        />
                        <Button
                            icon={<PlusOutlined />}
                            disabled={!selected || selectedRemaining <= 0}
                            onClick={addToList}
                        >
                            Add to list
                        </Button>
                    </div>
                    {selected && (
                        <Text
                            type="secondary"
                            style={{
                                fontSize: 11,
                                display: "block",
                                marginTop: 6,
                            }}
                        >
                            Available: <strong>{selectedRemaining}</strong>
                            {" · "}
                            Subtotal:{" "}
                            <strong>
                                {peso(Number(selected.price) * quantity)}
                            </strong>
                        </Text>
                    )}
                </div>

                {/* Items to pay */}
                {cart.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Text strong style={{ fontSize: 12 }}>
                            Items to add
                        </Text>
                        <div style={{ marginTop: 8 }}>
                            {cart.map((line) => (
                                <div
                                    key={line.addOnId}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 0",
                                        borderBottom: "1px solid #f1f5f9",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}
                                        >
                                            {line.name}
                                        </div>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 10 }}
                                        >
                                            {peso(line.price)} each ·{" "}
                                            {stockOf(line.addOnId)} in stock
                                        </Text>
                                    </div>

                                    <InputNumber
                                        size="small"
                                        min={1}
                                        max={Math.max(
                                            1,
                                            stockOf(line.addOnId),
                                        )}
                                        value={line.quantity}
                                        onChange={(v) =>
                                            setLineQty(
                                                line.addOnId,
                                                Number(v) || 1,
                                            )
                                        }
                                        style={{ width: 60 }}
                                    />

                                    <div
                                        style={{
                                            width: 80,
                                            textAlign: "right",
                                            fontWeight: 700,
                                            fontSize: 12,
                                            color: MINT_GREEN,
                                        }}
                                    >
                                        {peso(line.price * line.quantity)}
                                    </div>

                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeLine(line.addOnId)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}