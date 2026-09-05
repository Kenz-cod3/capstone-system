<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Events\NotificationCreated;
use App\Models\Booking;
use App\Models\BookingHistory;
use App\Models\BookingPayment;
use App\Models\Shift;
use App\Models\CashTransaction;
use App\Models\Notification;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayMongoController extends Controller
{
    // CREATE PAYMONGO DYNAMIC QRPH PAYMENT
    public function createQrPayment(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'amount'     => 'required|numeric|min:1',
        ]);

        $booking = Booking::with('bookedRooms')
            ->findOrFail($validated['booking_id']);

        Log::info('Creating Dynamic QRPH payment', [
            'booking_id' => $booking->id,
            'amount' => $validated['amount'],
        ]);

        // Make sure booking still has a room waiting for payment
        $hasPendingRoom = $booking->bookedRooms()
            ->where('status', 'pending')
            ->exists();

        if (! $hasPendingRoom) {
            return response()->json([
                'message' => 'This booking is no longer awaiting payment'
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | STEP 1: Create Payment Intent
        |--------------------------------------------------------------------------
        */

        $amountCentavos = (int) round($validated['amount'] * 100);

        $intentResponse = Http::withBasicAuth(
            env('PAYMONGO_SECRET_KEY'),
            ''
        )->post(
            'https://api.paymongo.com/v1/payment_intents',
            [
                'data' => [
                    'attributes' => [
                        'amount' => $amountCentavos,
                        'currency' => 'PHP',
                        'payment_method_allowed' => ['qrph'],
                        'description' =>
                        "Travelers Inn Booking #{$booking->booking_reference}",
                        'metadata' => [
                            'booking_id' => (string) $booking->id,
                            'payment_method' => 'qrph',
                        ],
                    ],
                ],
            ]
        );

        Log::info('Payment Intent Response', [
            'status' => $intentResponse->status(),
            'body' => $intentResponse->json(),
        ]);

        if ($intentResponse->failed()) {
            return response()->json([
                'message' => 'Failed to create PayMongo payment intent',
                'error' => $intentResponse->json(),
            ], $intentResponse->status());
        }

        $intentData = $intentResponse->json('data');

        $paymentIntentId = $intentData['id'];
        $clientKey = $intentData['attributes']['client_key'];

        /*
        |--------------------------------------------------------------------------
        | STEP 2: Create QRPH Payment Method
        |--------------------------------------------------------------------------
        */

        $paymentMethodResponse = Http::withBasicAuth(
            env('PAYMONGO_PUBLIC_KEY'),
            ''
        )->post(
            'https://api.paymongo.com/v1/payment_methods',
            [
                'data' => [
                    'attributes' => [
                        'type' => 'qrph',
                        'expiry_seconds' => 1800,
                    ],
                ],
            ]
        );

        Log::info('QRPH Payment Method Response', [
            'status' => $paymentMethodResponse->status(),
            'body' => $paymentMethodResponse->json(),
        ]);

        if ($paymentMethodResponse->failed()) {
            return response()->json([
                'message' => 'Failed to create QRPH payment method',
                'error' => $paymentMethodResponse->json(),
            ], $paymentMethodResponse->status());
        }

        $paymentMethodId = $paymentMethodResponse->json('data.id');

        /*
        |--------------------------------------------------------------------------
        | STEP 3: Attach QRPH Payment Method to Payment Intent
        |--------------------------------------------------------------------------
        */

        $attachResponse = Http::withBasicAuth(
            env('PAYMONGO_PUBLIC_KEY'),
            ''
        )->post(
            "https://api.paymongo.com/v1/payment_intents/{$paymentIntentId}/attach",
            [
                'data' => [
                    'attributes' => [
                        'payment_method' => $paymentMethodId,
                        'client_key' => $clientKey,
                    ],
                ],
            ]
        );

        Log::info('QRPH Attach Response', [
            'status' => $attachResponse->status(),
            'body' => $attachResponse->json(),
        ]);

        if ($attachResponse->failed()) {
            return response()->json([
                'message' => 'Failed to generate Dynamic QRPH',
                'error' => $attachResponse->json(),
            ], $attachResponse->status());
        }

        $intent = $attachResponse->json('data');

        /*
        |--------------------------------------------------------------------------
        | STEP 4: Get QR Image
        |--------------------------------------------------------------------------
        */

        $qrImage = data_get(
            $intent,
            'attributes.next_action.code.image_url'
        );

        $testUrl = data_get(
            $intent,
            'attributes.next_action.code.test_url'
        );

        if (! $qrImage) {
            return response()->json([
                'message' => 'PayMongo did not return a QR code',
                'payment_intent' => $intent,
            ], 422);
        }

        return response()->json([
            'message' => 'Dynamic QRPH generated successfully',
            'payment_intent_id' => $paymentIntentId,
            'client_key' => $clientKey,
            'amount' => $validated['amount'],
            'qr_image_url' => $qrImage,
            'test_url' => $testUrl,
        ], 200);
    }

    // CHECK QRPH PAYMENT INTENT STATUS (polled by frontend)
    public function checkQrStatus(Request $request, string $paymentIntentId)
    {
        $clientKey = $request->query('client_key');

        if (! $clientKey) {
            return response()->json([
                'message' => 'client_key is required'
            ], 400);
        }

        $response = Http::withBasicAuth(
            env('PAYMONGO_PUBLIC_KEY'),
            ''
        )->get(
            "https://api.paymongo.com/v1/payment_intents/{$paymentIntentId}",
            [
                'client_key' => $clientKey,
            ]
        );

        Log::info('QRPH Status Check Response', [
            'payment_intent_id' => $paymentIntentId,
            'status' => $response->status(),
            'body' => $response->json(),
        ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Failed to fetch payment intent status',
                'error' => $response->json(),
            ], $response->status());
        }

        $status = $response->json('data.attributes.status');

        return response()->json([
            'status' => $status,
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

        if (!in_array($eventType, [
            'checkout_session.payment.paid',
            'payment.paid',
        ])) {
            return response()->json(['message' => 'Event ignored'], 200);
        }

        $session = data_get($payload, 'data.attributes.data');

        $bookingId     = data_get($session, 'attributes.metadata.booking_id');
        $paymentMethod = data_get($session, 'attributes.metadata.payment_method', 'gcash');

        // Direct Payment Intent flow (e.g. QRPH): amount/id sit on the payment object itself.
        // Checkout Session flow (e.g. gcash/bank via checkout): amount/id sit inside "payments[0]".
        $paidAmountCentavos = data_get($session, 'attributes.amount')
            ?? data_get($session, 'attributes.payments.0.attributes.amount');

        $paymentReference = data_get($session, 'id')
            ?? data_get($session, 'attributes.payments.0.id');

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
            'bank_reference'  => in_array($paymentMethod, ['bank', 'qrph']) ? $paymentReference : null,
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

        // AUTO-CONFIRM booked rooms now that payment has been received
        $pendingRooms = $booking->bookedRooms()
            ->where('status', 'pending')
            ->get();

        foreach ($pendingRooms as $bookedRoom) {
            $bookedRoom->update([
                'status' => 'confirmed',
            ]);
        }

        if ($pendingRooms->isNotEmpty()) {

            BookingHistory::create([
                'booking_id'   => $booking->id,
                'old_status'   => 'pending',
                'new_status'   => 'confirmed',
                'change_note'  => 'Booking automatically confirmed after successful QR Ph payment',
                'changed_by'   => null,
                'changed_at'   => now(),
            ]);

            // Notify Admins and Staff
            $staffAndAdmins = User::whereIn('role', ['admin', 'staff'])->get();

            foreach ($staffAndAdmins as $user) {
                $notification = Notification::create([
                    'user_id' => $user->id,
                    'title'   => 'Booking Confirmed',
                    'message' => 'Booking ' . $booking->booking_reference . ' was automatically confirmed after payment via QR Ph.',
                    'is_read' => false,
                ]);

                broadcast(new NotificationCreated($notification));
            }

            // Notify Guest
            $booking->loadMissing('user');

            if ($booking->user_id) {

                $notification = Notification::create([
                    'user_id' => $booking->user_id,
                    'title'   => 'Booking Confirmed',
                    'message' => 'Your booking ' . $booking->booking_reference . ' has been confirmed. Payment received successfully.',
                    'is_read' => false,
                ]);

                broadcast(new NotificationCreated($notification));

                if ($booking->user && $booking->user->email) {

                    MailService::sendNotificationEmail(
                        $booking->user->email,
                        $booking->user->first_name,
                        $booking->booking_reference,
                        $notification->title,
                        $notification->message
                    );
                }
            }

            broadcast(new DashboardUpdated())->toOthers();
        }

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
}
