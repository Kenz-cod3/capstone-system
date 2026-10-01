<?php

namespace App\Http\Controllers;

use App\Models\AddOn;
use App\Models\BookingAddOn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingAddOnController extends Controller
{
    // GET ALL BOOKING ADD-ONS
    public function index()
    {
        return response()->json(
            BookingAddOn::with(['bookedRoom', 'addOn'])->get(),
            200
        );
    }

    // BookingAddOnController.php
    public function transactions(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 10);
        $search  = $request->search;

        $base = BookingAddOn::query();

        if (!empty($search)) {
            $base->where(function ($q) use ($search) {
                $q->whereHas('addOn', fn($a) =>
                $a->where('add_on_name', 'LIKE', "%{$search}%"))
                    ->orWhereHas('bookedRoom.booking', fn($b) =>
                    $b->where('booking_reference', 'LIKE', "%{$search}%"))
                    ->orWhereHas('bookedRoom.room', fn($r) =>
                    $r->where('room_number', 'LIKE', "%{$search}%"));
            });
        }

        // Revenue: huwag isama ang cancelled/refunded rooms
        $revenueQuery = (clone $base)->whereHas('bookedRoom', fn($q) =>
        $q->whereNotIn('status', ['cancelled', 'refunded']));

        $summary = [
            'total_records'  => (clone $base)->count(),
            'total_quantity' => (clone $revenueQuery)->sum('quantity'),
            'total_revenue'  => (clone $revenueQuery)->sum('subtotal'),
        ];

        $paginated = $base->with([
            'addOn',
            'bookedRoom.room.roomType',
            'bookedRoom.booking.user',
            'bookedRoom.booking.walkInGuest',
        ])
            ->latest()
            ->paginate($perPage);

        $paginated->through(function ($item) {
            $booking = $item->bookedRoom?->booking;

            $guest = $booking?->booking_type === 'online'
                ? trim(($booking->user?->first_name ?? '') . ' ' . ($booking->user?->last_name ?? ''))
                : ($booking?->walkInGuest?->full_name ?? 'Guest');

            return [
                'id'                => $item->id,
                'booking_id'        => $booking?->id,
                'booking_reference' => $booking?->booking_reference ?? '-',
                'guest'             => $guest ?: 'N/A',
                'booking_type'      => $booking?->booking_type === 'online' ? 'Online' : 'Walk-in',
                'room_number'       => $item->bookedRoom?->room?->room_number ?? 'N/A',
                'room_type'         => $item->bookedRoom?->room?->roomType?->type_name ?? '-',
                'room_status'       => $item->bookedRoom?->status ?? 'pending',
                'add_on_name'       => $item->addOn?->add_on_name ?? 'Unknown',
                'price'             => (float) ($item->addOn?->price ?? 0),
                'quantity'          => $item->quantity,
                'subtotal'          => (float) $item->subtotal,
                'date'              => $item->created_at,
            ];
        });

        return response()->json(array_merge($paginated->toArray(), [
            'summary' => $summary,
        ]));
    }

    // ADD ADD-ON TO A BOOKED ROOM (deducts stock)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booked_room_id' => 'required|exists:booked_rooms,id',
            'add_on_id'      => 'required|exists:add_ons,id',
            'quantity'       => 'required|integer|min:1',
        ]);

        $bookingAddOn = DB::transaction(function () use ($validated) {
            $bookedRoom = \App\Models\BookedRoom::findOrFail($validated['booked_room_id']);

            if ($bookedRoom->status !== 'checked_in') {
                throw ValidationException::withMessages([
                    'booked_room_id' => 'Add-ons can only be added to checked-in rooms.',
                ]);
            }

            // Lock the row so two requests can't take the same last stock
            $addOn = AddOn::lockForUpdate()->findOrFail($validated['add_on_id']);

            if ($addOn->stock < $validated['quantity']) {
                throw ValidationException::withMessages([
                    'quantity' => "Only {$addOn->stock} {$addOn->add_on_name} left in stock.",
                ]);
            }

            // Deduct stock
            $addOn->decrement('stock', $validated['quantity']);

            // Compute subtotal
            $validated['subtotal'] = $addOn->price * $validated['quantity'];

            return BookingAddOn::create($validated);
        });

        return response()->json([
            'message' => 'Add-on added successfully.',
            'data'    => $bookingAddOn->load(['bookedRoom', 'addOn']),
        ], 201);
    }

    // GET SINGLE BOOKING ADD-ON
    public function show($id)
    {
        $bookingAddOn = BookingAddOn::with(['bookedRoom', 'addOn'])->findOrFail($id);

        return response()->json($bookingAddOn, 200);
    }

    // UPDATE QUANTITY (adjusts stock by the difference)
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $bookingAddOn = DB::transaction(function () use ($validated, $id) {
            $bookingAddOn = BookingAddOn::findOrFail($id);
            $addOn = AddOn::lockForUpdate()->findOrFail($bookingAddOn->add_on_id);

            // positive = needs more stock, negative = gives stock back
            $difference = $validated['quantity'] - $bookingAddOn->quantity;

            if ($difference > 0 && $addOn->stock < $difference) {
                throw ValidationException::withMessages([
                    'quantity' => "Only {$addOn->stock} more {$addOn->add_on_name} available.",
                ]);
            }

            // decrement with a negative number increments
            if ($difference !== 0) {
                $addOn->decrement('stock', $difference);
            }

            // Recalculate subtotal using current add-on price
            $bookingAddOn->update([
                'quantity' => $validated['quantity'],
                'subtotal' => $addOn->price * $validated['quantity'],
            ]);

            return $bookingAddOn;
        });

        return response()->json([
            'message' => 'Booking add-on updated successfully.',
            'data'    => $bookingAddOn->fresh()->load(['bookedRoom', 'addOn']),
        ], 200);
    }

    // DELETE BOOKING ADD-ON (returns stock)
    public function destroy($id)
    {
        DB::transaction(function () use ($id) {
            $bookingAddOn = BookingAddOn::findOrFail($id);

            AddOn::where('id', $bookingAddOn->add_on_id)
                ->increment('stock', $bookingAddOn->quantity);

            $bookingAddOn->delete();
        });

        return response()->json([
            'message' => 'Booking add-on deleted successfully.',
        ], 200);
    }
}
