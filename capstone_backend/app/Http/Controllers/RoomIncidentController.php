<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomIncident;
use Illuminate\Http\Request;

class RoomIncidentController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | GET ALL INCIDENTS
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        $reports = RoomIncident::with([
            'room',
            'cleaner',
            'resolvedBy',
            'booking.user',
            'booking.walkInGuest'
        ])
            ->latest()
            ->get();

        return response()->json($reports);
    }

    /*
    |--------------------------------------------------------------------------
    | GET SINGLE REPORT
    |--------------------------------------------------------------------------
    */

    public function show($id)
    {
        $report = RoomIncident::with([
            'room',
            'cleaner',
            'resolvedBy',
            'booking.user',
            'booking.walkInGuest'
        ])->findOrFail($id);

        return response()->json($report);
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE REPORT
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_id'    => 'required|exists:rooms,id',
            'booking_id' => 'nullable|exists:bookings,id',
            'report_type' => 'required|in:damaged,lost,found',
            'note'       => 'required|string',
            'photos.*'   => 'nullable|image|max:2048'
        ]);

        $photos = [];

        // MULTIPLE IMAGE UPLOAD
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('damage_reports', 'public');
                $photos[] = $path;
            }
        }

        $activeBooking = \App\Models\Booking::whereHas(
            'rooms',
            function ($q) use ($validated) {
                $q->where('rooms.id', $validated['room_id']);
            }
        )
            ->latest()
            ->first();

        $report = RoomIncident::create([
            'room_id'     => $validated['room_id'],
            'cleaner_id'  => $request->user()?->id,
            'booking_id'  => $validated['booking_id'] ?? $activeBooking?->id,
            'report_type' => $validated['report_type'],
            'status'      => 'pending',
            'note'        => $validated['note'],
            'photos'      => $photos,
            'reported_at' => now(),
        ]);

        /*
        |----------------------------------------------------------------------
        | ONLY "damaged" puts the room into maintenance.
        | "lost" and "found" are informational reports — room stays as-is.
        |----------------------------------------------------------------------
        */
        if ($validated['report_type'] === 'damaged') {
            Room::where('id', $validated['room_id'])
                ->update([
                    'status'     => 'maintenance',
                    'has_damage' => true,
                ]);
        }

        return response()->json([
            'message' => 'Report created successfully',
            'data'    => $report,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE REPORT STATUS
    |--------------------------------------------------------------------------
    */

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,repairing,resolved'
        ]);

        $report = RoomIncident::findOrFail($id);

        $report->update([
            'status'      => $validated['status'],
            'resolved_by' => $validated['status'] === 'resolved'
                ? $request->user()?->id
                : null,
            'resolved_at' => $validated['status'] === 'resolved'
                ? now()
                : null,
        ]);

        if ($validated['status'] === 'resolved') {

            $remainingDamages = RoomIncident::where('room_id', $report->room_id)
                ->where('id', '!=', $report->id)
                ->where('report_type', 'damaged')
                ->whereIn('status', ['pending', 'repairing'])
                ->count();

            if ($remainingDamages === 0) {
                Room::where('id', $report->room_id)->update([
                    'status' => 'available',
                    'has_damage' => false,
                ]);
            }
        }

        return response()->json([
            'message' => 'Status updated successfully',
            'data'    => $report,
        ]);
    }
}
