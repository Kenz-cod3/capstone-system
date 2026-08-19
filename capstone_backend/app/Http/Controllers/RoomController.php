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
            'roomType:id,type_name,description,base_price,short_stay_price,max_occupancy',
            'images',
            'amenities:id,name'
        ])
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        return response()->json(
            $rooms->map(function ($room) {

                // NORMAL IMAGE
                $normalImage = $room->images
                    ->where('image_type', 'normal')
                    ->sortByDesc('created_at')
                    ->first();

                // 360 IMAGE
                $panoramaImage = $room->images
                    ->where('image_type', '360')
                    ->sortByDesc('created_at')
                    ->first();

                return [
                    'id'          => $room->id,
                    'room_number' => $room->room_number,
                    'status'      => $room->status,
                    'is_deleted'  => $room->deleted_at !== null,

                    'images' => $room->images,

                    'room_type_id' => $room->room_type_id,
                    'room_type'    => $room->roomType,

                    'amenities' => $room->amenities,

                    // CARD IMAGE
                    'image_url' => $normalImage
                        ? asset('storage/' . $normalImage->image_path)
                        : null,

                    // POV IMAGE
                    'panorama_url' => $panoramaImage
                        ? asset('storage/' . $panoramaImage->image_path)
                        : null,
                ];
            })
        );
    }

    // LIGHTWEIGHT REALTIME ROOM GRID
    // public function statusGrid()
    // {
    //     $rooms = Room::select(
    //         'id',
    //         'room_number',
    //         'status'
    //     )
    //         ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
    //         ->get();

    //     return response()->json($rooms);
    // }
    public function statusGrid()
    {
        $rooms = Room::with([
            'bookedRooms.booking.user',
            'bookedRooms.booking.walkInGuest',
        ])
            ->select(
                'id',
                'room_number',
                'status'
            )
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        $rooms->each(function ($room) {

            // Get the active booked room for this room
            $bookedRoom = $room->bookedRooms
                ->whereIn('status', [
                    'pending',
                    'confirmed',
                    'checked_in',
                ])
                ->sortByDesc('id')
                ->first();

            $booking = $bookedRoom?->booking;

            $guestName = null;

            // WALK-IN GUEST
            if ($booking?->walkInGuest) {

                $walkIn = $booking->walkInGuest;

                $guestName = $walkIn->full_name
                    ?? trim(
                        ($walkIn->first_name ?? '') . ' ' .
                            ($walkIn->middle_name ?? '') . ' ' .
                            ($walkIn->last_name ?? '')
                    );
            }

            // REGISTERED USER
            elseif ($booking?->user) {

                $user = $booking->user;

                $guestName = trim(
                    ($user->first_name ?? '') . ' ' .
                        ($user->middle_name ?? '') . ' ' .
                        ($user->last_name ?? '')
                );
            }

            $room->current_guest = $guestName;
            $room->booking_status = $bookedRoom?->status;
            $room->check_in_date = $bookedRoom?->check_in_date;
            $room->check_out_date = $bookedRoom?->check_out_date;
            $room->booking_reference = $booking?->booking_reference;
            $room->booked_room_id = $bookedRoom?->id;
            $room->booking_id = $booking?->id;
        });

        return response()->json($rooms);
    }


    // CREATE ROOM
    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'room_number'  => 'required|string|unique:rooms,room_number',
            'status'       => 'required|in:available,reserved,occupied,maintenance,dirty,cleaning',

            'amenities'   => 'nullable|array',
            'amenities.*' => 'exists:amenities,id',
        ]);

        $amenities = $validated['amenities'] ?? [];
        unset($validated['amenities']);

        $room = Room::create($validated);

        $room->amenities()->sync($amenities);

        $room->load([
            'roomType',
            'images',
            'amenities',
        ]);

        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room created successfully',
            'data'    => $room
        ], 201);
    }

    // SHOW ROOM
    public function show($id)
    {
        $room = Room::with([
            'roomType',
            'images',
            'amenities'
        ])->findOrFail($id);

        // NORMAL IMAGE
        $normalImage = $room->images
            ->where('image_type', 'normal')
            ->sortByDesc('created_at')
            ->first();

        // 360 IMAGE
        $panoramaImage = $room->images
            ->where('image_type', '360')
            ->sortByDesc('created_at')
            ->first();

        return response()->json([
            'id'          => $room->id,
            'room_number' => $room->room_number,
            'status'      => $room->status,

            'room_type_id' => $room->room_type_id,
            'room_type'    => $room->roomType,

            'amenities' => $room->amenities,
            'images'    => $room->images,

            'image_url'    => $normalImage
                ? asset('storage/' . $normalImage->image_path)
                : null,

            'panorama_url' => $panoramaImage
                ? asset('storage/' . $panoramaImage->image_path)
                : null,
        ], 200);
    }

    // UPDATE ROOM
    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        $validated = $request->validate([
            'room_type_id' => 'sometimes|exists:room_types,id',
            'room_number'  => 'sometimes|string|unique:rooms,room_number,' . $id,
            'status'       => 'sometimes|in:available,reserved,occupied,maintenance,dirty,cleaning',

            'amenities'   => 'nullable|array',
            'amenities.*' => 'exists:amenities,id',
        ]);

        $amenities = $validated['amenities'] ?? null;
        unset($validated['amenities']);

        $room->update($validated);

        if ($amenities !== null) {
            $room->amenities()->sync($amenities);
        }

        $room->load([
            'roomType',
            'images',
            'amenities',
        ]);

        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room updated successfully',
            'data'    => $room
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

        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Room permanently deleted'
        ]);
    }

    // ROOM OCCUPANCY SUMMARY
    public function occupancy()
    {
        $totalRooms      = Room::count();
        $occupiedRooms   = Room::where('status', 'occupied')->count();
        $availableRooms  = Room::where('status', 'available')->count();
        $maintenanceRooms = Room::where('status', 'maintenance')->count();
        $dirtyRooms      = Room::where('status', 'dirty')->count();
        $cleaningRooms   = Room::where('status', 'cleaning')->count();

        $occupancyRate = $totalRooms > 0
            ? round(($occupiedRooms / $totalRooms) * 100, 2)
            : 0;

        return response()->json([
            'total_rooms'       => $totalRooms,
            'occupied_rooms'    => $occupiedRooms,
            'available_rooms'   => $availableRooms,
            'maintenance_rooms' => $maintenanceRooms,
            'dirty_rooms'       => $dirtyRooms,
            'cleaning_rooms'    => $cleaningRooms,
            'occupancy_rate'    => $occupancyRate
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
                'day'       => \Carbon\Carbon::parse($date)->format('D'),
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
