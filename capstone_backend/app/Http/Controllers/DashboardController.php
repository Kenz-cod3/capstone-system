<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use App\Models\BookingPayment;
use App\Models\CashTransaction;
use App\Models\WalkInGuest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /**
     * Get basic dashboard stats (fast endpoint)
     */
    public function stats()
    {
        $user = Auth::user();
        $isStaff = $user->role === 'staff';

        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $currentYear = Carbon::now()->year;

        // USERS
        if ($isStaff) {
            $totalGuests = User::where('role', 'guest')
                ->whereBetween('created_at', [$todayStart, $todayEnd])
                ->count() + WalkInGuest::whereBetween('created_at', [$todayStart, $todayEnd])->count();
        } else {
            $totalGuests = User::where('role', 'guest')->count() + WalkInGuest::count();
        }

        // ROOMS — single query
        $roomCounts = Room::whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $occupied    = $roomCounts['occupied']    ?? 0;
        $available   = $roomCounts['available']   ?? 0;
        $reserved    = $roomCounts['reserved']    ?? 0;
        $maintenance = $roomCounts['maintenance'] ?? 0;
        $cleaning    = $roomCounts['cleaning']    ?? 0;
        $dirty       = $roomCounts['dirty']       ?? 0;

        $totalActiveRooms = $occupied + $available + $cleaning + $dirty;
        $currentOccupancyRate = $totalActiveRooms > 0
            ? round(($occupied / $totalActiveRooms) * 100, 2)
            : 0;

        // BOOKINGS - using booked_rooms status (FIXED)
        if ($isStaff) {
            $activeBookings = Booking::whereNull('deleted_at')
                ->whereHas('bookedRooms', function ($q) {
                    $q->whereNotIn('status', [
                        'checked_out',
                        'cancelled',
                        'refunded'
                    ]);
                })
                ->count();
        } else {
            $activeBookings = Booking::whereNull('deleted_at')->count();
        }

        // REVENUE - using booked_rooms status

        // REVENUE - based on actual successful payments
        // $totalRevenueQuery = BookingPayment::where('payment_status', 'paid');

        // if ($isStaff) {
        //     $totalRevenueQuery->whereBetween('payment_date', [$todayStart, $todayEnd]);
        // } else {
        //     $totalRevenueQuery->whereYear('payment_date', $currentYear);
        // }

        // $totalRevenue = $totalRevenueQuery->sum('amount');

        $payments = BookingPayment::query();

        if ($isStaff) {
            $payments->whereBetween('payment_date', [$todayStart, $todayEnd]);
        } else {
            $payments->whereYear('payment_date', $currentYear);
        }

        $totalPaid = (clone $payments)
            ->where('payment_status', 'paid')
            ->sum('amount');

        $totalRefunded = (clone $payments)
            ->where('payment_status', 'refunded')
            ->sum('amount');

        $totalRevenue = $totalPaid - $totalRefunded;
        // $totalRevenueQuery = Booking::whereNull('deleted_at')
        //     ->whereYear('created_at', $currentYear)
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', [
        //             'confirmed',
        //             'checked_in',
        //             'checked_out'
        //         ]);
        //     });
        // if ($isStaff) {
        //     $totalRevenueQuery->whereBetween('updated_at', [$todayStart, $todayEnd]);
        // }
        // $totalRevenue = $totalRevenueQuery->sum('total_price');

        // EXPENSES
        $totalExpensesQuery = CashTransaction::where('type', 'pay_out');
        if ($isStaff) {
            $totalExpensesQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
        }
        $totalExpenses = $totalExpensesQuery->sum('amount');

        // WEEK
        $startOfThisWeek = Carbon::now()->startOfWeek();
        $endOfThisWeek   = Carbon::now()->endOfWeek();
        $startOfLastWeek = Carbon::now()->subWeek()->startOfWeek();
        $endOfLastWeek   = Carbon::now()->subWeek()->endOfWeek();

        // $thisWeekRevenue = Booking::whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->sum('total_price');

        $thisWeekPaid = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$startOfThisWeek, $endOfThisWeek])
            ->sum('amount');

        $thisWeekRefunded = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$startOfThisWeek, $endOfThisWeek])
            ->sum('amount');

        $thisWeekRevenue = $thisWeekPaid - $thisWeekRefunded;

        // $lastWeekRevenue = Booking::whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->sum('total_price');
        $lastWeekPaid = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$startOfLastWeek, $endOfLastWeek])
            ->sum('amount');

        $lastWeekRefunded = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$startOfLastWeek, $endOfLastWeek])
            ->sum('amount');

        $lastWeekRevenue = $lastWeekPaid - $lastWeekRefunded;

        if ($isStaff) {
            $todayPaid = BookingPayment::where('payment_status', 'paid')
                ->whereDate('payment_date', $today)
                ->sum('amount');

            $todayRefunded = BookingPayment::where('payment_status', 'refunded')
                ->whereDate('payment_date', $today)
                ->sum('amount');

            $todayRevenue = $todayPaid - $todayRefunded;
            // $todayRevenue = Booking::whereDate('updated_at', $today)
            //     ->whereHas('bookedRooms', function ($q) {
            //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
            //     })
            //     ->sum('total_price');

            // 
            $yesterdayPaid = BookingPayment::where('payment_status', 'paid')
                ->whereDate('payment_date', $yesterday)
                ->sum('amount');

            $yesterdayRefunded = BookingPayment::where('payment_status', 'refunded')
                ->whereDate('payment_date', $yesterday)
                ->sum('amount');

            $yesterdayRevenue = $yesterdayPaid - $yesterdayRefunded;

            $revenueChange = $yesterdayRevenue > 0 ? min((($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 100) : ($todayRevenue > 0 ? 100 : 0);
        } else {
            $revenueChange = $lastWeekRevenue > 0 ? min((($thisWeekRevenue - $lastWeekRevenue) / $lastWeekRevenue) * 100, 100) : ($thisWeekRevenue > 0 ? 100 : 0);
        }

        $thisWeekExpenses = CashTransaction::where('type', 'pay_out')->whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])->sum('amount');
        $lastWeekExpenses = CashTransaction::where('type', 'pay_out')->whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])->sum('amount');

        if ($isStaff) {
            $todayExpenses     = CashTransaction::where('type', 'pay_out')->whereDate('created_at', $today)->sum('amount');
            $yesterdayExpenses = CashTransaction::where('type', 'pay_out')->whereDate('created_at', $yesterday)->sum('amount');
            $expensesChange    = $yesterdayExpenses > 0 ? min((($todayExpenses - $yesterdayExpenses) / $yesterdayExpenses) * 100, 100) : ($todayExpenses > 0 ? 100 : 0);
        } else {
            $expensesChange = $lastWeekExpenses > 0 ? min((($thisWeekExpenses - $lastWeekExpenses) / $lastWeekExpenses) * 100, 100) : ($thisWeekExpenses > 0 ? 100 : 0);
        }

        $totalProfit    = $totalRevenue - $totalExpenses;
        $thisWeekProfit = $thisWeekRevenue - $thisWeekExpenses;
        $lastWeekProfit = $lastWeekRevenue - $lastWeekExpenses;

        if ($isStaff) {
            $todayProfit     = $todayRevenue - $todayExpenses;
            $yesterdayProfit = $yesterdayRevenue - $yesterdayExpenses;
            $profitChange    = $yesterdayProfit != 0 ? min((($todayProfit - $yesterdayProfit) / abs($yesterdayProfit)) * 100, 100) : ($todayProfit > 0 ? 100 : 0);
        } else {
            $profitChange = $lastWeekProfit != 0 ? min((($thisWeekProfit - $lastWeekProfit) / abs($lastWeekProfit)) * 100, 100) : ($thisWeekProfit > 0 ? 100 : 0);
        }

        // RECENT BOOKINGS
        $recentBookings = Booking::with([
            'user',
            'walkInGuest',
            'bookedRooms.room',
            'latestPayment',
        ])
            ->latest()
            ->limit(5)
            ->get();
        // $recentBookings = Booking::with([
        //     'user',
        //     'walkInGuest',
        //     'bookedRooms.room',
        //     'payments',
        // ])->latest()->limit(5)->get();

        // $recentBookings->each(function ($booking) {

        //     // $booking->booking_status =
        //     //     $booking->bookedRooms->first()?->status ?? 'pending';
        //     $latestPayment = $booking->payments
        //         ->sortByDesc('payment_date')
        //         ->first();

        //     $booking->booking_status =
        //         $latestPayment?->payment_status ?? 'pending';
        // });

        // OCCUPANCY STATUS
        $occupancyStatus = 'normal';
        $occupancyAlert  = null;
        if ($currentOccupancyRate >= 90) {
            $occupancyStatus = 'critical';
            $occupancyAlert  = 'High occupancy! Only ' . ($totalActiveRooms - $occupied) . ' rooms left.';
        } elseif ($currentOccupancyRate >= 75) {
            $occupancyStatus = 'high';
            $occupancyAlert  = 'Occupancy is above 75%. Consider additional staff scheduling.';
        } elseif ($currentOccupancyRate <= 20 && $currentOccupancyRate > 0) {
            $occupancyStatus = 'low';
            $occupancyAlert  = 'Low occupancy. Consider running promotions or discounts.';
        } elseif ($currentOccupancyRate == 0) {
            $occupancyStatus = 'empty';
            $occupancyAlert  = 'No rooms currently occupied.';
        }

        return response()->json([
            'stats' => [
                'guests'          => $totalGuests,
                'rooms'           => $totalActiveRooms,
                'bookings'        => $activeBookings,
                'revenue'         => $totalRevenue,
                'expenses'        => $totalExpenses,
                'profit'          => $totalProfit,
                'revenue_change'  => round($revenueChange, 1),
                'expenses_change' => round($expensesChange, 1),
                'profit_change'   => round($profitChange, 1),
            ],
            'recentBookings' => $recentBookings,
            'occupancy'      => $currentOccupancyRate,
            'occupancyMetrics' => [
                'current' => $currentOccupancyRate,
                'status'  => $occupancyStatus,
                'alert'   => $occupancyAlert,
            ],
            'roomStatus' => [
                ['name' => 'Available',   'value' => $available,   'color' => '#2e7d64'],
                ['name' => 'Reserved',    'value' => $reserved,    'color' => '#fbbf24'],
                ['name' => 'Occupied',    'value' => $occupied,    'color' => '#3b82f6'],
                ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                ['name' => 'Dirty',       'value' => $dirty,       'color' => '#8b5cf6'],
                ['name' => 'Cleaning',    'value' => $cleaning,    'color' => '#f59e0b'],
            ],
        ]);
    }

    /**
     * Get full dashboard with charts and trends (slower endpoint)
     */
    public function index()
    {
        $user = Auth::user();
        $isStaff = $user->role === 'staff';

        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $currentYear = Carbon::now()->year;
        $lastYear = $currentYear - 1;

        // USERS
        if ($isStaff) {
            $totalGuests = User::where('role', 'guest')
                ->whereBetween('created_at', [$todayStart, $todayEnd])
                ->count() + WalkInGuest::whereBetween('created_at', [$todayStart, $todayEnd])->count();
        } else {
            $totalGuests = User::where('role', 'guest')->count() + WalkInGuest::count();
        }

        // ROOMS
        $roomCounts = Room::whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $occupied    = $roomCounts['occupied']    ?? 0;
        $available   = $roomCounts['available']   ?? 0;
        $maintenance = $roomCounts['maintenance'] ?? 0;
        $cleaning    = $roomCounts['cleaning']    ?? 0;
        $dirty       = $roomCounts['dirty']       ?? 0;

        $totalActiveRooms = $occupied + $available + $cleaning + $dirty;
        $currentOccupancyRate = $totalActiveRooms > 0
            ? round(($occupied / $totalActiveRooms) * 100, 2)
            : 0;

        // BOOKINGS - using booked_rooms status (FIXED)
        if ($isStaff) {
            $activeBookings = Booking::whereNull('deleted_at')
                ->whereHas('bookedRooms', function ($q) {
                    $q->whereNotIn('status', ['checked_out', 'cancelled', 'refunded']);
                })
                ->count();
        } else {
            $activeBookings = Booking::whereNull('deleted_at')->count();
        }

        // REVENUE - using booked_rooms status
        $payments = BookingPayment::query();

        if ($isStaff) {
            $payments->whereBetween('payment_date', [$todayStart, $todayEnd]);
        } else {
            $payments->whereYear('payment_date', $currentYear);
        }

        $totalPaid = (clone $payments)
            ->where('payment_status', 'paid')
            ->sum('amount');

        $totalRefunded = (clone $payments)
            ->where('payment_status', 'refunded')
            ->sum('amount');

        $totalRevenue = $totalPaid - $totalRefunded;
        // $totalRevenueQuery = Booking::whereNull('deleted_at')
        //     ->whereYear('created_at', $currentYear)
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     });
        // if ($isStaff) {
        //     $totalRevenueQuery->whereBetween('updated_at', [$todayStart, $todayEnd]);
        // }
        // $totalRevenue = $totalRevenueQuery->sum('total_price');

        // EXPENSES
        $totalExpensesQuery = CashTransaction::where('type', 'pay_out');
        if ($isStaff) {
            $totalExpensesQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
        }
        $totalExpenses = $totalExpensesQuery->sum('amount');

        // WEEK
        $startOfThisWeek = Carbon::now()->startOfWeek();
        $endOfThisWeek   = Carbon::now()->endOfWeek();
        $startOfLastWeek = Carbon::now()->subWeek()->startOfWeek();
        $endOfLastWeek   = Carbon::now()->subWeek()->endOfWeek();

        // $thisWeekRevenue = Booking::whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->sum('total_price');
        $thisWeekPaid = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$startOfThisWeek, $endOfThisWeek])
            ->sum('amount');

        $thisWeekRefunded = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$startOfThisWeek, $endOfThisWeek])
            ->sum('amount');

        $thisWeekRevenue = $thisWeekPaid - $thisWeekRefunded;

        // $lastWeekRevenue = Booking::whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->sum('total_price');

        $lastWeekPaid = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$startOfLastWeek, $endOfLastWeek])
            ->sum('amount');

        $lastWeekRefunded = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$startOfLastWeek, $endOfLastWeek])
            ->sum('amount');

        $lastWeekRevenue = $lastWeekPaid - $lastWeekRefunded;

        if ($isStaff) {
            // $todayRevenue = Booking::whereDate('updated_at', $today)
            //     ->whereHas('bookedRooms', function ($q) {
            //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
            //     })
            //     ->sum('total_price');
            $todayPaid = BookingPayment::where('payment_status', 'paid')
                ->whereDate('payment_date', $today)
                ->sum('amount');

            $todayRefunded = BookingPayment::where('payment_status', 'refunded')
                ->whereDate('payment_date', $today)
                ->sum('amount');

            $todayRevenue = $todayPaid - $todayRefunded;

            // $yesterdayRevenue = Booking::whereDate('created_at', $yesterday)
            //     ->whereHas('bookedRooms', function ($q) {
            //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
            //     })
            //     ->sum('total_price');
            $yesterdayPaid = BookingPayment::where('payment_status', 'paid')
                ->whereDate('payment_date', $yesterday)
                ->sum('amount');

            $yesterdayRefunded = BookingPayment::where('payment_status', 'refunded')
                ->whereDate('payment_date', $yesterday)
                ->sum('amount');

            $yesterdayRevenue = $yesterdayPaid - $yesterdayRefunded;

            $revenueChange = $yesterdayRevenue > 0 ? min((($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 100) : ($todayRevenue > 0 ? 100 : 0);
        } else {
            $revenueChange = $lastWeekRevenue > 0 ? min((($thisWeekRevenue - $lastWeekRevenue) / $lastWeekRevenue) * 100, 100) : ($thisWeekRevenue > 0 ? 100 : 0);
        }

        $thisWeekExpenses = CashTransaction::where('type', 'pay_out')->whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])->sum('amount');
        $lastWeekExpenses = CashTransaction::where('type', 'pay_out')->whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])->sum('amount');

        if ($isStaff) {
            $todayExpenses     = CashTransaction::where('type', 'pay_out')->whereDate('created_at', $today)->sum('amount');
            $yesterdayExpenses = CashTransaction::where('type', 'pay_out')->whereDate('created_at', $yesterday)->sum('amount');
            $expensesChange    = $yesterdayExpenses > 0 ? min((($todayExpenses - $yesterdayExpenses) / $yesterdayExpenses) * 100, 100) : ($todayExpenses > 0 ? 100 : 0);
        } else {
            $expensesChange = $lastWeekExpenses > 0 ? min((($thisWeekExpenses - $lastWeekExpenses) / $lastWeekExpenses) * 100, 100) : ($thisWeekExpenses > 0 ? 100 : 0);
        }

        $totalProfit    = $totalRevenue - $totalExpenses;
        $thisWeekProfit = $thisWeekRevenue - $thisWeekExpenses;
        $lastWeekProfit = $lastWeekRevenue - $lastWeekExpenses;

        if ($isStaff) {
            $todayProfit     = $todayRevenue - $todayExpenses;
            $yesterdayProfit = $yesterdayRevenue - $yesterdayExpenses;
            $profitChange    = $yesterdayProfit != 0 ? min((($todayProfit - $yesterdayProfit) / abs($yesterdayProfit)) * 100, 100) : ($todayProfit > 0 ? 100 : 0);
        } else {
            $profitChange = $lastWeekProfit != 0 ? min((($thisWeekProfit - $lastWeekProfit) / abs($lastWeekProfit)) * 100, 100) : ($thisWeekProfit > 0 ? 100 : 0);
        }

        // RECENT BOOKINGS
        $recentBookings = Booking::with([
            'user',
            'walkInGuest',
            'bookedRooms.room',
            'latestPayment',
        ])
            ->latest()
            ->limit(5)
            ->get();
        // $recentBookings = Booking::with([
        //     'user',
        //     'walkInGuest',
        //     'bookedRooms.room',
        //     'payments' => function ($query) {
        //         $query->orderByDesc('payment_date');
        //     },
        // ])
        //     ->latest()
        //     ->limit(5)
        //     ->get();
        // $recentBookings = Booking::with([
        //     'user',
        //     'walkInGuest',
        //     'bookedRooms.room',
        // ])->latest()->limit(5)->get();

        $recentBookings->each(function ($booking) {

            $booking->booking_status =
                $booking->bookedRooms->first()?->status ?? 'pending';
        });

        // OCCUPANCY TREND - FIXED to use booked_rooms status
        $allBookings = Booking::whereNull('deleted_at')
            ->with(['bookedRooms' => function ($q) {
                $q->with('room:id,status,deleted_at');
            }])
            ->get();

        $totalRoomsCount = $totalActiveRooms;

        $getOccupancyForDate = function ($dateString) use ($allBookings, $totalRoomsCount) {
            if ($totalRoomsCount === 0) return 0;

            $targetDate = Carbon::parse($dateString);
            $today = Carbon::today();
            $occupiedRoomIds = [];

            foreach ($allBookings as $booking) {

                $isActive = false;

                foreach ($booking->bookedRooms as $br) {

                    $checkInDate = Carbon::parse($br->check_in_date);

                    $checkOutDate = $br->check_out_date
                        ? Carbon::parse($br->check_out_date)
                        : null;

                    $status = $br->status;

                    if ($status === 'checked_in') {
                        $isActive = $targetDate->gte($checkInDate);
                        if ($br->check_out_time && $targetDate->gt(Carbon::parse($br->check_out_time))) {
                            $isActive = false;
                        }
                    } elseif ($status === 'checked_out') {
                        if ($br->check_out_time) {
                            $co = Carbon::parse($br->check_out_time);
                            if ($targetDate->gte($checkInDate) && $targetDate->lte($co)) {
                                $isActive = true;
                                break;
                            }
                        }
                    } elseif ($status === 'confirmed') {
                        if ($checkOutDate && $targetDate->gte($checkInDate) && $targetDate->lte($checkOutDate)) {
                            if ($targetDate->gt($today) || ($targetDate->eq($today) && $br->check_in_time)) {
                                $isActive = true;
                            }
                        }
                    }
                }

                if ($isActive) {
                    foreach ($booking->bookedRooms as $br) {
                        if ($br->room && $br->room->status !== 'maintenance' && $br->room->deleted_at === null) {
                            $occupiedRoomIds[$br->room_id] = true;
                        }
                    }
                }
            }

            return round(min((count($occupiedRoomIds) / $totalRoomsCount) * 100, 100), 2);
        };

        // LAST 7 DAYS
        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date    = Carbon::today()->subDays($i);
            $trend[] = [
                'day'       => $date->format('M d, Y'),
                'occupancy' => $getOccupancyForDate($date->toDateString()),
                'fullDate'  => $date->toDateString(),
            ];
        }

        // LAST 30 DAYS
        $thirtyDayTrend = [];
        for ($i = 29; $i >= 0; $i--) {
            $date             = Carbon::today()->subDays($i);
            $thirtyDayTrend[] = [
                'day'       => $date->format('M d, Y'),
                'occupancy' => $getOccupancyForDate($date->toDateString()),
                'fullDate'  => $date->toDateString(),
            ];
        }

        // THIS MONTH
        $thisMonthTrend = [];
        $currentDate    = Carbon::today()->startOfMonth()->copy();
        $endOfMonth     = Carbon::today()->endOfMonth();
        while ($currentDate->lte($endOfMonth)) {
            $thisMonthTrend[] = [
                'day'       => $currentDate->format('M d, Y'),
                'occupancy' => $getOccupancyForDate($currentDate->toDateString()),
                'fullDate'  => $currentDate->toDateString(),
            ];
            $currentDate->addDay();
        }

        // THIS YEAR
        $thisYearTrend = [];
        for ($month = 1; $month <= 12; $month++) {
            $monthStart = Carbon::create($currentYear, $month, 1)->startOfMonth();
            $monthEnd   = Carbon::create($currentYear, $month, 1)->endOfMonth();

            if ($monthStart->gt(Carbon::today())) {
                $thisYearTrend[] = [
                    'day'       => $monthStart->format('M Y'),
                    'occupancy' => 0,
                    'fullDate'  => $monthStart->toDateString(),
                ];
                continue;
            }

            $totalOcc  = 0;
            $daysCount = 0;
            $iter      = $monthStart->copy();
            while ($iter->lte($monthEnd) && $iter->lte(Carbon::today())) {
                $totalOcc += $getOccupancyForDate($iter->toDateString());
                $daysCount++;
                $iter->addDay();
            }

            $thisYearTrend[] = [
                'day'       => $monthStart->format('M Y'),
                'occupancy' => $daysCount > 0 ? round($totalOcc / $daysCount, 2) : 0,
                'fullDate'  => $monthStart->toDateString(),
            ];
        }

        // FINANCIAL TREND — bulk queries (FIXED)
        $thirtyDaysAgo = Carbon::today()->subDays(29)->startOfDay();

        // $dailyRevenueRaw = BookingPayment::where('created_at', '>=', $thirtyDaysAgo)
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->selectRaw('DATE(created_at) as date, SUM(total_price) as total')
        //     ->groupBy('date')
        //     ->pluck('total', 'date');
        $dailyPaidRaw = BookingPayment::where('payment_status', 'paid')
            ->where('payment_date', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyRefundRaw = BookingPayment::where('payment_status', 'refunded')
            ->where('payment_date', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyExpensesRaw = CashTransaction::where('type', 'pay_out')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $financialTrend = [];
        for ($i = 29; $i >= 0; $i--) {
            $date             = Carbon::today()->subDays($i);
            $dateStr          = $date->toDateString();
            // $rev              = $dailyRevenueRaw[$dateStr] ?? 0;
            $rev = ($dailyPaidRaw[$dateStr] ?? 0)
                - ($dailyRefundRaw[$dateStr] ?? 0);
            $exp              = $dailyExpensesRaw[$dateStr] ?? 0;
            $financialTrend[] = [
                'name'     => $date->format('M d'),
                'date'     => $dateStr,
                'revenue'  => $rev,
                'expenses' => $exp,
                'profit'   => $rev - $exp,
            ];
        }

        // YEARLY TREND
        // $yearlyRevenueRaw = BookingPayment::whereNull('deleted_at')
        //     ->whereYear('created_at', $currentYear)
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->selectRaw('MONTH(created_at) as month, SUM(total_price) as total')
        //     ->groupBy('month')->pluck('total', 'month');
        $yearlyPaidRaw = BookingPayment::where('payment_status', 'paid')
            ->whereYear('payment_date', $currentYear)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total')
            ->groupBy('month')
            ->pluck('total', 'month');

        $yearlyRefundRaw = BookingPayment::where('payment_status', 'refunded')
            ->whereYear('payment_date', $currentYear)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total')
            ->groupBy('month')
            ->pluck('total', 'month');

        $yearlyExpensesRaw = CashTransaction::where('type', 'pay_out')
            ->whereYear('created_at', $currentYear)
            ->selectRaw('MONTH(created_at) as month, SUM(amount) as total')
            ->groupBy('month')->pluck('total', 'month');

        $yearlyTrend = [];
        for ($m = 1; $m <= 12; $m++) {
            $rev = ($yearlyPaidRaw[$m] ?? 0)
                - ($yearlyRefundRaw[$m] ?? 0);
            // $rev           = $yearlyRevenueRaw[$m] ?? 0;
            $exp           = $yearlyExpensesRaw[$m] ?? 0;
            $yearlyTrend[] = [
                'name'     => Carbon::create()->month($m)->format('M'),
                'date'     => Carbon::create($currentYear, $m, 1)->toDateString(),
                'revenue'  => $rev,
                'expenses' => $exp,
                'profit'   => $rev - $exp,
            ];
        }

        // LAST YEAR TREND
        // $lastYearRevenueRaw = BookingPayment::whereNull('deleted_at')
        //     ->whereYear('created_at', $lastYear)
        //     ->whereHas('bookedRooms', function ($q) {
        //         $q->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        //     })
        //     ->selectRaw('MONTH(created_at) as month, SUM(total_price) as total')
        //     ->groupBy('month')->pluck('total', 'month');
        $lastYearPaidRaw = BookingPayment::where('payment_status', 'paid')
            ->whereYear('payment_date', $lastYear)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total')
            ->groupBy('month')
            ->pluck('total', 'month');

        $lastYearRefundRaw = BookingPayment::where('payment_status', 'refunded')
            ->whereYear('payment_date', $lastYear)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total')
            ->groupBy('month')
            ->pluck('total', 'month');

        $lastYearExpensesRaw = CashTransaction::where('type', 'pay_out')
            ->whereYear('created_at', $lastYear)
            ->selectRaw('MONTH(created_at) as month, SUM(amount) as total')
            ->groupBy('month')->pluck('total', 'month');

        $lastYearTrend = [];
        for ($m = 1; $m <= 12; $m++) {
            // $rev             = $lastYearRevenueRaw[$m] ?? 0;
            $rev                = ($lastYearPaidRaw[$m] ?? 0)
                - ($lastYearRefundRaw[$m] ?? 0);
            $exp             = $lastYearExpensesRaw[$m] ?? 0;
            $lastYearTrend[] = [
                'name'     => Carbon::create()->month($m)->format('M'),
                'date'     => Carbon::create($lastYear, $m, 1)->toDateString(),
                'revenue'  => $rev,
                'expenses' => $exp,
                'profit'   => $rev - $exp,
                'year'     => $lastYear,
            ];
        }

        // METRICS
        $peakOccupancy    = collect($thirtyDayTrend)->max('occupancy') ?? 0;
        $averageOccupancy = collect($thirtyDayTrend)->avg('occupancy') ?? 0;

        $occupancyStatus = 'normal';
        $occupancyAlert  = null;
        if ($currentOccupancyRate >= 90) {
            $occupancyStatus = 'critical';
            $occupancyAlert  = 'High occupancy! Only ' . ($totalActiveRooms - $occupied) . ' rooms left.';
        } elseif ($currentOccupancyRate >= 75) {
            $occupancyStatus = 'high';
            $occupancyAlert  = 'Occupancy is above 75%. Consider additional staff scheduling.';
        } elseif ($currentOccupancyRate <= 20 && $currentOccupancyRate > 0) {
            $occupancyStatus = 'low';
            $occupancyAlert  = 'Low occupancy. Consider running promotions or discounts.';
        } elseif ($currentOccupancyRate == 0) {
            $occupancyStatus = 'empty';
            $occupancyAlert  = 'No rooms currently occupied.';
        }

        return response()->json([
            'stats' => [
                'guests'          => $totalGuests,
                'rooms'           => $totalActiveRooms,
                'bookings'        => $activeBookings,
                'revenue'         => $totalRevenue,
                'expenses'        => $totalExpenses,
                'profit'          => $totalProfit,
                'revenue_change'  => round($revenueChange, 1),
                'expenses_change' => round($expensesChange, 1),
                'profit_change'   => round($profitChange, 1),
            ],
            'recentBookings'   => $recentBookings,
            'occupancy'        => $currentOccupancyRate,
            'occupancyMetrics' => [
                'current' => $currentOccupancyRate,
                'peak'    => $peakOccupancy,
                'average' => round($averageOccupancy, 2),
                'status'  => $occupancyStatus,
                'alert'   => $occupancyAlert,
            ],
            'roomStatus' => [
                ['name' => 'Available',   'value' => $available,   'color' => '#2e7d64'],
                ['name' => 'Occupied',    'value' => $occupied,    'color' => '#3b82f6'],
                ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                ['name' => 'Dirty',       'value' => $dirty,       'color' => '#8b5cf6'],
                ['name' => 'Cleaning',    'value' => $cleaning,    'color' => '#f59e0b'],
            ],
            'trend'          => $trend,
            'thirtyDayTrend' => $thirtyDayTrend,
            'thisMonthTrend' => $thisMonthTrend,
            'thisYearTrend'  => $thisYearTrend,
            'financialTrend' => $financialTrend,
            'yearlyTrend'    => $yearlyTrend,
            'lastYearTrend'  => $lastYearTrend,
        ]);
    }
}
