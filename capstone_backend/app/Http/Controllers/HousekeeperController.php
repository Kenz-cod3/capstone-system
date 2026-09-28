<?php

namespace App\Http\Controllers;

use App\Models\BookingHistory;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\DashboardUpdated;

class HousekeeperController extends Controller
{
    public function tasks()
    {
        $rooms = Room::with([
            'roomType',
            'cleaner',
            'images',

            'bookedRooms' => function ($query) {
                $query
                    ->with([
                        'booking.user',
                        'booking.walkInGuest',
                        'booking.histories.user',
                    ])
                    ->orderByDesc('booked_rooms.check_out_time')
                    ->orderByDesc('booked_rooms.id');
            },
        ])
            ->whereNull('deleted_at')
            ->whereIn('status', [
                'preparing',
                'ongoing',
                'maintenance',
            ])
            ->latest();

        $perPage = request()->get('per_page', 5);

        $rooms = $rooms->paginate(
            $perPage === 'all' ? $rooms->count() : (int) $perPage
        );

        $rooms->getCollection()->transform(function ($room) {
            /*
                |--------------------------------------------------------------------------
                | ROOM IMAGE
                |--------------------------------------------------------------------------
                */

            $normalImage = $room->images
                ->where('image_type', 'normal')
                ->sortByDesc('created_at')
                ->first();

            /*
                |--------------------------------------------------------------------------
                | LAST BOOKING FOR THIS ROOM
                |--------------------------------------------------------------------------
                */

            $lastBookedRoom = $room->bookedRooms->first();

            $lastBooking = $lastBookedRoom?->booking;

            /*
                |--------------------------------------------------------------------------
                | LAST GUEST NAME
                |--------------------------------------------------------------------------
                */

            $lastGuestName = null;

            if ($lastBooking) {

                /*
                    | WALK-IN GUEST
                    */

                if ($lastBooking->walkInGuest) {

                    $guest = $lastBooking->walkInGuest;

                    $lastGuestName = trim(
                        ($guest->first_name ?? '') . ' ' .
                            ($guest->middle_name ?? '') . ' ' .
                            ($guest->last_name ?? '')
                    );
                }

                /*
                    | ONLINE / REGISTERED GUEST
                    */ elseif ($lastBooking->user) {

                    $guest = $lastBooking->user;

                    $lastGuestName = trim(
                        ($guest->first_name ?? '') . ' ' .
                            ($guest->middle_name ?? '') . ' ' .
                            ($guest->last_name ?? '')
                    );
                }
            }

            /*
                |--------------------------------------------------------------------------
                | CHECKOUT STAFF
                |--------------------------------------------------------------------------
                */

            $checkoutHistory = null;

            if ($lastBooking) {
                $checkoutHistory = $lastBooking->histories
                    ->where('new_status', 'checked_out')
                    ->sortByDesc(function ($history) {
                        return $history->changed_at
                            ?? $history->created_at;
                    })
                    ->first();
            }

            $checkoutStaffName = null;

            if ($checkoutHistory?->user) {
                $checkoutStaffName = trim(
                    ($checkoutHistory->user->first_name ?? '') . ' ' .
                        ($checkoutHistory->user->middle_name ?? '') . ' ' .
                        ($checkoutHistory->user->last_name ?? '')
                );
            }

            /*
                |--------------------------------------------------------------------------
                | ACTUAL CHECKOUT
                |--------------------------------------------------------------------------
                |
                | IMPORTANT:
                | check_out_time is the real time when staff/admin
                | clicked the Checkout button.
                |
                */

            $actualCheckout = $lastBookedRoom?->check_out_time;

            /*
                |--------------------------------------------------------------------------
                | RETURN ROOM DATA
                |--------------------------------------------------------------------------
                */

            return [

                'id' => $room->id,

                'room_number' => $room->room_number,

                'status' => $room->status,

                /*
                    | Used by mobile notification system
                    | to detect a new preparing-room event.
                    */

                'updated_at' => $room->updated_at,

                'has_damage' => $room->has_damage,

                'room_type' => $room->roomType?->type_name,

                'damage_summary' => $room->damage_summary,

                'completed_at' => $room->completed_at,

                'image_url' => $normalImage
                    ? asset('storage/' . $normalImage->image_path)
                    : null,

                'cleaned_by' => $room->cleaner
                    ? trim(
                        $room->cleaner->first_name . ' ' .
                            $room->cleaner->last_name
                    )
                    : null,

                /*
                    |--------------------------------------------------------------------------
                    | GUEST
                    |--------------------------------------------------------------------------
                    */

                'last_guest_name' => $lastGuestName,

                /*
                    |--------------------------------------------------------------------------
                    | ACTUAL CHECKOUT
                    |--------------------------------------------------------------------------
                    */

                'check_out_time' => $actualCheckout,

                /*
                    | Keep this value for compatibility.
                    | Mobile can derive the date from check_out_time.
                    */

                'check_out_date' => $actualCheckout
                    ? Carbon::parse($actualCheckout)->toDateString()
                    : null,

                /*
                    |--------------------------------------------------------------------------
                    | STAFF WHO HANDLED CHECKOUT
                    |--------------------------------------------------------------------------
                    */

                'checkout_staff_name' => $checkoutStaffName,

                /*
                    |--------------------------------------------------------------------------
                    | BOOKING INFORMATION
                    |--------------------------------------------------------------------------
                    */

                'last_booking_id' => $lastBooking?->id,

                'last_booking_status' => $lastBookedRoom?->status,

                'last_booking_type' => $lastBookedRoom?->stay_type,
            ];
        });

        return response()->json($rooms);
    }

