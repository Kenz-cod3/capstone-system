<?php

namespace App\Http\Controllers;

use App\Models\WalkInGuest;
use App\Models\Booking;
use App\Models\Room;
use App\Models\BookedRoom;
use App\Models\BookingAddOn;
use App\Models\AddOn;
use App\Models\BookingPayment;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

use App\Events\DashboardUpdated;
use Illuminate\Support\Facades\Cache;

use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;
use App\Models\StaffActivityLog;

class WalkInGuestController extends Controller
{
    private const BLOCKING_STATUSES = [
        'pending',
        'confirmed',
        'checked_in',
    ];

    /**
     * GET ALL WALK-IN GUESTS WITH THEIR BOOKINGS AND TOTAL SPENT
     */
    public function index(Request $request)
    {
        $query = WalkInGuest::query();

        if ($request->search) {
            $search = $request->search;

            $query->whereRaw("
                CONCAT(
                    first_name,
                    ' ',
                    COALESCE(middle_name, ''),
                    ' ',
                    last_name
                ) LIKE ?
            ", ["%{$search}%"])
                ->orWhere('contact_number', 'LIKE', "%{$search}%")
                ->orWhere('address', 'LIKE', "%{$search}%");
        }

        $guests = $query
            ->latest()
            ->paginate($request->per_page ?? 10);

        $guests->getCollection()->transform(function ($guest) {
            $bookings = Booking::where('walk_in_guest_id', $guest->id)->get();

            $guest->bookings_count = $bookings->count();
            $guest->total_spent = $bookings->sum('total_price');
            $guest->full_name = trim(
                $guest->first_name . ' ' .
                    ($guest->middle_name ? $guest->middle_name . ' ' : '') .
                    $guest->last_name
            );

            return $guest;
        });

        $totalRevenue = Booking::whereNotNull('walk_in_guest_id')->sum('total_price');

        return response()->json([
            'data' => $guests->items(),
            'current_page' => $guests->currentPage(),
            'last_page' => $guests->lastPage(),
            'per_page' => $guests->perPage(),
            'total' => $guests->total(),
            'total_revenue' => $totalRevenue,
        ]);
    }

    /**
     * GET GUEST DETAILS WITH BOOKINGS AND TOTAL SPENT
     */
    public function getGuestDetails($id)
    {
        $guest = WalkInGuest::findOrFail($id);

        $bookings = Booking::with([
            'walkInGuest',
            'bookedRooms' => function ($query) {
                $query->with([
                    'room.roomType',
                    'bookingAddOns.addOn'
                ]);
            },
            'payments'
        ])
            ->where('walk_in_guest_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $totalSpent = $bookings->sum('total_price');
        $firstVisit = $bookings->min('check_in_date');
        $lastVisit = $bookings->max('check_in_date');
        $averageSpent = $bookings->count() > 0
            ? $totalSpent / $bookings->count()
            : 0;

        $guestData = [
            'id' => $guest->id,
            'first_name' => $guest->first_name,
            'middle_name' => $guest->middle_name,
            'last_name' => $guest->last_name,
            'full_name' => trim(
                $guest->first_name . ' ' .
                    ($guest->middle_name ? $guest->middle_name . ' ' : '') .
                    $guest->last_name
            ),
            'contact_number' => $guest->contact_number,
            'address' => $guest->address,
            'created_at' => $guest->created_at,
            'updated_at' => $guest->updated_at,
            'bookings_count' => $bookings->count(),
            'total_spent' => $totalSpent,
        ];

        return response()->json([
            'guest' => $guestData,
            'bookings' => $bookings,
            'summary' => [
                'total_bookings' => $bookings->count(),
                'total_spent' => $totalSpent,
                'first_visit' => $firstVisit,
                'last_visit' => $lastVisit,
                'average_spent' => $averageSpent,
            ]
        ]);
    }

    /**
     * SEARCH EXISTING GUESTS
     */
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

    /**
     * CREATE NEW GUEST ONLY (NO BOOKING)
     */
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

    /**
     * GET ALL ADD-ONS
     */
    public function getAddOns()
    {
        $addOns = AddOn::orderBy('add_on_name')->get();
        return response()->json($addOns);
    }

    /**
     * WALK-IN CHECK-IN WITH ADD-ONS SUPPORT
     *
     * Cash  -> BookedRoom checked_in, payment paid (unchanged behaviour).
     * QRPh  -> BookedRoom confirmed (reserved), payment pending.
     *          Room stays available until QR confirms.
     */
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
            'total_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,qrph',
        ]);

