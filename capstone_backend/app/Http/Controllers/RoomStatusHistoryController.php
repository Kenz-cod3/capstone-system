<?php

namespace App\Http\Controllers;

use App\Models\RoomStatusHistory;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class RoomStatusHistoryController extends Controller
{
    public function index()
    {
        return response()->json(
            RoomStatusHistory::with('room')->get(),
            200
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'status' => 'required|in:available,occupied,maintenance'
        ]);

        $validated['changed_at'] = Carbon::now();

        Room::where('id', $validated['room_id'])
            ->update(['status' => $validated['status']]);

        $history = RoomStatusHistory::create($validated);

        return response()->json([
            'message' => 'Room status updated and logged',
            'data' => $history
        ], 201);
    }

    public function show($id)
    {
        $history = RoomStatusHistory::with('room')->findOrFail($id);

        return response()->json($history, 200);
    }

    public function update(Request $request, $id)
    {
        $history = RoomStatusHistory::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:available,occupied,maintenance',
            'changed_at' => 'sometimes|date'
        ]);

        $history->update($validated);

        return response()->json([
            'message' => 'History updated',
            'data' => $history
        ], 200);
    }

    public function destroy($id)
    {
        $history = RoomStatusHistory::findOrFail($id);
        $history->delete();

        return response()->json([
            'message' => 'History deleted'
        ], 200);
    }
}
