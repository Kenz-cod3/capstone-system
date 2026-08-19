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

class BookedRoomController extends Controller
{
    // GET ALL ACTIVE BOOKED ROOMS
    public function index(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;

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

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                // Room Number
                $q->whereHas('room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                })

                    // Booking Reference
                    ->orWhereHas('booking', function ($booking) use ($search) {

                        $booking->where('booking_reference', 'LIKE', "%{$search}%")
                            ->orWhere('id', $search)

                            // Online Guest
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

                            // Walk-in Guest
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
            ->where(function ($q) {

                // Always show these
                $q->whereIn('status', [
                    'checked_out',
                    'refunded',
                ]);

                // Show cancelled only if NOT paid
                $q->orWhere(function ($q2) {
                    $q2->where('status', 'cancelled')
                        ->whereHas('booking.payments', function ($payment) {
                            $payment->where('payment_status', '!=', 'paid');
                        });
                });
            });

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                // Room Number
                $q->whereHas('room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                })

                    // Booking
                    ->orWhereHas('booking', function ($booking) use ($search) {

                        $booking->where('booking_reference', 'LIKE', "%{$search}%")
                            ->orWhere('id', $search)

                            // Online Guest
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

                            // Walk-in Guest
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

    // GET TRASHED BOOKED ROOMS
    public function trash(Request $request)
    {
        $perPage = $request->per_page ?? 10;
        $search = $request->search;

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

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                // Room Number
                $q->whereHas('room', function ($room) use ($search) {
                    $room->where('room_number', 'LIKE', "%{$search}%");
                })

                    // Booking
                    ->orWhereHas('booking', function ($booking) use ($search) {

                        $booking->where('booking_reference', 'LIKE', "%{$search}%")
                            ->orWhere('id', $search)

                            // Online Guest
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

                            // Walk-in Guest
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
    // ASSIGN ROOM TO BOOKING
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'room_id' => 'required|exists:rooms,id',
            'status' => 'nullable|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
            'price_at_time_of_booking' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'stay_type' => 'required|in:overnight,short_stay',
        ]);

        $room = Room::findOrFail($validated['room_id']);

        if ($room->status !== 'available') {
            return response()->json([
                'message' => 'Room already assigned or occupied'
            ], 400);
        }

        $bookedRoom = BookedRoom::create([
            'booking_id'               => $validated['booking_id'],
            'room_id'                  => $validated['room_id'],
            'price_at_time_of_booking' => $validated['price_at_time_of_booking'],
            'subtotal'                 => $validated['subtotal'],
            'stay_type'                => $validated['stay_type'],
        ]);

        $room->update([
            'status' => Room::STATUS_OCCUPIED
        ]);

        //  REALTIME DASHBOARD UPDATE
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

    // GET SINGLE
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

    // UPDATE
    public function update(Request $request, $id)
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

        $validated = $request->validate([
            'status' => 'sometimes|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
            'price_at_time_of_booking' => 'sometimes|numeric|min:0',
            'subtotal' => 'sometimes|numeric|min:0',
            'stay_type' => 'sometimes|in:overnight,short_stay',
        ]);

        // Update room booking status
        if (array_key_exists('status', $validated)) {

            $bookedRoom->status = $validated['status'];

            switch ($validated['status']) {

                case 'confirmed':

                    $booking = $bookedRoom->booking;

                    \App\Models\BookingHistory::create([
                        'booking_id'   => $booking->id,
                        'old_status'   => 'pending',
                        'new_status'   => 'confirmed',
                        'change_note'  => 'Booking confirmed',
                        'changed_by'   => Auth::id(),
                    ]);

                    BookingPayment::where('booking_id', $bookedRoom->booking_id)
                        ->update([
                            'received_by' => Auth::id(),
                            'payment_status' => 'paid',
                            'payment_date' => now(),
                        ]);

                    // Notify Admins and Staff (except the user who confirmed)
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

                    // Notify Guest
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
                    $bookedRoom->check_in_time = now();

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
                    if ($bookedRoom->room) {
                        $bookedRoom->room->update([
                            'status' => Room::STATUS_AVAILABLE,
                        ]);
                    }

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
        }

        // Update other fields
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

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room updated successfully.',
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

    // MOVE BOOKED ROOM TO TRASH
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

        // Prevent deleting checked-in room
        if ($bookedRoom->status === 'checked_in') {
            return response()->json([
                'message' => 'Checked-in room cannot be moved to trash.'
            ], 400);
        }

        // Room becomes available again
        if ($bookedRoom->room) {
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

    // RESTORE BOOKED ROOM
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

        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Booked room restored.'
        ], 200);
    }

    // PERMANENT DELETE (SOFT DELETE ONLY)
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
