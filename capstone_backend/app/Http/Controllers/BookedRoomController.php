<?php

namespace App\Http\Controllers;

use App\Models\BookedRoom;
use App\Models\Room;
use Illuminate\Http\Request;

class BookedRoomController extends Controller
{
    //GET ALL BOOKED ROOMS
    public function index()
    {
        return response()->json(
            BookedRoom::with(['booking', 'room'])->get(),
            200
        );
    }

    //ASSIGN ROOM TO BOOKING
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'room_id' => 'required|exists:rooms,id',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:reserved,checked_in,checked_out'
        ]);

        // Check if room already assigned
        $exists = BookedRoom::where('room_id', $validated['room_id'])
            ->where('status', '!=', 'checked_out')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Room already assigned or occupied'
            ], 400);
        }

        $bookedRoom = BookedRoom::create($validated);

        // Update room status
        Room::where('id', $validated['room_id'])
            ->update(['status' => 'occupied']);

        return response()->json([
            'message' => 'Room assigned to booking',
            'data' => $bookedRoom->load(['booking', 'room'])
        ], 201);
    }

    //GET SINGLE
    public function show($id)
    {
        $bookedRoom = BookedRoom::with(['booking', 'room'])->findOrFail($id);

        return response()->json($bookedRoom, 200);
    }

    // 🔹 UPDATE (e.g., CHECK-IN / CHECK-OUT)
    public function update(Request $request, $id)
    {
        $bookedRoom = BookedRoom::findOrFail($id);

        $validated = $request->validate([
            'price' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:reserved,checked_in,checked_out'
        ]);

        $bookedRoom->update($validated);

        // If checked out → free the room
        if (isset($validated['status']) && $validated['status'] === 'checked_out') {
            Room::where('id', $bookedRoom->room_id)
                ->update(['status' => 'available']);
        }

        return response()->json([
            'message' => 'Booked room updated',
            'data' => $bookedRoom
        ], 200);
    }

    // 🔹 REMOVE ROOM FROM BOOKING
    public function destroy($id)
    {
        $bookedRoom = BookedRoom::findOrFail($id);

        // Free the room
        Room::where('id', $bookedRoom->room_id)
            ->update(['status' => 'available']);

        $bookedRoom->delete();

        return response()->json([
            'message' => 'Booked room deleted'
        ], 200);
    }
}