    /*
    |--------------------------------------------------------------------------
    | START CLEANING
    |--------------------------------------------------------------------------
    */

    public function start($id)
    {
        $room = Room::whereNull('deleted_at')
            ->findOrFail($id);

        if ($room->status !== 'preparing') {
            return response()->json([
                'message' => 'Room is not in preparing status.'
            ], 422);
        }

        $room->update([
            'status' => 'ongoing',
            'cleaned_by' => Auth::id(),
            'has_damage' => false,
        ]);

        broadcast(new DashboardUpdated());

        return response()->json([
            'message' => 'Cleaning started.',
            'data' => $room,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLETE CLEANING
    |--------------------------------------------------------------------------
    | ongoing/preparing → available or maintenance
    |--------------------------------------------------------------------------
    */

    public function complete(Request $request, $id)
    {
        $room = Room::whereNull('deleted_at')
            ->findOrFail($id);

        if (!in_array($room->status, [
            'preparing',
            'ongoing',
            'maintenance'
        ])) {
            return response()->json([
                'message' => 'Room is not in a cleanable state.'
            ], 422);
        }

        $hasDamage = filter_var(
            $request->input('has_damage', false),
            FILTER_VALIDATE_BOOLEAN
        );

        $room->update([
            'status' => $hasDamage
                ? 'maintenance'
                : 'available',

            'has_damage' => $hasDamage,

            'cleaned_by' => Auth::id(),

            'completed_at' => Carbon::now(),
        ]);

        broadcast(new DashboardUpdated());

        /*
        |--------------------------------------------------------------------------
        | LOG HISTORY
        |--------------------------------------------------------------------------
        */

        BookingHistory::create([
            'booking_id' => null,

            'old_status' => 'ongoing',

            'new_status' => $hasDamage
                ? 'maintenance'
                : 'cleaned',

            'change_note' => $hasDamage
                ? 'Room cleaned with damage'
                : 'Room cleaned successfully',

            'changed_by' => Auth::id(),

            'changed_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => $hasDamage
                ? 'Room marked as maintenance due to damage.'
                : 'Room marked as available.',

            'data' => $room,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE EXPO PUSH TOKEN
    |--------------------------------------------------------------------------
    */

    public function savePushToken(Request $request)
    {
        $request->validate([
            'expo_push_token' => 'required|string',
        ]);

        $user = User::findOrFail(Auth::id());

        if ($user->role !== 'housekeeper') {
            return response()->json([
                'message' =>
                'Only housekeepers can register push tokens.',
            ], 403);
        }

        $user->update([
            'expo_push_token' => $request->expo_push_token,
        ]);

        return response()->json([
            'message' =>
            'Push token saved successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | HISTORY
    | Completed rooms by this housekeeper
    |--------------------------------------------------------------------------
    */

    public function history()
    {
        $rooms = Room::with([
            'roomType'
        ])
            ->whereNull('deleted_at')
            ->where('cleaned_by', Auth::id())
            ->whereNotNull('completed_at')
            ->latest('completed_at');

        $perPage = request()->get('per_page', 5);

        $rooms = $rooms->paginate(
            $perPage === 'all'
                ? $rooms->count()
                : (int) $perPage
        );

        $rooms->getCollection()->transform(function ($room) {

            /*
        |--------------------------------------------------------------------------
        | DAMAGE REPORT
        |--------------------------------------------------------------------------
        | Keep the damage report in history even after it has been resolved.
        */

            $damageSummary = $room->damage_summary;

            /*
        |--------------------------------------------------------------------------
        | GET DAMAGE STATUS
        |--------------------------------------------------------------------------
        */

            $damageStatus = '';

            if (is_array($damageSummary)) {
                $damageStatus = strtolower(
                    $damageSummary['status'] ?? ''
                );
            } elseif ($damageSummary) {
                $damageStatus = strtolower(
                    $damageSummary->status ?? ''
                );
            }

            /*
        |--------------------------------------------------------------------------
        | RESOLVED DAMAGE
        |--------------------------------------------------------------------------
        */

            $isDamageResolved = $damageStatus === 'resolved';

            /*
        |--------------------------------------------------------------------------
        | HISTORY STATUS
        |--------------------------------------------------------------------------
        |
        | Resolved damage = CLEANED
        | Unresolved damage = keep current room status
        |
        */

            $historyStatus = $isDamageResolved
                ? 'cleaned'
                : $room->status;

            /*
        |--------------------------------------------------------------------------
        | HISTORICAL DAMAGE
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | Do NOT use $room->has_damage here.
        |
        | has_damage can become false after the damage is resolved,
        | but the damage report must remain visible in history.
        |
        */

            $hasHistoricalDamage = !empty($damageSummary);

            return [
                'id' => $room->id,

                'room_number' => $room->room_number,

                /*
            |--------------------------------------------------------------------------
            | MAIN HISTORY STATUS
            |--------------------------------------------------------------------------
            */

                'status' => $historyStatus,

                /*
            |--------------------------------------------------------------------------
            | DAMAGE HISTORY
            |--------------------------------------------------------------------------
            |
            | true if a damage report exists, even if it is already resolved.
            |
            */

                'has_damage' => $hasHistoricalDamage,

                'room_type' => $room->roomType?->type_name,

                /*
            |--------------------------------------------------------------------------
            | KEEP DAMAGE REPORT
            |--------------------------------------------------------------------------
            */

                'damage_summary' => $damageSummary,

                'completed_at' => $room->completed_at,
            ];
        });

        return response()->json($rooms);
    }
}
