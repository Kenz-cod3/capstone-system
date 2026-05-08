<?php

namespace App\Http\Controllers;

use App\Models\BookingHistory;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HousekeeperController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | GET TASKS (dirty + cleaning + maintenance rooms)
    |--------------------------------------------------------------------------
    */
    public function tasks()
    {
        $rooms = Room::with(['roomType', 'cleaner'])
            ->whereNull('deleted_at')
            ->whereIn('status', ['dirty', 'cleaning', 'maintenance'])
            ->latest()
            ->get()
            ->map(function ($room) {
                return [
                    'id'             => $room->id,
                    'room_number'    => $room->room_number,
                    'status'         => $room->status,
                    'has_damage'     => $room->has_damage,
                    'room_type'      => $room->roomType?->type_name,
                    'damage_summary' => $room->damage_summary,
                    'completed_at'   => $room->completed_at,
                    'cleaned_by'     => $room->cleaner
                        ? $room->cleaner->first_name . ' ' . $room->cleaner->last_name
                        : null,
                ];
            });

        return response()->json($rooms);
    }

    /*
    |--------------------------------------------------------------------------
    | START CLEANING (dirty → cleaning)
    |--------------------------------------------------------------------------
    */
    public function start($id)
    {
        $room = Room::whereNull('deleted_at')->findOrFail($id);

        if ($room->status !== 'dirty') {
            return response()->json([
                'message' => 'Room is not dirty.'
            ], 422);
        }

        $room->update([
            'status'     => 'cleaning',
            'cleaned_by' => Auth::id(),
            'has_damage' => false,
        ]);

        return response()->json([
            'message' => 'Cleaning started.',
            'data'    => $room,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLETE CLEANING (cleaning/dirty → available or maintenance)
    | NOTE: Damage report details handled by RoomDamageReportController
    |--------------------------------------------------------------------------
    */
    public function complete(Request $request, $id)
    {
        $room = Room::whereNull('deleted_at')->findOrFail($id);

        if (!in_array($room->status, ['dirty', 'cleaning', 'maintenance'])) {
            return response()->json([
                'message' => 'Room is not in a cleanable state.'
            ], 422);
        }

        $hasDamage = filter_var(
            $request->input('has_damage', false),
            FILTER_VALIDATE_BOOLEAN
        );

        $room->update([
            'status'       => $hasDamage ? 'maintenance' : 'available',
            'has_damage'   => $hasDamage,
            'cleaned_by'   => Auth::id(),
            'completed_at' => Carbon::now(),
        ]);

        // LOG HISTORY
        BookingHistory::create([
            'booking_id'  => null,
            'old_status'  => 'cleaning',
            'new_status'  => $hasDamage ? 'maintenance' : 'cleaned',
            'change_note' => $hasDamage
                ? 'Room cleaned with damage'
                : 'Room cleaned successfully',
            'changed_by'  => Auth::id(),
            'changed_at'  => Carbon::now(),
        ]);

        return response()->json([
            'message' => $hasDamage
                ? 'Room marked as maintenance due to damage.'
                : 'Room marked as available.',
            'data' => $room,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | HISTORY (completed rooms by this housekeeper)
    |--------------------------------------------------------------------------
    */
    public function history()
    {
        $rooms = Room::with(['roomType'])
            ->whereNull('deleted_at')
            ->where('cleaned_by', Auth::id())
            ->whereNotNull('completed_at')
            ->latest('completed_at')
            ->get()
            ->map(function ($room) {
                return [
                    'id'             => $room->id,
                    'room_number'    => $room->room_number,
                    'status'         => $room->status,
                    'has_damage'     => $room->has_damage,
                    'room_type'      => $room->roomType?->type_name,
                    'damage_summary' => $room->damage_summary,
                    'completed_at'   => $room->completed_at,
                ];
            });

        return response()->json($rooms);
    }
}