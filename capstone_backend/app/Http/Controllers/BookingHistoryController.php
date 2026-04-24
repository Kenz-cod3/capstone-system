<?php

namespace App\Http\Controllers;

use App\Models\BookingHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BookingHistoryController extends Controller
{
    // 🔹 GET ALL HISTORY
    public function index()
    {
        return response()->json(
            BookingHistory::with([
                'booking.rooms',
                'user'
            ])
                ->orderByDesc('changed_at')
                ->get(),
            200
        );
    }

    // 🔹 CREATE HISTORY LOG (SAFE VERSION)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'old_status' => 'required|string|max:255',
            'new_status' => 'required|string|max:255',
            'change_note' => 'nullable|string',
            'override_reason' => 'nullable|string',
            'is_override' => 'nullable|boolean',
        ]);

        $history = BookingHistory::create([
            'booking_id' => $validated['booking_id'],
            'old_status' => $validated['old_status'],
            'new_status' => $validated['new_status'],
            'change_note' => $validated['change_note'] ?? null,
            'override_reason' => $validated['override_reason'] ?? null,
            'is_override' => $validated['override_reason'] ? true : false,

            // ✅ AUTO USER (SAFE)
            'changed_by' => Auth::check() ? Auth::id() : null,

            // ✅ IMPORTANT FIX
            'changed_at' => now()
        ]);

        return response()->json([
            'message' => 'Booking history recorded',
            'data' => $history->load(['booking', 'user'])
        ], 201);
    }

    // 🔹 GET SINGLE HISTORY
    public function show($id)
    {
        $history = BookingHistory::with([
            'booking.rooms',
            'user'
        ])->findOrFail($id);

        return response()->json($history, 200);
    }

    // 🔹 UPDATE (ONLY IF REALLY NEEDED)
    public function update(Request $request, $id)
    {
        $history = BookingHistory::findOrFail($id);

        $validated = $request->validate([
            'change_note' => 'sometimes|string'
        ]);

        $history->update($validated);

        return response()->json([
            'message' => 'Booking history updated',
            'data' => $history
        ], 200);
    }

    // 🔹 DELETE (NOT RECOMMENDED BUT OK)
    public function destroy($id)
    {
        $history = BookingHistory::findOrFail($id);
        $history->delete();

        return response()->json([
            'message' => 'Booking history deleted'
        ], 200);
    }
}
