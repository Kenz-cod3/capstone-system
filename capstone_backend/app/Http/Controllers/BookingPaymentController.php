<?php

namespace App\Http\Controllers;

use App\Events\NotificationCreated;
use App\Models\BookingPayment;
use App\Models\Booking;
use App\Models\Shift;
use App\Models\CashTransaction;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BookingPaymentController extends Controller
{
    // GET ALL PAYMENTS

    public function index()
    {
        try {

            $query = BookingPayment::with([
                'booking:id,booking_reference',
                'receiver:id,first_name,last_name'
            ])
                ->where('payment_status', 'paid');

            // Staff can only see their own collections
            if (Auth::user()->role === 'staff') {
                $query->where('received_by', Auth::id());
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
            'payment_method' =>  'required|in:cash,gcash,bank',
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

            $shift = Shift::whereNull('closed_at')
                ->latest()
                ->first();

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
        ]);

        $booking = Booking::with([
            'bookedRooms',
            'payments'
        ])->findOrFail($validated['booking_id']);

        $bookedRoom = $booking->bookedRooms()
            ->whereKey($validated['booked_room_id'])
            ->firstOrFail();

        if (!in_array($bookedRoom->status, [
            'confirmed',
            'checked_in',
        ])) {
            return response()->json([
                'message' => 'Only confirmed or checked-in rooms can be refunded.'
            ], 400);
        }

        DB::beginTransaction();

        try {

            // Latest payment
            $latestPayment = $booking->payments()
                ->latest('id')
                ->first();

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
                'amount'          => $bookedRoom->subtotal,

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

            // Update booking total
            $booking->update([
                'total_price' => $booking->bookedRooms()
                    ->whereNotIn('status', [
                        'refunded',
                        'cancelled'
                    ])
                    ->sum('subtotal')
            ]);

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
            'payment_method' =>  'sometimes|in:cash,gcash,bank',
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
