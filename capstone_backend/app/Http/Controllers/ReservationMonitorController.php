<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;

class ReservationMonitorController extends Controller
{
    public function index(Request $request)
    {
        $bookedRooms = \App\Models\BookedRoom::with([
            'booking.user',
            'booking.walkInGuest',
            'room.roomType',
        ])
            ->whereIn('status', [
                'pending',
                'confirmed',
                'checked_in',
            ])
            ->orderByDesc('created_at')
            ->get();

        $formattedBookings = $bookedRooms->map(function ($bookedRoom) {

            $booking = $bookedRoom->booking;
            $room = $bookedRoom->room;

            return [
                // booked_rooms.id
                'id' => $bookedRoom->id,

                // bookings.id
                'booking_id' => $booking->id,

                'booking_reference' => $booking->booking_reference,

                'booking_status' => $bookedRoom->status,

                'check_in_date' => $bookedRoom->check_in_date,
                'check_out_date' => $bookedRoom->check_out_date,

                'check_in_time' => $bookedRoom->check_in_time,
                'check_out_time' => $bookedRoom->check_out_time,

                'subtotal' => (float) $bookedRoom->subtotal,

                'guests_adults' => 2,
                'guests_children' => 0,

                'user' => $booking->user ? [
                    'first_name' => $booking->user->first_name,
                    'middle_name' => $booking->user->middle_name,
                    'last_name' => $booking->user->last_name,
                ] : null,

                'walkInGuest' => $booking->walkInGuest ? [
                    'first_name' => $booking->walkInGuest->first_name,
                    'middle_name' => $booking->walkInGuest->middle_name,
                    'last_name' => $booking->walkInGuest->last_name,
                ] : null,

                'room' => [
                    'id' => $room->id,
                    'room_number' => $room->room_number,

                    'room_type' => $room->roomType ? [
                        'id' => $room->roomType->id,
                        'type_name' => $room->roomType->type_name,
                    ] : null,
                ],

                'created_at' => $bookedRoom->created_at,
                'updated_at' => $bookedRoom->updated_at,
            ];
        });

        return response()->json($formattedBookings);
    }
}
