<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class HousekeeperController extends Controller
{
    public function tasks(Request $request)
    {
        $rooms = Room::whereIn('status', ['dirty', 'cleaning'])
            ->get();

        return response()->json($rooms);
    }

    public function start($id)
    {
        $room = Room::findOrFail($id);

        $room->status = 'cleaning';
        $room->save();

        return response()->json([
            'message' => 'Cleaning started',
            'room' => $room
        ]);
    }

    public function complete($id)
    {
        $room = Room::findOrFail($id);

        $room->status = 'available';
        $room->completed_at = Carbon::now();
        $room->cleaned_by = Auth::id();

        $room->save();

        return response()->json([
            'message' => 'Room is now available',
            'room' => $room
        ]);
    }

    public function history()
    {
        $rooms = Room::with('cleaner')
            ->whereNotNull('completed_at')
            ->where('cleaned_by', Auth::id())
            ->latest('completed_at')
            ->get();

        return response()->json($rooms);
    }
}
