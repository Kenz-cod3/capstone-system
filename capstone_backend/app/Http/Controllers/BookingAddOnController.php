<?php

namespace App\Http\Controllers;

use App\Models\BookingAddOn;
use App\Models\AddOn;
use Illuminate\Http\Request;

class BookingAddOnController extends Controller
{
    //GET ALL
    public function index()
    {
        return response()->json(
            BookingAddOn::with(['booking', 'addOn'])->get(),
            200
        );
    }

    //ADD ADD-ON TO BOOKING
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'add_on_id' => 'required|exists:add_ons,id',
            'quantity' => 'required|integer|min:1'
        ]);

        //Get add-on price
        $addOn = AddOn::findOrFail($validated['add_on_id']);

        $validated['price'] = $addOn->price;
        $validated['subtotal'] = $addOn->price * $validated['quantity'];

        $bookingAddOn = BookingAddOn::create($validated);

        return response()->json([
            'message' => 'Add-on added to booking',
            'data' => $bookingAddOn->load(['booking', 'addOn'])
        ], 201);
    }

    //GET SINGLE
    public function show($id)
    {
        $data = BookingAddOn::with(['booking', 'addOn'])->findOrFail($id);

        return response()->json($data, 200);
    }

    //UPDATE (CHANGE QUANTITY)
    public function update(Request $request, $id)
    {
        $bookingAddOn = BookingAddOn::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1'
        ]);

        //Recalculate subtotal
        $validated['subtotal'] = $bookingAddOn->price * $validated['quantity'];

        $bookingAddOn->update($validated);

        return response()->json([
            'message' => 'Booking add-on updated',
            'data' => $bookingAddOn
        ], 200);
    }

    //REMOVE ADD-ON
    public function destroy($id)
    {
        $bookingAddOn = BookingAddOn::findOrFail($id);
        $bookingAddOn->delete();

        return response()->json([
            'message' => 'Booking add-on deleted'
        ], 200);
    }
}
