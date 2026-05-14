<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index()
    {
        $rooms = Room::with([
            'roomType:id,type_name,base_price,short_stay_price',
            'images'
        ])
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        return response()->json(
            $rooms->map(function ($room) {

                // 📷 NORMAL IMAGE
                $normalImage = $room->images
                    ->where('image_type', 'normal')
                    ->sortByDesc('created_at')
                    ->first();

                // 👁️ 360 IMAGE
                $panoramaImage = $room->images
                    ->where('image_type', '360')
                    ->sortByDesc('created_at')
                    ->first();

                return [
                    'id' => $room->id,
                    'room_number' => $room->room_number,
                    'status' => $room->status,
                    'is_deleted' => $room->deleted_at !== null,

                    'images' => $room->images,

                    'room_type_id' => $room->room_type_id,
                    'room_type' => $room->roomType,

                    // 📷 CARD IMAGE
                    'image_url' => $normalImage
                        ? asset('storage/' . $normalImage->image_path)
                        : null,

                    // 👁️ POV IMAGE
                    'panorama_url' => $panoramaImage
                        ? asset('storage/' . $panoramaImage->image_path)
                        : null,
                ];
            })
        );
    }

    // 🔥 LIGHTWEIGHT REALTIME ROOM GRID
    public function statusGrid()
    {
        $rooms = Room::select(
            'id',
            'room_number',
            'status'
        )
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        return response()->json($rooms);
    }

    // CREATE ROOM
    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'room_number' => 'required|string|unique:rooms,room_number',
            'status' => 'required|in:available,occupied,maintenance,dirty,cleaning'
        ]);

        $room = Room::create($validated);

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room created successfully',
            'data' => $room
        ], 201);
    }

    // SHOW ROOM
    public function show($id)
    {
        $room = Room::with(['roomType', 'images'])->findOrFail($id);

        $room->image_url = $room->images->count()
            ? asset('storage/' . $room->images[0]->image_path)
            : null;

        return response()->json($room, 200);
    }

    // UPDATE ROOM
    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        $validated = $request->validate([
            'room_type_id' => 'sometimes|exists:room_types,id',
            'room_number' => 'sometimes|string|unique:rooms,room_number,' . $id,
            'status' => 'sometimes|in:available,occupied,maintenance,dirty,cleaning'
        ]);

        $room->update($validated);

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room updated successfully',
            'data' => $room
        ], 200);
    }

    // SOFT DELETE ROOM
    public function destroy($id)
    {
        $room = Room::with('bookings')->findOrFail($id);

        // DO NOT DELETE OCCUPIED ROOM
        if ($room->status === 'occupied') {

            return response()->json([
                'message' => 'The room is occupied and cannot be deleted.'
            ], 400);
        }

        $hasActiveBookings = $room->bookings()
            ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
            ->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'message' => 'Cannot delete room. It still has active bookings.'
            ], 400);
        }

        $room->delete();

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room deleted successfully'
        ]);
    }

    // RESTORE ROOM
    public function restore($id)
    {
        $room = Room::withTrashed()->findOrFail($id);

        if (!$room->trashed()) {
            return response()->json([
                'message' => 'Room is not deleted'
            ], 400);
        }

        $room->restore();

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room restored successfully'
        ]);
    }

    // PERMANENT DELETE
    public function forceDelete($id)
    {
        $room = Room::withTrashed()->findOrFail($id);

        $room->forceDelete();

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room permanently deleted'
        ]);
    }

    // ROOM OCCUPANCY SUMMARY
    public function occupancy()
    {
        $totalRooms = Room::count();

        $occupiedRooms = Room::where('status', 'occupied')->count();
        $availableRooms = Room::where('status', 'available')->count();
        $maintenanceRooms = Room::where('status', 'maintenance')->count();
        $dirtyRooms = Room::where('status', 'dirty')->count();
        $cleaningRooms = Room::where('status', 'cleaning')->count();

        $occupancyRate = $totalRooms > 0
            ? round(($occupiedRooms / $totalRooms) * 100, 2)
            : 0;

        return response()->json([
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedRooms,
            'available_rooms' => $availableRooms,
            'maintenance_rooms' => $maintenanceRooms,
            'dirty_rooms' => $dirtyRooms,
            'cleaning_rooms' => $cleaningRooms,
            'occupancy_rate' => $occupancyRate
        ]);
    }

    // OCCUPANCY TREND
    public function occupancyTrend()
    {
        $data = [];

        for ($i = 6; $i >= 0; $i--) {

            $date = now()->subDays($i)->format('Y-m-d');

            $totalRooms = Room::count();

            $occupiedRooms = \App\Models\Booking::whereDate('created_at', $date)
                ->whereIn('booking_status', [
                    'confirmed',
                    'checked_in',
                    'checked_out'
                ])
                ->with('rooms')
                ->get()
                ->pluck('rooms')
                ->flatten()
                ->count();

            $rate = $totalRooms > 0
                ? round(($occupiedRooms / $totalRooms) * 100, 2)
                : 0;

            $data[] = [
                'day' => \Carbon\Carbon::parse($date)->format('D'),
                'occupancy' => $rate
            ];
        }

        return response()->json($data);
    }

    // DAMAGED ROOMS
    public function damaged()
    {
        $rooms = Room::with([
            'cleaner'
        ])
            ->where('has_damage', 1)
            ->latest('completed_at')
            ->get();

        return response()->json($rooms);
    }
}
