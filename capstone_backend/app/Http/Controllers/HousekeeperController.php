<?php

namespace App\Http\Controllers;

use App\Models\BookingHistory;
use Illuminate\Http\Request;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class HousekeeperController extends Controller
{
    // ✅ GET TASKS
    public function tasks()
    {
        $rooms = Room::whereIn('status', ['dirty', 'cleaning', 'maintenance'])
            ->latest()
            ->get();

        return response()->json($rooms);
    }

    // ✅ START CLEANING
    public function start($id)
    {
        $room = Room::findOrFail($id);

        if ($room->status !== 'dirty') {
            return response()->json([
                'message' => 'Room is not available for cleaning'
            ], 400);
        }

        // 🔥 RESET DAMAGE STATE HERE
        $room->status = 'cleaning';
        $room->has_damage = false;
        $room->damage_note = null;
        $room->damage_photo = null;

        $room->save();

        return response()->json([
            'message' => 'Cleaning started',
            'room' => $room
        ]);
    }

    // ✅ COMPLETE CLEANING
    public function complete(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        // ✅ VALIDATION (RELAXED BOOLEAN)
        $request->validate([
            'has_damage' => 'nullable',
            'damage_note' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|max:2048',
        ]);

        if (!in_array($room->status, ['cleaning', 'dirty'])) {
            return response()->json([
                'message' => 'Room cannot be completed'
            ], 400);
        }

        // 🔥 HANDLE BOOLEAN SAFELY (ACCEPT ALL FORMATS)
        $hasDamage = filter_var(
            $request->input('has_damage'),
            FILTER_VALIDATE_BOOLEAN
        );

        // 🔥 STATUS LOGIC
        $room->status = 'available';

        $room->completed_at = Carbon::now();
        $room->cleaned_by = Auth::id();

        // 🔥 DAMAGE
        $room->has_damage = $hasDamage;
        $room->damage_note = $hasDamage ? $request->damage_note : null;

        // 🔥 GET LATEST BOOKING FROM PIVOT TABLE
        // $currentBooking = $room->bookings()
        //     ->orderBy('booked_rooms.id', 'desc')
        //     ->first();

        // // 🔥 SAVE BOOKING ID
        // $room->damage_booking_id = $hasDamage && $currentBooking
        //     ? $currentBooking->id
        //     : null;
        // 🔥 DO NOT CHANGE booking here

        // 🔥 PHOTO
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('damages', 'public');
            $room->damage_photo = $path;
        }

        $room->save();

        $currentBooking = $room->bookings()
            ->orderByDesc('booked_rooms.id')
            ->first();

        BookingHistory::create([
            'booking_id' => $hasDamage ? $currentBooking?->id : null, // 🔥 NEW
            'old_status' => 'cleaning',
            'new_status' => 'cleaned',
            'changed_by' => Auth::id(),
            'change_note' => $hasDamage
                ? 'Room cleaned with damage'
                : 'Room cleaned successfully',
            'changed_at' => now()
        ]);


        return response()->json([
            'message' => $hasDamage
                ? 'Room cleaned but has damage'
                : 'Room cleaned successfully',
            'room' => $room
        ]);
    }

    // ✅ HISTORY
    public function history()
    {
        $history = BookingHistory::with([
            'booking.rooms',
            'user'
        ])
            ->where('changed_by', Auth::id())
            ->where('change_note', 'LIKE', '%clean%')
            ->latest('changed_at')
            ->get();

        return response()->json($history);
    }
}

// namespace App\Http\Controllers;

// use Illuminate\Http\Request;
// use App\Models\Room;
// use Carbon\Carbon;
// use Illuminate\Support\Facades\Auth;

// class HousekeeperController extends Controller
// {
//     public function tasks(Request $request)
//     {
//         $rooms = Room::whereIn('status', ['dirty', 'cleaning'])
//             ->get();

//         return response()->json($rooms);
//     }

//     public function start($id)
//     {
//         $room = Room::findOrFail($id);

//         $room->status = 'cleaning';
//         $room->save();

//         return response()->json([
//             'message' => 'Cleaning started',
//             'room' => $room
//         ]);
//     }

//     public function complete(Request $request, $id)
//     {
//         $room = Room::findOrFail($id);

//         $room->status = 'available';
//         $room->completed_at = Carbon::now();
//         $room->cleaned_by = Auth::id();

//         // 🔥 NEW DAMAGE HANDLING
//         $room->has_damage = $request->has_damage ?? false;
//         $room->damage_note = $request->damage_note;

//         $room->save();

//         return response()->json([
//             'message' => 'Room updated',
//             'room' => $room
//         ]);
//     }

//     public function history()
//     {
//         $rooms = Room::with('cleaner')
//             ->whereNotNull('completed_at')
//             ->where('cleaned_by', Auth::id())
//             ->latest('completed_at')
//             ->get();

//         return response()->json($rooms);
//     }
// }

// namespace App\Http\Controllers;

// use Illuminate\Http\Request;
// use App\Models\Room;
// use Carbon\Carbon;
// use Illuminate\Support\Facades\Auth;

// class HousekeeperController extends Controller
// {
//     public function tasks(Request $request)
//     {
//         $rooms = Room::whereIn('status', ['dirty', 'cleaning'])
//             ->get();

//         return response()->json($rooms);
//     }

//     public function start($id)
//     {
//         $room = Room::findOrFail($id);

//         $room->status = 'cleaning';
//         $room->save();

//         return response()->json([
//             'message' => 'Cleaning started',
//             'room' => $room
//         ]);
//     }

//     public function complete(Request $request, $id)
//     {
//         $room = Room::findOrFail($id);

//         $room->status = 'available';
//         $room->completed_at = Carbon::now();
//         $room->cleaned_by = Auth::id();

//         // 🔥 NEW DAMAGE HANDLING
//         $room->has_damage = $request->has_damage ?? false;
//         $room->damage_note = $request->damage_note;

//         $room->save();

//         return response()->json([
//             'message' => 'Room updated',
//             'room' => $room
//         ]);
//     }

//     public function history()
//     {
//         $rooms = Room::with('cleaner')
//             ->whereNotNull('completed_at')
//             ->where('cleaned_by', Auth::id())
//             ->latest('completed_at')
//             ->get();

//         return response()->json($rooms);
//     }
// }
