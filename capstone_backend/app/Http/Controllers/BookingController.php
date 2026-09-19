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
use App\Events\DashboardUpdated;

use App\Events\NotificationCreated;
use App\Models\BookedRoom;
use App\Models\StaffActivityLog;
use App\Models\User;

class BookingController extends Controller
{
    private const BLOCKING_STATUSES = [
        'pending',
        'confirmed',
        'checked_in',
    ];

    private const TERMINAL_STATUSES = [
        'checked_out',
        'refunded',
        'cancelled',
    ];

    public function index()
    {
        $query = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',
            'bookedRooms.room' => function ($q) {
                $q->withTrashed()->with([
                    'images',
                    'roomType'
                ]);
            },
            'bookedRooms.bookingAddOns.addOn',
            'payments.receiver',
            'payments.shift',
        ]);

        if (Auth::user()->role === 'admin') {
            $query->withTrashed();
        } else {
            $query->where('user_id', Auth::id());
        }

        $bookings = $query->get();

        $bookings->each(function ($booking) {
            $this->attachRoomImages($booking);
        });

        return response()->json($bookings, 200);
    }

    public function active(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;
        $status = $request->status;

        $query = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',
            'bookedRooms.bookingAddOns.addOn',
            'payments.receiver',
            'payments.shift',
            'bookedRooms.room' => function ($q) {
                $q->withTrashed()->with([
                    'roomType',
                    'images'
                ]);
            }
        ])
            ->whereNull('deleted_at')
            ->whereHas('bookedRooms', function ($q) use ($status) {
                $q->whereNull('archived_at')
                    ->whereNotIn('status', [
                        'checked_out',
                        'refunded'
                    ]);

                if (!empty($status) && $status !== 'all') {
                    $q->where('status', $status);
                }
            });

        if (!in_array(Auth::user()->role, ['admin', 'staff'])) {
            $query->where('user_id', Auth::id());
        }

        $this->applySearch($query, $search);

        $bookings = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($booking) use ($status) {

            $rooms = $booking->bookedRooms
                ->whereNull('archived_at')
                ->whereNotIn('status', [
                    'checked_out',
                    'refunded'
                ]);

            if (!empty($status) && $status !== 'all') {
                $rooms = $rooms->where('status', $status);
            }

            $booking->setRelation('bookedRooms', $rooms->values());

            return $booking;
        });

        $bookings->getCollection()->each(function ($booking) {

            foreach ($booking->bookedRooms as $bookedRoom) {

                if (
                    $bookedRoom->status === 'checked_in' &&
                    $bookedRoom->expected_checkout_at &&
                    now()->greaterThan($bookedRoom->expected_checkout_at) &&
                    !$bookedRoom->overdue_started_at
                ) {

                    $bookedRoom->update([
                        'overdue_started_at' => now()
                    ]);

                    $this->log(
                        $booking->id,
                        'checked_in',
                        'checked_in',
                        'Room ' . $this->roomLabel($bookedRoom) . ' became overdue'
                    );
                }
            }

            $this->attachRoomImages($booking);
        });

        return response()->json($bookings);
    }

    public function history(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;
        $status = $request->status;
        $paymentStatus = $request->payment_status;

        $query = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',
            'bookedRooms.bookingAddOns.addOn',
            'payments.receiver',
            'payments.shift',
            'bookedRooms.room' => function ($q) {
                $q->withTrashed()->with([
                    'roomType',
                    'images'
                ]);
            }
        ])
            ->whereNull('deleted_at')
            ->whereHas('bookedRooms', function ($q) use ($status) {
                $q->whereNull('archived_at')
                    ->whereIn('status', [
                        'checked_out',
                        'refunded'
                    ]);

                if (!empty($status) && $status !== 'all') {
                    $q->where('status', $status);
                }
            });

        if (!in_array(Auth::user()->role, ['admin', 'staff'])) {
            $query->where('user_id', Auth::id());
        }

        if (!empty($paymentStatus) && $paymentStatus !== 'all') {
            $query->whereHas('payments', function ($q) use ($paymentStatus) {
                $q->where('payment_status', $paymentStatus);
            });
        }

        $this->applySearch($query, $search);

        $bookings = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($booking) use ($status) {

            $rooms = $booking->bookedRooms
                ->whereNull('archived_at')
                ->whereIn('status', [
                    'checked_out',
                    'refunded'
                ]);

            if (!empty($status) && $status !== 'all') {
                $rooms = $rooms->where('status', $status);
            }

            $booking->setRelation('bookedRooms', $rooms->values());

            return $booking;
        });

        $bookings->getCollection()->each(function ($booking) {
            $this->attachRoomImages($booking);
        });

        return response()->json($bookings);
    }

    public function trash(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;
        $status = $request->status;

        $query = Booking::whereNull('deleted_at')
            ->whereHas('bookedRooms', function ($q) use ($status) {
                $q->whereNotNull('archived_at');

                if (!empty($status) && $status !== 'all' && $status !== 'archived') {
                    $q->where('status', $status);
                }
            })
            ->with([
                'user',
                'walkInGuest',
                'createdBy',
                'histories.user',
                'bookedRooms.bookingAddOns.addOn',
                'payments.receiver',
                'payments.shift',
                'bookedRooms.room' => function ($q) {
                    $q->withTrashed()->with('roomType');
                }
            ]);

        $this->applySearch($query, $search);

        $bookings = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($booking) use ($status) {

            $rooms = $booking->bookedRooms->whereNotNull('archived_at');

            if (!empty($status) && $status !== 'all' && $status !== 'archived') {
                $rooms = $rooms->where('status', $status);
            }

            $booking->setRelation('bookedRooms', $rooms->values());

            return $booking;
        });

        return response()->json($bookings);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rooms' => 'required|array|min:1',

            'rooms.*.room_id' => 'required|exists:rooms,id',

            'rooms.*.stay_type' => 'required|in:overnight,short_stay',

            'rooms.*.check_in_date' => 'required|date|after_or_equal:today',

            'rooms.*.check_out_date' => [
                'required',
                'date',
                function ($attribute, $value, $fail) use ($request) {

                    preg_match('/rooms\.(\d+)\./', $attribute, $matches);
                    $index = $matches[1] ?? null;

                    if ($index === null) {
                        return;
                    }

                    $room = $request->rooms[$index];

                    if (($room['stay_type'] ?? null) === 'overnight') {

                        if (strtotime($value) <= strtotime($room['check_in_date'])) {
                            $fail('Check-out date must be after check-in date.');
                        }
                    } else {

                        if ($value !== $room['check_in_date']) {
                            $fail('Short stay must use the same date.');
                        }
                    }
                },
            ],

            'payment_method' => 'required|in:gcash,bank',

            'gcash_reference' => 'nullable|string',

            'bank_reference' => 'nullable|string',
        ]);

        $roomIds = collect($validated['rooms'])
            ->pluck('room_id')
            ->unique()
            ->values();

        $rooms = Room::whereIn('id', $roomIds)
            ->with('roomType')
            ->get();

        if ($rooms->count() !== $roomIds->count()) {
            return response()->json([
                'message' => 'Some selected rooms do not exist.'
            ], 400);
        }

        $maintenance = $rooms->firstWhere('status', 'maintenance');

        if ($maintenance) {
            return response()->json([
                'message' => "Room {$maintenance->room_number} is under maintenance."
            ], 400);
        }

        $ranges = [];

        foreach ($validated['rooms'] as $roomData) {

            [$in, $out] = $this->resolveRange(
                $roomData['check_in_date'],
                $roomData['check_out_date'],
                $roomData['stay_type']
            );

            $roomId = $roomData['room_id'];

            foreach ($ranges[$roomId] ?? [] as $existing) {

                if ($in->lt($existing[1]) && $out->gt($existing[0])) {

                    $room = $rooms->firstWhere('id', $roomId);

                    return response()->json([
                        'message' => 'Room ' . ($room->room_number ?? $roomId) .
                            ' is selected twice with overlapping dates.'
                    ], 422);
                }
            }

            $ranges[$roomId][] = [$in, $out];
        }

        try {

            $booking = DB::transaction(function () use ($validated, $rooms) {

                foreach ($validated['rooms'] as $roomData) {

                    [$in, $out] = $this->resolveRange(
                        $roomData['check_in_date'],
                        $roomData['check_out_date'],
                        $roomData['stay_type']
                    );

                    $conflict = $this->conflictQuery(
                        $roomData['room_id'],
                        $in,
                        $out
                    )
                        ->lockForUpdate()
                        ->exists();

                    if ($conflict) {

                        $room = $rooms->firstWhere('id', $roomData['room_id']);

                        abort(response()->json([
                            'message' => 'Room ' . ($room->room_number ?? $roomData['room_id']) .
                                ' is already booked for the selected dates.'
                        ], 409));
                    }
                }

                $reference = 'BOOK-' . strtoupper(Str::random(8));

                $booking = Booking::create([
                    'user_id' => Auth::id(),
                    'created_by' => Auth::id(),

                    'booking_type' => 'online',
                    'booking_reference' => $reference,
                    'total_price' => 0,
                ]);

                $total = 0;

                foreach ($validated['rooms'] as $roomData) {

                    $room = $rooms->firstWhere('id', $roomData['room_id']);

                    $stayType = $roomData['stay_type'];

                    $checkInDate = Carbon::parse($roomData['check_in_date'])->startOfDay();
                    $checkOutDate = Carbon::parse($roomData['check_out_date'])->startOfDay();

                    if ($stayType === 'short_stay') {

                        $price = $room->roomType->short_stay_price
                            ?? $room->roomType->base_price
                            ?? 500;

                        $subtotal = $price;
                    } else {

                        $nights = max(
                            1,
                            (int) $checkInDate->diffInDays($checkOutDate, false)
                        );

                        $price = $room->roomType->base_price ?? 1000;

                        $subtotal = $price * $nights;
                    }

                    BookedRoom::create([
                        'booking_id' => $booking->id,
                        'room_id' => $room->id,

                        'stay_type' => $stayType,

                        'check_in_date' => $checkInDate->toDateString(),

                        'check_out_date' => $checkOutDate->toDateString(),

                        'price_at_time_of_booking' => $price,

                        'subtotal' => $subtotal,

                        'status' => 'pending',
                    ]);

                    $total += $subtotal;
                }

                $booking->update([
                    'total_price' => $total,
                ]);

                $this->log(
                    $booking->id,
                    'none',
                    'pending',
                    'Booking created'
                );

                return $booking;
            });
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {

            return $e->getResponse();
        }

        Cache::flush();

        $users = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($users as $user) {

            $notification = Notification::create([
                'user_id' => $user->id,
                'title' => 'New Booking Request',
                'message' => 'A new booking (' . $booking->booking_reference .
                    ') has been submitted and is waiting for confirmation.',
                'is_read' => false,
            ]);

            broadcast(new NotificationCreated($notification));
        }

        $guestNotification = Notification::create([
            'user_id' => Auth::id(),
            'title' => 'Booking Submitted',
            'message' => 'Your booking ' . $booking->booking_reference .
                ' has been submitted and is waiting for staff confirmation.',
            'is_read' => false,
        ]);

        broadcast(new NotificationCreated($guestNotification));

        if (Auth::user()?->role === 'staff') {
            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Create Booking',
                'details' => 'Created booking ' . $booking->booking_reference,
                'ip_address' => request()->ip(),
                'timestamp' => now(),
            ]);
        }

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booking created successfully',
            'data' => $booking->load([
                'user',
                'walkInGuest',
                'bookedRooms.room'
            ])
        ], 201);
    }

    public function show($id)
    {
        $booking = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',
            'payments.receiver',
            'payments.shift',
            'bookedRooms.bookingAddOns.addOn',
            'bookedRooms.room' => function ($q) {
                $q->withTrashed()->with([
                    'roomType',
                    'images'
                ]);
            }
        ])->findOrFail($id);

        $this->attachRoomImages($booking);

        return response()->json($booking);
    }

    public function findByReference($reference)
    {
        $booking = Booking::with(['user', 'walkInGuest'])
            ->where('booking_reference', $reference)
            ->first();

        if (!$booking) {
            return response()->json([
                'message' => 'Booking not found'
            ], 404);
        }

        $guestName = null;

        if ($booking->user) {
            $guestName = trim($booking->user->first_name . ' ' . $booking->user->last_name);
        } elseif ($booking->walkInGuest) {
            $guestName = trim($booking->walkInGuest->first_name . ' ' . $booking->walkInGuest->last_name);
        }

        return response()->json([
            'booking_reference' => $booking->booking_reference,
            'guest_name' => $guestName ?: null,
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
            'override_reason' => 'nullable|string',
        ]);

        $booking = Booking::with([
            'bookedRooms.room',
            'payments'
        ])->findOrFail($id);

        $newStatus = $request->status;
        $reason = $request->override_reason ?? null;

        $targetRooms = $booking->bookedRooms
            ->whereNull('archived_at')
            ->whereNotIn('status', self::TERMINAL_STATUSES)
            ->values();

        if ($targetRooms->isEmpty()) {
            return response()->json([
                'message' => 'No active rooms to update for this booking.'
            ], 400);
        }

        $oldStatus = $targetRooms->first()->status ?? 'pending';

        $type = $booking->walk_in_guest_id ? 'Walk-in' : 'Guest';

        if ($newStatus === 'confirmed') {

            if (!Auth::check() || !in_array(Auth::user()->role, ['admin', 'staff'])) {
                return response()->json([
                    'message' => 'Only staff or admin can confirm a booking.'
                ], 403);
            }

            foreach ($targetRooms as $bookedRoom) {
                $bookedRoom->update([
                    'status' => 'confirmed'
                ]);
            }

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
                    'is_read' => false
                ]);

                broadcast(new NotificationCreated($notification));
            }
        } elseif ($newStatus === 'checked_in') {

            $occupiedRooms = [];

            foreach ($targetRooms as $bookedRoom) {
                $alreadyOccupied = BookedRoom::where('room_id', $bookedRoom->room_id)
                    ->where('id', '!=', $bookedRoom->id)
                    ->whereNull('archived_at')
                    ->whereNull('deleted_at')
                    ->where('status', 'checked_in')
                    ->exists();

                if ($alreadyOccupied) {
                    $occupiedRooms[] = $this->roomLabel($bookedRoom);
                }
            }

            if (!empty($occupiedRooms)) {
                return response()->json([
                    'message' => 'Room(s) ' . implode(', ', $occupiedRooms) .
                        ' already have a guest checked in. Please check out first.'
                ], 409);
            }

            $receivedBy = Auth::id();

            $shift = \App\Models\Shift::where('opened_by', $receivedBy)
                ->whereNull('closed_at')
                ->latest('opened_at')
                ->first();

            if (!$shift) {
                return response()->json([
                    'message' => 'Please open a shift first before checking in.'
                ], 400);
            }

            $booking->payments()
                ->where('payment_status', 'paid')
                ->whereNull('received_by')
                ->update([
                    'received_by' => $receivedBy,
                    'shift_id' => $shift->id,
                ]);

            foreach ($targetRooms as $bookedRoom) {
                $bookedRoom->update([
                    'status' => 'checked_in',
                    'check_in_time' => $bookedRoom->check_in_time ?? now(),
                    'overdue_started_at' => null,
                    'checkout_status' => 'ontime',
                ]);
            }

            $booking->update([
                'total_price' => $booking->bookedRooms()
                    ->whereNull('archived_at')
                    ->whereNotIn('status', ['cancelled', 'refunded'])
                    ->sum('subtotal')
            ]);

            NotificationService::notifyAdmins(
                $type . ' Check-in',
                $type . ' booking ' . $booking->booking_reference . ' checked in'
            );

            if ($booking->user_id) {
                $notification = Notification::create([
                    'user_id' => $booking->user_id,
                    'title' => 'Checked In',
                    'message' => 'Your booking ' . $booking->booking_reference . ' checked in.',
                    'is_read' => false
                ]);

                broadcast(new NotificationCreated($notification));
            }

            Room::whereIn('id', $targetRooms->pluck('room_id'))
                ->update([
                    'status' => Room::STATUS_OCCUPIED
                ]);
        } elseif ($newStatus === 'checked_out') {

            foreach ($targetRooms as $bookedRoom) {

                $wasCheckedIn = $bookedRoom->status === 'checked_in';

                $bookedRoom->update([
                    'status' => 'checked_out',
                    'check_out_time' => now(),
                    'overdue_started_at' => null,
                ]);

                $room = $bookedRoom->room;

                if (!$room) {
                    continue;
                }

                if ($wasCheckedIn && $room->status === Room::STATUS_OCCUPIED) {
                    $room->status = Room::STATUS_DIRTY;
                    $room->save();
                }
            }

            NotificationService::notifyAdmins(
                $type . ' Check-out',
                $type . ' booking ' . $booking->booking_reference . ' checked out'
            );

            if ($booking->user_id) {
                $notification = Notification::create([
                    'user_id' => $booking->user_id,
                    'title' => 'Checked Out',
                    'message' => 'Your booking ' . $booking->booking_reference . ' has been checked out.',
                    'is_read' => false
                ]);

                broadcast(new NotificationCreated($notification));
            }
        } elseif ($newStatus === 'cancelled') {

            foreach ($targetRooms as $bookedRoom) {

                $wasCheckedIn = $bookedRoom->status === 'checked_in';

                $bookedRoom->update([
                    'status' => 'cancelled',
                    'expected_checkout_at' => null,
                    'overdue_started_at' => null,
                    'checkout_status' => null,
                ]);

                $room = $bookedRoom->room;

                if (!$room) {
                    continue;
                }

                if ($wasCheckedIn && $room->status === Room::STATUS_OCCUPIED) {
                    $room->status = Room::STATUS_AVAILABLE;
                    $room->save();
                }
            }

            NotificationService::notifyAdmins(
                $type . ' Booking Cancelled',
                $type . ' booking ' . $booking->booking_reference . ' has been cancelled'
            );

            if ($booking->user_id) {
                $notification = Notification::create([
                    'user_id' => $booking->user_id,
                    'title' => 'Booking Cancelled',
                    'message' => 'Your booking ' . $booking->booking_reference . ' has been cancelled.',
                    'is_read' => false
                ]);

                broadcast(new NotificationCreated($notification));
            }
        } elseif ($newStatus === 'refunded') {

            foreach ($targetRooms as $bookedRoom) {

                $wasCheckedIn = $bookedRoom->status === 'checked_in';

                $bookedRoom->update([
                    'status' => 'refunded',
                    'expected_checkout_at' => null,
                    'overdue_started_at' => null,
                ]);

                $room = $bookedRoom->room;

                if ($room && $wasCheckedIn && $room->status === Room::STATUS_OCCUPIED) {
                    $room->status = Room::STATUS_DIRTY;
                    $room->save();
                }
            }
        } else {

            foreach ($targetRooms as $bookedRoom) {
                $bookedRoom->update([
                    'status' => 'pending'
                ]);
            }
        }

        Cache::flush();

        $this->log(
            $booking->id,
            $oldStatus,
            $newStatus,
            'Status updated',
            $reason
        );

        if (Auth::user()?->role === 'staff') {
            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Update Booking Status',
                'details' =>
                'Booking ' . $booking->booking_reference .
                    ' updated to ' . $newStatus,
                'ip_address' => request()->ip(),
                'total_amount' => $booking->total_price,
                'timestamp' => now(),
            ]);
        }

        event(new DashboardUpdated());

        $updatedBooking = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'histories.user',
            'bookedRooms.bookingAddOns.addOn',
            'payments.receiver',
            'payments.shift',
            'bookedRooms.room' => function ($q) {
                $q->withTrashed()->with([
                    'roomType',
                    'images'
                ]);
            }
        ])->find($booking->id);

        $this->attachRoomImages($updatedBooking);

        return response()->json([
            'message' => 'Status updated',
            'data' => $updatedBooking
        ]);
    }

    public function extend(Request $request, $bookingId, $bookedRoomId)
    {
        $request->validate([
            'hours' => 'nullable|integer|min:1|max:24',
            'amount' => 'nullable|numeric|min:0',
        ]);

        $booking = Booking::with('bookedRooms.room.roomType')->findOrFail($bookingId);

        $bookedRoom = $booking->bookedRooms()
            ->with('room.roomType')
            ->where('id', $bookedRoomId)
            ->firstOrFail();

        if ($bookedRoom->status !== 'checked_in') {
            return response()->json([
                'message' => 'Only checked-in rooms can be extended.'
            ], 422);
        }

        $hours = (int) ($request->hours ?? 1);

        $extendAmount = $request->amount !== null
            ? (float) $request->amount
            : (float) ($bookedRoom->room?->roomType?->extension_fee ?? 100);

        $base = $bookedRoom->expected_checkout_at
            ? Carbon::parse($bookedRoom->expected_checkout_at)
            : now();

        if ($base->lessThan(now())) {
            $base = now();
        }

        $newExpectedCheckout = $base->copy()->addHours($hours);

        $nextBooking = BookedRoom::where('room_id', $bookedRoom->room_id)
            ->where('id', '!=', $bookedRoom->id)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereIn('status', self::BLOCKING_STATUSES)
            ->whereDate('check_in_date', '>=', $newExpectedCheckout->toDateString())
            ->orderBy('check_in_date')
            ->first();

        if ($nextBooking) {

            $nextStart = Carbon::parse($nextBooking->check_in_date)->startOfDay();

            if ($newExpectedCheckout->toDateString() > $nextStart->toDateString()) {
                return response()->json([
                    'message' => 'Cannot extend. Another booking starts on ' .
                        $nextStart->toDateString() . '.'
                ], 409);
            }
        }

        $bookedRoom->subtotal += $extendAmount;
        $bookedRoom->is_extended = true;
        $bookedRoom->expected_checkout_at = $newExpectedCheckout;

        if ($newExpectedCheckout->greaterThan(now())) {
            $bookedRoom->overdue_started_at = null;
            $bookedRoom->checkout_status = 'ontime';
        }

        $bookedRoom->save();

        $booking->total_price = $booking->bookedRooms()
            ->whereNull('archived_at')
            ->whereNotIn('status', [
                'cancelled',
                'refunded'
            ])
            ->sum('subtotal');

        $booking->save();

        Cache::flush();

        $this->log(
            $booking->id,
            $bookedRoom->status,
            $bookedRoom->status,
            'Room ' . $this->roomLabel($bookedRoom) .
                ' extended by ' . $hours . 'h (+₱' . number_format($extendAmount, 2) . ')'
        );

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Room extended successfully.',
            'total_price' => $booking->total_price,
            'booked_room' => $bookedRoom->fresh('room'),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden'
            ], 403);
        }

        $booking = Booking::with([
            'bookedRooms.room',
            'payments'
        ])->findOrFail($id);

        $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
            'override_reason' => 'nullable|string',
        ]);

        $bookedRoom = $booking->bookedRooms()
            ->with('room')
            ->findOrFail($request->booked_room_id);

        if (!is_null($bookedRoom->archived_at)) {
            return response()->json([
                'message' => 'Booked room is already in trash.'
            ], 400);
        }

        $reason = $request->override_reason ?? null;

        $this->log(
            $booking->id,
            $bookedRoom->status,
            'archived',
            'Booked Room ' . $this->roomLabel($bookedRoom) . ' moved to trash',
            $reason
        );

        if (
            $bookedRoom->room &&
            $bookedRoom->status === 'checked_in' &&
            $bookedRoom->room->status === Room::STATUS_OCCUPIED
        ) {
            $bookedRoom->room->update([
                'status' => Room::STATUS_AVAILABLE
            ]);
        }

        $bookedRoom->update([
            'archived_at' => now(),
        ]);

        Cache::flush();

        StaffActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'Delete Booked Room',
            'details' =>
            'Deleted Room ' . $this->roomLabel($bookedRoom) .
                ' from booking ' . $booking->booking_reference,
            'ip_address' => request()->ip(),
            'timestamp' => now(),
        ]);

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booked room moved to trash.'
        ]);
    }

    public function restore(Request $request, $id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden'
            ], 403);
        }

        $booking = Booking::with('bookedRooms.room')->findOrFail($id);

        $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
        ]);

        $bookedRoom = $booking->bookedRooms()
            ->with('room')
            ->findOrFail($request->booked_room_id);

        if (is_null($bookedRoom->archived_at)) {
            return response()->json([
                'message' => 'Booked room is not in trash.'
            ], 400);
        }

        if ($bookedRoom->room) {

            [$in, $out] = $this->resolveRange(
                $bookedRoom->check_in_date,
                $bookedRoom->check_out_date,
                $bookedRoom->stay_type
            );

            $hasConflict = $this->conflictQuery(
                $bookedRoom->room_id,
                $in,
                $out,
                $bookedRoom->id
            )->exists();

            if ($hasConflict) {
                return response()->json([
                    'message' => 'Room is already booked for these dates by another booking.'
                ], 409);
            }
        }

        $bookedRoom->update([
            'archived_at' => null,
        ]);

        Cache::flush();

        $this->log(
            $booking->id,
            'archived',
            'restored',
            'Booked Room ' . $this->roomLabel($bookedRoom) . ' restored from trash'
        );

        StaffActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'Restore Booked Room',
            'details' => 'Restored Room ' . $this->roomLabel($bookedRoom) .
                ' from booking ' . $booking->booking_reference,
            'ip_address' => request()->ip(),
            'timestamp' => now(),
        ]);

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booked room restored successfully.'
        ], 200);
    }

    public function forceDelete(Request $request, $id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden'
            ], 403);
        }

        $booking = Booking::with([
            'bookedRooms.room'
        ])->withTrashed()->findOrFail($id);

        $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
        ]);

        $bookedRoom = $booking->bookedRooms()
            ->withTrashed()
            ->with(['room' => fn($q) => $q->withTrashed()])
            ->findOrFail($request->booked_room_id);

        if (is_null($bookedRoom->archived_at)) {
            return response()->json([
                'message' => 'Move booked room to trash first.'
            ], 400);
        }

        $label = $this->roomLabel($bookedRoom);

        if (!$bookedRoom->trashed()) {
            $bookedRoom->delete();
        }

        Cache::flush();

        StaffActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'Delete Booked Room',
            'details' =>
            'Marked Room ' . $label .
                ' from Booking ' . $booking->booking_reference .
                ' as permanently deleted',
            'ip_address' => request()->ip(),
            'timestamp' => now(),
        ]);

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booked room permanently deleted.'
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

    private function roomLabel($bookedRoom): string
    {
        return $bookedRoom->room?->room_number
            ?? ('#' . $bookedRoom->room_id);
    }

    private function attachRoomImages($booking): void
    {
        if (!$booking) {
            return;
        }

        foreach ($booking->bookedRooms as $bookedRoom) {

            $room = $bookedRoom->room;

            if (!$room || !$room->relationLoaded('images')) {
                continue;
            }

            $validImages = $room->images->filter(function ($img) {
                return $img->image_path
                    && Storage::disk('public')->exists($img->image_path);
            })->values();

            $normalImage = $validImages
                ->where('image_type', 'normal')
                ->sortByDesc('id')
                ->first();

            $panoramaImage = $validImages
                ->where('image_type', '360')
                ->sortByDesc('id')
                ->first();

            $room->image_url = $normalImage
                ? asset('storage/' . $normalImage->image_path)
                : null;

            $room->panorama_url = $panoramaImage
                ? asset('storage/' . $panoramaImage->image_path)
                : null;

            $room->setRelation('images', $validImages);
        }
    }

    private function applySearch($query, ?string $search): void
    {
        if (empty($search)) {
            return;
        }

        $nameMatch = function ($q) use ($search) {

            $q->where('first_name', 'LIKE', "%{$search}%")
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
        };

        $query->where(function ($q) use ($search, $nameMatch) {

            $q->where('booking_reference', 'LIKE', "%{$search}%")

                ->orWhereHas('user', $nameMatch)

                ->orWhereHas('walkInGuest', $nameMatch)

                ->orWhereHas('bookedRooms.room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                });

            if (is_numeric($search)) {
                $q->orWhere('id', (int) $search);
            }
        });
    }

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
