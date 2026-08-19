<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookedRoom;
use App\Models\BookingPayment;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $start = $request->start_date;
        $end = $request->end_date;
        $perPage = $request->per_page ?? 10;

        $bookingQuery = Booking::with([
            'user',
            'walkInGuest',
            'bookedRooms' => function ($query) {
                $query->with('room');
            },
        ]);

        // Filter by date range if provided
        if ($start && $end) {
            $bookingQuery->whereBetween('created_at', [$start, $end]);
        }

        // Get all bookings for the period to calculate aggregates
        $allBookings = (clone $bookingQuery)->get();

        // Calculate total revenue from paid bookings
        $totalRevenue = BookingPayment::where('payment_status', 'paid')
            ->whereIn('booking_id', $allBookings->pluck('id'))
            ->sum('amount');

        // Count checked-in rooms (not bookings)
        $checkedInCount = BookedRoom::where('status', 'checked_in')
            ->whereIn('booking_id', $allBookings->pluck('id'))
            ->count();

        // Get paginated bookings
        $paginatedBookings = (clone $bookingQuery)
            ->latest()
            ->paginate($perPage);

        // Transform each booking to include status from its booked rooms
        $paginatedBookings->getCollection()->transform(function ($booking) {
            // Get the first booked room's status as the booking status
            $firstBookedRoom = $booking->bookedRooms->first();
            
            // Add booking_status to the booking object
            $booking->booking_status = $firstBookedRoom?->status ?? 'pending';
            
            // Add room_number if available
            if ($firstBookedRoom && $firstBookedRoom->room) {
                $booking->room_number = $firstBookedRoom->room->room_number;
            }
            
            // Add booking type determination
            $booking->booking_type = $booking->walk_in_guest_id ? 'walk_in' : 'online';
            
            return $booking;
        });

        // Recent bookings with status
        $recentBookings = (clone $bookingQuery)
            ->latest()
            ->take(10)
            ->get()
            ->transform(function ($booking) {
                $firstBookedRoom = $booking->bookedRooms->first();
                $booking->booking_status = $firstBookedRoom?->status ?? 'pending';
                if ($firstBookedRoom && $firstBookedRoom->room) {
                    $booking->room_number = $firstBookedRoom->room->room_number;
                }
                $booking->booking_type = $booking->walk_in_guest_id ? 'walk_in' : 'online';
                return $booking;
            });

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_bookings' => $allBookings->count(),
            'checked_in' => $checkedInCount,
            'bookings' => $paginatedBookings,
            'recent_bookings' => $recentBookings,
        ]);
    }
}