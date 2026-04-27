<?php

namespace App\Http\Controllers;

use App\Models\WalkInGuest;
use App\Models\Booking;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;

use App\Services\NotificationService;

class WalkInGuestController extends Controller
{
    // GET ALL
    public function index()
    {
        return response()->json(
            WalkInGuest::with('bookings.bookedRooms.room.roomType')->get(),
            200
        );
    }

    // WALK-IN CHECK-IN
    public function store(Request $request)
    {
        $validated = $request->validate([
            'guest_name' => 'required|string|max:255',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',

            'room_ids' => 'required|array|min:1',
            'room_ids.*' => 'exists:rooms,id',
            'check_in_date' => 'required|date',
            'check_out_date' => 'nullable|date|after_or_equal:check_in_date',

            'stay_types' => 'required|array',
            'stay_types.*' => 'in:short_stay,overnight',

            'subtotals' => 'required|array',
            'subtotals.*' => 'numeric|min:0',
        ]);

        // 1. CREATE GUEST
        $guest = WalkInGuest::create([
            'created_by' => Auth::id(),
            'guest_name' => $validated['guest_name'],
            'contact_number' => $validated['contact_number'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        $checkIn = Carbon::parse($validated['check_in_date']);
        $checkOut = $validated['check_out_date']
            ? Carbon::parse($validated['check_out_date'])
            : $checkIn->copy()->addDay();

        $reference = 'BOOK-' . strtoupper(Str::random(8));

        $createdBookings = [];
        $roomNumbers = [];

        foreach ($validated['room_ids'] as $index => $roomId) {

            $room = Room::with('roomType')->findOrFail($roomId);
            $roomNumbers[] = $room->room_number;

            $stayType = $validated['stay_types'][$index];

            $overnightPrice = $room->roomType->base_price ?? 0;
            $shortStayPrice = $room->roomType->short_stay_price ?? $overnightPrice;

            if ($stayType === 'short_stay') {
                $subtotal = $shortStayPrice;
            } else {
                $subtotal = $overnightPrice;
            }

            // ✅ CREATE BOOKING PER ROOM
            $booking = Booking::create([
                'walk_in_guest_id' => $guest->id,
                'created_by' => Auth::id(),
                'booking_type' => 'walk_in',
                'stay_type' => $stayType,
                'check_in_date' => $validated['check_in_date'],
                'check_out_date' => $validated['check_out_date'],
                'check_in_time' => now(),
                'booking_reference' => $reference,
                'total_price' => $subtotal,
                'booking_status' => 'checked_in',
            ]);

            $booking->bookedRooms()->create([
                'room_id' => $room->id,
                'price_at_time_of_booking' => $overnightPrice,
                'subtotal' => $subtotal,
                'stay_type' => $stayType
            ]);

            $room->update([
                'status' => 'occupied'
            ]);

            $createdBookings[] = $booking;
        }

        // 2. CREATE BOOKING WITH created_by
        // $booking = Booking::create([
        //     'walk_in_guest_id' => $guest->id,
        //     'created_by' => Auth::id(), // ✅ ADD THIS - CRITICAL
        //     'booking_type' => 'walk_in',
        //     'stay_type' => 'overnight',
        //     'check_in_date' => $validated['check_in_date'],
        //     'check_out_date' => $validated['check_out_date'],
        //     'check_in_time' => now(),
        //     'booking_reference' => 'BOOK-' . strtoupper(Str::random(8)),
        //     'total_price' => 0,
        //     'booking_status' => 'checked_in',
        // ]);

        // $total = 0;
        // $roomNumbers = []; // Store room numbers for notification

        // foreach ($validated['room_ids'] as $index => $roomId) {
        //     $room = Room::with('roomType')->findOrFail($roomId);
        //     $roomNumbers[] = $room->room_number;

        //     $stayType = $validated['stay_types'][$index];

        //     $overnightPrice = $room->roomType->base_price ?? 0;
        //     $shortStayPrice = $room->roomType->short_stay_price ?? $overnightPrice;

        //     if ($stayType === 'short_stay') {
        //         $subtotal = $shortStayPrice;
        //     } else {
        //         $subtotal = $overnightPrice;
        //     }

        //     $booking->bookedRooms()->create([
        //         'room_id' => $room->id,
        //         'price_at_time_of_booking' => $overnightPrice,
        //         'subtotal' => $subtotal,
        //         'stay_type' => $stayType
        //     ]);

        //     $room->update([
        //         'status' => 'occupied'
        //     ]);

        //     $total += $subtotal;
        // }

        // $booking->update([
        //     'total_price' => $total
        // ]);

        // 🔥 NOTIFICATION
        NotificationService::notifyAdmins(
            'Walk-in Check-In',
            'Walk-in: ' . $validated['guest_name'] . ' checked in (Rooms: ' . implode(', ', $roomNumbers) . ')'
        );

        return response()->json([
            'message' => 'Walk-in guest checked in successfully',
            'guest' => $guest,
            'bookings' => $createdBookings
        ], 201);
    }

    // CHECK-OUT

    public function checkOut($bookingId)
    {
        $booking = Booking::with(['bookedRooms', 'walkInGuest'])->findOrFail($bookingId);

        $booking->update([
            'booking_status' => 'checked_out'
        ]);

        // 🔥 ADD THIS (IMPORTANT)
        foreach ($booking->bookedRooms as $bookedRoom) {
            $bookedRoom->update([
                'check_out_time' => now()
            ]);

            Room::where('id', $bookedRoom->room_id)
                ->update(['status' => 'available']);
        }

        $name = optional($booking->walkInGuest)->guest_name ?? 'Walk-in Guest';

        NotificationService::notifyAdmins(
            'Walk-in Check-Out',
            $name . ' checked out (Ref: ' . $booking->booking_reference . ')'
        );

        return response()->json([
            'message' => 'Guest checked out successfully'
        ]);
    }
    // public function checkOut($bookingId)
    // {
    //     $booking = Booking::with(['bookedRooms', 'walkInGuest'])->findOrFail($bookingId);

    //     $booking->update([
    //         'booking_status' => 'checked_out'
    //     ]);

    //     foreach ($booking->bookedRooms as $bookedRoom) {
    //         Room::where('id', $bookedRoom->room_id)
    //             ->update(['status' => 'available']);
    //     }

    //     $name = optional($booking->walkInGuest)->guest_name ?? 'Walk-in Guest';

    //     NotificationService::notifyAdmins(
    //         'Walk-in Check-Out',
    //         $name . ' checked out (Ref: ' . $booking->booking_reference . ')'
    //     );

    //     return response()->json([
    //         'message' => 'Guest checked out successfully'
    //     ]);
    // }
}
// namespace App\Http\Controllers;

// use App\Models\WalkInGuest;
// use App\Models\Booking;
// use App\Models\Room;
// use Illuminate\Http\Request;
// use Illuminate\Support\Facades\Auth;
// use Illuminate\Support\Str;
// use Carbon\Carbon;

// use App\Services\NotificationService;

// class WalkInGuestController extends Controller
// {
//     // GET ALL
//     public function index()
//     {
//         return response()->json(
//             WalkInGuest::with('bookings.bookedRooms.room.roomType')->get(),
//             200
//         );
//     }

//     // WALK-IN CHECK-IN
//     public function store(Request $request)
//     {
//         $validated = $request->validate([
//             'guest_name' => 'required|string|max:255',
//             'contact_number' => 'nullable|string|max:20',
//             'address' => 'nullable|string|max:255',

//             'room_ids' => 'required|array|min:1',
//             'room_ids.*' => 'exists:rooms,id',
//             'check_in_date' => 'required|date',
//             'check_out_date' => 'nullable|date|after_or_equal:check_in_date',

//             'stay_types' => 'required|array',
//             'stay_types.*' => 'in:short_stay,overnight',

//             'subtotals' => 'required|array',
//             'subtotals.*' => 'numeric|min:0',
//         ]);

//         // 1. CREATE GUEST
//         $guest = WalkInGuest::create([
//             'created_by' => Auth::id(),
//             'guest_name' => $validated['guest_name'],
//             'contact_number' => $validated['contact_number'] ?? null,
//             'address' => $validated['address'] ?? null,
//         ]);

//         // 2. GET ROOM + PRICE
//         // $room = Room::with('roomType')->findOrFail($validated['room_id']);

//         // $overnightPrice = $room->roomType->base_price ?? 0;
//         // $shortStayPrice = $room->roomType->short_stay_price ?? $overnightPrice;

//         $checkIn = Carbon::parse($validated['check_in_date']);
//         $checkOut = $validated['check_out_date']
//             ? Carbon::parse($validated['check_out_date'])
//             : $checkIn->copy()->addDay();

//         // ✅ LOGIC BASED SA TYPE
//         // if ($validated['stay_type'] === 'short_stay') {
//         //     $total = $shortStayPrice;

//         //     // force same day
//         //     $validated['check_out_date'] = $validated['check_in_date'];
//         // } else {
//         //     $nights = $checkIn->diffInDays($checkOut);
//         //     $nights = $nights > 0 ? $nights : 1;

//         //     $total = $overnightPrice * $nights;
//         // }

//         // 5. CREATE BOOKING (UPDATED)
//         $booking = Booking::create([
//             'walk_in_guest_id' => $guest->id,
//             'booking_type' => 'walk_in',
//             'stay_type' => 'overnight',
//             'check_in_date' => $validated['check_in_date'],
//             'check_out_date' => $validated['check_out_date'],
//             'check_in_time' => now(),
//             'booking_reference' => 'BOOK-' . strtoupper(Str::random(8)),
//             'total_price' => 0, // ✅ FIXED
//             'booking_status' => 'checked_in',
//         ]);

//         $total = 0;

//         foreach ($validated['room_ids'] as $index => $roomId) {

//     $room = Room::with('roomType')->findOrFail($roomId);

//     $stayType = $validated['stay_types'][$index];

//     $overnightPrice = $room->roomType->base_price ?? 0;
//     $shortStayPrice = $room->roomType->short_stay_price ?? $overnightPrice;

//     if ($stayType === 'short_stay') {
//         $subtotal = $shortStayPrice;
//     } else {
//         $subtotal = $overnightPrice;
//     }

//     $booking->bookedRooms()->create([
//         'room_id' => $room->id,
//         'price_at_time_of_booking' => $overnightPrice,
//         'subtotal' => $subtotal,
//         'stay_type' => $stayType
//     ]);

//     $room->update([
//         'status' => 'occupied'
//     ]);

//     $total += $subtotal;
// }

//         $booking->update([
//             'total_price' => $total
//         ]);
//         // 6. ATTACH ROOM WITH PRICE
//         // $booking->bookedRooms()->create([
//         //     'room_id' => $validated['room_id'],
//         //     'price_at_time_of_booking' => $total
//         // ]);

//         // ❌ REMOVED WRONG UPDATE (no need anymore)
//         // $booking->update(['total_price' => $price]);

//         // 7. UPDATE ROOM STATUS → OCCUPIED
//         // $room->update([
//         //     'status' => 'occupied'
//         // ]);

//         // 🔥 NOTIFICATION
//         NotificationService::notifyAdmins(
//             'Walk-in Check-In',
//             'Walk-in: ' . $validated['guest_name'] . ' checked in (Room ID ' . $room->id . ')'
//         );

//         return response()->json([
//             'message' => 'Walk-in guest checked in successfully',
//             'guest' => $guest,
//             'booking' => $booking
//         ], 201);
//     }

//     // CHECK-OUT
//     public function checkOut($bookingId)
//     {
//         $booking = Booking::with(['bookedRooms', 'walkInGuest'])->findOrFail($bookingId);

//         $booking->update([
//             'booking_status' => 'checked_out'
//         ]);

//         foreach ($booking->bookedRooms as $room) {
//             Room::where('id', $room->room_id)
//                 ->update(['status' => 'available']);
//         }

//         $name = optional($booking->walkInGuest)->guest_name ?? 'Walk-in Guest';

//         NotificationService::notifyAdmins(
//             'Walk-in Check-Out',
//             $name . ' checked out (Ref: ' . $booking->booking_reference . ')'
//         );

//         return response()->json([
//             'message' => 'Guest checked out successfully'
//         ]);
//     }
// }



// namespace App\Http\Controllers;

// use App\Models\WalkInGuest;
// use App\Models\Booking;
// use App\Models\Room;
// use Illuminate\Http\Request;
// use Illuminate\Support\Facades\Auth;
// use Illuminate\Support\Str;

// use App\Services\NotificationService;

// class WalkInGuestController extends Controller
// {
//     // GET ALL
//     public function index()
//     {
//         return response()->json(
//             WalkInGuest::with('bookings.bookedRooms.room.roomType')->get(),
//             200
//         );
//     }

//     // WALK-IN CHECK-IN
//     public function store(Request $request)
//     {
//         $validated = $request->validate([
//             'guest_name' => 'required|string|max:255',
//             'contact_number' => 'nullable|string|max:20',
//             'address' => 'nullable|string|max:255',

//             'room_id' => 'required|exists:rooms,id',
//             'check_in_date' => 'required|date',
//             'check_out_date' => 'nullable|date|after:check_in_date',
//         ]);

//         // 1. CREATE GUEST
//         $guest = WalkInGuest::create([
//             'created_by' => Auth::id(),
//             'guest_name' => $validated['guest_name'],
//             'contact_number' => $validated['contact_number'] ?? null,
//             'address' => $validated['address'] ?? null,
//         ]);

//         // 2. CREATE BOOKING
//         $booking = Booking::create([
//             'walk_in_guest_id' => $guest->id,
//             'booking_type' => 'walk_in',
//             'stay_type' => 'short_stay',
//             'check_in_date' => $validated['check_in_date'],
//             'check_out_date' => $validated['check_out_date'],
//             'booking_reference' => 'BOOK-' . strtoupper(Str::random(8)),
//             'total_price' => 0,
//             'booking_status' => 'checked_in',
//         ]);

//         // 3. GET ROOM + PRICE
//         $room = Room::with('roomType')->findOrFail($validated['room_id']);

//         $price = $room->roomType->base_price ?? 0;

//         // 4. ATTACH ROOM WITH PRICE
//         $booking->bookedRooms()->create([
//             'room_id' => $validated['room_id'],
//             'price_at_time_of_booking' => $price
//         ]);

//         // 5. UPDATE TOTAL PRICE
//         $booking->update([
//             'total_price' => $price
//         ]);

//         // 6. UPDATE ROOM STATUS → OCCUPIED
//         // 6. UPDATE ROOM STATUS → OCCUPIED
//         $room->update([
//             'status' => 'occupied'
//         ]);

//         // 🔥 ADD THIS (IMPORTANT)
//         NotificationService::notifyAdmins(
//             'Walk-in Check-In',
//             'Walk-in: ' . $validated['guest_name'] . ' checked in (Room ID ' . $room->id . ')'
//         );


//         return response()->json([
//             'message' => 'Walk-in guest checked in successfully',
//             'guest' => $guest,
//             'booking' => $booking
//         ], 201);
//     }

//     // CHECK-OUT
//     public function checkOut($bookingId)
//     {
//         $booking = Booking::with(['bookedRooms', 'walkInGuest'])->findOrFail($bookingId);

//         $booking->update([
//             'booking_status' => 'checked_out'
//         ]);

//         foreach ($booking->bookedRooms as $room) {
//             Room::where('id', $room->room_id)
//                 ->update(['status' => 'available']);
//         }

//         // ✅ SAFE VERSION
//         $name = optional($booking->walkInGuest)->guest_name ?? 'Walk-in Guest';

//         NotificationService::notifyAdmins(
//             'Walk-in Check-Out',
//             $name . ' checked out (Ref: ' . $booking->booking_reference . ')'
//         );

//         return response()->json([
//             'message' => 'Guest checked out successfully'
//         ]);
//     }
// }
