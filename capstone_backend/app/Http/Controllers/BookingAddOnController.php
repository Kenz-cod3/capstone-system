<?php

namespace App\Http\Controllers;

use App\Models\BookingAddOn;
use App\Models\AddOn;
use Illuminate\Http\Request;

class BookingAddOnController extends Controller
{
    // GET ALL BOOKING ADD-ONS
    public function index()
    {
        return response()->json(
            BookingAddOn::with(['bookedRoom', 'addOn'])->get(),
            200
        );
    }

    // ADD ADD-ON TO A BOOKED ROOM
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
            'add_on_id' => 'required|exists:add_ons,id',
            'quantity' => 'required|integer|min:1',
        ]);

        // Get add-on price
        $addOn = AddOn::findOrFail($validated['add_on_id']);

        // Compute subtotal
        $validated['subtotal'] = $addOn->price * $validated['quantity'];

        $bookingAddOn = BookingAddOn::create($validated);

        return response()->json([
            'message' => 'Add-on added successfully.',
            'data' => $bookingAddOn->load(['bookedRoom', 'addOn']),
        ], 201);
    }

    // GET SINGLE BOOKING ADD-ON
    public function show($id)
    {
        $bookingAddOn = BookingAddOn::with(['bookedRoom', 'addOn'])->findOrFail($id);

        return response()->json($bookingAddOn, 200);
    }

    // UPDATE QUANTITY
    public function update(Request $request, $id)
    {
        $bookingAddOn = BookingAddOn::with('addOn')->findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        // Recalculate subtotal using current add-on price
        $validated['subtotal'] = $bookingAddOn->addOn->price * $validated['quantity'];

        $bookingAddOn->update($validated);

        return response()->json([
            'message' => 'Booking add-on updated successfully.',
            'data' => $bookingAddOn->fresh()->load(['bookedRoom', 'addOn']),
        ], 200);
    }

    // DELETE BOOKING ADD-ON
    public function destroy($id)
    {
        $bookingAddOn = BookingAddOn::findOrFail($id);

        $bookingAddOn->delete();

        return response()->json([
            'message' => 'Booking add-on deleted successfully.',
        ], 200);
    }
}
