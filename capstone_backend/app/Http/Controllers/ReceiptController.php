<?php

namespace App\Http\Controllers;

use App\Models\BookingPayment;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    // ==========================================
    // WEB RECEIPT (STAFF)
    // GET /receipts/{payment}
    // ==========================================
    public function show(BookingPayment $payment)
    {
        return response()->json(
            $payment->load([
                'booking.walkInGuest',
                'booking.bookedRooms.room.roomType',
                'booking.bookedRooms.bookingAddOns.addOn',
                'receiver',
                'shift',
            ])
        );
    }

    // ==========================================
    // MOBILE RECEIPT (GUEST)
    // GET /bookings/{bookingId}/receipt
    // ==========================================
    public function bookingReceipt($bookingId)
    {
        $payment = BookingPayment::with([
            'booking.walkInGuest',
            'booking.user',
            'booking.bookedRooms.room.roomType',
            'booking.bookedRooms.bookingAddOns.addOn',
            'receiver',
            'shift',
        ])
            ->where('booking_id', $bookingId)
            ->where('payment_status', 'paid')
            ->latest('payment_date')
            ->first();

        if (!$payment) {
            return response()->json([
                'message' => 'Receipt not found.'
            ], 404);
        }

        return response()->json($payment);
    }
}
