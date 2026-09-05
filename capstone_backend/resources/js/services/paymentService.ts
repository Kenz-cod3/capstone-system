import api from "./api";

export interface PaymentStatusResponse {
    status: "pending" | "paid" | "expired" | "failed";
    reference_id?: string;
    paid_at?: string | null;
}

// Adjust the endpoint to match your backend route for checking
// a room/booking's payment status (e.g. PayMongo webhook result).
export const getPaymentStatus = (roomId: number) =>
    api.get<PaymentStatusResponse>(`/payments/room/${roomId}/status`);

// ── QR Ph (Payment Intent) — dynamic QR rendered in our own page ──

export interface CreateQrPaymentResponse {
    payment_intent_id: string;
    client_key: string;
    qr_image_url: string; // data:image/png;base64,... — render directly in <img src=... />
    test_url?: string;    // NEW — only present in PayMongo test mode, used to simulate payment
    status: string;       // "awaiting_next_action" right after creation
}

export const createQrPayment = (bookingId: number, amount: number) =>
    api.post<CreateQrPaymentResponse>("/paymongo/qr/create", {
        booking_id: bookingId,
        amount,
    });

export interface QrPaymentStatusResponse {
    status: string; // "awaiting_payment_method" | "awaiting_next_action" | "processing" | "succeeded" | ...
}

export const checkQrPaymentStatus = (paymentIntentId: string, clientKey: string) =>
    api.get<QrPaymentStatusResponse>(`/paymongo/qr/status/${paymentIntentId}`, {
        params: { client_key: clientKey },
    });