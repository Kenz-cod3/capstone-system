<?php

namespace App\Http\Controllers;

use App\Models\BookingPayment;
use App\Models\Booking;
use App\Models\Shift;
use App\Models\CashTransaction;
use Illuminate\Http\Request;

class BookingPaymentController extends Controller
{
    // GET ALL PAYMENTS
    public function index()
    {
        try {

            $payments = BookingPayment::with([
                'booking:id,booking_reference',
                'receiver:id,first_name,last_name'
            ])
                ->orderByDesc('payment_date')
                ->get();

            return response()->json(
                $payments,
                200
            );
        } catch (\Exception $e) {

            return response()->json([
                'message' => 'Failed to load payments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // CREATE PAYMENT
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' =>
            'required|exists:bookings,id',

            'amount' =>
            'required|numeric|min:0',

            'payment_method' =>
            'required|in:cash,gcash,bank',

            'gcash_reference' =>
            'nullable|string',

            'bank_reference' =>
            'nullable|string',
        ]);

        $booking = Booking::findOrFail(
            $validated['booking_id']
        );

        $shift = Shift::whereNull('closed_at')
            ->latest()
            ->first();

        $totalPaid = BookingPayment::where(
            'booking_id',
            $booking->id
        )->sum('amount');

        $newTotal =
            $totalPaid +
            $validated['amount'];

        $payment = BookingPayment::create([

            'booking_id' =>
            $booking->id,

            'shift_id' =>
            $shift?->id,

            'amount' =>
            $validated['amount'],

            'payment_method' =>
            $validated['payment_method'],

            'gcash_reference' =>
            $validated['gcash_reference'] ?? null,

            'bank_reference' =>
            $validated['bank_reference'] ?? null,

            'received_by' =>
            null,

            'payment_date' =>
            now(),
        ]);

        if (
            $newTotal >=
            $booking->total_price
        ) {

            $booking->update([
                'booking_status' =>
                'confirmed'
            ]);
        }

        if ($shift) {

            $payments =
                BookingPayment::where(
                    'shift_id',
                    $shift->id
                )->sum('amount');

            $payIn =
                CashTransaction::where(
                    'shift_id',
                    $shift->id
                )
                ->where(
                    'type',
                    'pay_in'
                )
                ->sum('amount');

            $payOut =
                CashTransaction::where(
                    'shift_id',
                    $shift->id
                )
                ->where(
                    'type',
                    'pay_out'
                )
                ->sum('amount');

            $shift->update([

                'expected_cash' =>

                $shift->starting_cash +
                    $payments +
                    $payIn -
                    $payOut
            ]);
        }

        return response()->json([
            'message' =>
            'Payment recorded successfully',

            'data' =>
            $payment->load([
                'booking:id,booking_reference',
                'receiver:id,first_name,last_name'
            ])
        ], 201);
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

            'amount' =>
            'sometimes|numeric|min:0',

            'payment_method' =>
            'sometimes|in:cash,gcash,bank',

            'gcash_reference' =>
            'nullable|string',

            'bank_reference' =>
            'nullable|string',
        ]);

        $payment->update($validated);

        return response()->json([
            'message' =>
            'Payment updated',

            'data' =>
            $payment->load([
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
            'message' =>
            'Payment deleted'
        ], 200);
    }
}
