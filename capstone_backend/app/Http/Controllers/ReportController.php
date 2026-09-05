<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use App\Models\BookedRoom;
use App\Models\BookingPayment;
use App\Models\CashTransaction;
use App\Models\WalkInGuest;
use App\Models\RoomIncident;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Get booking reports with date filtering
     */
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

        if ($start && $end) {
            $bookingQuery->whereBetween('created_at', [$start, $end]);
        }

        $allBookings = (clone $bookingQuery)->get();

        $totalRevenue = BookingPayment::where('payment_status', 'paid')
            ->whereIn('booking_id', $allBookings->pluck('id'))
            ->sum('amount');

        $checkedInCount = BookedRoom::where('status', 'checked_in')
            ->whereIn('booking_id', $allBookings->pluck('id'))
            ->count();

        $paginatedBookings = (clone $bookingQuery)
            ->latest()
            ->paginate($perPage);

        $paginatedBookings->getCollection()->transform(function ($booking) {
            $firstBookedRoom = $booking->bookedRooms->first();
            $booking->booking_status = $firstBookedRoom?->status ?? 'pending';
            if ($firstBookedRoom && $firstBookedRoom->room) {
                $booking->room_number = $firstBookedRoom->room->room_number;
            }
            $booking->booking_type = $booking->walk_in_guest_id ? 'walk_in' : 'online';
            return $booking;
        });

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

    /**
     * Get guest reports
     */
    public function guests(Request $request)
    {
        try {
            $search = $request->search;
            $start = $request->start_date;
            $end = $request->end_date;
            $perPage = $request->per_page ?? 50;

            $guests = DB::table('users')
                ->leftJoin('bookings', 'users.id', '=', 'bookings.user_id')
                ->leftJoin('booked_rooms', 'bookings.id', '=', 'booked_rooms.booking_id')
                ->select(
                    'users.id',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    DB::raw("'' as phone"),
                    DB::raw('COUNT(DISTINCT bookings.id) as total_stays'),
                    DB::raw('COALESCE(SUM(booked_rooms.subtotal), 0) as total_spent'),
                    DB::raw('MAX(booked_rooms.check_in_date) as last_visit')
                )
                ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email');

            if ($start && $end) {
                $guests->whereBetween('bookings.created_at', [$start, $end]);
            }

            if ($search) {
                $guests->where(function ($q) use ($search) {
                    $q->where('users.first_name', 'LIKE', "%{$search}%")
                      ->orWhere('users.last_name', 'LIKE', "%{$search}%")
                      ->orWhere('users.email', 'LIKE', "%{$search}%");
                });
            }

            return response()->json($guests->paginate($perPage));

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Get transaction reports
     *
     * Rewritten to avoid a fragile 6-table join + manual GROUP BY/GROUP_CONCAT
     * query, which is a very common source of 500 errors under MySQL's
     * ONLY_FULL_GROUP_BY mode (and breaks silently when columns are added
     * later without also updating the groupBy list). This version loads
     * Bookings with their relationships and builds the same response shape
     * in PHP, which is slightly more memory-hungry per page but far more
     * robust and easier to maintain.
     */
    public function transactions(Request $request)
    {
        try {
            $perPage = $request->per_page ?? 50;
            $start = $request->start_date;
            $end = $request->end_date;

            $query = Booking::with([
                'user:id,first_name,last_name',
                'walkInGuest:id,first_name,last_name',
                'bookedRooms.room:id,room_number',
                'payments' => function ($q) {
                    $q->latest('payment_date');
                },
            ]);

            if ($start && $end) {
                $query->whereBetween('bookings.created_at', [$start, $end]);
            }

            $paginated = $query->latest('bookings.created_at')->paginate($perPage);

            $paginated->getCollection()->transform(function (Booking $booking) {
                $latestPayment = $booking->payments->first();

                $guestFirstName = $booking->user->first_name
                    ?? $booking->walkInGuest->first_name
                    ?? '';
                $guestLastName = $booking->user->last_name
                    ?? $booking->walkInGuest->last_name
                    ?? '';

                return [
                    'id' => $booking->id,
                    'booking_reference' => $booking->booking_reference,
                    'booking_type' => $booking->walk_in_guest_id ? 'walk_in' : 'online',
                    'guest_first_name' => $guestFirstName,
                    'guest_last_name' => $guestLastName,
                    'guest' => trim($guestFirstName . ' ' . $guestLastName),
                    'rooms' => $booking->bookedRooms
                        ->pluck('room.room_number')
                        ->filter()
                        ->implode(', '),
                    'total_rooms' => $booking->bookedRooms->count(),
                    'total_price' => $booking->total_price,
                    'amount' => $latestPayment->amount ?? null,
                    'payment_method' => $latestPayment->payment_method ?? null,
                    'payment_date' => $latestPayment->payment_date ?? null,
                    'payment_reference' => $latestPayment->payment_reference ?? null,
                    'payment_status' => $latestPayment->payment_status ?? null,
                    'date' => $booking->created_at,
                    'refunded_amount' => 0,
                    'cancelled_amount' => 0,
                ];
            });

            return response()->json($paginated);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    /**
     * Get transaction summary
     */
    public function transactionSummary()
    {
        $summary = [
            'total_records' => BookingPayment::count(),
            'total_revenue' => BookingPayment::where('payment_status', 'paid')->sum('amount'),
        ];

        return response()->json($summary);
    }

    /**
     * Get incident reports
     */
    public function incidents(Request $request)
    {
        $perPage = $request->per_page ?? 50;
        $start = $request->start_date;
        $end = $request->end_date;

        $incidents = RoomIncident::with([
            'room',
            'cleaner',
            'resolvedBy',
            'booking.user',
            'booking.walkInGuest'
        ]);

        if ($start && $end) {
            $incidents->whereBetween('reported_at', [$start, $end]);
        }

        return response()->json($incidents->paginate($perPage));
    }

    /**
     * Get financial trend data
     */
    public function financialTrend(Request $request)
    {
        $from = $request->from;
        $to = $request->to;

        if (!$from || !$to) {
            $to = Carbon::now()->endOfDay();
            $from = Carbon::now()->subDays(30)->startOfDay();
        }

        $dailyPaidRaw = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$from, $to])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyRefundRaw = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$from, $to])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyExpensesRaw = CashTransaction::where('type', 'pay_out')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $trend = [];
        $current = Carbon::parse($from);

        while ($current <= Carbon::parse($to)) {
            $dateStr = $current->toDateString();
            $rev = ($dailyPaidRaw[$dateStr] ?? 0) - ($dailyRefundRaw[$dateStr] ?? 0);
            $exp = $dailyExpensesRaw[$dateStr] ?? 0;

            $trend[] = [
                'name' => $current->format('M d'),
                'date' => $dateStr,
                'revenue' => $rev,
                'expenses' => $exp,
                'profit' => $rev - $exp,
            ];

            $current->addDay();
        }

        return response()->json(['financialRangeTrend' => $trend]);
    }

    /**
     * Get revenue by date range
     */
    public function revenueByDate(Request $request)
    {
        $from = $request->from;
        $to = $request->to;

        $query = BookingPayment::where('payment_status', 'paid');

        if ($from && $to) {
            $query->whereBetween('payment_date', [$from, $to]);
        }

        $payments = $query->get();

        $grouped = $payments->groupBy(function ($payment) {
            return Carbon::parse($payment->payment_date)->toDateString();
        });

        $revenueData = [];
        foreach ($grouped as $date => $items) {
            $revenueData[] = [
                'date' => $date,
                'total' => $items->sum('amount'),
                'count' => $items->count(),
            ];
        }

        return response()->json($revenueData);
    }

    /**
     * Get guest reviews
     */
    public function reviews(Request $request)
    {
        $perPage = $request->per_page ?? 50;
        $search = $request->search;
        $start = $request->start_date;
        $end = $request->end_date;

        $reviews = Review::with(['booking.user', 'booking.walkInGuest', 'room']);

        if ($start && $end) {
            $reviews->whereBetween('created_at', [$start, $end]);
        }

        if ($search) {
            $reviews->where(function ($q) use ($search) {
                $q->where('review', 'LIKE', "%{$search}%")
                  ->orWhere('guest_name', 'LIKE', "%{$search}%");
            });
        }

        return response()->json($reviews->paginate($perPage));
    }

    /**
     * Get occupancy reports
     */
    public function occupancy(Request $request)
    {
        $start = $request->start_date;
        $end = $request->end_date;

        $roomCounts = Room::whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $occupied    = $roomCounts['occupied'] ?? 0;
        $available   = $roomCounts['available'] ?? 0;
        $reserved    = $roomCounts['reserved'] ?? 0;
        $maintenance = $roomCounts['maintenance'] ?? 0;
        $cleaning    = $roomCounts['cleaning'] ?? 0;
        $dirty       = $roomCounts['dirty'] ?? 0;

        $totalActiveRooms = $occupied + $available + $cleaning + $dirty;
        $currentOccupancyRate = $totalActiveRooms > 0
            ? round(($occupied / $totalActiveRooms) * 100, 2)
            : 0;

        $occupancyData = [
            'total_rooms' => $totalActiveRooms,
            'occupied_rooms' => $occupied,
            'available_rooms' => $available,
            'reserved_rooms' => $reserved,
            'dirty_rooms' => $dirty,
            'cleaning_rooms' => $cleaning,
            'maintenance_rooms' => $maintenance,
            'occupancy_rate' => $currentOccupancyRate,
            'room_status' => [
                ['name' => 'Available', 'value' => $available, 'color' => '#2e7d64'],
                ['name' => 'Reserved', 'value' => $reserved, 'color' => '#fbbf24'],
                ['name' => 'Occupied', 'value' => $occupied, 'color' => '#3b82f6'],
                ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                ['name' => 'Dirty', 'value' => $dirty, 'color' => '#8b5cf6'],
                ['name' => 'Cleaning', 'value' => $cleaning, 'color' => '#f59e0b'],
            ],
        ];

        if ($start && $end) {
            $occupancyData['period_bookings'] = Booking::whereBetween('created_at', [$start, $end])->count();
            $occupancyData['period_revenue'] = BookingPayment::where('payment_status', 'paid')
                ->whereBetween('payment_date', [$start, $end])
                ->sum('amount');
        }

        return response()->json($occupancyData);
    }

    /**
     * Get housekeeping reports
     */
    public function housekeeping(Request $request)
    {
        $start = $request->start_date;
        $end = $request->end_date;

        $housekeepingData = [
            'total_dirty_rooms' => Room::where('status', 'dirty')->count(),
            'total_cleaning_rooms' => Room::where('status', 'cleaning')->count(),
            'total_available_rooms' => Room::where('status', 'available')->count(),
        ];

        if ($start && $end) {
            // Add date filtered data if needed
        }

        return response()->json($housekeepingData);
    }

    /**
     * Get maintenance reports
     */
    public function maintenance(Request $request)
    {
        $start = $request->start_date;
        $end = $request->end_date;

        $maintenanceData = [
            'total_maintenance_rooms' => Room::where('status', 'maintenance')->count(),
        ];

        if ($start && $end) {
            // Add date filtered data if needed
        }

        return response()->json($maintenanceData);
    }
}