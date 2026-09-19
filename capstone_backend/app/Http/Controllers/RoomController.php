<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $checkIn = $request->check_in_date;
        $checkOut = $request->check_out_date;
        $stayType = $request->stay_type;

        $today = now()->startOfDay();

        $rooms = Room::with([
            'roomType:id,type_name,description,base_price,short_stay_price,max_occupancy',
            'images',
            'amenities:id,name',
            'bookedRooms' => function ($q) {
                $q->whereNull('archived_at')
                    ->whereNull('deleted_at')
                    ->whereIn('status', [
                        'pending',
                        'confirmed',
                        'checked_in',
                    ]);
            },
        ])
            ->when($checkIn && $checkOut, function ($q) use ($checkIn, $checkOut, $stayType) {

                $out = $stayType === 'short_stay'
                    ? \Carbon\Carbon::parse($checkIn)->addDay()->toDateString()
                    : $checkOut;

                $q->whereDoesntHave('bookedRooms', function ($br) use ($checkIn, $out) {
                    $br->whereNull('archived_at')
                        ->whereNull('deleted_at')
                        ->whereIn('status', [
                            'pending',
                            'confirmed',
                            'checked_in',
                        ])
                        ->whereDate('check_in_date', '<', $out)
                        ->whereRaw(
                            "CASE
                            WHEN stay_type = 'short_stay'
                            THEN DATE_ADD(check_in_date, INTERVAL 1 DAY)
                            ELSE check_out_date
                         END > ?",
                            [$checkIn]
                        );
                });
            })
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        return response()->json(
            $rooms->map(function ($room) use ($today) {

                $normalImage = $room->images
                    ->where('image_type', 'normal')
                    ->sortByDesc('created_at')
                    ->first();

                $panoramaImage = $room->images
                    ->where('image_type', '360')
                    ->sortByDesc('created_at')
                    ->first();

                /*
             * Determine if the reservation is ACTIVE TODAY.
             * A future reservation must not make the room RESERVED today.
             */
                $currentBooking = $room->bookedRooms
                    ->filter(function ($booking) use ($today) {

                        $in = \Carbon\Carbon::parse(
                            $booking->check_in_date
                        )->startOfDay();

                        $out = $booking->stay_type === 'short_stay'
                            ? $in->copy()->addDay()
                            : \Carbon\Carbon::parse(
                                $booking->check_out_date
                            )->startOfDay();

                        return $today->gte($in) && $today->lt($out);
                    })
                    ->sortBy('check_in_date')
                    ->first();

                /*
             * If the database says RESERVED but the reservation
             * is only in the future, show AVAILABLE on dashboard.
             */
                $displayStatus = $room->status;

                if (
                    $room->status === 'reserved' &&
                    !$currentBooking
                ) {
                    $displayStatus = 'available';
                }

                /*
             * If there is a booking covering today, keep RESERVED.
             */
                if (
                    $currentBooking &&
                    $currentBooking->status !== 'checked_in' &&
                    $room->status === 'reserved'
                ) {
                    $displayStatus = 'reserved';
                }

                return [
                    'id'          => $room->id,
                    'room_number' => $room->room_number,
                    'status'      => $displayStatus,
                    'is_deleted'  => $room->deleted_at !== null,

                    'images' => $room->images,

                    'room_type_id' => $room->room_type_id,
                    'room_type'    => $room->roomType,

                    'amenities' => $room->amenities,

                    'image_url' => $normalImage
                        ? asset('storage/' . $normalImage->image_path)
                        : null,

                    'panorama_url' => $panoramaImage
                        ? asset('storage/' . $panoramaImage->image_path)
                        : null,
                ];
            })
        );
    }

    public function checkAvailability(Request $request, $id)
    {
        $request->validate([
            'check_in_date'  => 'required|date',
            'check_out_date' => 'required|date',
            'stay_type'      => 'nullable|in:overnight,short_stay',
        ]);

        $room = Room::findOrFail($id);

        $stayType = $request->stay_type ?? 'overnight';

        $checkIn = \Carbon\Carbon::parse($request->check_in_date)->startOfDay();

        $checkOut = $stayType === 'short_stay'
            ? $checkIn->copy()->addDay()
            : \Carbon\Carbon::parse($request->check_out_date)->startOfDay();

        // ROOM UNDER MAINTENANCE
        if ($room->status === 'maintenance') {
            return response()->json([
                'data' => [
                    'available' => false,
                    'conflicts' => [],
                    'reason'    => 'This room is currently under maintenance.',
                ]
            ]);
        }

        // OVERLAPPING ACTIVE BOOKINGS (same logic as BookingController@conflictQuery)
        $conflicts = \App\Models\BookedRoom::where('room_id', $room->id)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereIn('status', [
                'pending',
                'confirmed',
                'checked_in',
            ])
            ->whereDate('check_in_date', '<', $checkOut->toDateString())
            ->whereRaw(
                "CASE
                WHEN stay_type = 'short_stay'
                THEN DATE_ADD(check_in_date, INTERVAL 1 DAY)
                ELSE check_out_date
             END > ?",
                [$checkIn->toDateString()]
            )
            ->get(['id', 'check_in_date', 'check_out_date', 'stay_type', 'status']);

        return response()->json([
            'data' => [
                'available' => $conflicts->isEmpty(),
                'conflicts' => $conflicts,
                'reason'    => null,
            ]
        ]);
    }

    /**
     * Returns every active (pending/confirmed/checked_in) booking range
     * for this room, so the guest calendar can disable those days.
     */
    public function bookedDates($id)
    {
        $room = Room::findOrFail($id);

        $bookings = \App\Models\BookedRoom::where('room_id', $room->id)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereIn('status', [
                'pending',
                'confirmed',
                'checked_in',
            ])
            ->orderBy('check_in_date')
            ->get(['check_in_date', 'check_out_date', 'stay_type']);

        $ranges = $bookings->map(function ($b) {

            $in = \Carbon\Carbon::parse($b->check_in_date)->toDateString();

            // Short stays only block the single check-in day.
            $out = $b->stay_type === 'short_stay'
                ? \Carbon\Carbon::parse($b->check_in_date)->addDay()->toDateString()
                : \Carbon\Carbon::parse($b->check_out_date)->toDateString();

            return [
                'check_in_date'  => $in,
                'check_out_date' => $out, // exclusive — the checkout day itself is free
            ];
        })->values();

        return response()->json(['data' => $ranges]);
    }

    public function publicAvailable()
    {
        $rooms = Room::with([
            'roomType:id,type_name,description,base_price,short_stay_price,max_occupancy',
            'images',
            'amenities:id,name'
        ])
            ->where('status', 'available')
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        return response()->json(
            $rooms->map(function ($room) {

                $normalImage = $room->images
                    ->where('image_type', 'normal')
                    ->sortByDesc('created_at')
                    ->first();

                return [
                    'id' => $room->id,
                    'name' => 'Room ' . $room->room_number,
                    'type' => $room->roomType?->type_name,
                    'pricePerNight' => $room->roomType?->base_price ?? 0,
                    'capacity' => $room->roomType?->max_occupancy ?? 0,

                    'imageUrl' => $normalImage
                        ? asset('storage/' . $normalImage->image_path)
                        : null,

                    'amenities' => $room->amenities,
                ];
            })
        );
    }

    public function statusGrid()
    {
        $today = \Carbon\Carbon::now()->startOfDay();

        $rooms = Room::with([
            'bookedRooms.booking.user',
            'bookedRooms.booking.walkInGuest',
            'bookedRooms.room.roomType',
        ])
            ->select(
                'id',
                'room_number',
                'status'
            )
            ->orderByRaw('CAST(room_number AS UNSIGNED) ASC')
            ->get();

        $rooms->each(function ($room) use ($today) {

            // FIX: checked_in bookings stay "active" until actually checked out
            // (even if past their expected check_out_date — that's overdue, not gone).
            // pending/confirmed bookings only count if today falls within their range,
            // so future bookings don't wrongly show on today's grid.
            $bookedRoom = $room->bookedRooms
                ->whereIn('status', [
                    'pending',
                    'confirmed',
                    'checked_in',
                ])
                ->filter(function ($br) use ($today) {

                    $in = \Carbon\Carbon::parse($br->check_in_date)->startOfDay();

                    if ($br->status === 'checked_in') {
                        // Still occupying the room — hasn't checked out yet.
                        return $today->gte($in);
                    }

                    $out = $br->stay_type === 'short_stay'
                        ? $in->copy()->addDay()
                        : \Carbon\Carbon::parse($br->check_out_date)->startOfDay();

                    return $today->gte($in) && $today->lt($out);
                })
                ->sortBy(function ($br) {
                    return $br->status === 'checked_in' ? 0 : 1;
                })
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

            // FIX: correct stale "reserved" status when there's no active booking
            // behind it (also self-heals the DB record).
            $displayStatus = $room->status;

            if ($displayStatus === 'reserved' && !$bookedRoom) {
                $displayStatus = 'available';
                $room->status = 'available';
                $room->save();
            } else {
                $room->status = $displayStatus;
            }

            // ============================================
            // BASIC BOOKING DATA
            // ============================================

            $room->current_guest = $guestName;
            $room->booking_status = $bookedRoom?->status;
            $room->check_in_date = $bookedRoom?->check_in_date;
            $room->check_out_date = $bookedRoom?->check_out_date;
            $room->booking_reference = $booking?->booking_reference;
            $room->booked_room_id = $bookedRoom?->id;
            $room->booking_id = $booking?->id;

            // ============================================
            // CHECKOUT COUNTDOWN
            // ============================================

            $room->stay_type = $bookedRoom?->stay_type;
            $room->check_in_time = $bookedRoom?->check_in_time;
            $room->checkout_status = $bookedRoom?->checkout_status;

            // Get existing expected checkout time
            $expectedCheckoutAt = $bookedRoom?->expected_checkout_at;

            // ============================================
            // CALCULATE EXPECTED CHECKOUT IF MISSING
            // ============================================

            if (
                $bookedRoom &&
                $bookedRoom->status === 'checked_in' &&
                !$expectedCheckoutAt &&
                $bookedRoom->room?->roomType
            ) {

                $roomType = $bookedRoom->room->roomType;

                // SHORT STAY
                if ($bookedRoom->stay_type === 'short_stay') {

                    $expectedCheckoutAt = \Carbon\Carbon::parse(
                        $bookedRoom->check_in_time ?? now()
                    )->addHours(
                        (int) ($roomType->short_stay_hours ?? 3)
                    );
                }

                // OVERNIGHT
                else {

                    $expectedCheckoutAt = \Carbon\Carbon::parse(
                        $bookedRoom->check_in_date
                    )
                        ->addDay()
                        ->setTimeFromTimeString(
                            $roomType->overnight_checkout_time
                        );
                }
            }

            // ============================================
            // AUTO MARK AS OVERDUE
            // ============================================

            if (
                $bookedRoom &&
                $bookedRoom->status === 'checked_in' &&
                $expectedCheckoutAt
            ) {

                $expectedCheckout = \Carbon\Carbon::parse(
                    $expectedCheckoutAt
                );

                // Guest is already past checkout time
                if (
                    now()->greaterThanOrEqualTo($expectedCheckout) &&
                    !$bookedRoom->overdue_started_at
                ) {

                    $bookedRoom->overdue_started_at = $expectedCheckout;
                    $bookedRoom->checkout_status = 'overdue';

                    $bookedRoom->save();
                }
            }

            // ============================================
            // RETURN COUNTDOWN DATA
            // ============================================

            $room->expected_checkout_at = $expectedCheckoutAt;

            $room->overdue_started_at =
                $bookedRoom?->overdue_started_at;

            $room->checkout_status =
                $bookedRoom?->checkout_status;
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
