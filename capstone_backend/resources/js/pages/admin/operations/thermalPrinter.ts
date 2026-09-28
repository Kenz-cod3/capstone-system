// operations/thermalPrinter.ts
// ESC/POS printing over Web Serial (PT-210, 58mm Bluetooth printer)

// ============================================================
// CONSTANTS
// ============================================================

const LINE_WIDTH = 32;
const BAUD_RATE = 9600;
const CHUNK_SIZE = 256;
const CHUNK_DELAY_MS = 30;

const DASH = "-".repeat(LINE_WIDTH);
const encoder = new TextEncoder();

let serialPort: any = null;

// ============================================================
// FORMATTING HELPERS
// ============================================================

/** Keep printable ASCII only (the printer can't handle other characters). */
const clean = (value: unknown): string =>
    String(value ?? "")
        .replace(/₱/g, "PHP ")
        .replace(/[\u202f\u00a0]/g, " ") // narrow/non-breaking spaces in dates
        .replace(/[^\x20-\x7E]/g, "");

const peso = (amount: unknown): string =>
    "PHP " +
    Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const METHOD_LABELS: Record<string, string> = {
    cash: "Cash",
    qrph: "QR Ph",
    gcash: "GCash",
    bank: "Bank Transfer",
    bank_transfer: "Bank Transfer",
};

const methodLabel = (method?: string): string =>
    METHOD_LABELS[method ?? ""] ?? method ?? "-";

const parseDate = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
};

/** e.g. 9/28/2026 */
const formatDate = (value: unknown): string => {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-US") : "-";
};

/** e.g. 9/28/2026, 5:54 PM */
const formatDateTime = (value: unknown): string => {
    const date = parseDate(value);
    return date
        ? date.toLocaleString("en-US", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
          })
        : "-";
};

/** Left text + right text on one line. Wraps the right text if too long. */
const row = (left: string, right: string): string => {
    const l = clean(left);
    const r = clean(right);
    const space = LINE_WIDTH - l.length - r.length;

    if (space >= 1) return l + " ".repeat(space) + r;

    return l + "\n" + " ".repeat(Math.max(0, LINE_WIDTH - r.length)) + r;
};

/** "Label: value" on one line, or value on the next line if it won't fit. */
const field = (label: string, value: string): string => {
    const line = `${clean(label)}: ${clean(value)}`;
    return line.length <= LINE_WIDTH
        ? line
        : `${clean(label)}:\n  ${clean(value)}`;
};

// ============================================================
// ESC/POS WRITER
// ============================================================

function createWriter() {
    const bytes: number[] = [];

    const raw = (...b: number[]) => bytes.push(...b);

    return {
        init: () => raw(0x1b, 0x40),
        align: (n: 0 | 1 | 2) => raw(0x1b, 0x61, n),
        bold: (on: boolean) => raw(0x1b, 0x45, on ? 1 : 0),
        feed: (lines: number) => raw(0x1b, 0x64, lines),
        text: (s = "") => bytes.push(...encoder.encode(clean(s) + "\n")),
        dash() {
            this.text(DASH);
        },
        toBytes: () => new Uint8Array(bytes),
    };
}

type Writer = ReturnType<typeof createWriter>;

// ============================================================
// CONNECTION
// ============================================================

export const isSerialSupported = () =>
    typeof navigator !== "undefined" && "serial" in navigator;

export const isPrinterConnected = () => !!serialPort?.writable;

const getSerial = () => {
    const serial = (navigator as any).serial;

    if (!serial) {
        throw new Error("Use Chrome or Edge to print to the thermal printer.");
    }

    return serial;
};

async function closePort() {
    if (serialPort) {
        try {
            await serialPort.close();
        } catch {
            // ignore
        }
    }

    serialPort = null;
}

async function getPort() {
    const serial = getSerial();

    if (!serialPort) {
        const granted = await serial.getPorts();
        serialPort = granted[0] ?? (await serial.requestPort());
    }

    if (!serialPort.writable) {
        await serialPort.open({ baudRate: BAUD_RATE });
    }

    return serialPort;
}

export async function searchPrinter(): Promise<boolean> {
    const picked = await getSerial().requestPort();

    await closePort();

    serialPort = picked;
    await serialPort.open({ baudRate: BAUD_RATE });

    return true;
}

export async function refreshPrinter(): Promise<boolean> {
    if (!isSerialSupported()) return false;

    await closePort();

    const granted = await (navigator as any).serial.getPorts();

    if (!granted.length) return false;

    serialPort = granted[0];

    try {
        await serialPort.open({ baudRate: BAUD_RATE });
        return true;
    } catch {
        serialPort = null;
        return false;
    }
}

export async function disconnectPrinter() {
    await closePort();
}

// ============================================================
// RECEIPT SECTIONS
// ============================================================

const writeHeader = (w: Writer) => {
    w.align(1);
    w.bold(true);
    w.text("LYNN ENNIA TRAVELERS INN");
    w.bold(false);
    w.text("Official Receipt");
    w.dash();
    w.align(0);
};

