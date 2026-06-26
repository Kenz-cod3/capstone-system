<?php

namespace App\Http\Controllers;

use App\Models\BookingInvoice;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BookingInvoiceController extends Controller
{
    // GET ALL INVOICES
    public function index()
    {
        return response()->json(
            BookingInvoice::with('booking')->get(),
            200
        );
    }

    // CREATE INVOICE
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id'
        ]);

        $booking = Booking::with(['bookedRooms', 'bookingAddOns', 'payments'])
            ->findOrFail($validated['booking_id']);

        $roomTotal = $booking->bookedRooms->sum('price_at_time_of_booking');
        $addOnTotal = $booking->bookingAddOns->sum('subtotal');
        $paidTotal = $booking->payments->sum('amount');
        $grandTotal = $roomTotal + $addOnTotal;
        $balance = $grandTotal - $paidTotal;
        $invoice = BookingInvoice::create([
            'booking_id' => $booking->id,
            'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
            'room_total' => $roomTotal,
            'add_on_total' => $addOnTotal,
            'grand_total' => $grandTotal,
            'paid_total' => $paidTotal,
            'balance' => $balance
        ]);

        return response()->json([
            'message' => 'Invoice generated successfully',
            'data' => $invoice->load('booking')
        ], 201);
    }

    public function show($id)
    {
        $invoice = BookingInvoice::with('booking')->findOrFail($id);

        return response()->json($invoice, 200);
    }

    public function update(Request $request, $id)
    {
        $invoice = BookingInvoice::findOrFail($id);

        $validated = $request->validate([
            'room_total' => 'sometimes|numeric|min:0',
            'add_on_total' => 'sometimes|numeric|min:0',
            'grand_total' => 'sometimes|numeric|min:0',
            'paid_total' => 'sometimes|numeric|min:0',
            'balance' => 'sometimes|numeric|min:0'
        ]);

        $invoice->update($validated);

        return response()->json([
            'message' => 'Invoice updated',
            'data' => $invoice
        ], 200);
    }

    public function destroy($id)
    {
        $invoice = BookingInvoice::findOrFail($id);
        $invoice->delete();

        return response()->json([
            'message' => 'Invoice deleted'
        ], 200);
    }
}
