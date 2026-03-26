<?php

namespace App\Http\Controllers;

use App\Models\BookingPayment;
use App\Models\Booking;
use Illuminate\Http\Request;

class BookingPaymentController extends Controller
{
    // 🔹 GET ALL PAYMENTS
    public function index()
    {
        return response()->json(
            BookingPayment::with('booking')->get(),
            200
        );
    }

    // 🔹 CREATE PAYMENT
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'status' => 'required|in:pending,paid,failed'
        ]);

        $booking = Booking::findOrFail($validated['booking_id']);

        // Calculate total paid so far
        $totalPaid = BookingPayment::where('booking_id', $booking->id)->sum('amount');

        $newTotal = $totalPaid + $validated['amount'];

        // Optional: update booking status
        if ($newTotal >= $booking->total_price) {
            $booking->update(['status' => 'paid']);
        }

        $payment = BookingPayment::create($validated);

        return response()->json([
            'message' => 'Payment recorded successfully',
            'data' => $payment->load('booking')
        ], 201);
    }

    // 🔹 GET SINGLE PAYMENT
    public function show($id)
    {
        $payment = BookingPayment::with('booking')->findOrFail($id);

        return response()->json($payment, 200);
    }

    // 🔹 UPDATE PAYMENT
    public function update(Request $request, $id)
    {
        $payment = BookingPayment::findOrFail($id);

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'payment_method' => 'sometimes|string',
            'status' => 'sometimes|in:pending,paid,failed'
        ]);

        $payment->update($validated);

        return response()->json([
            'message' => 'Payment updated',
            'data' => $payment
        ], 200);
    }

    // 🔹 DELETE PAYMENT
    public function destroy($id)
    {
        $payment = BookingPayment::findOrFail($id);
        $payment->delete();

        return response()->json([
            'message' => 'Payment deleted'
        ], 200);
    }
}