const writeDetails = (w: Writer, receipts: any[]) => {
    const first = receipts[0];
    const isSplit = receipts.length > 1;

    if (isSplit) {
        w.text("Receipt Nos.");
        receipts.forEach((r) => w.text(`  ${r.receipt_number ?? "-"}`));
    } else {
        w.text(row("Receipt No.", first.receipt_number ?? "-"));
    }

    w.text(row("Booking Ref.", first.booking?.booking_reference ?? "-"));
    w.text(row("Date", formatDateTime(first.payment_date ?? Date.now())));

    if (isSplit) {
        w.text("Payment Breakdown");
        receipts.forEach((r) => {
            w.text(row(`  ${methodLabel(r.payment_method)}`, peso(r.amount)));

            const ref = r.gcash_reference || r.bank_reference;
            if (ref) w.text(`    Ref: ${ref}`);
        });
    } else {
        w.text(row("Payment Method", methodLabel(first.payment_method)));

        const ref = first.gcash_reference || first.bank_reference;
        if (ref) w.text(field("Reference", ref));
    }

    w.text(
        row(
            "Cashier",
            first.receiver
                ? `${first.receiver.first_name} ${first.receiver.last_name}`
                : "-",
        ),
    );

    w.dash();
};

const writeRoomCharges = (w: Writer, rooms: any[]) => {
    if (!rooms.length) return;

    w.bold(true);
    w.text("ROOM CHARGES");
    w.bold(false);
    w.text();

    rooms.forEach((room) => {
        const stay =
            room.stay_type === "short_stay" ? "SHORT STAY" : "OVERNIGHT";

        w.bold(true);
        w.text(row(`Room ${room.room?.room_number ?? "-"}`, stay));
        w.bold(false);

        w.text(room.room?.room_type?.type_name ?? "-");

        w.text(field("Scheduled Check-in", formatDate(room.check_in_date)));

        if (room.check_in_time) {
            w.text(field("Actual Check-in", formatDateTime(room.check_in_time)));
        }

        w.text(field("Scheduled Check-out", formatDate(room.check_out_date)));

        if (room.expected_checkout_at) {
            w.text(
                field(
                    "Expected Checkout",
                    formatDateTime(room.expected_checkout_at),
                ),
            );
        }

        if (room.check_out_time) {
            w.text(
                field("Actual Check-out", formatDateTime(room.check_out_time)),
            );
        }

        w.text();
        w.text(row("Room Amount", peso(room.subtotal)));
        w.text();
    });

    w.dash();
};

const writeAddOns = (w: Writer, rooms: any[]) => {
    const lines = rooms.flatMap((room) =>
        (room.booking_add_ons ?? []).map((addon: any) => ({
            label: `Room ${room.room?.room_number ?? "-"} - ${
                addon.add_on?.add_on_name ?? "Add-on"
            } x${addon.quantity}`,
            amount: addon.subtotal,
        })),
    );

    if (!lines.length) return;

    w.bold(true);
    w.text("ADD-ONS");
    w.bold(false);

    lines.forEach((line) => w.text(row(line.label, peso(line.amount))));

    w.dash();
};

const writeTotal = (w: Writer, receipts: any[]) => {
    const total = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    w.bold(true);
    w.text(row("TOTAL AMOUNT", peso(total)));
    w.bold(false);
    w.dash();
};

const writeFooter = (w: Writer) => {
    w.align(1);
    w.text();
    w.text("Thank you for staying");
    w.text("with us.");
    w.text();
};

// ============================================================
// BUILD RECEIPT
// ============================================================

export function buildReceipt(receipts: any[]): Uint8Array {
    const rooms = receipts[0]?.booking?.booked_rooms ?? [];
    const w = createWriter();

    w.init();
    writeHeader(w);
    writeDetails(w, receipts);
    writeRoomCharges(w, rooms);
    writeAddOns(w, rooms);
    writeTotal(w, receipts);
    writeFooter(w);
    w.feed(4);

    return w.toBytes();
}

// ============================================================
// SEND TO PRINTER
// ============================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendToPrinter(data: Uint8Array) {
    const port = await getPort();
    const writer = port.writable.getWriter();

    try {
        // Bluetooth printers can drop large writes, so send in chunks.
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            await writer.write(data.slice(i, i + CHUNK_SIZE));
            await sleep(CHUNK_DELAY_MS);
        }
    } finally {
        writer.releaseLock();
    }
}

export async function printReceipt(receipts: any[]) {
    if (!receipts.length) {
        throw new Error("No receipt data to print.");
    }

    await sendToPrinter(buildReceipt(receipts));
}

// ============================================================
// PRINTER TEST
// ============================================================

export async function testPrinter() {
    const sampleReceipt = {
        receipt_number: "TEST-000001",
        booking: {
            booking_reference: "TEST-BOOKING-001",
            booked_rooms: [
                {
                    room: {
                        room_number: "101",
                        room_type: { type_name: "Standard Room" },
                    },
                    subtotal: 1000,
                    stay_type: "overnight",
                    check_in_date: "2026-09-28",
                    check_in_time: "2026-09-28T17:00:00",
                    check_out_date: "2026-09-29",
                    expected_checkout_at: "2026-09-29T11:00:00",
                    check_out_time: null,
                    booking_add_ons: [],
                },
            ],
        },
        payment_date: "2026-09-28T17:00:00",
        receiver: { first_name: "Test", last_name: "Cashier" },
        payment_method: "cash",
        amount: 1000,
        gcash_reference: null,
        bank_reference: null,
    };

    try {
        await sendToPrinter(buildReceipt([sampleReceipt]));
        await sleep(1000);
    } catch (error) {
        console.error("Printer test error:", error);
        throw error;
    }
}