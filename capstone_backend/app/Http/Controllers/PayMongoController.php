<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingPayment;
use App\Models\Shift;
use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayMongoController extends Controller
{
    // CREATE PAYMONGO CHECKOUT SESSION
    public function createPayment(Request $request)
    {
        $validated = $request->validate([
            'booking_id'     => 'required|exists:bookings,id',
            'amount'         => 'required|numeric|min:1',
            'payment_method' => 'required|in:gcash,bank',
        ]);

        $booking = Booking::with('bookedRooms')
            ->findOrFail($validated['booking_id']);

        Log::info([
            'booking_id' => $booking->id,
            'room_statuses' => $booking->bookedRooms->pluck('status'),
        ]);

        $hasPendingRoom = $booking->bookedRooms()
            ->where('status', 'pending')
            ->exists();

        if (! $hasPendingRoom) {
            return response()->json([
                'message' => 'This booking is no longer awaiting payment'
            ], 400);
        }

        $paymentMethodTypes = $validated['payment_method'] === 'gcash'
            ? ['gcash']
            : ['dob'];

        $response = Http::withBasicAuth(
            env('PAYMONGO_SECRET_KEY'),
            ''
        )->post(
            'https://api.paymongo.com/v1/checkout_sessions',
            [
                "data" => [
                    "attributes" => [

                        "line_items" => [
                            [
                                "currency" => "PHP",
                                "amount"   => (int) round($validated['amount'] * 100),
                                "name"     => "Travelers Inn Booking #{$booking->booking_reference}",
                                "quantity" => 1,
                            ]
                        ],

                        "payment_method_types" => $paymentMethodTypes,

                        "metadata" => [
                            "booking_id"     => (string) $booking->id,
                            "payment_method" => $validated['payment_method'],
                        ],

                        "success_url" => "https://example.com/success?booking_id={$booking->id}",
                        "cancel_url"  => "https://example.com/cancel?booking_id={$booking->id}",
                    ]
                ]
            ]
        );

        Log::info('========== CREATE CHECKOUT ==========');

        Log::info('Checkout Request', [
            'booking_id' => $booking->id,
            'payment_method' => $validated['payment_method'],
            'payment_method_types' => $paymentMethodTypes,
            'amount' => $validated['amount'],
        ]);

        Log::info('Checkout Response', [
            'status' => $response->status(),
            'body' => $response->json(),
        ]);

        if ($response->failed()) {
            Log::error('PayMongo checkout session failed', $response->json() ?? []);

            return response()->json([
                'message' => 'Failed to create payment session',
                'error'   => $response->json(),
            ], $response->status());
        }

        $data = $response->json('data');

        return response()->json([
            'checkout_url' => $data['attributes']['checkout_url'],
            'session_id'   => $data['id'],
        ], 200);
    }

    // PAYMONGO WEBHOOK
    public function webhook(Request $request)
    {
        Log::info('========== PAYMONGO WEBHOOK ==========');

        Log::info('Headers', [
            'Paymongo-Signature' => $request->header('Paymongo-Signature'),
        ]);

        Log::info('Payload', $request->all());

        $signatureHeader = $request->header('Paymongo-Signature');

        if (! $this->verifySignature($request->getContent(), $signatureHeader)) {

            Log::warning('PayMongo webhook signature verification failed');

            return response()->json([
                'message' => 'Invalid signature'
            ], 400);
        }

        $payload = $request->all();
        $eventType = data_get($payload, 'data.attributes.type');

        if ($eventType !== 'checkout_session.payment.paid') {
            return response()->json(['message' => 'Event ignored'], 200);
        }

        $session = data_get($payload, 'data.attributes.data');

        $bookingId     = data_get($session, 'attributes.metadata.booking_id');
        $paymentMethod = data_get($session, 'attributes.metadata.payment_method', 'gcash');

        $paidAmountCentavos = data_get($session, 'attributes.payments.0.attributes.amount');
        $paymentReference   = data_get($session, 'attributes.payments.0.id');

        if (! $bookingId || ! $paidAmountCentavos) {
            Log::warning('PayMongo webhook missing booking_id or amount', $payload);
            return response()->json(['message' => 'Missing data'], 200);
        }

        // findOrFail-style, but soft-deleted bookings should also be blocked,
        // so we deliberately do NOT use withTrashed() here
        $booking = Booking::with('bookedRooms')->find($bookingId);

        if (! $booking) {
            Log::warning("PayMongo webhook: booking {$bookingId} not found or was deleted");

            return response()->json([
                'message' => 'Booking not found'
            ], 200);
        }

        $hasPendingRoom = $booking->bookedRooms()
            ->where('status', 'pending')
            ->exists();

        if (! $hasPendingRoom) {

            Log::warning("PayMongo webhook: booking {$bookingId} has no pending rooms.", [
                'payment_reference' => $paymentReference,
            ]);

            return response()->json([
                'message' => 'Booking is no longer payable.'
            ], 200);
        }

        // Idempotency guard: don't double-record the same PayMongo payment
        $existing = BookingPayment::where('gcash_reference', $paymentReference)
            ->orWhere('bank_reference', $paymentReference)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already processed'], 200);
        }

        $amount = $paidAmountCentavos / 100;

        $shift = Shift::whereNull('closed_at')->latest()->first();

        $totalPaid = BookingPayment::where('booking_id', $booking->id)->sum('amount');
        $newTotal  = $totalPaid + $amount;

        // Generate Official Receipt Number
        $lastPayment = BookingPayment::whereNotNull('receipt_number')
            ->latest('id')
            ->first();

        $nextNumber = 1;

        if ($lastPayment && $lastPayment->receipt_number) {
            $nextNumber = ((int) substr($lastPayment->receipt_number, -6)) + 1;
        }

        $receiptNumber = 'OR-' . date('Y') . '-' .
            str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

        $payment = BookingPayment::create([
            'booking_id'      => $booking->id,
            'shift_id'        => $shift?->id,
            'receipt_number'  => $receiptNumber,
            'amount'          => $amount,
            'payment_method'  => $paymentMethod === 'gcash' ? 'gcash' : 'bank',
            'payment_status'  => 'paid',
            'gcash_reference' => $paymentMethod === 'gcash' ? $paymentReference : null,
            'bank_reference'  => $paymentMethod === 'bank' ? $paymentReference : null,
            'received_by'     => null,
            'payment_date'    => now(),
        ]);

        if ($shift) {
            $payments = BookingPayment::where('shift_id', $shift->id)
                ->where('payment_status', 'paid')
                ->sum('amount');

            $payIn = CashTransaction::where('shift_id', $shift->id)
                ->where('type', 'pay_in')
                ->sum('amount');

            $payOut = CashTransaction::where('shift_id', $shift->id)
                ->where('type', 'pay_out')
                ->sum('amount');

            $shift->update([
                'expected_cash' => $shift->starting_cash + $payments + $payIn - $payOut,
            ]);
        }

        Log::info("PayMongo payment recorded for booking {$booking->id}", ['payment_id' => $payment->id]);

        return response()->json(['message' => 'Payment recorded'], 200);
    }

    private function verifySignature(string $payload, ?string $signatureHeader): bool
    {
        Log::info('Signature Header', [
            'header' => $signatureHeader,
        ]);

        if (! $signatureHeader) {
            Log::warning('No signature header.');
            return false;
        }

        $parts = [];

        foreach (explode(',', $signatureHeader) as $pair) {

            [$key, $value] = array_pad(
                explode('=', $pair, 2),
                2,
                null
            );

            $parts[$key] = $value;
        }

        Log::info('Parsed Header', $parts);

        $timestamp = $parts['t'] ?? null;

        $signature = !empty($parts['li'])
            ? $parts['li']
            : ($parts['te'] ?? null);

        Log::info('Timestamp', [
            'timestamp' => $timestamp
        ]);

        Log::info('Received Signature', [
            'signature' => $signature
        ]);

        $signedPayload = $timestamp . '.' . $payload;

        $expectedSignature = hash_hmac(
            'sha256',
            $signedPayload,
            env('PAYMONGO_WEBHOOK_SECRET')
        );

        Log::info('Computed Signature', [
            'expected' => $expectedSignature,
        ]);

        return hash_equals($expectedSignature, $signature);
    }

    // private function verifySignature(string $payload, ?string $signatureHeader): bool
    // {
    //     if (! $signatureHeader) {
    //         return false;
    //     }

    //     $parts = [];
    //     foreach (explode(',', $signatureHeader) as $pair) {
    //         [$key, $value] = array_pad(explode('=', $pair, 2), 2, null);
    //         $parts[$key] = $value;
    //     }

    //     $timestamp = $parts['t'] ?? null;
    //     $signature = $parts['li'] ?? $parts['te'] ?? null;

    //     if (! $timestamp || ! $signature) {
    //         return false;
    //     }

    //     $signedPayload = $timestamp . '.' . $payload;

    //     $expectedSignature = hash_hmac(
    //         'sha256',
    //         $signedPayload,
    //         env('PAYMONGO_WEBHOOK_SECRET')
    //     );

    //     return hash_equals($expectedSignature, $signature);
    // }
}
