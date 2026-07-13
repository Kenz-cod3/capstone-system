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

class BookingController extends Controller
{
    // ===============================
    // ALL BOOKINGS (ADMIN)
    // ===============================
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

            foreach ($booking->bookedRooms as $bookedRoom) {

                $room = $bookedRoom->room;

                if (!$room) {
                    continue;
                }

                // remove broken images
                $validImages = $room->images->filter(function ($img) {
                    return Storage::disk('public')->exists($img->image_path);
                })->values();

                // best image
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

                $room->images = $validImages;
            }
        });

        return response()->json($bookings, 200);
    }

    // ACTIVE BOOKINGS
    public function active(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;

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
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereHas('bookedRooms', function ($q) {
                $q->whereNotIn('status', [
                    'checked_out',
                    'refunded'
                ]);
            });

        if (!in_array(Auth::user()->role, ['admin', 'staff'])) {
            $query->where('user_id', Auth::id());
        }

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                $q->where('booking_reference', 'LIKE', "%{$search}%")
                    ->orWhere('id', $search)

                    ->orWhereHas('user', function ($user) use ($search) {

                        $user->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('middle_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")

                            // First Middle Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // First Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last, First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            );
                    })

                    ->orWhereHas('walkInGuest', function ($guest) use ($search) {

                        $guest->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('middle_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")

                            // First Middle Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // First Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last, First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            );
                    })

                    ->orWhereHas('bookedRooms.room', function ($room) use ($search) {

                        $room->where('room_number', 'LIKE', "%{$search}%");
                    });
            });
        }

        $bookings = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($booking) {

            $booking->setRelation(
                'bookedRooms',

                $booking->bookedRooms->whereNotIn('status', [
                    'checked_out',
                    'refunded'
                ])->values()
            );

            return $booking;
        });

        $bookings->getCollection()->each(function ($booking) {

            foreach ($booking->bookedRooms as $bookedRoom) {

                if (
                    $bookedRoom->status === 'checked_in' &&
                    now()->greaterThan($bookedRoom->check_out_date) &&
                    !$bookedRoom->overdue_started_at
                ) {

                    $bookedRoom->update([
                        'overdue_started_at' => now()
                    ]);

                    $this->log(
                        $booking->id,
                        'checked_in',
                        'checked_in',
                        'Room ' . $bookedRoom->room->room_number . ' became overdue'
                    );
                }
            }
        });

        return response()->json($bookings);
    }

    // HISTORY 
    public function history(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;

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
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->whereHas('bookedRooms', function ($q) {
                $q->whereIn('status', [
                    'checked_out',
                    'refunded'
                ]);
            });

        if (!in_array(Auth::user()->role, ['admin', 'staff'])) {
            $query->where('user_id', Auth::id());
        }

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                $q->where('booking_reference', 'LIKE', "%{$search}%")
                    ->orWhere('id', $search)

                    ->orWhereHas('user', function ($user) use ($search) {

                        $user->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('middle_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")

                            // First Middle Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // First Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last, First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            );
                    })

                    ->orWhereHas('walkInGuest', function ($guest) use ($search) {

                        $guest->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('middle_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")

                            // First Middle Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // First Last
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ' ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            )

                            // Last, First Middle
                            ->orWhereRaw(
                                "CONCAT(last_name, ', ', first_name, ' ', middle_name) LIKE ?",
                                ["%{$search}%"]
                            );
                    })

                    ->orWhereHas('bookedRooms.room', function ($room) use ($search) {
                        $room->where('room_number', 'LIKE', "%{$search}%");
                    });
            });
        }

        $bookings = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($booking) {

            $booking->setRelation(
                'bookedRooms',

                $booking->bookedRooms->whereIn('status', [
                    'checked_out',
                    'refunded'
                ])->values()
            );

            return $booking;
        });

        // FIX IMAGE + ROOM DATA
        $bookings->getCollection()->each(function ($booking) {

            foreach ($booking->bookedRooms as $bookedRoom) {

                $room = $bookedRoom->room;

                if (!$room) {
                    continue;
                }

                $validImages = $room->images->filter(function ($img) {
                    return Storage::disk('public')->exists($img->image_path);
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

                $room->images = $validImages;
            }
        });

        return response()->json($bookings);
    }

    // TRASH
    public function trash(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;

        $query = Booking::whereNotNull('archived_at')
            ->whereNull('deleted_at')
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

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                $q->where('booking_reference', 'LIKE', "%{$search}%")
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
                    })

                    ->orWhereHas('bookedRooms.room', function ($room) use ($search) {
                        $room->where('room_number', 'LIKE', "%{$search}%");
                    });
            });
        }

        $bookings = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage);


        return response()->json($bookings);
    }

    // CREATE BOOKING (ONLINE)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'rooms' => 'required|array|min:1',

            'rooms.*.room_id' => 'required|exists:rooms,id',

            'rooms.*.stay_type' => 'required|in:overnight,short_stay',

            'rooms.*.check_in_date' => 'required|date',

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

                    if ($room['stay_type'] === 'overnight') {

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
            ->pluck('room_id');

        $rooms = Room::whereIn('id', $roomIds)
            ->where('status', 'available')
            ->with('roomType')
            ->get();

        if ($rooms->count() != count($roomIds)) {
            return response()->json([
                'message' => 'Some rooms are not available'
            ], 400);
        }

        Cache::flush();

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

            $checkInDate = Carbon::parse($roomData['check_in_date']);
            $checkOutDate = Carbon::parse($roomData['check_out_date']);

            if ($stayType === 'short_stay') {

                $price = $room->roomType->short_stay_price
                    ?? $room->roomType->base_price
                    ?? 500;

                $subtotal = $price;
            } else {

                $nights = max(1, $checkInDate->diffInDays($checkOutDate));

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

        // Update room status
        Room::whereIn('id', $roomIds)
            ->update([
                'status' => Room::STATUS_RESERVED
            ]);

        // Notifications
        NotificationService::notifyAdmins(
            'Guest Check-in',
            'Guest booking ' . $reference . ' checked in'
        );

        $notification = Notification::create([
            'user_id' => Auth::id(),
            'title' => 'Booking Created',
            'message' => 'Your booking ' . $reference . ' has been successfully created.',
            'is_read' => false
        ]);

        broadcast(new NotificationCreated($notification));

        if (Auth::user()?->role === 'staff') {
            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Create Booking',
                'details' => 'Created booking ' . $reference,
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

    // GET SINGLE BOOKING
    public function show($id)
    {
        $booking = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
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

        return response()->json($booking);
    }

    // ===============================
    // UPDATE STATUS
    // ===============================
    public function update(Request $request, $id)
    {

        $request->validate([
            'status' => 'required|in:pending,confirmed,checked_in,checked_out,cancelled',
            'override_reason' => 'nullable|string',
        ]);


        $booking = Booking::with([
            'bookedRooms.room',
            'payments'
        ])->findOrFail($id);

        $newStatus = $request->status;
        $reason = $request->override_reason ?? null;

        $oldStatus = $booking->bookedRooms->first()?->status ?? 'pending';

        $type = $booking->walk_in_guest_id ? 'Walk-in' : 'Guest';

        if ($newStatus === 'confirmed') {

            $shift = \App\Models\Shift::where('opened_by', Auth::id())
                ->whereNull('closed_at')
                ->latest()
                ->first();

            if (!$shift) {

                return response()->json([
                    'message' => 'Please open a shift first before confirming bookings.'
                ], 400);
            }

            foreach ($booking->bookedRooms as $bookedRoom) {

                $bookedRoom->update([
                    'status' => 'confirmed'
                ]);
            }

            $payment = $booking->payments()->first();

            if ($payment) {

                $payment->update([
                    'shift_id' => $shift?->id,
                    'received_by' => Auth::id(),
                ]);
            }
        } elseif ($newStatus === 'checked_in') {

            // RECALCULATE TOTAL
            $total = $booking->bookedRooms->sum('subtotal');
            foreach ($booking->bookedRooms as $bookedRoom) {

                $bookedRoom->update([
                    'status' => 'checked_in',
                    'check_in_time' => $bookedRoom->check_in_time ?? now(),
                ]);
            }

            $booking->update([
                'total_price' => $total
            ]);

            NotificationService::notifyAdmins(
                $type . ' Check-in',
                $type . ' booking ' . $booking->booking_reference . ' checked in'
            );

            $notification = Notification::create([
                'user_id' => $booking->user_id,
                'title' => 'Checked In',
                'message' => 'Your booking checked in.',
                'is_read' => false
            ]);

            broadcast(new NotificationCreated($notification));

            $roomIds = $booking->bookedRooms
                ->pluck('room_id');

            Room::whereIn('id', $roomIds)
                ->update([
                    'status' => Room::STATUS_OCCUPIED
                ]);
        } elseif ($newStatus === 'checked_out') {
            foreach ($booking->bookedRooms as $bookedRoom) {

                $bookedRoom->update([
                    'status' => 'checked_out',
                    'check_out_time' => now(),
                ]);
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


            foreach ($booking->bookedRooms as $bookedRoom) {

                $room = $bookedRoom->room;

                if (!$room) {
                    continue;
                }

                // Update room status to DIRTY (needs cleaning)
                $room->status = Room::STATUS_DIRTY;
                $room->save();
            }
        } elseif ($newStatus === 'cancelled') {
            // When cancelled, make rooms available again

            foreach ($booking->bookedRooms as $bookedRoom) {

                $bookedRoom->update([
                    'status' => 'cancelled'
                ]);

                $room = $bookedRoom->room;

                if (!$room) {
                    continue;
                }
                $room->status = Room::STATUS_AVAILABLE;
                $room->save();
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

        return response()->json([
            'message' => 'Status updated',
            'data' => Booking::with([
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
            ])->find($booking->id)
        ]);
    }

    public function extend($bookingId, $bookedRoomId)
    {
        $booking = Booking::with('bookedRooms.room')->findOrFail($bookingId);

        $bookedRoom = $booking->bookedRooms()
            ->where('id', $bookedRoomId)
            ->firstOrFail();

        $extendAmount = 100;

        if ($bookedRoom->status !== 'checked_in') {
            return response()->json([
                'message' => 'Only checked-in rooms can be extended.'
            ], 422);
        }

        // Extend ONLY the selected room
        $bookedRoom->subtotal += $extendAmount;
        $bookedRoom->is_extended = true;
        $bookedRoom->save();

        // Update booking total
        $booking->total_price = $booking->bookedRooms()
            ->whereNotIn('status', [
                'cancelled',
                'refunded'
            ])
            ->sum('subtotal');

        $booking->save();

        // History
        $this->log(
            $booking->id,
            $bookedRoom->status,
            $bookedRoom->status,
            'Room ' . $bookedRoom->room->room_number .
                ' extended (+₱' . number_format($extendAmount, 2) . ')'
        );

        return response()->json([
            'message' => 'Room extended successfully.',
            'total_price' => $booking->total_price,
            'booked_room' => $bookedRoom->fresh('room'),
        ]);
    }
    // MOVE TO TRASH (PER BOOKED ROOM)
    public function destroy(Request $request, $id)
    {
        $booking = Booking::with([
            'bookedRooms.room',
            'payments'
        ])->findOrFail($id);

        if (Auth::user()->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden'
            ], 403);
        }

        // Required booked room id
        $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
            'override_reason' => 'nullable|string',
        ]);

        $bookedRoom = $booking->bookedRooms()
            ->with('room')
            ->findOrFail($request->booked_room_id);

        $reason = $request->override_reason ?? null;

        // History
        $this->log(
            $booking->id,
            $bookedRoom->status,
            'archived',
            'Booked Room ' . $bookedRoom->room->room_number . ' moved to trash',
            $reason
        );

        // Make only this room available
        if ($bookedRoom->room) {
            $bookedRoom->room->update([
                'status' => Room::STATUS_AVAILABLE
            ]);
        }

        // Archive ONLY this booked room
        $bookedRoom->update([
            'archived_at' => now(),
        ]);

        Cache::flush();

        if (Auth::user()?->role === 'staff') {

            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Delete Booked Room',
                'details' =>
                'Deleted Room ' .
                    $bookedRoom->room->room_number .
                    ' from booking ' .
                    $booking->booking_reference,
                'ip_address' => request()->ip(),
                'timestamp' => now(),
            ]);
        }

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booked room moved to trash.'
        ]);
    }

    // ===============================
    // RESTORE BOOKED ROOM FROM TRASH
    // ===============================
    public function restore(Request $request, $id)
    {
        $booking = Booking::with('bookedRooms.room')->findOrFail($id);

        if (Auth::user()->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden'
            ], 403);
        }

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

            if ($bookedRoom->room->status !== Room::STATUS_AVAILABLE) {
                return response()->json([
                    'message' => 'Room is no longer available.'
                ], 400);
            }

            $bookedRoom->room->update([
                'status' => Room::STATUS_RESERVED,
            ]);
        }

        $bookedRoom->update([
            'archived_at' => null,
        ]);

        Cache::flush();

        $this->log(
            $booking->id,
            'archived',
            'restored',
            'Booked Room ' . $bookedRoom->room->room_number . ' restored from trash'
        );

        if (Auth::user()->role === 'staff') {
            StaffActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'Restore Booked Room',
                'details' => 'Restored Room ' .
                    $bookedRoom->room->room_number .
                    ' from booking ' .
                    $booking->booking_reference,
                'ip_address' => request()->ip(),
                'timestamp' => now(),
            ]);
        }

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booked room restored successfully.'
        ], 200);
    }
    // ===============================
    // DELETE BOOKED ROOM PERMANENTLY (Soft Delete)
    // ===============================
    public function forceDelete(Request $request, $id)
    {
        $booking = Booking::with([
            'bookedRooms.room'
        ])->withTrashed()->findOrFail($id);

        // Admin only
        if (Auth::user()->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden'
            ], 403);
        }

        $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
        ]);

        $bookedRoom = $booking->bookedRooms()
            ->withTrashed()
            ->findOrFail($request->booked_room_id);

        if (is_null($bookedRoom->archived_at)) {
            return response()->json([
                'message' => 'Move booked room to trash first.'
            ], 400);
        }

        if (!$bookedRoom->trashed()) {
            $bookedRoom->delete();
        }

        Cache::flush();

        StaffActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'Delete Booked Room',
            'details' =>
            'Marked Room ' .
                $bookedRoom->room->room_number .
                ' from Booking ' .
                $booking->booking_reference .
                ' as permanently deleted',
            'ip_address' => request()->ip(),
            'timestamp' => now(),
        ]);

        event(new DashboardUpdated());

        return response()->json([
            'message' => 'Booked room permanently deleted.'
        ]);
    }

    // public function all()
    // {
    //     return Booking::with([
    //         'rooms' => function ($q) {
    //             $q->withTrashed()->with('roomType');
    //         },
    //         'user',
    //         'walkInGuest'
    //     ])
    //         ->latest()
    //         ->get();
    // }

    // ===============================
    // REUSABLE LOGGER
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
