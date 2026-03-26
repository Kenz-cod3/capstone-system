<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $start = $request->start_date;
        $end = $request->end_date;

        $query = Booking::query();

        // FILTER BY DATE
        if ($start && $end) {
            $query->whereBetween('check_in_date', [$start, $end]);
        }

        return response()->json([
            'total_revenue' => $query->sum('total_price'),
            'total_bookings' => $query->count(),
            'checked_in' => (clone $query)->where('booking_status', 'checked_in')->count(),

            // RECENT BOOKINGS (FAST)
            'recent_bookings' => Booking::with(['user', 'walkInGuest'])
                ->latest()
                ->limit(10)
                ->get()
        ]);
    }
}