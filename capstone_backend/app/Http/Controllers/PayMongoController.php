<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Events\NotificationCreated;
use App\Models\Booking;
use App\Models\BookingHistory;
use App\Models\BookingPayment;
use App\Models\Room;
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
            'fee_type'   => 'nullable|in:early_checkin,late_checkout,extension,addon,room',
            'payment_id' => 'nullable|exists:booking_payments,id',
            'add_on_id'  => 'nullable|integer|exists:add_ons,id',
            'quantity'   => 'nullable|integer|min:1',
        ]);

        $isFeePayment = ! empty($validated['fee_type']);

        $booking = Booking::with('bookedRooms')
            ->findOrFail($validated['booking_id']);

        Log::info('Creating Dynamic QRPH payment', [
            'booking_id' => $booking->id,
            'amount' => $validated['amount'],
            'booking_type' => $booking->booking_type,
        ]);

        // Reuse an existing walk-in payment leg (pending, or failed after "Back to payment options").
        $walkInPayment = null;

        if (! $isFeePayment && ! empty($validated['payment_id'])) {
            $walkInPayment = BookingPayment::find($validated['payment_id']);

            if (
                ! $walkInPayment ||
                (int) $walkInPayment->booking_id !== (int) $booking->id ||
                $walkInPayment->payment_method !== 'qrph' ||
                ! in_array($walkInPayment->payment_status, ['pending', 'failed'])
            ) {
                return response()->json([
                    'message' => 'This payment can no longer be paid by QR Ph.'
                ], 409);
            }

            // The leg's own amount is the source of truth.
            $validated['amount'] = (float) $walkInPayment->amount;
        }

        // Walk-in QR bookings are created with BookedRoom.status = 'confirmed'
        // (reserved but not yet checked in), so we accept both 'pending'
        // (online bookings) and 'confirmed' (walk-in) here.
        $hasPayableRoom = $booking->bookedRooms()
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        // Fee payments (early check-in, late check-out, extension) don't need a payable room
        if (! $isFeePayment && ! $hasPayableRoom) {
            return response()->json([
                'message' => 'This booking is no longer awaiting payment'
            ], 400);
        }

        // Add-on fee: don't generate a QR for stock that no longer exists.
        // (The stock itself is only deducted later by POST /booking-addons.)
        if (($validated['fee_type'] ?? null) === 'addon' && ! empty($validated['add_on_id'])) {
            $addOn = \App\Models\AddOn::find($validated['add_on_id']);
            $needed = (int) ($validated['quantity'] ?? 1);
            $available = (int) ($addOn?->stock ?? 0);

            if (! $addOn || $available < $needed) {
                return response()->json([
                    'message' => $available <= 0
                        ? ($addOn?->add_on_name ?? 'This add-on') . ' is out of stock.'
                        : "Only {$available} {$addOn->add_on_name} left in stock.",
                ], 409);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | STEP 1: Create Payment Intent
        |--------------------------------------------------------------------------
        */

        $amountCentavos = (int) round($validated['amount'] * 100);

        $intentResponse = Http::withBasicAuth(
            config('services.paymongo.secret_key'),
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
                        'metadata' => array_filter([
                            'booking_id' => (string) $booking->id,
                            'payment_method' => 'qrph',
                            'booking_type' => $booking->booking_type,
                            'fee_type' => $validated['fee_type'] ?? null,
                            'add_on_id' => isset($validated['add_on_id']) ? (string) $validated['add_on_id'] : null,
                            'add_on_qty' => isset($validated['quantity']) ? (string) $validated['quantity'] : null,
                            'booking_payment_id' => $walkInPayment ? (string) $walkInPayment->id : null,
                        ]),
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
            config('services.paymongo.public_key'),
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
            config('services.paymongo.public_key'),
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

        if ($walkInPayment) {
            // Same row, new intent. No new booking_payments row.
            $walkInPayment->update([
                'payment_method' => 'qrph',
                'payment_status' => 'pending',
                'bank_reference' => $paymentIntentId,
                'payment_date'   => null,
            ]);
        }

        return response()->json([
            'message' => 'Dynamic QRPH generated successfully',
            'payment_intent_id' => $paymentIntentId,
            'client_key' => $clientKey,
            'amount' => $validated['amount'],
            'qr_image_url' => $qrImage,
            'test_url' => $testUrl,
            'expiry_seconds' => 1800,
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
            config('services.paymongo.public_key'),
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
        $paymentId = $response->json('data.attributes.payments.0.id');

        if ($status === 'succeeded') {
            Log::channel('paymongo')->info('✅ QR status poll: SUCCEEDED', [
                'payment_intent_id' => $paymentIntentId,
                'payment_id'        => $paymentId,
            ]);
        }

        return response()->json([
            'status' => $status,
            'payment_id' => $paymentId,
        ], 200);
    }

    // FEE QR STATUS (DB lang, read-only, walang tawag sa PayMongo)
    public function feeStatus(string $paymentIntentId)
    {
        // Bago: pay_... ang nasa bank_reference, kaya hanapin ito sa payment_logs gamit ang pi_.
        // Luma: pi_... mismo ang naka-save, kaya hinahanap din.
        $refs = array_filter([
            $paymentIntentId,
            \App\Models\PaymentLog::where('intent_id', $paymentIntentId)->value('payment_id'),
        ]);

        $payment = BookingPayment::whereIn('bank_reference', $refs)
            ->where('payment_status', 'paid')
            ->first();

        return response()->json([
            'paid'           => (bool) $payment,
            'payment_id'     => $payment?->id,
            'reference'      => $payment?->bank_reference,
            'receipt_number' => $payment?->receipt_number,
        ]);
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

        Log::channel('paymongo')->info('✅ PAYMONGO PAYMENT SUCCESS (webhook received)', [
            'event'       => $eventType,
            'payment_id'  => data_get($session, 'id'),
            'intent_id'   => data_get($session, 'attributes.payment_intent_id'),
            'amount'      => ((int) data_get($session, 'attributes.amount', 0)) / 100,
            'fee'         => ((int) data_get($session, 'attributes.fee', 0)) / 100,
            'net_amount'  => ((int) data_get($session, 'attributes.net_amount', 0)) / 100,
            'method'      => data_get($session, 'attributes.source.type'),
            'description' => data_get($session, 'attributes.description'),
            'booking_id'  => data_get($session, 'attributes.metadata.booking_id'),
            'fee_type'    => data_get($session, 'attributes.metadata.fee_type'),
            'paid_at'     => data_get($session, 'attributes.paid_at'),
        ]);

        \App\Models\PaymentLog::firstOrCreate(
            ['payment_id' => data_get($session, 'id')],
            [
                'event'       => $eventType,
                'intent_id'   => data_get($session, 'attributes.payment_intent_id'),
                'booking_id'  => data_get($session, 'attributes.metadata.booking_id'),
                'amount'      => ((int) data_get($session, 'attributes.amount', 0)) / 100,
                'fee'         => ((int) data_get($session, 'attributes.fee', 0)) / 100,
                'net_amount'  => ((int) data_get($session, 'attributes.net_amount', 0)) / 100,
                'method'      => data_get($session, 'attributes.source.type'),
                'description' => data_get($session, 'attributes.description'),
                'status'      => 'paid',
                'paid_at'     => data_get($session, 'attributes.paid_at')
                    ? \Carbon\Carbon::createFromTimestamp(data_get($session, 'attributes.paid_at'), config('app.timezone'))
                    : now(),
            ]
        );

        // ============================================================
        // ROUTING: Kung Restaurant POS ito, ipasa sa OrderQrController
        // ============================================================
        $metadata = data_get($session, 'attributes.metadata', []);

        if (data_get($metadata, 'source') === 'restaurant_pos') {
            Log::info('Webhook: Routing to OrderQrController (Restaurant POS)');

            return app(\App\Http\Controllers\OrderQrController::class)
                ->webhook($request);
        }
        // ============================================================

        // Fee payments (early check-in, late check-out, extension): ang webhook na ang nagre-record
        if (data_get($session, 'attributes.metadata.fee_type')) {
            $feeBookingId = data_get($session, 'attributes.metadata.booking_id');
            $feeAmount = ((int) data_get($session, 'attributes.amount', 0)) / 100;
            // I-save ang pay_... (parehas sa Payment Logs). Ang pi_... ay hinahanap
            // ng feeStatus() gamit ang payment_logs.intent_id
            $feePaymentId = data_get($session, 'id');
            $feeIntentId  = data_get($session, 'attributes.payment_intent_id');
            $feeReference = $feePaymentId ?? $feeIntentId;

            if (! $feeBookingId || ! $feeReference || $feeAmount <= 0) {
                Log::warning('PayMongo webhook: fee payment missing data', $payload);
                return response()->json(['message' => 'Missing data'], 200);
            }

            if (BookingPayment::whereIn('bank_reference', array_filter([$feePaymentId, $feeIntentId]))->exists()) {
                return response()->json(['message' => 'Already processed'], 200);
            }

            $feeBooking = Booking::find($feeBookingId);

            if (! $feeBooking) {
                return response()->json(['message' => 'Booking not found'], 200);
            }

            $feeShift = Shift::whereNull('closed_at')->latest()->first();

            $lastFeePayment = BookingPayment::whereNotNull('receipt_number')
                ->latest('id')
                ->first();

            $feeNext = $lastFeePayment && $lastFeePayment->receipt_number
                ? ((int) substr($lastFeePayment->receipt_number, -6)) + 1
                : 1;

            BookingPayment::create([
                'booking_id'      => $feeBooking->id,
                'shift_id'        => $feeShift?->id,
                'receipt_number'  => 'OR-' . date('Y') . '-' . str_pad($feeNext, 6, '0', STR_PAD_LEFT),
                'amount'          => $feeAmount,
                'payment_method'  => 'qrph',
                'payment_status'  => 'paid',
                'gcash_reference' => null,
                'bank_reference'  => $feeReference,
                'received_by'     => $feeBooking->created_by,
                'payment_date'    => now(),
            ]);

            broadcast(new DashboardUpdated())->toOthers();

            Log::channel('paymongo')->info('💾 Fee payment saved to DB', [
                'booking_id' => $feeBooking->id,
                'fee_type'   => data_get($session, 'attributes.metadata.fee_type'),
                'reference'  => $feeReference,
                'amount'     => $feeAmount,
            ]);

            return response()->json(['message' => 'Fee payment recorded'], 200);
        }

        $bookingId     = data_get($session, 'attributes.metadata.booking_id');
        $paymentMethod = data_get($session, 'attributes.metadata.payment_method', 'gcash');
        $bookingType   = data_get($session, 'attributes.metadata.booking_type');
        $bookingPaymentId = data_get($session, 'attributes.metadata.booking_payment_id');
        $intentId         = data_get($session, 'attributes.payment_intent_id');

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

        // Determine if this is a walk-in QR payment early, so we can
        // accept 'confirmed' rooms (walk-in reservations) as payable too.
        $isWalkInQr = ($bookingType === 'walk_in' || $booking->booking_type === 'walk_in')
            && $paymentMethod === 'qrph';

        $hasPayableRoom = $booking->bookedRooms()
            ->whereIn('status', $isWalkInQr ? ['pending', 'confirmed'] : ['pending'])
            ->exists();

        if (! $hasPayableRoom) {

            Log::warning("PayMongo webhook: booking {$bookingId} has no payable rooms.", [
                'payment_reference' => $paymentReference,
                'is_walk_in_qr' => $isWalkInQr,
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

        // The booking already has a "pending" payment row created when the
        // booking was first made (online booking or walk-in QR check-in).
        // Update THAT row instead of inserting a new one — otherwise the
        // original pending row is orphaned and keeps showing as "PENDING"
        // in the UI even though PayMongo already confirmed payment.
        if ($bookingPaymentId) {
            // Exact leg, and it must still be pending and belong to this intent.
            $payment = BookingPayment::where('id', $bookingPaymentId)
                ->where('booking_id', $booking->id)
                ->first();

            $valid = $payment
                && $payment->payment_method === 'qrph'
                && $payment->payment_status === 'pending'
                && (! $payment->bank_reference || ! $intentId || $payment->bank_reference === $intentId);

            if (! $valid) {
                Log::warning('PayMongo webhook ignored: payment leg is cancelled/changed/stale. MANUAL RECONCILIATION MAY BE NEEDED.', [
                    'booking_payment_id' => $bookingPaymentId,
                    'payment_reference'  => $paymentReference,
                    'status'             => $payment?->payment_status,
                ]);

                return response()->json(['message' => 'Payment leg no longer pending.'], 200);
            }
        } else {
            $payment = BookingPayment::where('booking_id', $booking->id)
                ->where('payment_status', 'pending')
                ->latest('id')
                ->first();

            // Walk-in QR must never create a fallback row.
            if ($isWalkInQr && ! $payment) {
                Log::warning('PayMongo webhook ignored: no pending walk-in QR row.', [
                    'booking_id' => $booking->id,
                    'payment_reference' => $paymentReference,
                ]);

                return response()->json(['message' => 'No pending payment.'], 200);
            }
        }

        if ($payment) {
            $payment->update([
                'shift_id'        => $payment->shift_id ?? $shift?->id,
                'amount'          => $amount,
                'payment_method'  => $paymentMethod,
                'payment_status'  => 'paid',
                'gcash_reference' => $paymentMethod === 'gcash' ? $paymentReference : $payment->gcash_reference,
                'bank_reference'  => in_array($paymentMethod, ['bank', 'qrph']) ? $paymentReference : $payment->bank_reference,
                'payment_date'    => now(),
            ]);
        } else {
            // Fallback: no pending row found (shouldn't normally happen).
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
                'payment_method'  => $paymentMethod,
                'payment_status'  => 'paid',
                'gcash_reference' => $paymentMethod === 'gcash' ? $paymentReference : null,
                'bank_reference'  => in_array($paymentMethod, ['bank', 'qrph']) ? $paymentReference : null,
                'received_by'     => $booking->created_by,
                'payment_date'    => now(),
            ]);
        }

        // ---------------------------------------------------------------------
        // WALK-IN QR Ph AUTO-CONFIRM
        //
        // For walk-ins the guest is physically at the counter, so once PayMongo
        // confirms payment we immediately flip the BookedRoom(s) to 'checked_in'
        // and the physical Room(s) to 'occupied'. Online bookings continue to
        // require manual staff confirmation.
        // ---------------------------------------------------------------------
        $hasUnpaidLeg = BookingPayment::where('booking_id', $booking->id)
            ->whereIn('payment_status', ['pending', 'failed'])
            ->exists();

        if ($isWalkInQr && ! $hasUnpaidLeg) {
            foreach ($booking->bookedRooms as $bookedRoom) {
                if (in_array($bookedRoom->status, ['pending', 'confirmed'])) {
                    $bookedRoom->update([
                        'status' => 'checked_in',
                        'check_in_time' => $bookedRoom->check_in_time ?? now(),
                    ]);

                    Room::where('id', $bookedRoom->room_id)->update([
                        'status' => Room::STATUS_OCCUPIED,
                    ]);
                }
            }

            Log::info("PayMongo webhook auto-confirmed walk-in QR booking {$booking->id}");
        }

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

        Log::channel('paymongo')->info('💾 Payment saved to DB', [
            'booking_id'         => $booking->id,
            'booking_reference'  => $booking->booking_reference,
            'booking_payment_id' => $payment->id,
            'paymongo_reference' => $paymentReference,
            'amount'             => $amount,
            'walk_in_qr'         => $isWalkInQr,
        ]);

        // Staff who handled this walk-in at the counter
        $booking->loadMissing('createdBy');

        $handlerName = $booking->createdBy
            ? trim($booking->createdBy->first_name . ' ' . $booking->createdBy->last_name)
            : null;

        if ($isWalkInQr && ! $hasUnpaidLeg) {
            BookingHistory::create([
                'booking_id'  => $booking->id,
                'old_status'  => 'confirmed',
                'new_status'  => 'checked_in',
                'change_note' => 'Guest checked in via QR Ph' . ($handlerName ? ' (handled by ' . $handlerName . ')' : ''),
                'changed_by'  => $booking->created_by,
                'changed_at'  => now(),
            ]);
        }

        // Notify Admins and Staff
        $staffAndAdmins = User::whereIn('role', ['admin', 'staff'])
            ->when($booking->created_by, fn($q) => $q->where('id', '!=', $booking->created_by))
            ->get();

        foreach ($staffAndAdmins as $user) {
            $notification = Notification::create([
                'user_id' => $user->id,
                'booking_id' => $booking->id,
                'title'   => $isWalkInQr ? 'Walk-in QR Ph Paid' : 'Payment Received',
                'message' => $isWalkInQr
                    ? 'Walk-in booking ' . $booking->booking_reference . ' paid via QR Ph and auto-checked-in.' . ($handlerName ? ' Handled by ' . $handlerName . '.' : '')
                    : 'Payment received for booking ' . $booking->booking_reference . ' via QR Ph. Awaiting staff confirmation.',
                'is_read' => false,
            ]);

            broadcast(new NotificationCreated($notification));
        }

        // Notify Guest (only if there's a linked user account — walk-ins usually don't have one)
        $booking->loadMissing('user');

        if ($booking->user_id) {

            $notification = Notification::create([
                'user_id' => $booking->user_id,
                'booking_id' => $booking->id,
                'title'   => 'Payment Received',
                'message' => $isWalkInQr
                    ? 'We received your payment for booking ' . $booking->booking_reference . '. You are now checked in.'
                    : 'We received your payment for booking ' . $booking->booking_reference . '. It is now awaiting staff confirmation.',
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

        return response()->json(['message' => 'Payment recorded'], 200);
    }


    // PAYMENT LOGS (admin lang)
    public function logs(Request $request)
    {
        if ($request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = \App\Models\PaymentLog::query()->latest('paid_at');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('payment_id', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('booking_id', $search);
            });
        }

        return response()->json($query->paginate($request->per_page ?? 15));
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
            config('services.paymongo.webhook_secret')
        );

        Log::info('Computed Signature', [
            'expected' => $expectedSignature,
        ]);

        return hash_equals($expectedSignature, $signature);
    }
}
