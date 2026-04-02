<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Room;
use App\Models\BookingHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

use App\Services\NotificationService;
use Illuminate\Support\Facades\Storage;

class BookingController extends Controller
{
    // ===============================
    // 🔹 ALL BOOKINGS (ADMIN)
    // ===============================
    public function index()
    {
        $query = Booking::with([
            'user',
            'walkInGuest',
            'rooms.images', // gi add
            'addOns',
            'histories.user'
        ]);

        // Admin sees all (including trash)
        if (Auth::user()->role === 'admin') {
            $query->withTrashed();
        } else {
            $query->where('user_id', Auth::id());
        }

        $bookings = $query->get();

        $bookings->each(function ($booking) {
            foreach ($booking->rooms as $room) {

                // ✅ 1. remove broken images
                $validImages = $room->images->filter(function ($img) {
                    return Storage::disk('public')->exists($img->image_path);
                })->values();

                // ✅ 2. pick BEST image (latest or main)
                $bestImage = $validImages
                    ->sortByDesc('id') // latest upload
                    ->first();

                // ✅ 3. attach image_url (like admin)
                $room->image_url = $bestImage
                    ? asset('storage/' . $bestImage->image_path)
                    : null;

                // optional: keep images
                $room->images = $validImages;
            }
        });

        return response()->json($bookings, 200);
    }

    // ===============================
    // 🔹 ACTIVE BOOKINGS
    // ===============================
    public function active()
    {
        $bookings = Booking::with(['user', 'walkInGuest', 'rooms'])
            ->whereNull('deleted_at')
            ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
            ->get();

        return response()->json($bookings);
    }

    // ===============================
    // 🔹 HISTORY (COMPLETED)
    // ===============================
    public function history()
    {
        $bookings = Booking::with(['user', 'walkInGuest', 'rooms'])
            ->whereNull('deleted_at')
            ->whereIn('booking_status', ['checked_out', 'cancelled'])
            ->get();

        return response()->json($bookings);
    }

    // ===============================
    // 🔹 TRASH
    // ===============================
    public function trash()
    {
        $bookings = Booking::onlyTrashed()
            ->with(['user', 'walkInGuest', 'rooms'])
            ->get();

        return response()->json($bookings);
    }

    // ===============================
    // 🔹 CREATE BOOKING
    // ===============================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date|after:check_in_date',
            'total_price' => 'required|numeric|min:0',
            'room_ids' => 'required|array',
            'room_ids.*' => 'exists:rooms,id'
        ]);

        $rooms = Room::whereIn('id', $validated['room_ids'])
            ->where('status', 'available')
            ->get();

        if ($rooms->count() != count($validated['room_ids'])) {
            return response()->json([
                'message' => 'Some rooms are not available'
            ], 400);
        }

        $booking = Booking::create([
            'user_id' => Auth::id(),
            'check_in_date' => $validated['check_in_date'],
            'check_out_date' => $validated['check_out_date'],
            'total_price' => $validated['total_price'],
            'booking_status' => 'pending',
            'booking_type' => 'online',
            'booking_reference' => 'BOOK-' . strtoupper(Str::random(8)),
        ]);

        Cache::forget('dashboard_data');

        foreach ($rooms as $room) {
            $booking->rooms()->attach($room->id, [
                'price_at_time_of_booking' => $room->price ?? 1000
            ]);
        }

        Room::whereIn('id', $validated['room_ids'])
            ->update(['status' => 'occupied']);

        // 🔥 LOG
        $this->log($booking->id, 'none', 'pending', 'Booking created');

        NotificationService::notifyAdmins(
            'Guest Check-in',
            'Guest booking ' . $booking->booking_reference . ' checked in'
        );

        return response()->json([
            'message' => 'Booking created',
            'data' => $booking
        ], 201);
    }

    // ===============================
    // 🔹 UPDATE STATUS
    // ===============================
    public function update(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        $oldStatus = $booking->booking_status;
        $newStatus = $request->booking_status;

        // ✅ ADD THIS LINE
        $type = $booking->walk_in_guest_id ? 'Walk-in' : 'Guest';

        $booking->update([
            'booking_status' => $newStatus
        ]);

        // ✅ USE IT HERE
        if ($newStatus === 'checked_in') {
            NotificationService::notifyAdmins(
                $type . ' Check-in',
                $type . ' booking ' . $booking->booking_reference . ' checked in'
            );
        }

        if ($newStatus === 'checked_out') {
            NotificationService::notifyAdmins(
                $type . ' Check-out',
                $type . ' booking ' . $booking->booking_reference . ' checked out'
            );
        }

        Cache::forget('dashboard_data');
        $this->log($booking->id, $oldStatus, $newStatus, 'Status updated');

        if ($newStatus === 'checked_out') {
            $roomIds = $booking->rooms->pluck('id');
            Room::whereIn('id', $roomIds)->update(['status' => 'available']);
        }

        return response()->json([
            'message' => 'Status updated'
        ]);
    }
    // ===============================
    // 🔹 DELETE (SOFT DELETE)
    // ===============================
    public function destroy($id)
    {
        $booking = Booking::with('rooms')->findOrFail($id);

        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // 🔥 LOG (KEEP ORIGINAL STATUS)
        $this->log(
            $booking->id,
            $booking->booking_status,
            $booking->booking_status,
            'Soft deleted'
        );

        $roomIds = $booking->rooms->pluck('id');
        Room::whereIn('id', $roomIds)->update(['status' => 'available']);

        $booking->delete();

        Cache::forget('dashboard_data');

        return response()->json([
            'message' => 'Moved to trash'
        ]);
    }

    // ===============================
    // 🔹 RESTORE
    // ===============================
    public function restore($id)
    {
        $booking = Booking::withTrashed()->findOrFail($id);

        $booking->restore();

        Cache::forget('dashboard_data');

        $this->log(
            $booking->id,
            'deleted',
            $booking->booking_status,
            'Restored booking'
        );

        return response()->json([
            'message' => 'Restored'
        ]);
    }

    // ===============================
    // 🔹 FORCE DELETE
    // ===============================
    public function forceDelete($id)
    {
        $booking = Booking::withTrashed()->findOrFail($id);

        $booking->forceDelete();

        Cache::forget('dashboard_data');

        return response()->json([
            'message' => 'Permanently deleted'
        ]);
    }

    // ===============================
    // 🔹 REUSABLE LOGGER
    // ===============================
    private function log($bookingId, $old, $new, $note)
    {
        BookingHistory::create([
            'booking_id' => $bookingId,
            'old_status' => $old,
            'new_status' => $new,
            'changed_by' => Auth::id() ?? 1,
            'change_note' => $note,
            'changed_at' => now()
        ]);
    }
}
