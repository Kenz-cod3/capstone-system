<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Events\NotificationCreated;
use App\Models\BookedRoom;
use App\Models\BookingPayment;
use App\Models\Notification;
use App\Models\Room;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BookedRoomController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;
        $status = $request->status;

        $query = BookedRoom::with([
            'room.roomType',
            'booking.user',
            'booking.walkInGuest',
            'booking.createdBy',
            'booking.histories.user',
            'booking.payments.receiver',
            'booking.payments.shift',
            'bookingAddOns.addOn',
        ])
            ->whereNull('archived_at')
            ->where(function ($q) {
                $q->whereIn('status', [
                    'pending',
                    'confirmed',
                    'checked_in',
                ]);

                $q->orWhere(function ($q2) {
                    $q2->where('status', 'cancelled')
                        ->whereHas('booking.payments', function ($payment) {
                            $payment->where('payment_status', 'paid');
                        });
                });
            });

        if (!empty($status) && $status !== 'all') {
            $query->where('status', $status);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                })
                    ->orWhereHas('booking', function ($booking) use ($search) {
                        $booking->where('booking_reference', 'LIKE', "%{$search}%")
                            ->orWhere('id', $search)
                            ->orWhereHas('user', function ($user) use ($search) {
                                $user->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                                    ->orWhereRaw("CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"]);
                            })
                            ->orWhereHas('walkInGuest', function ($guest) use ($search) {
                                $guest->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                                    ->orWhereRaw("CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"]);
                            });
                    });
            });
        }

        return response()->json($query->latest()->paginate($perPage), 200);
    }

    public function history(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;
        $status = $request->status;
        $paymentStatus = $request->payment_status;

        $query = BookedRoom::with([
            'room.roomType',
            'booking.user',
            'booking.walkInGuest',
            'booking.createdBy',
            'booking.payments.receiver',
            'booking.payments.shift',
            'bookingAddOns.addOn',
        ])
            ->whereNull('archived_at')
            ->whereIn('status', [
                'checked_out',
                'cancelled',
                'refunded',
            ]);

        if (!empty($status) && $status !== 'all') {
            $query->where('status', $status);
        }

        if (!empty($paymentStatus) && $paymentStatus !== 'all') {
            $query->whereHas('booking.payments', function ($q) use ($paymentStatus) {
                $q->where('payment_status', $paymentStatus);
            });
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                })
                    ->orWhereHas('booking', function ($booking) use ($search) {
                        $booking->where('booking_reference', 'LIKE', "%{$search}%")
                            ->orWhere('id', $search)
                            ->orWhereHas('user', function ($user) use ($search) {
                                $user->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                                    ->orWhereRaw("CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"]);
                            })
                            ->orWhereHas('walkInGuest', function ($guest) use ($search) {
                                $guest->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                                    ->orWhereRaw("CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"]);
                            });
                    });
            });
        }

        return response()->json($query->latest()->paginate($perPage), 200);
    }

    public function trash(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;
        $status = $request->status;

        $query = BookedRoom::with([
            'room.roomType',
            'booking.user',
            'booking.walkInGuest',
            'booking.createdBy',
            'booking.payments.receiver',
            'booking.payments.shift',
            'bookingAddOns.addOn',
        ])
            ->whereNotNull('archived_at');

        if (!empty($status) && $status !== 'all' && $status !== 'archived') {
            $query->where('status', $status);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                })
                    ->orWhereHas('booking', function ($booking) use ($search) {
                        $booking->where('booking_reference', 'LIKE', "%{$search}%")
                            ->orWhere('id', $search)
                            ->orWhereHas('user', function ($user) use ($search) {
                                $user->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                                    ->orWhereRaw("CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"]);
                            })
                            ->orWhereHas('walkInGuest', function ($guest) use ($search) {
                                $guest->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                                    ->orWhereRaw("CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"])
                                    ->orWhereRaw("CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?", ["%{$search}%"]);
                            });
                    });
            });
        }

        return response()->json($query->latest()->paginate($perPage), 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'room_id' => 'required|exists:rooms,id',
            'status' => 'nullable|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
            'price_at_time_of_booking' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'stay_type' => 'required|in:overnight,short_stay',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date',
            'validate_only' => 'sometimes|boolean',
        ]);

        $room = Room::findOrFail($validated['room_id']);

        if ($room->status === 'maintenance') {
            return response()->json([
                'message' => 'Room is under maintenance and cannot be assigned.'
            ], 400);
        }

        $requestedCheckIn = Carbon::parse($validated['check_in_date']);

        $requestedCheckOut = $validated['stay_type'] === 'short_stay'
            ? $requestedCheckIn->copy()->addDay()
            : Carbon::parse($validated['check_out_date']);

        $hasConflict = BookedRoom::where('room_id', $room->id)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereIn('status', [
                'pending',
                'confirmed',
                'checked_in',
            ])
            ->get()
            ->contains(function ($existing) use ($requestedCheckIn, $requestedCheckOut) {
                $existingCheckIn = Carbon::parse($existing->check_in_date);

                $existingCheckOut = $existing->stay_type === 'short_stay'
                    ? $existingCheckIn->copy()->addDay()
                    : Carbon::parse($existing->check_out_date);

                return $requestedCheckIn->lt($existingCheckOut)
                    && $requestedCheckOut->gt($existingCheckIn);
            });

        if ($hasConflict) {
            return response()->json([
                'message' => 'Room is already booked for the selected dates.'
            ], 409);
        }

        // Dry run: the frontend checks availability BEFORE collecting payment
        if ($request->boolean('validate_only')) {
            return response()->json(['message' => 'Room is available.'], 200);
        }

        $bookedRoom = BookedRoom::create([
            'booking_id'               => $validated['booking_id'],
            'room_id'                  => $validated['room_id'],
            'price_at_time_of_booking' => $validated['price_at_time_of_booking'],
            'subtotal'                 => $validated['subtotal'],
            'stay_type'                => $validated['stay_type'],
            'check_in_date'            => $requestedCheckIn->toDateString(),
            'check_out_date'           => $requestedCheckOut->toDateString(),
            'status'                   => $validated['status'] ?? 'pending',
        ]);

        // Recompute the booking total so the new room shows up in the Total
        $parentBooking = \App\Models\Booking::find($validated['booking_id']);
        $parentBooking->update([
            'total_price' => $parentBooking->bookedRooms()
                ->whereNull('archived_at')
                ->whereNotIn('status', ['cancelled', 'refunded'])
                ->sum('subtotal'),
        ]);

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Room assigned to booking',
            'data' => $bookedRoom->load([
                'room.roomType',
                'booking.user',
                'booking.walkInGuest',
                'booking.createdBy',
                'booking.payments.receiver',
                'booking.payments.shift',
                'bookingAddOns.addOn',
            ])
        ], 201);
    }

    // "Room 101 (Oct 05, 2026 - Oct 07, 2026)" or "Room 101 (Oct 05, 2026 - Short stay)"
    private function roomStaySummary($bookedRoom): string
    {
        $in = Carbon::parse($bookedRoom->check_in_date);
        $out = Carbon::parse($bookedRoom->check_out_date);

        $dates = $bookedRoom->stay_type === 'short_stay'
            ? $in->format('M d, Y') . ' - Short stay'
            : $in->format('M d, Y') . ' - ' . $out->format('M d, Y');

        return 'Room ' . ($bookedRoom->room->room_number ?? $bookedRoom->room_id) .
            ' (' . $dates . ')';
    }

    public function show($id)
    {
        $bookedRoom = BookedRoom::with([
            'room.roomType',
            'booking.user',
            'booking.walkInGuest',
            'booking.createdBy',
            'booking.payments.receiver',
            'booking.payments.shift',
            'bookingAddOns.addOn',
        ])->findOrFail($id);

        return response()->json($bookedRoom, 200);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
            'key_returned' => 'required_if:status,checked_out|boolean',
            'price_at_time_of_booking' => 'sometimes|numeric|min:0',
            'subtotal' => 'sometimes|numeric|min:0',
            'stay_type' => 'sometimes|in:overnight,short_stay',
        ]);

        $wasNoOp = false;
        $earlyResponse = null;

        if (array_key_exists('status', $validated)) {

            $bookedRoom = DB::transaction(function () use (
                $validated,
                $id,
                &$wasNoOp,
                &$earlyResponse
            ) {
                // LOCK BOOKED ROOM
                $bookedRoom = BookedRoom::where('id', $id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $newStatus = $validated['status'];
                $previousStatus = $bookedRoom->status;

                // IDEMPOTENCY GUARD
                if ($bookedRoom->status === $newStatus) {
                    $wasNoOp = true;
                    return $bookedRoom;
                }

                // VALID STATUS TRANSITIONS
                $allowedFrom = [
                    'confirmed'   => ['pending'],
                    'checked_in'  => ['confirmed', 'pending'],
                    'checked_out' => ['checked_in'],
                    'cancelled'   => ['pending', 'confirmed', 'checked_in'],
                    'refunded'    => ['cancelled', 'checked_in', 'checked_out'],
                ];

                if (
                    isset($allowedFrom[$newStatus]) &&
                    !in_array($bookedRoom->status, $allowedFrom[$newStatus], true)
                ) {
                    $earlyResponse = response()->json([
                        'message' => "Room is already '{$bookedRoom->status}'; cannot change to '{$newStatus}'."
                    ], 409);
                    return $bookedRoom;
                }

                // LOAD RELATIONSHIPS
                $bookedRoom->load([
                    'room.roomType',
                    'booking.user',
                    'booking.walkInGuest',
                    'booking.createdBy',
                    'booking.payments.receiver',
                    'booking.payments.shift',
                    'bookingAddOns.addOn',
                ]);

                $bookedRoom->status = $newStatus;

                switch ($newStatus) {

                    // CONFIRMED
                    case 'confirmed':
                        if (
                            !Auth::check() ||
                            !in_array(Auth::user()->role, ['admin', 'staff'])
                        ) {
                            $earlyResponse = response()->json([
                                'message' => 'Only staff or admin can confirm a booking.'
                            ], 403);
                            return $bookedRoom;
                        }

                        $booking = $bookedRoom->booking;

                        $hasVerifiedPayment = $booking->payments()
                            ->where('payment_status', 'paid')
                            ->exists();

                        if (!$hasVerifiedPayment) {
                            $earlyResponse = response()->json([
                                'message' => 'Cannot confirm — payment is still pending. Please verify the payment first.'
                            ], 409);
                            return $bookedRoom;
                        }

                        \App\Models\BookingHistory::create([
                            'booking_id'  => $booking->id,
                            'old_status'  => $previousStatus,
                            'new_status'  => 'confirmed',
                            'change_note' => 'Booking confirmed by ' .
                                Auth::user()->first_name . ' ' .
                                Auth::user()->last_name,
                            'changed_by'  => Auth::id(),
                            'changed_at'  => now(),
                        ]);

                        $users = User::whereIn('role', ['admin', 'staff'])
                            ->where('id', '!=', Auth::id())
                            ->get();

                        $staffName = trim(
                            Auth::user()->first_name . ' ' .
                                Auth::user()->last_name
                        );

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Booking Confirmed',
                                'booking_id' => $booking->id,
                                'message' => $staffName .
                                    ' confirmed booking ' .
                                    $booking->booking_reference . '.',
                                'is_read' => false,
                            ]);

                            broadcast(new NotificationCreated($notification));
                        }

                        if ($booking->user_id) {
                            $notification = Notification::create([
                                'user_id' => $booking->user_id,
                                'title' => 'Booking Confirmed',
                                'booking_id' => $booking->id,
                                'message' => 'Your booking ' .
                                    $booking->booking_reference .
                                    ' for ' . $this->roomStaySummary($bookedRoom) .
                                    ' has been confirmed.',
                                'is_read' => false,
                            ]);

                            broadcast(new NotificationCreated($notification));

                            if ($booking->user && $booking->user->email) {
                                MailService::sendNotificationEmail(
                                    $booking->user->email,
                                    $booking->user->first_name,
                                    $booking->booking_reference,
                                    $notification->title,
                                    $notification->message
                                );
                            }
                        }

                        break;

                    case 'checked_in':
                        // Walk-in na may pending QR Ph: bawal i-check-in hangga't walang webhook
                        $hasPendingQr = $bookedRoom->booking
                            && $bookedRoom->booking->booking_type === 'walk_in'
                            && $bookedRoom->booking->payments()
                            ->where('payment_method', 'qrph')
                            ->where('payment_status', 'pending')
                            ->exists();

                        if ($hasPendingQr) {
                            $earlyResponse = response()->json([
                                'message' => 'QR Ph payment is still pending. Wait for confirmation or switch to cash.'
                            ], 409);
                            return $bookedRoom;
                        }

                        $alreadyOccupied = BookedRoom::where('room_id', $bookedRoom->room_id)
                            ->where('id', '!=', $bookedRoom->id)
                            ->whereNull('archived_at')
                            ->whereNull('deleted_at')
                            ->where('status', 'checked_in')
                            ->exists();

                        if ($alreadyOccupied) {
                            $earlyResponse = response()->json([
                                'message' => 'Room ' .
                                    ($bookedRoom->room->room_number ?? $bookedRoom->room_id) .
                                    ' already has a guest checked in. Please check out the current guest first.'
                            ], 409);
                            return $bookedRoom;
                        }

                        // Block check-in while housekeeping still has the room
                        $roomStatus = $bookedRoom->room?->status;

                        if (in_array($roomStatus, [Room::STATUS_PREPARING, 'ongoing'], true)) {
                            $label = $roomStatus === 'ongoing' ? 'being cleaned' : 'queued for cleaning';

                            $earlyResponse = response()->json([
                                'message' => 'Room ' .
                                    ($bookedRoom->room->room_number ?? $bookedRoom->room_id) .
                                    ' is still ' . $label . '. Please wait until housekeeping finishes before checking in.'
                            ], 409);
                            return $bookedRoom;
                        }

                        $bookedRoom->check_in_time = now();

                        $roomType = $bookedRoom->room?->roomType;

                        $earlyFee = (float) ($roomType?->early_checkin_fee ?? 0);
                        $standardTime = $roomType?->standard_checkin_time ?? '14:00';
                        $checkoutTime = $roomType?->overnight_checkout_time ?? '11:00';

                        if ($bookedRoom->stay_type === 'short_stay') {
                            $bookedRoom->expected_checkout_at = now()
                                ->addHours((int) ($roomType?->short_stay_hours ?? 3));

                            $bookedRoom->is_early_checkin = false;
                            $bookedRoom->early_checkin_fee = 0;
                        } else {
                            $scheduledCheckIn = Carbon::parse($bookedRoom->check_in_date)->startOfDay();
                            $today = now()->startOfDay();

                            if ($today->lt($scheduledCheckIn)) {
                                $bookedRoom->is_early_checkin = true;
                                $bookedRoom->early_checkin_fee = $earlyFee;
                                $bookedRoom->subtotal += $earlyFee;
                                $bookedRoom->check_in_date = $today->toDateString();

                                $bookedRoom->expected_checkout_at = $today->copy()
                                    ->addDay()
                                    ->setTimeFromTimeString($checkoutTime);
                            } else {
                                $bookedRoom->expected_checkout_at = $scheduledCheckIn->copy()
                                    ->addDay()
                                    ->setTimeFromTimeString($checkoutTime);

                                $standardCheckIn = $scheduledCheckIn->copy()
                                    ->setTimeFromTimeString($standardTime);

                                if (now()->lt($standardCheckIn)) {
                                    $bookedRoom->is_early_checkin = true;
                                    $bookedRoom->early_checkin_fee = $earlyFee;
                                    $bookedRoom->subtotal += $earlyFee;
                                } else {
                                    $bookedRoom->is_early_checkin = false;
                                    $bookedRoom->early_checkin_fee = 0;
                                }
                            }
                        }

                        $bookedRoom->checkout_status = 'ontime';
                        $bookedRoom->overdue_started_at = null;

                        if ($bookedRoom->room) {
                            $bookedRoom->room->update([
                                'status' => Room::STATUS_OCCUPIED,
                            ]);
                        }

                        $users = User::whereIn('role', ['admin', 'staff'])
                            ->when(Auth::id(), fn($q) => $q->where('id', '!=', Auth::id()))
                            ->get();

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Guest Checked In',
                                'booking_id' => $bookedRoom->booking_id,
                                'message' => 'Guest has checked in to Room ' .
                                    $bookedRoom->room->room_number .
                                    ' (Booking: ' .
                                    $bookedRoom->booking->booking_reference .
                                    ').',
                            ]);

                            broadcast(new NotificationCreated($notification))->toOthers();
                        }

                        $checkinNote = 'Guest checked in to Room ' .
                            ($bookedRoom->room->room_number ?? $bookedRoom->room_id);

                        if ($bookedRoom->is_early_checkin) {
                            $checkinNote .= ' (Early Check-in, +₱' .
                                number_format($bookedRoom->early_checkin_fee, 2) .
                                ' fee)';
                        }

                        if (Auth::check()) {
                            $checkinNote .= ' by ' . trim(
                                Auth::user()->first_name . ' ' . Auth::user()->last_name
                            );
                        }

                        \App\Models\BookingHistory::create([
                            'booking_id'  => $bookedRoom->booking_id,
                            'old_status'  => $previousStatus,
                            'new_status'  => 'checked_in',
                            'change_note' => $checkinNote,
                            'changed_by'  => Auth::id(),
                            'changed_at'  => now(),
                        ]);

                        break;

                    // CHECKED OUT — this is where housekeepers get notified
                    case 'checked_out':
                        $bookedRoom->check_out_time = now();
                        $bookedRoom->key_returned = $validated['key_returned'];

                        if (Auth::check()) {
                            $checkoutStaffName = trim(
                                Auth::user()->first_name . ' ' .
                                    Auth::user()->last_name
                            );

                            \App\Models\BookingHistory::create([
                                'booking_id'  => $bookedRoom->booking_id,
                                'old_status'  => $previousStatus,
                                'new_status'  => 'checked_out',
                                'change_note' => 'Guest checked out by ' . $checkoutStaffName,
                                'changed_by'  => Auth::id(),
                                'changed_at'  => now(),
                            ]);
                        }

                        $roomType = $bookedRoom->room?->roomType;

                        if (
                            $bookedRoom->expected_checkout_at &&
                            now()->gt($bookedRoom->expected_checkout_at)
                        ) {
                            $bookedRoom->is_late_checkout = true;
                            $bookedRoom->late_checkout_fee = $roomType?->late_checkout_fee ?? 0;
                            $bookedRoom->checkout_status = 'overdue';
                            $bookedRoom->subtotal += $roomType?->late_checkout_fee ?? 0;
                        } else {
                            $bookedRoom->is_late_checkout = false;
                            $bookedRoom->late_checkout_fee = 0;
                            $bookedRoom->checkout_status = 'ontime';
                        }

                        $bookedRoom->overdue_started_at = null;

                        if ($bookedRoom->room) {
                            // Room becomes 'preparing' — this is what the
                            // housekeeper app's /housekeeper/tasks endpoint
                            // filters on.
                            $bookedRoom->room->update([
                                'status' => Room::STATUS_PREPARING,
                            ]);

                            /*
                            |--------------------------------------------------
                            | NOTIFY HOUSEKEEPERS
                            |--------------------------------------------------
                            | 1. Persist a Notification row per housekeeper
                            |    (so /notifications/user/{id} and
                            |    /notifications/unread-count/{id} work).
                            | 2. Broadcast it over the websocket channel for
                            |    real-time delivery while the app is open.
                            | 3. Send an Expo push notification for delivery
                            |    while the app is backgrounded/closed.
                            |--------------------------------------------------
                            */

                            $housekeepers = User::where('role', 'housekeeper')->get();

                            foreach ($housekeepers as $housekeeper) {

                                $notification = Notification::create([
                                    'user_id' => $housekeeper->id,
                                    'title' => 'New Cleaning Task',
                                    'booking_id' => $bookedRoom->booking_id,
                                    'message' => 'Room ' .
                                        $bookedRoom->room->room_number .
                                        ' is ready for cleaning (Booking: ' .
                                        $bookedRoom->booking->booking_reference .
                                        ').',
                                    'is_read' => false,
                                ]);

                                broadcast(new NotificationCreated($notification))->toOthers();

                                if ($housekeeper->expo_push_token) {
                                    try {
                                        Http::post(
                                            'https://exp.host/--/api/v2/push/send',
                                            [
                                                'to' => $housekeeper->expo_push_token,
                                                'title' => 'Cleaning Required',
                                                'body' => 'Room ' .
                                                    $bookedRoom->room->room_number .
                                                    ' is ready for cleaning.',
                                                'sound' => 'default',
                                                'channelId' => 'housekeeping',
                                                'data' => [
                                                    'type' => 'room_cleaning',
                                                    'notification_id' => $notification->id,
                                                    'room_id' => $bookedRoom->room->id,
                                                    'room_number' => $bookedRoom->room->room_number,
                                                ],
                                            ]
                                        );
                                    } catch (\Throwable $e) {
                                        Log::error(
                                            'Failed to send housekeeper push notification.',
                                            [
                                                'housekeeper_id' => $housekeeper->id,
                                                'room_id' => $bookedRoom->room->id,
                                                'error' => $e->getMessage(),
                                            ]
                                        );
                                    }
                                }
                            }
                        }

                        $users = User::whereIn('role', ['admin', 'staff'])
                            ->when(Auth::id(), fn($q) => $q->where('id', '!=', Auth::id()))
                            ->get();

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Checked-out',
                                'booking_id' => $bookedRoom->booking_id,
                                'message' => 'Guest Room ' .
                                    $bookedRoom->room->room_number .
                                    ' has been checked out (Booking: ' .
                                    $bookedRoom->booking->booking_reference .
                                    ').',
                            ]);

                            broadcast(new NotificationCreated($notification))->toOthers();
                        }

                        break;

                    // CANCELLED
                    case 'cancelled':
                        if (
                            $bookedRoom->room &&
                            $bookedRoom->room->status === Room::STATUS_OCCUPIED
                        ) {
                            $bookedRoom->room->update([
                                'status' => Room::STATUS_AVAILABLE,
                            ]);
                        }

                        $bookedRoom->expected_checkout_at = null;
                        $bookedRoom->overdue_started_at = null;
                        $bookedRoom->checkout_status = 'ontime';

                        $users = User::whereIn('role', ['admin', 'staff'])
                            ->when(Auth::id(), fn($q) => $q->where('id', '!=', Auth::id()))
                            ->get();

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Booking Cancelled',
                                'booking_id' => $bookedRoom->booking_id,
                                'message' => 'Booking ' .
                                    $bookedRoom->booking->booking_reference .
                                    ' has been cancelled. Room ' .
                                    $bookedRoom->room->room_number .
                                    ' is now available.',
                            ]);

                            broadcast(new NotificationCreated($notification))->toOthers();
                        }

                        \App\Models\BookingHistory::create([
                            'booking_id'  => $bookedRoom->booking_id,
                            'old_status'  => $previousStatus,
                            'new_status'  => 'cancelled',
                            'change_note' => 'Booking ' . $bookedRoom->booking->booking_reference . ' cancelled' .
                                (Auth::check() ? ' by ' . trim(Auth::user()->first_name . ' ' . Auth::user()->last_name) : ''),
                            'changed_by'  => Auth::id(),
                            'changed_at'  => now(),
                        ]);

                        break;

                    // REFUNDED
                    case 'refunded':
                        \App\Models\BookingHistory::create([
                            'booking_id'  => $bookedRoom->booking_id,
                            'old_status'  => $previousStatus,
                            'new_status'  => 'refunded',
                            'change_note' => 'Room ' .
                                ($bookedRoom->room->room_number ?? $bookedRoom->room_id) .
                                ' marked as refunded' .
                                (Auth::check() ? ' by ' . trim(Auth::user()->first_name . ' ' . Auth::user()->last_name) : ''),
                            'changed_by'  => Auth::id(),
                            'changed_at'  => now(),
                        ]);

                        break;
                }

                $bookedRoom->save();

                if ($bookedRoom->booking) {
                    $bookedRoom->booking->update([
                        'total_price' => $bookedRoom->booking->bookedRooms()
                            ->whereNull('archived_at')
                            ->whereNotIn('status', ['cancelled', 'refunded'])
                            ->sum('subtotal'),
                    ]);
                }

                return $bookedRoom;
            });

            if ($earlyResponse) {
                return $earlyResponse;
            }

            $updateData = collect($validated)
                ->only(['price_at_time_of_booking', 'subtotal', 'stay_type'])
                ->toArray();

            if (!empty($updateData)) {
                $bookedRoom->update($updateData);
            }
        } else {
            $bookedRoom = BookedRoom::with([
                'room.roomType',
                'booking.user',
                'booking.walkInGuest',
                'booking.createdBy',
                'booking.payments.receiver',
                'booking.payments.shift',
                'bookingAddOns.addOn',
            ])->findOrFail($id);

            $updateData = collect($validated)
                ->only(['price_at_time_of_booking', 'subtotal', 'stay_type'])
                ->toArray();

            if (!empty($updateData)) {
                $bookedRoom->update($updateData);
            }
        }

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => $wasNoOp
                ? 'No change — booked room already in this status.'
                : 'Booked room updated successfully.',

            'data' => $bookedRoom->fresh([
                'room.roomType',
                'booking.user',
                'booking.walkInGuest',
                'booking.createdBy',
                'booking.histories.user',
                'booking.payments.receiver',
                'booking.payments.shift',
                'bookingAddOns.addOn',
            ]),
        ], 200);
    }
}
