<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Room;
use App\Models\BookingHistory;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

use Illuminate\Support\Facades\DB;

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
            'createdBy',
            'histories.user',  // ✅ Add this line
            'rooms' => function ($q) {
                $q->withTrashed()->with('images');
            },
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

    // ACTIVE BOOKINGS
    public function active(Request $request)
    {
        $perPage = $request->per_page ?? 10;

        $bookings = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',
            'rooms' => function ($q) {
                $q->withTrashed()->with('roomType');
            }
        ])
            ->whereNull('deleted_at')
            ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
            ->latest()
            ->paginate($perPage);

        return response()->json($bookings);
    }

    // HISTORY 
    public function history(Request $request)
    {
        $perPage = $request->per_page ?? 10;

        $bookings = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',  // ✅ Add this line
            'rooms' => function ($q) {
                $q->withTrashed()->with('roomType');
            }
        ])
            ->whereNull('deleted_at')
            ->whereIn('booking_status', ['checked_out', 'cancelled'])
            ->latest()
            ->paginate($perPage);

        return response()->json($bookings);
    }

    // TRASH
    public function trash(Request $request)
    {
        $perPage = $request->per_page ?? 10;

        $bookings = Booking::onlyTrashed()
            ->with([
                'user',
                'walkInGuest',
                'createdBy',
                'histories.user',  // ✅ Add this line
                'rooms' => function ($q) {
                    $q->withTrashed()->with('roomType');
                }
            ])
            ->latest()
            ->paginate($perPage);

        return response()->json($bookings);
    }

    // CREATE BOOKING (ONLINE)

    // CREATE BOOKING (ONLINE)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_type' => 'required|in:overnight,short',
            'room_ids' => 'required|array',
            'room_ids.*' => 'exists:rooms,id',
            // Overnight validation
            'check_in_date' => 'required_if:booking_type,overnight|date|exclude_if:booking_type,short',
            'check_out_date' => 'required_if:booking_type,overnight|date|after:check_in_date|exclude_if:booking_type,short',
            // Short stay validation
            'hours' => 'required_if:booking_type,short|integer|min:1|max:24|exclude_if:booking_type,overnight',
        ]);

        $checkIn = Carbon::now();
        $stayType = $request->booking_type === 'short' ? 'short_stay' : 'overnight';

        if ($stayType === 'overnight') {
            $checkInDate = Carbon::parse($validated['check_in_date']);
            $checkOutDate = Carbon::parse($validated['check_out_date']);
            $nights = $checkInDate->diffInDays($checkOutDate);
            $nights = $nights > 0 ? $nights : 1;
        } else {
            // For short stay: check-in is now, check-out is now + hours
            $hours = $validated['hours'];
            $checkOutDate = Carbon::now()->addHours($hours);
            $nights = 0; // Not used for short stay pricing
        }

        $rooms = Room::whereIn('id', $validated['room_ids'])
            ->where('status', 'available')
            ->with('roomType') // Make sure to load room type for pricing
            ->get();

        if ($rooms->count() != count($validated['room_ids'])) {
            return response()->json([
                'message' => 'Some rooms are not available'
            ], 400);
        }

        Cache::forget('dashboard_data');

        $reference = 'BOOK-' . strtoupper(Str::random(8));
        $createdBookings = [];

        foreach ($rooms as $room) {
            // Calculate price based on stay type
            if ($stayType === 'short_stay') {
                $price = $room->roomType->short_stay_price ?? 500; // fallback
                $subtotal = $price;
            } else {
                $price = $room->roomType->base_price ?? 1000;
                $subtotal = $price * $nights;
            }

            // Create booking
            $booking = Booking::create([
                'user_id' => Auth::id(),
                'created_by' => Auth::id(),
                'check_in_date' => $stayType === 'overnight' ? $validated['check_in_date'] : Carbon::now()->toDateString(),
                'check_out_date' => $stayType === 'overnight' ? $validated['check_out_date'] : $checkOutDate->toDateString(),
                'check_in_time' => null,
                'total_price' => $subtotal,
                'booking_status' => 'pending',
                'booking_type' => 'online',
                'stay_type' => $stayType,
                'booking_reference' => $reference,
            ]);

            $booking->rooms()->attach($room->id, [
                'price_at_time_of_booking' => $price,
                'subtotal' => $subtotal,
                'stay_type' => $stayType
            ]);

            $this->log($booking->id, 'none', 'pending', 'Booking created');

            $createdBookings[] = $booking;
        }

        // Update room status
        Room::whereIn('id', $validated['room_ids'])
            ->update(['status' => 'occupied']);

        // Notifications
        NotificationService::notifyAdmins(
            'Guest Check-in',
            'Guest booking ' . $reference . ' checked in'
        );

        Notification::create([
            'user_id' => Auth::id(),
            'title' => 'Booking Created',
            'message' => 'Your booking ' . $reference . ' has been successfully created.',
            'is_read' => false
        ]);

        return response()->json([
            'message' => 'Bookings created',
            'data' => $createdBookings
        ], 201);
    }
    // public function store(Request $request)
    // {
    //     $validated = $request->validate([
    //         'check_in_date' => 'required|date',
    //         'check_out_date' => 'required|date|after:check_in_date',
    //         'room_ids' => 'required|array',
    //         'room_ids.*' => 'exists:rooms,id'
    //     ]);

    //     $checkIn = Carbon::parse($validated['check_in_date']);
    //     $checkOut = Carbon::parse($validated['check_out_date']);

    //     $nights = $checkIn->diffInDays($checkOut);
    //     $nights = $nights > 0 ? $nights : 1;

    //     $rooms = Room::whereIn('id', $validated['room_ids'])
    //         ->where('status', 'available')
    //         ->get();

    //     if ($rooms->count() != count($validated['room_ids'])) {
    //         return response()->json([
    //             'message' => 'Some rooms are not available'
    //         ], 400);
    //     }

    //     Cache::forget('dashboard_data');

    //     $reference = 'BOOK-' . strtoupper(Str::random(8));

    //     $createdBookings = [];

    //     foreach ($rooms as $room) {

    //         $price = $room->price ?? 1000;
    //         $subtotal = $price * $nights;

    //         // ✅ ONE BOOKING PER ROOM
    //         $booking = Booking::create([
    //             'user_id' => Auth::id(),
    //             'created_by' => Auth::id(),
    //             'check_in_date' => $validated['check_in_date'],
    //             'check_out_date' => $validated['check_out_date'],
    //             'total_price' => $subtotal,
    //             'booking_status' => 'pending',
    //             'booking_type' => 'online',
    //             'stay_type' => $request->booking_type === 'short' ? 'short_stay' : 'overnight',
    //             'booking_reference' => $reference,
    //         ]);

    //         $booking->rooms()->attach($room->id, [
    //             'price_at_time_of_booking' => $price,
    //             'subtotal' => $subtotal
    //         ]);

    //         $this->log($booking->id, 'none', 'pending', 'Booking created');

    //         $createdBookings[] = $booking;
    //     }

    //     // $booking = Booking::create([
    //     //     'user_id' => Auth::id(),
    //     //     'created_by' => Auth::id(),
    //     //     'check_in_date' => $validated['check_in_date'],
    //     //     'check_out_date' => $validated['check_out_date'],
    //     //     'total_price' => 0,
    //     //     'booking_status' => 'pending',
    //     //     'booking_type' => 'online',
    //     //     'booking_reference' => 'BOOK-' . strtoupper(Str::random(8)),
    //     // ]);

    //     // Cache::forget('dashboard_data');

    //     // $total = 0;

    //     // foreach ($rooms as $room) {

    //     //     $price = $room->price ?? 1000;

    //     //     $subtotal = $price * $nights;

    //     //     $booking->rooms()->attach($room->id, [
    //     //         'price_at_time_of_booking' => $price,
    //     //         'subtotal' => $subtotal
    //     //     ]);

    //     //     $total += $subtotal;
    //     // }

    //     // $booking->update([
    //     //     'total_price' => $total
    //     // ]);

    //     Room::whereIn('id', $validated['room_ids'])
    //         ->update(['status' => 'occupied']);

    //     // 🔥 LOG
    //     $this->log($booking->id, 'none', 'pending', 'Booking created');

    //     NotificationService::notifyAdmins(
    //         'Guest Check-in',
    //         'Guest booking ' . $booking->booking_reference . ' checked in'
    //     );

    //     // 🔔 NOTIFY USER (IMPORTANT)
    //     Notification::create([
    //         'user_id' => Auth::id(),
    //         'title' => 'Booking Created',
    //         'message' => 'Your booking ' . $booking->booking_reference . ' has been successfully created.',
    //         'is_read' => false
    //     ]);

    //     return response()->json([
    //         'message' => 'Bookings created',
    //         'data' => $createdBookings
    //     ], 201);
    // }

    // ===============================
    // 🔹 UPDATE STATUS
    // ===============================
    public function update(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        $oldStatus = $booking->booking_status;
        $newStatus = $request->booking_status;
        $reason = $request->override_reason ?? null;

        $type = $booking->walk_in_guest_id ? 'Walk-in' : 'Guest';

        $booking->update([
            'booking_status' => $newStatus
        ]);

        if ($newStatus === 'checked_in') {
            $booking->update([
                'booking_status' => $newStatus,
                'check_in_time' => $booking->check_in_time ?? now()
            ]);

            NotificationService::notifyAdmins(
                $type . ' Check-in',
                $type . ' booking ' . $booking->booking_reference . ' checked in'
            );

            Notification::create([
                'user_id' => $booking->user_id,
                'title' => 'Checked In',
                'message' => 'Your booking ' . $booking->booking_reference . ' has been checked in.',
                'is_read' => false
            ]);

            // Update rooms to OCCUPIED when checking in
            $booking->load('rooms');
            $roomIds = $booking->rooms->pluck('id');
            Room::whereIn('id', $roomIds)->update(['status' => 'occupied']);
        }

        if ($newStatus === 'checked_out') {
            $booking->update([
                'booking_status' => $newStatus,
                'check_out_time' => $booking->check_out_time ?? now()
            ]);

            NotificationService::notifyAdmins(
                $type . ' Check-out',
                $type . ' booking ' . $booking->booking_reference . ' checked out'
            );

            if ($booking->user_id) {
                Notification::create([
                    'user_id' => $booking->user_id,
                    'title' => 'Checked Out',
                    'message' => 'Your booking ' . $booking->booking_reference . ' has been checked out.',
                    'is_read' => false
                ]);
            }

            $booking->load('rooms');

            // 🔥 LOOP EACH ROOM and set to DIRTY (same as walk-in)
            foreach ($booking->rooms as $room) {
                // Update booked_rooms table with checkout time
                DB::table('booked_rooms')
                    ->where('booking_id', $booking->id)
                    ->where('room_id', $room->id)
                    ->update([
                        'check_out_time' => now()
                    ]);

                // Update room status to DIRTY (needs cleaning)
                $room->status = 'dirty';
                $room->save();
            }
        }

        if ($newStatus === 'cancelled') {
            // When cancelled, make rooms available again
            $booking->load('rooms');
            foreach ($booking->rooms as $room) {
                $room->status = 'available';
                $room->save();
            }

            NotificationService::notifyAdmins(
                $type . ' Booking Cancelled',
                $type . ' booking ' . $booking->booking_reference . ' has been cancelled'
            );

            if ($booking->user_id) {
                Notification::create([
                    'user_id' => $booking->user_id,
                    'title' => 'Booking Cancelled',
                    'message' => 'Your booking ' . $booking->booking_reference . ' has been cancelled.',
                    'is_read' => false
                ]);
            }
        }

        Cache::forget('dashboard_data');

        $this->log(
            $booking->id,
            $oldStatus,
            $newStatus,
            'Status updated',
            $reason
        );

        return response()->json([
            'message' => 'Status updated',
            'data' => Booking::with([
                'user',
                'walkInGuest',
                'createdBy',
                'histories.user',
                'rooms' => function ($q) {
                    $q->withTrashed()->with('roomType');
                }
            ])->find($booking->id)
        ]);
    }

    public function extend($id)
    {
        $booking = Booking::findOrFail($id);

        // add 1 hour charge (example ₱100)
        $booking->total_price += 100;

        $booking->save();

        return response()->json([
            'message' => 'Stay extended',
            'total_price' => $booking->total_price
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

        $reason = $request->override_reason ?? null;

        $this->log(
            $booking->id,
            $booking->booking_status,
            $booking->booking_status,
            'Soft deleted',
            $reason
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

    public function all()
    {
        return Booking::with([
            'rooms' => function ($q) {
                $q->withTrashed()->with('roomType'); // 🔥 FIX
            },
            'user',
            'walkInGuest'
        ])
            ->latest()
            ->get();
    }

    // ===============================
    // 🔹 REUSABLE LOGGER
    // ===============================
    private function log($bookingId, $old, $new, $note, $reason = null)
    {
        BookingHistory::create([
            'booking_id' => $bookingId,
            'old_status' => $old,
            'new_status' => $new,
            'changed_by' => Auth::id() ?? 1,
            'change_note' => $note,

            'override_reason' => $reason,
            'is_override' => $reason ? true : false,

            'changed_at' => now()
        ]);
    }
}