        DB::beginTransaction();

        try {

            $guest = WalkInGuest::findOrFail($validated['guest_id']);

            $isCash = $validated['payment_method'] === 'cash';
            $roomStatus = $isCash ? 'checked_in' : 'confirmed';
            $paymentStatus = $isCash ? 'paid' : 'pending';

            $roomNumbers = [];
            $totalPrice = 0;

            $roomIds = collect($validated['bookings'])
                ->pluck('room_id')
                ->unique()
                ->values();

            $roomsToBook = Room::whereIn('id', $roomIds)
                ->with('roomType')
                ->get();

            if ($roomsToBook->count() !== $roomIds->count()) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Some selected rooms do not exist.'
                ], 400);
            }

            $maintenance = $roomsToBook->firstWhere('status', 'maintenance');

            if ($maintenance) {
                DB::rollBack();

                return response()->json([
                    'message' => "Room {$maintenance->room_number} is under maintenance."
                ], 400);
            }

            // Overlapping ranges guard within payload
            $ranges = [];

            foreach ($validated['bookings'] as $bookingData) {

                [$in, $out] = $this->resolveRange(
                    $bookingData['check_in_date'],
                    $bookingData['check_out_date'],
                    $bookingData['stay_type']
                );

                $roomId = $bookingData['room_id'];

                foreach ($ranges[$roomId] ?? [] as $existing) {

                    if ($in->lt($existing[1]) && $out->gt($existing[0])) {

                        DB::rollBack();

                        $room = $roomsToBook->firstWhere('id', $roomId);

                        return response()->json([
                            'message' => 'Room ' . ($room->room_number ?? $roomId) .
                                ' is selected twice with overlapping dates.'
                        ], 422);
                    }
                }

                $ranges[$roomId][] = [$in, $out];
            }

            // Real conflict check against existing active bookings, row-locked
            foreach ($validated['bookings'] as $bookingData) {

                [$in, $out] = $this->resolveRange(
                    $bookingData['check_in_date'],
                    $bookingData['check_out_date'],
                    $bookingData['stay_type']
                );

                $conflict = $this->conflictQuery(
                    $bookingData['room_id'],
                    $in,
                    $out
                )
                    ->lockForUpdate()
                    ->exists();

                if ($conflict) {

                    DB::rollBack();

                    $room = $roomsToBook->firstWhere('id', $bookingData['room_id']);

                    return response()->json([
                        'message' => 'Room ' . ($room->room_number ?? $bookingData['room_id']) .
                            ' is already booked for the selected dates.'
                    ], 409);
                }
            }

            do {
                $reference = 'BOOK-' . strtoupper(Str::random(8));
            } while (Booking::where('booking_reference', $reference)->exists());

            foreach ($validated['bookings'] as $bookingData) {

                $roomSubtotal = $bookingData['room_subtotal'];
                $addOnsTotal = 0;

                if (!empty($bookingData['addons'])) {
                    foreach ($bookingData['addons'] as $addonData) {
                        $addOn = AddOn::findOrFail($addonData['id']);
                        $addOnsTotal += $addOn->price * $addonData['quantity'];
                    }
                }

                $totalPrice += $roomSubtotal + $addOnsTotal;
            }

            $booking = Booking::create([
                'walk_in_guest_id' => $guest->id,
                'created_by' => Auth::id(),
                'booking_type' => 'walk_in',
                'booking_reference' => $reference,
                'total_price' => $totalPrice,
            ]);

            foreach ($validated['bookings'] as $bookingData) {

                $room = $roomsToBook->firstWhere('id', $bookingData['room_id']);

                $roomNumbers[] = $room->room_number;

                $expectedCheckoutAt = null;

                if ($bookingData['stay_type'] === 'short_stay') {
                    $shortStayHours = (int) ($room->roomType->short_stay_hours ?? 3);
                    $expectedCheckoutAt = now()->addHours($shortStayHours);
                } else {
                    $expectedCheckoutAt = Carbon::parse(
                        $bookingData['check_out_date']
                    )->setTimeFromTimeString(
                        $room->roomType->overnight_checkout_time ?? '11:00:00'
                    );
                }

                $bookedRoom = $booking->bookedRooms()->create([
                    'room_id' => $room->id,
                    'stay_type' => $bookingData['stay_type'],
                    'check_in_date' => $bookingData['check_in_date'],
                    'check_out_date' => $bookingData['check_out_date'],
                    'price_at_time_of_booking' => $room->roomType->base_price ?? 0,
                    'subtotal' => $bookingData['room_subtotal'],
                    'status' => $roomStatus,
                    'check_in_time' => $isCash ? now() : null,
                    'expected_checkout_at' => $expectedCheckoutAt,
                    'checkout_status' => 'ontime',
                ]);

                if (!empty($bookingData['addons'])) {
                    foreach ($bookingData['addons'] as $addonData) {
                        $addOn = AddOn::findOrFail($addonData['id']);

                        BookingAddOn::create([
                            'booked_room_id' => $bookedRoom->id,
                            'add_on_id' => $addOn->id,
                            'quantity' => $addonData['quantity'],
                            'subtotal' => $addOn->price * $addonData['quantity'],
                        ]);
                    }
                }

                // Only flip the physical room to occupied for cash.
                // QRPh holds the room via BookedRoom.status = 'confirmed';
                // Room.status flips on confirmQr.
                if ($isCash) {
                    $room->update([
                        'status' => Room::STATUS_OCCUPIED,
                    ]);
                }
            }

            $shift = Shift::whereNull('closed_at')
                ->latest()
                ->first();

            $lastPayment = BookingPayment::whereNotNull('receipt_number')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            $nextNumber = 1;

            if ($lastPayment && $lastPayment->receipt_number) {
                $nextNumber = ((int) substr($lastPayment->receipt_number, -6)) + 1;
            }

            $receiptNumber = 'OR-' .
                date('Y') .
                '-' .
                str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'shift_id' => $shift?->id,
                'receipt_number' => $receiptNumber,
                'amount' => $totalPrice,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $paymentStatus,
                'gcash_reference' => null,
                'bank_reference' => null,
                'received_by' => Auth::id(),
                'payment_date' => $isCash ? now() : null,
            ]);

            DB::commit();

            Cache::flush();

            event(new DashboardUpdated());

            $allAddOns = [];

            foreach ($validated['bookings'] as $bookingData) {
                if (!empty($bookingData['addons'])) {
                    foreach ($bookingData['addons'] as $addon) {
                        $addonName = AddOn::find($addon['id'])->add_on_name ?? 'Unknown';
                        $allAddOns[] = $addonName . ' x' . $addon['quantity'];
                    }
                }
            }

            $addOnsMessage = '';

            if (!empty($allAddOns)) {
                $addOnsMessage = ' | Add-ons: ' . implode(', ', array_unique($allAddOns));
            }

            $activityVerb = $isCash ? 'Walk-in Check-In' : 'Walk-in Check-In (QR Ph pending)';

            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => $activityVerb,
                'details' =>
                'Guest: ' . $guest->first_name . ' ' . $guest->last_name .
                    ' | Rooms: ' . implode(', ', $roomNumbers) .
                    ' | Reference: ' . $reference,
                'ip_address' => request()->ip(),
                'total_amount' => $totalPrice,
                'timestamp' => now(),
            ]);

            if ($isCash) {
                NotificationService::notifyAdmins(
                    'Walk-in Check-In',
                    'Walk-in: ' .
                        $guest->first_name . ' ' .
                        $guest->last_name .
                        ' checked in (Rooms: ' .
                        implode(', ', $roomNumbers) . ')' .
                        $addOnsMessage
                );
            }

            $booking->load([
                'walkInGuest',
                'bookedRooms.room.roomType',
                'bookedRooms.bookingAddOns.addOn',
                'payments',
            ]);

            return response()->json([
                'message' => $isCash
                    ? 'Walk-in guest checked in successfully'
                    : 'Walk-in booking created. Awaiting QR Ph payment.',
                'booking' => $booking,
                'booking_id' => $booking->id,
                'booking_reference' => $reference,
                'payment_id' => $payment->id,
                'total_amount' => $totalPrice,
                'payment_status' => $paymentStatus,
            ], 201);
        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('Walk-in check-in error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'message' => 'Failed to check in guest: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * CONFIRM A WALK-IN QR PH PAYMENT (called by frontend after polling succeeds)
     *
     * Idempotent: repeated calls on an already-confirmed booking are no-ops.
     */
    public function confirmQr(Request $request, $bookingId)
    {
        $booking = Booking::with(['bookedRooms', 'walkInGuest'])->findOrFail($bookingId);

        // Idempotency: already confirmed?
        $allCheckedIn = $booking->bookedRooms->every(
            fn ($br) => in_array($br->status, ['checked_in', 'checked_out'])
        );

        $payment = $booking->payments()
            ->where('payment_method', 'qrph')
            ->latest('id')
            ->first();

        if ($allCheckedIn && $payment && $payment->payment_status === 'paid') {
            return response()->json([
                'message' => 'Payment already confirmed',
                'payment_id' => $payment->id,
                'booking_id' => $booking->id,
                'already_confirmed' => true,
            ], 200);
        }

        DB::beginTransaction();

        try {

            foreach ($booking->bookedRooms as $bookedRoom) {
                if ($bookedRoom->status === 'confirmed' || $bookedRoom->status === 'pending') {
                    $bookedRoom->update([
                        'status' => 'checked_in',
                        'check_in_time' => now(),
                    ]);

                    Room::where('id', $bookedRoom->room_id)->update([
                        'status' => Room::STATUS_OCCUPIED,
                    ]);
                }
            }

            if ($payment && $payment->payment_status !== 'paid') {
                $payment->update([
                    'payment_status' => 'paid',
                    'payment_date' => now(),
                    'bank_reference' => $request->input('payment_reference', $payment->bank_reference),
                    'received_by' => Auth::id() ?? $payment->received_by,
                ]);
            }

            DB::commit();

            Cache::flush();
            event(new DashboardUpdated());

            $guestName = $booking->walkInGuest
                ? $booking->walkInGuest->first_name . ' ' . $booking->walkInGuest->last_name
                : 'Walk-in Guest';

            $roomNumbers = $booking->bookedRooms->pluck('room.room_number')->filter()->implode(', ');

            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Walk-in QR Ph Confirmed',
                'details' =>
                'Guest: ' . $guestName .
                    ' | Rooms: ' . $roomNumbers .
                    ' | Reference: ' . $booking->booking_reference,
                'ip_address' => request()->ip(),
                'total_amount' => $booking->total_price,
                'timestamp' => now(),
            ]);

            NotificationService::notifyAdmins(
                'Walk-in QR Ph Paid',
                $guestName . ' paid via QR Ph and checked in (Rooms: ' . $roomNumbers . ')'
            );

            return response()->json([
                'message' => 'QR Ph payment confirmed. Guest checked in.',
                'payment_id' => $payment?->id,
                'booking_id' => $booking->id,
                'booking_reference' => $booking->booking_reference,
            ], 200);
        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('confirmQr error: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to confirm QR payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * CHECK-OUT
     */
    public function checkOut($bookingId)
    {
        DB::beginTransaction();

        try {

            $booking = Booking::with([
                'walkInGuest',
                'bookedRooms.room.roomType',
                'bookedRooms.bookingAddOns.addOn',
            ])->findOrFail($bookingId);

            $status = $booking->bookedRooms->first()->status ?? null;

            if ($status === 'checked_out') {
                return response()->json([
                    'message' => 'Booking is already checked out'
                ], 400);
            }

            foreach ($booking->bookedRooms as $bookedRoom) {

                $now = now();

                $isLate = false;
                $lateCheckoutFee = 0;
                $checkoutStatus = 'ontime';

                if (
                    $bookedRoom->expected_checkout_at &&
                    $now->greaterThan($bookedRoom->expected_checkout_at)
                ) {
                    $isLate = true;
                    $checkoutStatus = 'overdue';

                    $roomType = $bookedRoom->room?->roomType;

                    $lateCheckoutFee = (float) (
                        $roomType?->late_checkout_fee ?? 0
                    );

                    $bookedRoom->subtotal += $lateCheckoutFee;
                }

                $bookedRoom->update([
                    'status' => 'checked_out',
                    'check_out_time' => $now,
                    'is_late_checkout' => $isLate,
                    'late_checkout_fee' => $lateCheckoutFee,
                    'checkout_status' => $checkoutStatus,
                ]);

                Room::where('id', $bookedRoom->room_id)
                    ->update([
                        'status' => 'dirty',
                    ]);
            }

            DB::commit();

            Cache::flush();

            event(new DashboardUpdated());

            $name = $booking->walkInGuest
                ? $booking->walkInGuest->first_name . ' ' . $booking->walkInGuest->last_name
                : 'Walk-in Guest';

            $allAddOns = collect();

            foreach ($booking->bookedRooms as $bookedRoom) {
                foreach ($bookedRoom->bookingAddOns as $bookingAddOn) {
                    $allAddOns->push(
                        $bookingAddOn->addOn->add_on_name .
                            ' x' .
                            $bookingAddOn->quantity
                    );
                }
            }

            $addOnsInfo = '';

            if ($allAddOns->isNotEmpty()) {
                $addOnsInfo = ' | Add-ons: ' . $allAddOns->implode(', ');
            }

            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Walk-in Check-Out',
                'details' =>
                'Guest: ' . $name .
                    ' | Reference: ' . $booking->booking_reference,
                'ip_address' => request()->ip(),
                'total_amount' => $booking->total_price,
                'timestamp' => now(),
            ]);

            NotificationService::notifyAdmins(
                'Walk-in Check-Out',
                $name .
                    ' checked out (Ref: ' .
                    $booking->booking_reference .
                    ')' .
                    $addOnsInfo
            );

            return response()->json([
                'message' => 'Guest checked out successfully',
                'booking' => $booking,
            ]);
        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('Check-out error: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to check out guest: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET BOOKING DETAILS
     */
    public function getBookingDetails($bookingId)
    {
        $booking = Booking::with([
            'walkInGuest',
            'bookedRooms.room.roomType',
            'bookedRooms.bookingAddOns.addOn',
        ])->findOrFail($bookingId);

        $roomSubtotal = $booking->bookedRooms->sum('subtotal');

        $addOnsTotal = $booking->bookedRooms->sum(function ($bookedRoom) {
            return $bookedRoom->bookingAddOns->sum('subtotal');
        });

        return response()->json([
            'booking' => $booking,
            'breakdown' => [
                'room_subtotal' => $roomSubtotal,
                'add_ons_total' => $addOnsTotal,
                'total' => $booking->total_price,
            ]
        ]);
    }

    /**
     * PENDING WALK-IN PAYMENTS (for admin reconciliation)
     */
    public function pendingPayments()
    {
        $bookings = Booking::with([
            'walkInGuest',
            'payments',
            'bookedRooms.room',
        ])
            ->where('booking_type', 'walk_in')
            ->whereHas('payments', function ($q) {
                $q->where('payment_status', 'pending');
            })
            ->latest()
            ->get();

        return response()->json(['data' => $bookings]);
    }

    /**
     * DELETE WALK-IN GUEST
     */
    public function destroy($id)
    {
        $guest = WalkInGuest::findOrFail($id);
        $guest->delete();

        return response()->json([
            'message' => 'Walk-in guest deleted successfully'
        ]);
    }

    private function resolveRange($checkIn, $checkOut, ?string $stayType): array
    {
        $in = Carbon::parse($checkIn)->startOfDay();

        $out = $stayType === 'short_stay'
            ? $in->copy()->addDay()
            : Carbon::parse($checkOut ?? $in)->startOfDay();

        if ($out->lessThanOrEqualTo($in)) {
            $out = $in->copy()->addDay();
        }

        return [$in, $out];
    }

    private function conflictQuery($roomId, Carbon $in, Carbon $out, $excludeBookedRoomId = null)
    {
        $query = BookedRoom::where('room_id', $roomId)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereIn('status', self::BLOCKING_STATUSES)
            ->whereDate('check_in_date', '<', $out->toDateString())
            ->whereRaw(
                "CASE
                    WHEN stay_type = 'short_stay'
                    THEN DATE_ADD(check_in_date, INTERVAL 1 DAY)
                    ELSE check_out_date
                 END > ?",
                [$in->toDateString()]
            );

        if ($excludeBookedRoomId) {
            $query->where('id', '!=', $excludeBookedRoomId);
        }

        return $query;
    }
}