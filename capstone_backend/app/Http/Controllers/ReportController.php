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

        $query = Booking::with(['user', 'walkInGuest']);

        if ($start && $end) {
            $query->whereBetween('check_in_date', [$start, $end]);
        }

        return response()->json([
            'total_revenue' => (clone $query)->sum('total_price'),
            'total_bookings' => (clone $query)->count(),
            'checked_in' => (clone $query)->where('booking_status', 'checked_in')->count(),

            // ✅ PAGINATED DATA
            'bookings' => (clone $query)
                ->latest()
                ->paginate($request->per_page ?? 10),

            // optional recent
            'recent_bookings' => (clone $query)
                ->latest()
                ->limit(10)
                ->get(),
        ]);
    }
}
