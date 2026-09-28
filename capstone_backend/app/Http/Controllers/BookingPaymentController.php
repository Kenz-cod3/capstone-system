<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Events\NotificationCreated;
use App\Models\BookingPayment;
use App\Models\Booking;
use App\Models\Shift;
use App\Models\CashTransaction;
use App\Models\Notification;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BookingPaymentController extends Controller
{
    // GET ALL PAYMENTS

    public function index()
    {
        try {

            $query = BookingPayment::with([
                'booking:id,booking_reference',
                'receiver:id,first_name,last_name,role'
            ])
                ->where('payment_status', 'paid');

            // Staff can only see their own collections
            if (Auth::user()->role === 'staff') {
                $query->where('received_by', Auth::id());
            } else {
                // Admin view: exclude payments received by other admins —
                // only staff-collected cash should show here
                $query->whereHas('receiver', function ($q) {
                    $q->where('role', 'staff');
                });
            }

            $payments = $query
                ->orderByDesc('payment_date')
                ->get();

            return response()->json($payments);
        } catch (\Exception $e) {

            return response()->json([
                'message' => 'Failed to load payments',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    // public function index()
    // {
    //     try {

    //         $payments = BookingPayment::with([
    //             'booking:id,booking_reference',
    //             'receiver:id,first_name,last_name'
    //         ])
    //             ->orderByDesc('payment_date')
    //             ->get();

    //         return response()->json(
    //             $payments,
    //             200
    //         );
    //     } catch (\Exception $e) {

    //         return response()->json([
    //             'message' => 'Failed to load payments',
    //             'error' => $e->getMessage()
    //         ], 500);
    //     }
    // }

    // CREATE PAYMENT
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' =>      'required|exists:bookings,id',
            'amount' =>          'required|numeric|min:0',
            'payment_method' => 'required|in:cash,gcash,bank,qrph',
            'payment_status' =>  'nullable|in:pending,paid,refunded,failed',
            'gcash_reference' => 'nullable|string',
            'bank_reference' =>  'nullable|string',
        ]);

        // Automatically set payment status
        if ($validated['payment_method'] === 'cash') {
            $validated['payment_status'] = 'paid';
        } else {
            $validated['payment_status'] = $validated['payment_status'] ?? 'pending';
        }

        $booking = Booking::findOrFail(
            $validated['booking_id']
        );

        DB::beginTransaction();

        try {

            // Generate Receipt Number
            $lastPayment = BookingPayment::whereNotNull('receipt_number')
                ->latest('id')
                ->first();

            $nextNumber = 1;

            if ($lastPayment && $lastPayment->receipt_number) {
                $nextNumber = ((int) substr($lastPayment->receipt_number, -6)) + 1;
            }

            $receiptNumber = 'OR-' . date('Y') . '-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

            $shift = null;

            if ($validated['payment_method'] === 'cash') {
                $shift = Shift::where('opened_by', Auth::id())
                    ->whereNull('closed_at')
                    ->latest('opened_at')
                    ->first();
            }

            $totalPaid = BookingPayment::where('booking_id', $booking->id)
                ->where('payment_status', 'paid')
                ->sum('amount');

            $newTotal = $totalPaid;

            if (($validated['payment_status'] ?? 'pending') === 'paid') {
                $newTotal += $validated['amount'];
            }

            $payment = BookingPayment::create([

                'booking_id' =>      $booking->id,
                'shift_id' =>        $shift?->id,
                'receipt_number' =>  $receiptNumber,
                'amount' =>          $validated['amount'],
                'payment_method' =>  $validated['payment_method'],
                'payment_status' =>  $validated['payment_status'] ?? 'pending',
                'gcash_reference' => $validated['gcash_reference'] ?? null,
                'bank_reference' =>  $validated['bank_reference'] ?? null,
                'received_by' =>     Auth::id(),
                'payment_date' =>    now(),
            ]);

            if ($shift) {

                $payments = BookingPayment::where('shift_id', $shift->id)
                    ->where('payment_status', 'paid')
                    ->where('payment_method', 'cash')
                    ->sum('amount');

                $payIn = CashTransaction::where('shift_id', $shift->id)
                    ->where('type', 'pay_in')
                    ->sum('amount');

                $payOut = CashTransaction::where('shift_id', $shift->id)
                    ->where('type', 'pay_out')
                    ->sum('amount');

                $refunds = BookingPayment::where('shift_id', $shift->id)
                    ->where('payment_status', 'refunded')
                    ->where('payment_method', 'cash')
                    ->sum('amount');

                $shift->update([
                    'expected_cash' =>
                    $shift->starting_cash +
                        $payments +
                        $payIn -
                        $payOut -
                        $refunds
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Payment recorded successfully',
                'data' =>
                $payment->load([
                    'booking:id,booking_reference',
                    'receiver:id,first_name,last_name'
                ])
            ], 201);
        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' => 'Payment failed.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function refund(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'booked_room_id' => 'required|exists:booked_rooms,id',
            'manual_refund_confirmed' => 'nullable|boolean',
        ]);

        $booking = Booking::with([
            'bookedRooms',
            'payments'
        ])->findOrFail($validated['booking_id']);

        $bookedRoom = $booking->bookedRooms()
            ->whereKey($validated['booked_room_id'])
            ->firstOrFail();

        $bookedRoom->load('bookingAddOns');

        $refundAmount =
            $bookedRoom->subtotal +
            $bookedRoom->bookingAddOns->sum('subtotal');

        if (!in_array($bookedRoom->status, [
            'confirmed',
            'checked_in',
            'cancelled',
        ])) {
            return response()->json([
                'message' => 'Only confirmed, checked-in, or cancelled rooms can be refunded.'
            ], 400);
        }

        DB::beginTransaction();

        try {

            // Latest payment
            $latestPayment = $booking->payments()
                ->latest('id')
                ->first();

            // ---------------------------------------------------------------
            // Actually call PayMongo's Refunds API for non-cash payments.
            // Without this, the DB/UI shows "refunded" but PayMongo never
            // processes the refund and the guest's money is never returned.
            // ---------------------------------------------------------------
            $paymongoRefundId = null;

            if ($latestPayment && $latestPayment->payment_method !== 'cash') {

                // There is no refund API for QRPH payments (the provider's
                // Refunds endpoint rejects them with "Refunds are not
                // allowed for payments with source type qrph."). These must
                // be refunded manually by the staff (e.g. bank transfer to
                // the guest), so we block the automatic attempt here and
                // ask staff to confirm once they've done that manually.
                if ($latestPayment->payment_method === 'qrph') {

                    if (! ($validated['manual_refund_confirmed'] ?? false)) {
                        DB::rollBack();

                        return response()->json([
                            'message' => 'QR Ph payments cannot be refunded automatically. Please process this refund manually (e.g. bank transfer to the guest), then confirm below once you have paid the guest.',
                            'requires_manual_refund_confirmation' => true,
                        ], 422);
                    }

                    // Staff already sent the money to the guest manually.
                    // There is no refund API for QRPH, so we just record
                    // it as refunded in our own system below.
                    Log::info('QR Ph refund recorded as manually processed', [
                        'booking_id' => $booking->id,
                        'payment_id' => $latestPayment->id,
                        'confirmed_by' => Auth::id(),
                    ]);
                } else {
                    // The payment reference was stored on create/webhook:
                    // gcash -> gcash_reference, bank -> bank_reference
                    $paymongoPaymentId = $latestPayment->payment_method === 'gcash'
                        ? $latestPayment->gcash_reference
                        : $latestPayment->bank_reference;

                    if (! $paymongoPaymentId) {
                        DB::rollBack();

                        return response()->json([
                            'message' => 'Cannot refund: no payment reference found for this payment.',
                        ], 422);
                    }

                    $refundAmountCentavos = (int) round($refundAmount * 100);

                    $refundResponse = Http::withBasicAuth(
                        config('services.paymongo.secret_key'),
                        ''
                    )->post(
                        'https://api.paymongo.com/v1/refunds',
                        [
                            'data' => [
                                'attributes' => [
                                    'amount' => $refundAmountCentavos,
                                    'payment_id' => $paymongoPaymentId,
                                    'reason' => 'requested_by_customer',
                                    'notes' => "Refund for booking {$booking->booking_reference}",
                                ],
                            ],
                        ]
                    );

                    Log::info('PayMongo Refund Response', [
                        'booking_id' => $booking->id,
                        'payment_id' => $paymongoPaymentId,
                        'status' => $refundResponse->status(),
                        'body' => $refundResponse->json(),
                    ]);

                    if ($refundResponse->failed()) {
                        DB::rollBack();

                        return response()->json([
                            'message' => 'Refund failed.',
                            'error' => $refundResponse->json(),
                        ], $refundResponse->status());
                    }

                    $paymongoRefundId = $refundResponse->json('data.id');
                }
            }

            // Generate Receipt Number
            $lastPayment = BookingPayment::whereNotNull('receipt_number')
                ->latest('id')
                ->first();

            $nextNumber = 1;

            if ($lastPayment && $lastPayment->receipt_number) {
                $nextNumber = ((int) substr($lastPayment->receipt_number, -6)) + 1;
            }

            $receiptNumber = 'OR-' . date('Y') . '-' .
                str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

            // Current Shift
            $shift = Shift::whereNull('closed_at')
                ->latest()
                ->first();

            // Create Refund Transaction
            $payment = BookingPayment::create([
                'booking_id'      => $booking->id,
                'shift_id'        => $shift?->id,
                'receipt_number'  => $receiptNumber,

                // Always positive
                // 'amount'          => $bookedRoom->subtotal,
                'amount' => $refundAmount,

                'payment_method'  => $latestPayment?->payment_method ?? 'cash',
                'payment_status'  => 'refunded',

                'gcash_reference' => $latestPayment?->gcash_reference,
                'bank_reference'  => $latestPayment?->bank_reference,

                'received_by'     => Auth::id(),
                'payment_date'    => now(),
            ]);

            // Update booked room
            $bookedRoom->update([
                'status' => 'refunded'
            ]);

            if ($bookedRoom->room) {
                $bookedRoom->room->update([
                    'status' => \App\Models\Room::STATUS_AVAILABLE,
                ]);
            }

            $staffName = Auth::user()->first_name . ' ' . Auth::user()->last_name;

            $users = User::whereIn('role', ['admin', 'staff'])->get();

            foreach ($users as $user) {
                $notification = Notification::create([
                    'user_id' => $user->id,
                    'title' => 'Room Refunded',
                    'message' => "{$staffName} processed a refund for Room {$bookedRoom->room->room_number} (Booking {$booking->booking_reference}).",
                    'is_read' => false,
                ]);

                event(new NotificationCreated($notification));
            }

            // Notify Guest
            if ($booking->user_id) {

                $notification = Notification::create([
                    'user_id' => $booking->user_id,
                    'title' => 'Booking Refunded',
                    'message' => 'Your booking ' . $booking->booking_reference .
                        ' has been refunded successfully.',
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
            // Update booking total
            $remainingTotal = 0;

            $remainingRooms = $booking->bookedRooms()
                ->whereNotIn('status', ['refunded', 'cancelled'])
                ->with('bookingAddOns')
                ->get();

            foreach ($remainingRooms as $room) {
                $remainingTotal += $room->subtotal;
                $remainingTotal += $room->bookingAddOns->sum('subtotal');
            }

            $booking->update([
                'total_price' => $remainingTotal,
            ]);
            // $booking->update([
            //     'total_price' => $booking->bookedRooms()
            //         ->whereNotIn('status', [
            //             'refunded',
            //             'cancelled'
            //         ])
            //         ->sum('subtotal')
            // ]);

            // Update shift cash
            if ($shift) {

                $payments = BookingPayment::where('shift_id', $shift->id)
                    ->where('payment_status', 'paid')
                    ->where('payment_method', 'cash')
                    ->sum('amount');

                $refunds = BookingPayment::where('shift_id', $shift->id)
                    ->where('payment_status', 'refunded')
                    ->where('payment_method', 'cash')
                    ->sum('amount');

                $payIn = CashTransaction::where('shift_id', $shift->id)
                    ->where('type', 'pay_in')
                    ->sum('amount');

                $payOut = CashTransaction::where('shift_id', $shift->id)
                    ->where('type', 'pay_out')
                    ->sum('amount');

                $shift->update([
                    'expected_cash' =>
                    $shift->starting_cash +
                        $payments -
                        $refunds +
                        $payIn -
                        $payOut
                ]);
            }

            DB::commit();

            broadcast(new DashboardUpdated())->toOthers();

            return response()->json([
                'message' => 'Room refunded successfully.',
                'payment' => $payment->load([
                    'booking:id,booking_reference',
                    'receiver:id,first_name,last_name'
                ]),
                'booking' => $booking->fresh([
                    'user',
                    'walkInGuest',
                    'createdBy',

                    'bookedRooms.room.roomType',
                    'bookedRooms.bookingAddOns.addOn',

                    'payments.receiver',
                    'payments.shift',
                ])
            ], 200);
        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' => 'Refund failed.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // GET SINGLE PAYMENT
    public function show($id)
    {
        $payment = BookingPayment::with([
            'booking:id,booking_reference',
            'receiver:id,first_name,last_name',
            'shift:id,opened_at,closed_at'
        ])->findOrFail($id);

        return response()->json(
            $payment,
            200
        );
    }

    // UPDATE PAYMENT
    public function update(
        Request $request,
        $id
    ) {

        $payment = BookingPayment::findOrFail($id);

        $validated = $request->validate([

            'amount' =>          'sometimes|numeric|min:0',
            'payment_method' => 'sometimes|in:cash,gcash,bank,qrph',
            'payment_status' =>  'sometimes|in:pending,paid,refunded,failed',
            'gcash_reference' => 'nullable|string',
            'bank_reference' =>  'nullable|string',
        ]);

        $payment->update($validated);

        return response()->json([
            'message' => 'Payment updated',
            'data' =>    $payment->load([
                'booking:id,booking_reference',
                'receiver:id,first_name,last_name'
            ])
        ], 200);
    }

    // DELETE PAYMENT
    public function destroy($id)
    {
        $payment = BookingPayment::findOrFail($id);
        $payment->delete();

        return response()->json([
            'message' => 'Payment deleted'
        ], 200);
    }
}
