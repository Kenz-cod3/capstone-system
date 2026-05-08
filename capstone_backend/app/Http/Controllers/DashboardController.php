<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use App\Models\CashTransaction;
use App\Models\WalkInGuest;
use App\Models\BookedRoom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $isStaff = $user->role === 'staff';

        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();

        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        return Cache::remember('dashboard_data_' . $user->id, 60, function () use ($isStaff, $todayStart, $todayEnd, $today, $yesterday) {

            // USERS
            if ($isStaff) {
                $totalGuests = User::where('role', 'guest')
                    ->whereBetween('created_at', [$todayStart, $todayEnd])
                    ->count() + WalkInGuest::whereBetween('created_at', [$todayStart, $todayEnd])->count();
            } else {
                $totalGuests = User::where('role', 'guest')->count() + WalkInGuest::count();
            }

            // ROOMS - Include ALL rooms except soft-deleted
            $totalRooms = Room::whereNull('deleted_at')->count();
            $totalActiveRooms = Room::whereNull('deleted_at')->where('status', '!=', 'maintenance')->count();

            if ($isStaff) {
                $activeBookings = Booking::whereNull('deleted_at')
                    ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
                    ->count();
            } else {
                $activeBookings = Booking::whereNull('deleted_at')->count();
            }

            // REVENUE
            $totalRevenueQuery = Booking::whereIn('booking_status', ['checked_in', 'checked_out'])
                ->whereNull('deleted_at')
                ->whereYear('created_at', Carbon::now()->year);

            if ($isStaff) {
                $totalRevenueQuery->whereBetween('updated_at', [$todayStart, $todayEnd]);
            }

            $totalRevenue = $totalRevenueQuery->sum('total_price');

            // EXPENSES
            $totalExpensesQuery = CashTransaction::where('type', 'pay_out');
            if ($isStaff) {
                $totalExpensesQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
            }
            $totalExpenses = $totalExpensesQuery->sum('amount');

            // WEEK RANGE CALCULATIONS
            $startOfThisWeek = Carbon::now()->startOfWeek();
            $endOfThisWeek = Carbon::now()->endOfWeek();
            $startOfLastWeek = Carbon::now()->subWeek()->startOfWeek();
            $endOfLastWeek = Carbon::now()->subWeek()->endOfWeek();

            $thisWeekRevenue = Booking::whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])->sum('total_price');
            $lastWeekRevenue = Booking::whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])->sum('total_price');

            if ($isStaff) {
                $todayRevenue = Booking::whereDate('updated_at', $today)
                    ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->sum('total_price');
                $yesterdayRevenue = Booking::whereDate('created_at', $yesterday)->sum('total_price');
                $revenueChange = $yesterdayRevenue > 0 ? min((($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 100) : ($todayRevenue > 0 ? 100 : 0);
            } else {
                $revenueChange = $lastWeekRevenue > 0 ? min((($thisWeekRevenue - $lastWeekRevenue) / $lastWeekRevenue) * 100, 100) : ($thisWeekRevenue > 0 ? 100 : 0);
            }

            $thisWeekExpenses = CashTransaction::where('type', 'pay_out')->whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])->sum('amount');
            $lastWeekExpenses = CashTransaction::where('type', 'pay_out')->whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])->sum('amount');

            if ($isStaff) {
                $todayExpenses = CashTransaction::where('type', 'pay_out')->whereDate('created_at', $today)->sum('amount');
                $yesterdayExpenses = CashTransaction::where('type', 'pay_out')->whereDate('created_at', $yesterday)->sum('amount');
                $expensesChange = $yesterdayExpenses > 0 ? min((($todayExpenses - $yesterdayExpenses) / $yesterdayExpenses) * 100, 100) : ($todayExpenses > 0 ? 100 : 0);
            } else {
                $expensesChange = $lastWeekExpenses > 0 ? min((($thisWeekExpenses - $lastWeekExpenses) / $lastWeekExpenses) * 100, 100) : ($thisWeekExpenses > 0 ? 100 : 0);
            }

            $totalProfit = $totalRevenue - $totalExpenses;
            $thisWeekProfit = $thisWeekRevenue - $thisWeekExpenses;
            $lastWeekProfit = $lastWeekRevenue - $lastWeekExpenses;

            if ($isStaff) {
                $todayProfit = $todayRevenue - $todayExpenses;
                $yesterdayProfit = $yesterdayRevenue - $yesterdayExpenses;
                $profitChange = $yesterdayProfit != 0 ? min((($todayProfit - $yesterdayProfit) / abs($yesterdayProfit)) * 100, 100) : ($todayProfit > 0 ? 100 : 0);
            } else {
                $profitChange = $lastWeekProfit != 0 ? min((($thisWeekProfit - $lastWeekProfit) / abs($lastWeekProfit)) * 100, 100) : ($thisWeekProfit > 0 ? 100 : 0);
            }

            // RECENT BOOKINGS
            $recentBookings = Booking::with(['user', 'walkInGuest', 'rooms' => function ($q) {
                $q->whereNull('deleted_at');
            }])->latest()->limit(5)->get();

            // ROOM STATUS - CURRENT REAL-TIME
            $occupied = Room::whereNull('deleted_at')->where('status', 'occupied')->count();
            $available = Room::whereNull('deleted_at')->where('status', 'available')->count();
            $maintenance = Room::whereNull('deleted_at')->where('status', 'maintenance')->count();
            $cleaning = Room::whereNull('deleted_at')->where('status', 'cleaning')->count();
            $dirty = Room::whereNull('deleted_at')->where('status', 'dirty')->count();

            $currentOccupancyRate = $totalActiveRooms > 0 ? round(($occupied / $totalActiveRooms) * 100, 2) : 0;

            // =========================
            // 🔥 OCCUPANCY TREND - REALISTIC CALCULATION
            // =========================
            
            // Get all bookings with their booked rooms
            $bookings = Booking::whereNull('deleted_at')
                ->whereNotIn('booking_status', ['cancelled'])
                ->with(['bookedRooms.room'])
                ->get();

            // Helper: Get occupied rooms for a specific date based on ACTUAL occupancy
            $getOccupiedRoomsForDate = function($dateString) use ($bookings) {
                $occupiedRoomIds = collect();
                $targetDate = Carbon::parse($dateString);
                $today = Carbon::today();
                
                foreach ($bookings as $booking) {
                    // Skip cancelled bookings
                    if ($booking->booking_status === 'cancelled') {
                        continue;
                    }
                    
                    $checkInDate = Carbon::parse($booking->check_in_date);
                    $checkOutDate = $booking->check_out_date ? Carbon::parse($booking->check_out_date) : null;
                    
                    // Determine if booking is active on this date
                    $isActive = false;
                    
                    if ($booking->booking_status === 'checked_in') {
                        // Currently checked in - active from check-in date onwards
                        $isActive = $targetDate->gte($checkInDate);
                        
                        // If checked out, check against actual check-out time from booked_rooms
                        foreach ($booking->bookedRooms as $bookedRoom) {
                            if ($bookedRoom->check_out_time) {
                                $actualCheckOut = Carbon::parse($bookedRoom->check_out_time);
                                if ($targetDate->gt($actualCheckOut)) {
                                    $isActive = false;
                                }
                            }
                        }
                    } 
                    elseif ($booking->booking_status === 'checked_out') {
                        // Check if date falls within stay period using actual check-out time
                        foreach ($booking->bookedRooms as $bookedRoom) {
                            if ($bookedRoom->check_out_time) {
                                $actualCheckOut = Carbon::parse($bookedRoom->check_out_time);
                                if ($targetDate->gte($checkInDate) && $targetDate->lte($actualCheckOut)) {
                                    $isActive = true;
                                    break;
                                }
                            }
                        }
                    }
                    elseif ($booking->booking_status === 'confirmed') {
                        // Future booking - only count if date is between check-in and check-out
                        // AND it's for future dates (not past)
                        if ($checkOutDate && $targetDate->gte($checkInDate) && $targetDate->lte($checkOutDate)) {
                            // Only count confirmed bookings for future dates or today if they have check_in_time
                            if ($targetDate->gt($today) || ($targetDate->eq($today) && $booking->check_in_time)) {
                                $isActive = true;
                            }
                        }
                    }
                    
                    if ($isActive) {
                        foreach ($booking->bookedRooms as $bookedRoom) {
                            if ($bookedRoom->room && $bookedRoom->room->status !== 'maintenance' && $bookedRoom->room->deleted_at === null) {
                                $occupiedRoomIds->push($bookedRoom->room_id);
                            }
                        }
                    }
                }
                
                return $occupiedRoomIds->unique()->count();
            };

            // Helper: Get total rooms available on a specific date
            $getTotalRoomsForDate = function($dateString) {
                return Room::whereNull('deleted_at')
                    ->where('status', '!=', 'maintenance')
                    ->count();
            };

            // Helper: Get occupancy percentage (0-100% only)
            $getOccupancyForDate = function($dateString) use ($getOccupiedRoomsForDate, $getTotalRoomsForDate) {
                $occupiedRooms = $getOccupiedRoomsForDate($dateString);
                $totalRooms = $getTotalRoomsForDate($dateString);
                
                if ($totalRooms === 0) return 0;
                
                // Calculate realistic percentage (0-100% only)
                $percentage = ($occupiedRooms / $totalRooms) * 100;
                
                // Cap at 100% maximum (can't exceed 100%)
                $percentage = min($percentage, 100);
                
                // Round to 2 decimal places for professional display
                return round($percentage, 2);
            };

            // Generate Last 7 days trend
            $trend = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = Carbon::today()->subDays($i);
                $trend[] = [
                    'day' => $date->format('M d, Y'),
                    'occupancy' => $getOccupancyForDate($date->toDateString()),
                    'fullDate' => $date->toDateString()
                ];
            }

            // Generate Last 30 days trend
            $thirtyDayTrend = [];
            for ($i = 29; $i >= 0; $i--) {
                $date = Carbon::today()->subDays($i);
                $thirtyDayTrend[] = [
                    'day' => $date->format('M d, Y'),
                    'occupancy' => $getOccupancyForDate($date->toDateString()),
                    'fullDate' => $date->toDateString()
                ];
            }

            // Generate This month trend
            $thisMonthTrend = [];
            $startOfMonth = Carbon::today()->startOfMonth();
            $endOfMonth = Carbon::today()->endOfMonth();
            $currentDate = clone $startOfMonth;
            while ($currentDate <= $endOfMonth) {
                $thisMonthTrend[] = [
                    'day' => $currentDate->format('M d, Y'),
                    'occupancy' => $getOccupancyForDate($currentDate->toDateString()),
                    'fullDate' => $currentDate->toDateString()
                ];
                $currentDate->addDay();
            }

            // Generate This year trend (monthly averages)
            $thisYearTrend = [];
            $currentYear = Carbon::now()->year;
            for ($month = 1; $month <= 12; $month++) {
                $monthStart = Carbon::create($currentYear, $month, 1);
                $monthEnd = Carbon::create($currentYear, $month, 1)->endOfMonth();
                
                $totalOccupancy = 0;
                $daysCount = 0;
                $dateIterator = clone $monthStart;
                
                while ($dateIterator <= $monthEnd) {
                    $totalOccupancy += $getOccupancyForDate($dateIterator->toDateString());
                    $daysCount++;
                    $dateIterator->addDay();
                }
                
                $avgOccupancy = $daysCount > 0 ? round($totalOccupancy / $daysCount, 2) : 0;
                
                $thisYearTrend[] = [
                    'day' => $monthStart->format('M Y'),
                    'occupancy' => $avgOccupancy,
                    'fullDate' => $monthStart->toDateString()
                ];
            }

            // Financial Trend (Last 30 days)
            $financialTrend = [];
            for ($i = 29; $i >= 0; $i--) {
                $date = Carbon::today()->subDays($i);
                $start = $date->copy()->startOfDay();
                $end = $date->copy()->endOfDay();

                $dailyRevenue = Booking::whereBetween('created_at', [$start, $end])
                    ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->sum('total_price');

                $dailyExpenses = CashTransaction::where('type', 'pay_out')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('amount');

                $dailyProfit = $dailyRevenue - $dailyExpenses;

                $financialTrend[] = [
                    'name' => $date->format('M d'),
                    'date' => $date->toDateString(),
                    'revenue' => $dailyRevenue,
                    'expenses' => $dailyExpenses,
                    'profit' => $dailyProfit,
                ];
            }

            // Yearly Trend (Current Year)
            $yearlyTrend = [];
            for ($m = 1; $m <= 12; $m++) {
                $start = Carbon::create($currentYear, $m, 1)->startOfMonth();
                $end = Carbon::create($currentYear, $m, 1)->endOfMonth();

                $monthlyRevenue = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->whereNull('deleted_at')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('total_price');

                $monthlyExpenses = CashTransaction::where('type', 'pay_out')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('amount');

                $monthlyProfit = $monthlyRevenue - $monthlyExpenses;

                $yearlyTrend[] = [
                    'name' => Carbon::create()->month($m)->format('M'),
                    'date' => $start->toDateString(),
                    'revenue' => $monthlyRevenue,
                    'expenses' => $monthlyExpenses,
                    'profit' => $monthlyProfit,
                ];
            }

            // Last Year Trend
            $lastYearTrend = [];
            $lastYear = Carbon::now()->year - 1;
            for ($m = 1; $m <= 12; $m++) {
                $start = Carbon::create($lastYear, $m, 1)->startOfMonth();
                $end = Carbon::create($lastYear, $m, 1)->endOfMonth();

                $monthlyRevenue = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->whereNull('deleted_at')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('total_price');

                $monthlyExpenses = CashTransaction::where('type', 'pay_out')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('amount');

                $monthlyProfit = $monthlyRevenue - $monthlyExpenses;

                $lastYearTrend[] = [
                    'name' => Carbon::create()->month($m)->format('M'),
                    'date' => $start->toDateString(),
                    'revenue' => $monthlyRevenue,
                    'expenses' => $monthlyExpenses,
                    'profit' => $monthlyProfit,
                    'year' => $lastYear,
                ];
            }

            // Calculate additional professional metrics
            $peakOccupancy = collect($thirtyDayTrend)->max('occupancy') ?? 0;
            $averageOccupancy = collect($thirtyDayTrend)->avg('occupancy') ?? 0;
            
            // Determine occupancy status for alert
            $occupancyStatus = 'normal';
            $occupancyAlert = null;
            if ($currentOccupancyRate >= 90) {
                $occupancyStatus = 'critical';
                $occupancyAlert = 'High occupancy! Only ' . ($totalActiveRooms - $occupied) . ' rooms left.';
            } elseif ($currentOccupancyRate >= 75) {
                $occupancyStatus = 'high';
                $occupancyAlert = 'Occupancy is above 75%. Consider additional staff scheduling.';
            } elseif ($currentOccupancyRate <= 20 && $currentOccupancyRate > 0) {
                $occupancyStatus = 'low';
                $occupancyAlert = 'Low occupancy. Consider running promotions or discounts.';
            } elseif ($currentOccupancyRate == 0) {
                $occupancyStatus = 'empty';
                $occupancyAlert = 'No rooms currently occupied.';
            }

            return response()->json([
                'stats' => [
                    'guests' => $totalGuests,
                    'rooms' => $totalActiveRooms,
                    'bookings' => $activeBookings,
                    'revenue' => $totalRevenue,
                    'expenses' => $totalExpenses,
                    'profit' => $totalProfit,
                    'revenue_change' => round($revenueChange, 1),
                    'expenses_change' => round($expensesChange, 1),
                    'profit_change' => round($profitChange, 1),
                ],
                'recentBookings' => $recentBookings,
                'occupancy' => $currentOccupancyRate,
                'occupancyMetrics' => [
                    'current' => $currentOccupancyRate,
                    'peak' => $peakOccupancy,
                    'average' => round($averageOccupancy, 2),
                    'status' => $occupancyStatus,
                    'alert' => $occupancyAlert,
                ],
                'roomStatus' => [
                    ['name' => 'Available', 'value' => $available, 'color' => '#2e7d64'],
                    ['name' => 'Occupied', 'value' => $occupied, 'color' => '#3b82f6'],
                    ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                    ['name' => 'Dirty', 'value' => $dirty, 'color' => '#8b5cf6'],
                    ['name' => 'Cleaning', 'value' => $cleaning, 'color' => '#f59e0b'],
                ],
                'trend' => $trend,
                'thirtyDayTrend' => $thirtyDayTrend,
                'thisMonthTrend' => $thisMonthTrend,
                'thisYearTrend' => $thisYearTrend,
                'financialTrend' => $financialTrend,
                'yearlyTrend' => $yearlyTrend,
                'lastYearTrend' => $lastYearTrend,
            ]);
        });
    }
}