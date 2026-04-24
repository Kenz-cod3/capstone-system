<?php

namespace App\Http\Controllers;

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

                // 📷 NORMAL IMAGE (may fallback)
                $normalImage = $room->images
                    ->where('image_type', 'normal')
                    ->sortByDesc('created_at')
                    ->first()
                    ?? $room->images->sortByDesc('created_at')->first();

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

    // public function index()
    // {
    //     $rooms = Room::with([
    //         'roomType:id,type_name,base_price',
    //         'images' => function ($q) {
    //             $q->latest()->limit(1);
    //         }
    //     ])
    //         ->orderByRaw('CAST(room_number AS UNSIGNED) ASC') // 🔥 SORT FIX
    //         ->get();

    //     return response()->json(
    //         $rooms->map(function ($room) {
    //             return [
    //                 'id' => $room->id,
    //                 'room_number' => $room->room_number,
    //                 'status' => $room->status,

    //                 'room_type_id' => $room->room_type_id,
    //                 'room_type' => $room->roomType,

    //                 'image_url' => $room->images->first()
    //                     ? asset('storage/' . $room->images->first()->image_path)
    //                     : null
    //             ];
    //         })
    //     );
    // }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'room_number' => 'required|string|unique:rooms,room_number',
            'status' => 'required|in:available,occupied,maintenance'
        ]);

        $room = Room::create($validated);

        return response()->json([
            'message' => 'Room created successfully',
            'data' => $room
        ], 201);
    }

    public function show($id)
    {
        // $room = Room::with('roomType')->findOrFail($id);
        $room = Room::with(['roomType', 'images'])->findOrFail($id);

        $room->image_url = $room->images->count()
            ? asset('storage/' . $room->images[0]->image_path)
            : null;

        return response()->json($room, 200);
    }

    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        $validated = $request->validate([
            'room_type_id' => 'sometimes|exists:room_types,id',
            'room_number' => 'sometimes|string|unique:rooms,room_number,' . $id,
            'status' => 'sometimes|in:available,occupied,maintenance'
        ]);

        $room->update($validated);

        return response()->json([
            'message' => 'Room updated successfully',
            'data' => $room
        ], 200);
    }

    public function destroy($id)
    {
        $room = Room::with('bookings')->findOrFail($id);

        $hasActiveBookings = $room->bookings()
            ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
            ->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'message' => 'Cannot delete room. It still has active bookings.'
            ], 400);
        }

        $room->delete(); // ✅ soft delete

        return response()->json([
            'message' => 'Room deleted successfully'
        ]);
    }

    public function restore($id)
    {
        $room = Room::withTrashed()->findOrFail($id);

        if (!$room->trashed()) {
            return response()->json([
                'message' => 'Room is not deleted'
            ], 400);
        }

        $room->restore();

        return response()->json([
            'message' => 'Room restored successfully'
        ]);
    }

    public function forceDelete($id)
    {
        $room = Room::withTrashed()->findOrFail($id);

        $room->forceDelete();

        return response()->json([
            'message' => 'Room permanently deleted'
        ]);
    }

    public function occupancy()
    {
        $totalRooms = \App\Models\Room::count();

        $occupiedRooms = \App\Models\Room::where('status', 'occupied')->count();
        $availableRooms = \App\Models\Room::where('status', 'available')->count();
        $maintenanceRooms = \App\Models\Room::where('status', 'maintenance')->count();

        $occupancyRate = $totalRooms > 0
            ? round(($occupiedRooms / $totalRooms) * 100, 2)
            : 0;

        return response()->json([
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedRooms,
            'available_rooms' => $availableRooms,
            'maintenance_rooms' => $maintenanceRooms,
            'occupancy_rate' => $occupancyRate
        ]);
    }

    public function occupancyTrend()
    {
        $data = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');

            $totalRooms = \App\Models\Room::count();

            $occupiedRooms = \App\Models\Booking::whereDate('created_at', $date)
                ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
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
}
