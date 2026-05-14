<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Models\BookedRoom;
use App\Models\Room;
use Illuminate\Http\Request;

class BookedRoomController extends Controller
{
    // GET ALL BOOKED ROOMS
    public function index()
    {
        return response()->json(
            BookedRoom::with(['booking', 'room'])->get(),
            200
        );
    }

    // ASSIGN ROOM TO BOOKING
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id'               => 'required|exists:bookings,id',
            'room_id'                  => 'required|exists:rooms,id',
            'price_at_time_of_booking' => 'required|numeric|min:0',
            'subtotal'                 => 'required|numeric|min:0',
            'stay_type'                => 'required|in:overnight,short_stay',
        ]);

        $room = Room::findOrFail($validated['room_id']);

        if ($room->status !== 'available') {
            return response()->json([
                'message' => 'Room already assigned or occupied'
            ], 400);
        }

        $bookedRoom = BookedRoom::create([
            'booking_id'               => $validated['booking_id'],
            'room_id'                  => $validated['room_id'],
            'price_at_time_of_booking' => $validated['price_at_time_of_booking'],
            'subtotal'                 => $validated['subtotal'],
            'stay_type'                => $validated['stay_type'],
        ]);

        $room->update([
            'status' => 'occupied'
        ]);

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Room assigned to booking',
            'data'    => $bookedRoom->load(['booking', 'room'])
        ], 201);
    }

    // GET SINGLE
    public function show($id)
    {
        $bookedRoom = BookedRoom::with(['booking', 'room'])->findOrFail($id);

        return response()->json($bookedRoom, 200);
    }

    // UPDATE
    public function update(Request $request, $id)
    {
        $bookedRoom = BookedRoom::with('room')->findOrFail($id);

        $validated = $request->validate([
            'price_at_time_of_booking' => 'sometimes|numeric|min:0',
            'subtotal'                 => 'sometimes|numeric|min:0',
            'stay_type'                => 'sometimes|in:overnight,short_stay',
            'check_out'                => 'sometimes|boolean',
        ]);

        // CHECKOUT
        if (!empty($validated['check_out'])) {

            $bookedRoom->update([
                'check_out_time' => now()
            ]);

            // ROOM → DIRTY
            $bookedRoom->room->update([
                'status' => 'dirty'
            ]);

            unset($validated['check_out']);
        }

        // OTHER FIELD UPDATES
        $updateData = collect($validated)
            ->only([
                'price_at_time_of_booking',
                'subtotal',
                'stay_type'
            ])
            ->filter(fn($v) => $v !== null)
            ->toArray();

        if (!empty($updateData)) {
            $bookedRoom->update($updateData);
        }

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room updated',
            'data'    => $bookedRoom->fresh(['booking', 'room'])
        ], 200);
    }

    // REMOVE ROOM FROM BOOKING
    public function destroy($id)
    {
        $bookedRoom = BookedRoom::with('room')->findOrFail($id);

        // ROOM → DIRTY
        if ($bookedRoom->room) {
            $bookedRoom->room->update([
                'status' => 'dirty'
            ]);
        }

        $bookedRoom->delete();

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room removed'
        ], 200);
    }
}
