<?php

namespace App\Http\Controllers;

use App\Models\WalkInGuest;
use App\Models\Booking;
use App\Models\Room;
use App\Models\BookingAddOn;
use App\Models\AddOn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class WalkInGuestController extends Controller
{
    // GET ALL WALK-IN GUESTS WITH THEIR BOOKINGS AND ADD-ONS
    public function index()
    {
        return response()->json(
            WalkInGuest::with([
                'bookings' => function ($query) {
                    $query->with([
                        'bookedRooms.room.roomType',
                        'addOns'  // This uses your many-to-many relationship
                    ])->orderBy('created_at', 'desc');
                }
            ])->get(),
            200
        );
    }

    // SEARCH EXISTING GUESTS
    public function search(Request $request)
    {
        $query = $request->get('q');

        if (!$query || strlen(trim($query)) < 2) {
            return response()->json([]);
        }

        $guests = WalkInGuest::whereRaw("
        CONCAT(first_name, ' ', COALESCE(middle_name,''), ' ', last_name)
        LIKE ?
        ", ["%{$query}%"])
            ->orWhere('contact_number', 'LIKE', "%{$query}%")
            ->orderBy('first_name')
            ->limit(10)
            ->get();

        return response()->json($guests);
    }

    // CREATE NEW GUEST ONLY (NO BOOKING)
    public function storeGuest(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
        ]);

        $validated['created_by'] = Auth::id();

        $guest = WalkInGuest::create($validated);

        return response()->json($guest, 201);
    }

    // GET ALL ADD-ONS (for frontend to display)
    public function getAddOns()
    {
        $addOns = AddOn::orderBy('add_on_name')->get();
        return response()->json($addOns);
    }

    // WALK-IN CHECK-IN WITH ADD-ONS SUPPORT
    public function checkin(Request $request)
    {
        $validated = $request->validate([
            'guest_id' => 'required|exists:walk_in_guests,id',
            'bookings' => 'required|array|min:1',
            'bookings.*.room_id' => 'required|exists:rooms,id',
            'bookings.*.stay_type' => 'required|in:short_stay,overnight',
            'bookings.*.room_subtotal' => 'required|numeric|min:0',
            'bookings.*.check_in_date' => 'required|date',
            'bookings.*.check_out_date' => 'required|date|after_or_equal:bookings.*.check_in_date',
            'bookings.*.addons' => 'nullable|array',
            'bookings.*.addons.*.id' => 'exists:add_ons,id',
            'bookings.*.addons.*.quantity' => 'integer|min:1',
            'bookings.*.addons.*.price' => 'numeric|min:0',
            'bookings.*.addons.*.subtotal' => 'numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            // Get the guest
            $guest = WalkInGuest::findOrFail($validated['guest_id']);
            $reference = 'BOOK-' . strtoupper(Str::random(8));
            $createdBookings = [];
            $roomNumbers = [];

            // Check room availability first
            $roomIds = collect($validated['bookings'])->pluck('room_id')->toArray();
            $roomsToBook = Room::whereIn('id', $roomIds)
                ->where('status', 'available')
                ->get();

            if ($roomsToBook->count() != count($roomIds)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Some rooms are no longer available'
                ], 409);
            }

            foreach ($validated['bookings'] as $bookingData) {
                $room = Room::with('roomType')->findOrFail($bookingData['room_id']);
                $roomNumbers[] = $room->room_number;

                $stayType = $bookingData['stay_type'];
                $roomSubtotal = $bookingData['room_subtotal'];
                $overnightPrice = $room->roomType->base_price ?? 0;

                // Calculate total with add-ons
                $addOnsTotal = 0;
                if (!empty($bookingData['addons'])) {
                    $addOnsTotal = collect($bookingData['addons'])->sum('subtotal');
                }
                $bookingTotal = $roomSubtotal + $addOnsTotal;

                // CREATE BOOKING PER ROOM
                $booking = Booking::create([
                    'walk_in_guest_id' => $guest->id,
                    'created_by' => Auth::id(),
                    'booking_type' => 'walk_in',
                    'stay_type' => $stayType,
                    'check_in_date' => $bookingData['check_in_date'],
                    'check_out_date' => $bookingData['check_out_date'],
                    'check_in_time' => now(),
                    'booking_reference' => $reference,
                    'total_price' => $bookingTotal,
                    'booking_status' => 'checked_in',
                ]);

                // Create booked room record
                $booking->bookedRooms()->create([
                    'room_id' => $room->id,
                    'price_at_time_of_booking' => $overnightPrice,
                    'subtotal' => $roomSubtotal,
                    'stay_type' => $stayType
                ]);

                // Save add-ons using the many-to-many relationship
                if (!empty($bookingData['addons'])) {
                    foreach ($bookingData['addons'] as $addonData) {
                        // Use attach() method for many-to-many relationship
                        $booking->addOns()->attach($addonData['id'], [
                            'quantity' => $addonData['quantity'],
                            'subtotal' => $addonData['subtotal']
                        ]);
                    }
                }

                // Update room status to occupied
                $room->update([
                    'status' => 'occupied'
                ]);

                // Load relationships for response
                $booking->load(['addOns', 'bookedRooms.room.roomType']);
                $createdBookings[] = $booking;
            }

            DB::commit();

            // Prepare add-ons message for notification
            $addOnsMessage = '';
            $allAddOns = [];
            foreach ($validated['bookings'] as $bookingData) {
                if (!empty($bookingData['addons'])) {
                    foreach ($bookingData['addons'] as $addon) {
                        $addonName = AddOn::find($addon['id'])->add_on_name ?? 'Unknown';
                        $allAddOns[] = $addonName . ' x' . $addon['quantity'];
                    }
                }
            }
            if (!empty($allAddOns)) {
                $addOnsMessage = ' | Add-ons: ' . implode(', ', array_unique($allAddOns));
            }

            // NOTIFICATION
            NotificationService::notifyAdmins(
                'Walk-in Check-In',
                'Walk-in: ' .
                    $guest->first_name . ' ' .
                    $guest->last_name .
                    ' checked in (Rooms: ' . implode(', ', $roomNumbers) . ')' . $addOnsMessage
            );

            return response()->json([
                'message' => 'Walk-in guest checked in successfully',
                'guest' => $guest,
                'bookings' => $createdBookings,
                'booking_reference' => $reference,
                'total_amount' => $validated['total_amount']
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Walk-in check-in error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Failed to check in guest: ' . $e->getMessage()
            ], 500);
        }
    }

    // CHECK-OUT
    public function checkOut($bookingId)
    {
        DB::beginTransaction();

        try {
            $booking = Booking::with(['bookedRooms', 'walkInGuest', 'addOns'])->findOrFail($bookingId);

            // Prevent double check-out
            if ($booking->booking_status === 'checked_out') {
                return response()->json([
                    'message' => 'Booking is already checked out'
                ], 400);
            }

            $booking->update([
                'booking_status' => 'checked_out',
                'check_out_time' => now()
            ]);

            foreach ($booking->bookedRooms as $bookedRoom) {
                $bookedRoom->update([
                    'check_out_time' => now()
                ]);

                Room::where('id', $bookedRoom->room_id)
                    ->update([
                        'status' => 'dirty'
                    ]);
            }

            DB::commit();

            $name = $booking->walkInGuest
                ? $booking->walkInGuest->first_name . ' ' . $booking->walkInGuest->last_name
                : 'Walk-in Guest';

            // Prepare add-ons info for notification
            $addOnsInfo = '';
            if ($booking->addOns->count() > 0) {
                $addOnsList = $booking->addOns->map(function ($addon) {
                    return $addon->add_on_name . ' x' . $addon->pivot->quantity;
                })->implode(', ');
                $addOnsInfo = ' | Add-ons: ' . $addOnsList;
            }

            NotificationService::notifyAdmins(
                'Walk-in Check-Out',
                $name . ' checked out (Ref: ' . $booking->booking_reference . ')' . $addOnsInfo
            );

            return response()->json([
                'message' => 'Guest checked out successfully',
                'booking' => $booking
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Check-out error: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to check out guest: ' . $e->getMessage()
            ], 500);
        }
    }

    // GET BOOKING DETAILS WITH ADD-ONS
    public function getBookingDetails($bookingId)
    {
        $booking = Booking::with([
            'walkInGuest',
            'bookedRooms.room.roomType',
            'addOns'  // This uses the many-to-many relationship
        ])->findOrFail($bookingId);

        // Calculate additional info
        $roomSubtotal = $booking->bookedRooms->sum('subtotal');
        $addOnsTotal = $booking->addOns->sum(function ($addon) {
            return $addon->pivot->subtotal;
        });

        return response()->json([
            'booking' => $booking,
            'breakdown' => [
                'room_subtotal' => $roomSubtotal,
                'add_ons_total' => $addOnsTotal,
                'total' => $booking->total_price
            ]
        ]);
    }
}
