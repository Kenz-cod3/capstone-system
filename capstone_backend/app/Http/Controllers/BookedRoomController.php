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

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    );
                            })

                            ->orWhereHas('walkInGuest', function ($guest) use ($search) {

                                $guest->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    );
                            });
                    });
            });
        }

        return response()->json(
            $query
                ->latest()
                ->paginate($perPage),
            200
        );
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

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    );
                            })

                            ->orWhereHas('walkInGuest', function ($guest) use ($search) {

                                $guest->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    );
                            });
                    });
            });
        }

        return response()->json(
            $query
                ->latest()
                ->paginate($perPage),
            200
        );
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

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    );
                            })

                            ->orWhereHas('walkInGuest', function ($guest) use ($search) {

                                $guest->where('first_name', 'LIKE', "%{$search}%")
                                    ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                    ->orWhere('last_name', 'LIKE', "%{$search}%")

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    )

                                    ->orWhereRaw(
                                        "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                        ["%{$search}%"]
                                    );
                            });
                    });
            });
        }

        return response()->json(
            $query
                ->latest()
                ->paginate($perPage),
            200
        );
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

    // public function update(Request $request, $id)
    // {
    //     $bookedRoom = BookedRoom::with([
    //         'room.roomType',

    //         'booking.user',
    //         'booking.walkInGuest',
    //         'booking.createdBy',

    //         'booking.payments.receiver',
    //         'booking.payments.shift',

    //         'bookingAddOns.addOn',
    //     ])->findOrFail($id);

    //     $validated = $request->validate([
    //         'status' => 'sometimes|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
    //         'key_returned' => 'required_if:status,checked_out|boolean',
    //         'price_at_time_of_booking' => 'sometimes|numeric|min:0',
    //         'subtotal' => 'sometimes|numeric|min:0',
    //         'stay_type' => 'sometimes|in:overnight,short_stay',
    //     ]);

    //     if (array_key_exists('status', $validated)) {

    //         $bookedRoom->status = $validated['status'];

    //         switch ($validated['status']) {

    //             case 'confirmed':
    //                 if (!Auth::check() || !in_array(Auth::user()->role, ['admin', 'staff'])) {
    //                     return response()->json([
    //                         'message' => 'Only staff or admin can confirm a booking.'
    //                     ], 403);
    //                 }

    //                 $booking = $bookedRoom->booking;

    //                 \App\Models\BookingHistory::create([
    //                     'booking_id'   => $booking->id,
    //                     'old_status'   => 'pending',
    //                     'new_status'   => 'confirmed',
    //                     'change_note'  => 'Booking confirmed by ' .
    //                         Auth::user()->first_name . ' ' . Auth::user()->last_name,
    //                     'changed_by'   => Auth::id(),
    //                 ]);

    //                 BookingPayment::where('booking_id', $bookedRoom->booking_id)
    //                     ->update([
    //                         'received_by' => Auth::id(),
    //                         'payment_status' => 'paid',
    //                         'payment_date' => now(),
    //                     ]);

    //                 $users = User::whereIn('role', ['admin', 'staff'])
    //                     ->where('id', '!=', Auth::id())
    //                     ->get();

    //                 $staffName = Auth::user()->first_name . ' ' . Auth::user()->last_name;

    //                 foreach ($users as $user) {

    //                     $notification = Notification::create([
    //                         'user_id' => $user->id,
    //                         'title' => 'Booking Confirmed',
    //                         'message' => $staffName . ' confirmed booking ' . $booking->booking_reference . '.',
    //                         'is_read' => false,
    //                     ]);

    //                     broadcast(new NotificationCreated($notification));
    //                 }

    //                 if ($booking->user_id) {

    //                     $notification = Notification::create([
    //                         'user_id' => $booking->user_id,
    //                         'title' => 'Booking Confirmed',
    //                         'message' => 'Your booking ' . $booking->booking_reference . ' has been confirmed.',
    //                         'is_read' => false,
    //                     ]);

    //                     broadcast(new NotificationCreated($notification));

    //                     if ($booking->user && $booking->user->email) {

    //                         MailService::sendNotificationEmail(
    //                             $booking->user->email,
    //                             $booking->user->first_name,
    //                             $booking->booking_reference,
    //                             $notification->title,
    //                             $notification->message
    //                         );
    //                     }
    //                 }

    //                 break;

    //             case 'checked_in':
    //                 $alreadyOccupied = BookedRoom::where('room_id', $bookedRoom->room_id)
    //                     ->where('id', '!=', $bookedRoom->id)
    //                     ->whereNull('archived_at')
    //                     ->whereNull('deleted_at')
    //                     ->where('status', 'checked_in')
    //                     ->exists();

    //                 if ($alreadyOccupied) {
    //                     return response()->json([
    //                         'message' => 'Room ' . ($bookedRoom->room->room_number ?? $bookedRoom->room_id) .
    //                             ' already has a guest checked in. Please check out the current guest first.'
    //                     ], 409);
    //                 }

    //                 $bookedRoom->check_in_time = now();

    //                 $roomType = $bookedRoom->room->roomType;

    //                 if ($bookedRoom->stay_type === 'short_stay') {
    //                     $bookedRoom->expected_checkout_at = now()
    //                         ->addHours((int) $roomType->short_stay_hours);

    //                     $bookedRoom->is_early_checkin = false;
    //                     $bookedRoom->early_checkin_fee = 0;
    //                 } else {
    //                     $scheduledCheckIn = Carbon::parse($bookedRoom->check_in_date)->startOfDay();
    //                     $today = now()->startOfDay();

    //                     // CASE A: Checking in on a date BEFORE the scheduled check-in date
    //                     if ($today->lt($scheduledCheckIn)) {

    //                         $bookedRoom->is_early_checkin = true;
    //                         $bookedRoom->early_checkin_fee = $roomType->early_checkin_fee;
    //                         $bookedRoom->subtotal += $roomType->early_checkin_fee;

    //                         // Move check_in_date to today so nights / expected
    //                         // checkout are computed against the real stay.
    //                         $bookedRoom->check_in_date = $today->toDateString();

    //                         $bookedRoom->expected_checkout_at = $today->copy()
    //                             ->addDay()
    //                             ->setTimeFromTimeString($roomType->overnight_checkout_time);
    //                     } else {
    //                         // CASE B: Same scheduled date, only the time-of-day matters
    //                         $bookedRoom->expected_checkout_at = $scheduledCheckIn->copy()
    //                             ->addDay()
    //                             ->setTimeFromTimeString($roomType->overnight_checkout_time);

    //                         $standardCheckIn = $scheduledCheckIn->copy()
    //                             ->setTimeFromTimeString($roomType->standard_checkin_time);

    //                         if (now()->lt($standardCheckIn)) {
    //                             $bookedRoom->is_early_checkin = true;
    //                             $bookedRoom->early_checkin_fee = $roomType->early_checkin_fee;
    //                             $bookedRoom->subtotal += $roomType->early_checkin_fee;
    //                         } else {
    //                             $bookedRoom->is_early_checkin = false;
    //                             $bookedRoom->early_checkin_fee = 0;
    //                         }
    //                     }
    //                 }

    //                 $bookedRoom->checkout_status = 'ontime';
    //                 $bookedRoom->overdue_started_at = null;

    //                 if ($bookedRoom->room) {
    //                     $bookedRoom->room->update([
    //                         'status' => Room::STATUS_OCCUPIED,
    //                     ]);
    //                 }

    //                 $users = User::whereIn('role', ['admin', 'staff'])->get();

    //                 foreach ($users as $user) {
    //                     $notification = Notification::create([
    //                         'user_id' => $user->id,
    //                         'title' => 'Guest Checked In',
    //                         'message' => 'Guest has checked in to Room ' .
    //                             $bookedRoom->room->room_number .
    //                             ' (Booking: ' .
    //                             $bookedRoom->booking->booking_reference .
    //                             ').',
    //                     ]);

    //                     broadcast(new NotificationCreated($notification))->toOthers();
    //                 }

    //                 break;

    //             case 'checked_out':
    //                 $bookedRoom->check_out_time = now();
    //                 $bookedRoom->key_returned = $validated['key_returned'];

    //                 $roomType = $bookedRoom->room->roomType;

    //                 if ($bookedRoom->expected_checkout_at && now()->gt($bookedRoom->expected_checkout_at)) {
    //                     $bookedRoom->is_late_checkout = true;
    //                     $bookedRoom->late_checkout_fee = $roomType->late_checkout_fee;
    //                     $bookedRoom->checkout_status = 'overdue';
    //                     $bookedRoom->subtotal += $roomType->late_checkout_fee;
    //                 } else {
    //                     $bookedRoom->is_late_checkout = false;
    //                     $bookedRoom->late_checkout_fee = 0;
    //                     $bookedRoom->checkout_status = 'ontime';
    //                 }

    //                 $bookedRoom->overdue_started_at = null;

    //                 if ($bookedRoom->room) {
    //                     $bookedRoom->room->update([
    //                         'status' => Room::STATUS_DIRTY,
    //                     ]);
    //                 }

    //                 $users = User::whereIn('role', ['admin', 'staff'])->get();

    //                 foreach ($users as $user) {
    //                     $notification = Notification::create([
    //                         'user_id' => $user->id,
    //                         'title' => 'Checked-out',
    //                         'message' => 'Guest Room ' .
    //                             $bookedRoom->room->room_number .
    //                             ' has been checked out.',
    //                     ]);

    //                     broadcast(new NotificationCreated($notification))->toOthers();
    //                 }

    //                 break;

    //             case 'cancelled':
    //                 if (
    //                     $bookedRoom->room &&
    //                     $bookedRoom->room->status === Room::STATUS_OCCUPIED
    //                 ) {
    //                     $bookedRoom->room->update([
    //                         'status' => Room::STATUS_AVAILABLE,
    //                     ]);
    //                 }

    //                 $bookedRoom->expected_checkout_at = null;
    //                 $bookedRoom->overdue_started_at = null;
    //                 $bookedRoom->checkout_status = 'ontime';

    //                 $users = User::whereIn('role', ['admin', 'staff'])->get();

    //                 foreach ($users as $user) {
    //                     $notification = Notification::create([
    //                         'user_id' => $user->id,
    //                         'title' => 'Booking Cancelled',
    //                         'message' => 'Booking ' .
    //                             $bookedRoom->booking->booking_reference .
    //                             ' has been cancelled. Room ' .
    //                             $bookedRoom->room->room_number .
    //                             ' is now available.',
    //                     ]);

    //                     broadcast(new NotificationCreated($notification))->toOthers();
    //                 }

    //                 break;
    //         }

    //         $bookedRoom->save();
    //     }

    //     $updateData = collect($validated)
    //         ->only([
    //             'price_at_time_of_booking',
    //             'subtotal',
    //             'stay_type',
    //         ])
    //         ->toArray();

    //     if (!empty($updateData)) {
    //         $bookedRoom->update($updateData);
    //     }

    //     broadcast(new DashboardUpdated())->toOthers();

    //     return response()->json([
    //         'message' => 'Booked room updated successfully.',
    //         'data' => $bookedRoom->fresh([
    //             'room.roomType',

    //             'booking.user',
    //             'booking.walkInGuest',
    //             'booking.createdBy',

    //             'booking.payments.receiver',
    //             'booking.payments.shift',

    //             'bookingAddOns.addOn',
    //         ]),
    //     ], 200);
    // }

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

            $bookedRoom = DB::transaction(function () use ($validated, $id, &$wasNoOp, &$earlyResponse) {

                // Lock the row for the duration of this transaction. If a second
                // "Confirm" click (or a slow retry) arrives while this is running,
                // it blocks here until this transaction commits, then sees the
                // already-updated status below instead of re-running everything.
                $bookedRoom = BookedRoom::where('id', $id)->lockForUpdate()->firstOrFail();

                $newStatus = $validated['status'];

                // Idempotency guard: same status requested twice = no-op, not a re-run.
                if ($bookedRoom->status === $newStatus) {
                    $wasNoOp = true;
                    return $bookedRoom;
                }

                // Guard against stale/racing transitions (e.g. a queued "confirm"
                // landing after the room was already cancelled by another request).
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

                // Reload relations now that we hold the lock, so the side-effect
                // code below (which reads $bookedRoom->room, ->booking, etc.) has
                // fresh data rather than whatever was cached before the lock.
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

                    case 'confirmed':
                        if (!Auth::check() || !in_array(Auth::user()->role, ['admin', 'staff'])) {
                            $earlyResponse = response()->json([
                                'message' => 'Only staff or admin can confirm a booking.'
                            ], 403);
                            return $bookedRoom;
                        }

                        $booking = $bookedRoom->booking;

                        \App\Models\BookingHistory::create([
                            'booking_id'   => $booking->id,
                            'old_status'   => 'pending',
                            'new_status'   => 'confirmed',
                            'change_note'  => 'Booking confirmed by ' .
                                Auth::user()->first_name . ' ' . Auth::user()->last_name,
                            'changed_by'   => Auth::id(),
                        ]);

                        BookingPayment::where('booking_id', $bookedRoom->booking_id)
                            ->update([
                                'received_by' => Auth::id(),
                                'payment_status' => 'paid',
                                'payment_date' => now(),
                            ]);

                        $users = User::whereIn('role', ['admin', 'staff'])
                            ->where('id', '!=', Auth::id())
                            ->get();

                        $staffName = Auth::user()->first_name . ' ' . Auth::user()->last_name;

                        foreach ($users as $user) {

                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Booking Confirmed',
                                'message' => $staffName . ' confirmed booking ' . $booking->booking_reference . '.',
                                'is_read' => false,
                            ]);

                            broadcast(new NotificationCreated($notification));
                        }

                        if ($booking->user_id) {

                            $notification = Notification::create([
                                'user_id' => $booking->user_id,
                                'title' => 'Booking Confirmed',
                                'message' => 'Your booking ' . $booking->booking_reference . ' has been confirmed.',
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
                        $alreadyOccupied = BookedRoom::where('room_id', $bookedRoom->room_id)
                            ->where('id', '!=', $bookedRoom->id)
                            ->whereNull('archived_at')
                            ->whereNull('deleted_at')
                            ->where('status', 'checked_in')
                            ->exists();

                        if ($alreadyOccupied) {
                            $earlyResponse = response()->json([
                                'message' => 'Room ' . ($bookedRoom->room->room_number ?? $bookedRoom->room_id) .
                                    ' already has a guest checked in. Please check out the current guest first.'
                            ], 409);
                            return $bookedRoom;
                        }

                        $bookedRoom->check_in_time = now();

                        $roomType = $bookedRoom->room?->roomType;

                        // Safe defaults so a missing value never crashes or charges wrongly
                        $earlyFee     = (float) ($roomType?->early_checkin_fee ?? 0);
                        $standardTime = $roomType?->standard_checkin_time ?? '14:00';
                        $checkoutTime = $roomType?->overnight_checkout_time ?? '11:00';

                        if ($bookedRoom->stay_type === 'short_stay') {
                            // Short stays never pay an early check-in fee
                            $bookedRoom->expected_checkout_at = now()
                                ->addHours((int) ($roomType?->short_stay_hours ?? 3));

                            $bookedRoom->is_early_checkin = false;
                            $bookedRoom->early_checkin_fee = 0;
                        } else {
                            $scheduledCheckIn = Carbon::parse($bookedRoom->check_in_date)->startOfDay();
                            $today = now()->startOfDay();

                            // CASE A: Checking in on a date BEFORE the scheduled check-in date
                            if ($today->lt($scheduledCheckIn)) {

                                $bookedRoom->is_early_checkin = true;
                                $bookedRoom->early_checkin_fee = $earlyFee;
                                $bookedRoom->subtotal += $earlyFee;

                                // Move check_in_date to today so nights / expected
                                // checkout are computed against the real stay.
                                $bookedRoom->check_in_date = $today->toDateString();

                                $bookedRoom->expected_checkout_at = $today->copy()
                                    ->addDay()
                                    ->setTimeFromTimeString($checkoutTime);
                            } else {
                                // CASE B: Same scheduled date, only the time-of-day matters
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

                        $users = User::whereIn('role', ['admin', 'staff'])->get();

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Guest Checked In',
                                'message' => 'Guest has checked in to Room ' .
                                    $bookedRoom->room->room_number .
                                    ' (Booking: ' .
                                    $bookedRoom->booking->booking_reference .
                                    ').',
                            ]);

                            broadcast(new NotificationCreated($notification))->toOthers();
                        }

                        break;

                    case 'checked_out':
                        $bookedRoom->check_out_time = now();
                        $bookedRoom->key_returned = $validated['key_returned'];

                        $roomType = $bookedRoom->room->roomType;

                        if ($bookedRoom->expected_checkout_at && now()->gt($bookedRoom->expected_checkout_at)) {
                            $bookedRoom->is_late_checkout = true;
                            $bookedRoom->late_checkout_fee = $roomType->late_checkout_fee;
                            $bookedRoom->checkout_status = 'overdue';
                            $bookedRoom->subtotal += $roomType->late_checkout_fee;
                        } else {
                            $bookedRoom->is_late_checkout = false;
                            $bookedRoom->late_checkout_fee = 0;
                            $bookedRoom->checkout_status = 'ontime';
                        }

                        $bookedRoom->overdue_started_at = null;

                        if ($bookedRoom->room) {
                            $bookedRoom->room->update([
                                'status' => Room::STATUS_DIRTY,
                            ]);
                        }

                        $users = User::whereIn('role', ['admin', 'staff'])->get();

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Checked-out',
                                'message' => 'Guest Room ' .
                                    $bookedRoom->room->room_number .
                                    ' has been checked out.',
                            ]);

                            broadcast(new NotificationCreated($notification))->toOthers();
                        }

                        break;

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

                        $users = User::whereIn('role', ['admin', 'staff'])->get();

                        foreach ($users as $user) {
                            $notification = Notification::create([
                                'user_id' => $user->id,
                                'title' => 'Booking Cancelled',
                                'message' => 'Booking ' .
                                    $bookedRoom->booking->booking_reference .
                                    ' has been cancelled. Room ' .
                                    $bookedRoom->room->room_number .
                                    ' is now available.',
                            ]);

                            broadcast(new NotificationCreated($notification))->toOthers();
                        }

                        break;
                }

                $bookedRoom->save();

                // Keep the parent booking's total in sync — early check-in / late
                // checkout fees (and any other subtotal change) must flow into
                // revenue stats and the booking details "Total".
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

            // A guard inside the transaction (403/409) — return it as-is.
            if ($earlyResponse) {
                return $earlyResponse;
            }

            // Non-status fields, applied after the status transaction.
            $updateData = collect($validated)
                ->only([
                    'price_at_time_of_booking',
                    'subtotal',
                    'stay_type',
                ])
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
                ->only([
                    'price_at_time_of_booking',
                    'subtotal',
                    'stay_type',
                ])
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

                'booking.payments.receiver',
                'booking.payments.shift',

                'bookingAddOns.addOn',
            ]),
        ], 200);
    }

    public function destroy($id)
    {
        $bookedRoom = BookedRoom::with([
            'room.roomType',

            'booking.user',
            'booking.walkInGuest',

            'booking.payments.receiver',

            'bookingAddOns.addOn',
        ])->findOrFail($id);

        if ($bookedRoom->booking->payments()->where('payment_status', 'paid')->exists()) {
            return response()->json([
                'message' => 'Paid bookings cannot be moved to trash.'
            ], 400);
        }

        if ($bookedRoom->status === 'checked_in') {
            return response()->json([
                'message' => 'Checked-in room cannot be moved to trash.'
            ], 400);
        }

        if (
            $bookedRoom->room &&
            $bookedRoom->room->status === Room::STATUS_OCCUPIED
        ) {
            $bookedRoom->room->update([
                'status' => Room::STATUS_AVAILABLE,
            ]);
        }

        $bookedRoom->update([
            'archived_at' => now(),
        ]);

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room moved to trash.'
        ], 200);
    }

    public function restore($id)
    {
        $bookedRoom = BookedRoom::withTrashed()
            ->with('room')
            ->findOrFail($id);

        if ($bookedRoom->deleted_at) {
            return response()->json([
                'message' => 'Cannot restore a permanently deleted booked room.'
            ], 400);
        }

        if ($bookedRoom->room) {

            $checkIn = Carbon::parse($bookedRoom->check_in_date);

            $checkOut = $bookedRoom->stay_type === 'short_stay'
                ? $checkIn->copy()->addDay()
                : Carbon::parse($bookedRoom->check_out_date);

            $hasConflict = BookedRoom::where('room_id', $bookedRoom->room_id)
                ->where('id', '!=', $bookedRoom->id)
                ->whereNull('archived_at')
                ->whereNull('deleted_at')
                ->whereIn('status', [
                    'pending',
                    'confirmed',
                    'checked_in',
                ])
                ->get()
                ->contains(function ($existing) use ($checkIn, $checkOut) {

                    $existingCheckIn = Carbon::parse($existing->check_in_date);

                    $existingCheckOut = $existing->stay_type === 'short_stay'
                        ? $existingCheckIn->copy()->addDay()
                        : Carbon::parse($existing->check_out_date);

                    return $checkIn->lt($existingCheckOut)
                        && $checkOut->gt($existingCheckIn);
                });

            if ($hasConflict) {
                return response()->json([
                    'message' => 'Room is already booked for these dates by another booking.'
                ], 409);
            }
        }

        $bookedRoom->update([
            'archived_at' => null,
        ]);

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room restored.'
        ], 200);
    }

    public function forceDelete($id)
    {
        $bookedRoom = BookedRoom::withTrashed()->findOrFail($id);

        if (!$bookedRoom->trashed()) {
            $bookedRoom->delete();
        }

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room permanently deleted.'
        ], 200);
    }
}
