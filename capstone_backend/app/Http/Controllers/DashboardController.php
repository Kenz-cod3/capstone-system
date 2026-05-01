<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $isStaff = $user->role === 'staff';

        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();

        return Cache::remember('dashboard_data_' . $user->id, 10, function () use ($isStaff, $todayStart, $todayEnd) {

            // USERS
            $totalGuests = User::where('role', 'guest')->count();

            // ROOMS (exclude maintenance para realistic occupancy)
            $totalRooms = Room::whereNull('deleted_at')
                ->where('status', '!=', 'maintenance')
                ->count();

            // BOOKINGS
            $activeBookingsQuery = Booking::whereNull('deleted_at')
                ->whereNotIn('booking_status', ['checked_out', 'cancelled']);

            if ($isStaff) {
                $activeBookingsQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
            }

            $activeBookings = $activeBookingsQuery->count();

            // REVENUE
            $totalRevenueQuery = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out']);

            if ($isStaff) {
                $totalRevenueQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
            }

            $totalRevenue = $totalRevenueQuery->sum('total_price');

            // EXPENSES
            $totalExpensesQuery = CashTransaction::where('type', 'pay_out');

            if ($isStaff) {
                $totalExpensesQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
            }

            $totalExpenses = $totalExpensesQuery->sum('amount');


            //-----------WEEK RANGE (THIS WEEK vs LAST WEEK)----->
            $startOfThisWeek = Carbon::now()->startOfWeek();
            $endOfThisWeek = Carbon::now()->endOfWeek();

            $startOfLastWeek = Carbon::now()->subWeek()->startOfWeek();
            $endOfLastWeek = Carbon::now()->subWeek()->endOfWeek();


            //-----------REVENUE CHANGE (THIS WEEK vs LAST WEEK)----->
            $thisWeekRevenue = Booking::whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])
                ->sum('total_price');

            $lastWeekRevenue = Booking::whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])
                ->sum('total_price');

            $revenueChange = $lastWeekRevenue > 0
                ? (($thisWeekRevenue - $lastWeekRevenue) / $lastWeekRevenue) * 100
                : 0;


            //-----------EXPENSE CHANGE (THIS WEEK vs LAST WEEK)----->
            $thisWeekExpenses = CashTransaction::where('type', 'pay_out')
                ->whereBetween('created_at', [$startOfThisWeek, $endOfThisWeek])
                ->sum('amount');

            $lastWeekExpenses = CashTransaction::where('type', 'pay_out')
                ->whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])
                ->sum('amount');

            $expensesChange = $lastWeekExpenses == 0
                ? ($thisWeekExpenses > 0 ? 100 : 0)
                : (($thisWeekExpenses - $lastWeekExpenses) / $lastWeekExpenses) * 100;


            //-----------PROFIT CHANGE (THIS WEEK vs LAST WEEK)----->
            $totalProfit = $totalRevenue - $totalExpenses;

            $thisWeekProfit = $thisWeekRevenue - $thisWeekExpenses;
            $lastWeekProfit = $lastWeekRevenue - $lastWeekExpenses;

            $profitChange = $lastWeekProfit != 0
                ? (($thisWeekProfit - $lastWeekProfit) / abs($lastWeekProfit)) * 100
                : 0;
            // RECENT BOOKINGS
            $recentBookings = Booking::with([
                'user',
                'walkInGuest',
                'rooms' => function ($q) {
                    $q->whereNull('deleted_at');
                }
            ])
                ->latest()
                ->limit(5)
                ->get();

            // ROOM STATUS
            $occupied = Room::whereNull('deleted_at')
                ->where('status', 'occupied')
                ->count();

            $available = Room::whereNull('deleted_at')
                ->where('status', 'available')
                ->count();

            $maintenance = Room::whereNull('deleted_at')
                ->where('status', 'maintenance')
                ->count();

            $cleaning = Room::whereNull('deleted_at')
                ->where('status', 'cleaning')
                ->count();

            $dirty = Room::whereNull('deleted_at')
                ->where('status', 'dirty')
                ->count();

            $occupancyRate = $totalRooms > 0
                ? round(($occupied / $totalRooms) * 100, 2)
                : 0;

            // =========================
            // 🔥 OCCUPANCY TREND (FIXED)
            // =========================
            $trend = [];

            // preload bookings para faster
            $bookings = Booking::whereNull('deleted_at')
                ->whereNotIn('booking_status', ['cancelled'])
                ->with('rooms')
                ->get();

            $days = 6;

            for ($i = $days; $i >= 0; $i--) {

                $date = Carbon::today()->subDays($i)->toDateString();

                if ($date == Carbon::today()->toDateString()) {

                    // ✅ REAL-TIME (TODAY)
                    $occupiedRooms = Room::whereNull('deleted_at')
                        ->where('status', 'occupied')
                        ->count();

                    $totalRoomsPerDate = Room::whereNull('deleted_at')
                        ->where('status', '!=', 'maintenance')
                        ->count();
                } else {

                    // ✅ HISTORY (BOOKINGS)
                    $occupiedRooms = $bookings->filter(function ($booking) use ($date) {
                        return $booking->check_in_date <= $date &&
                            $booking->check_out_date > $date;
                    })
                        ->pluck('rooms')
                        ->flatten()
                        ->filter(function ($room) {
                            return $room && $room->status !== 'maintenance' && $room->deleted_at === null;
                        })
                        ->unique('id')
                        ->count();

                    // ✅ ROOM EXISTENCE PER DATE
                    $totalRoomsPerDate = Room::where(function ($q) use ($date) {
                        $q->whereNull('deleted_at')
                            ->orWhere('deleted_at', '>', $date);
                    })
                        ->where('status', '!=', 'maintenance')
                        ->count();
                }

                $rate = $totalRoomsPerDate > 0
                    ? round(($occupiedRooms / $totalRoomsPerDate) * 100, 2)
                    : 0;

                $trend[] = [
                    'day' => Carbon::parse($date)->format('D'),
                    'occupancy' => $rate
                ];
            }

            //-----------REVENUE / EXPENSE / PROFIT TREND (LAST 7 DAYS)----->
            $financialTrend = [];

            $days = $isStaff ? 0 : 6;

            for ($i = $days; $i >= 0; $i--) {

                $date = Carbon::today()->subDays($i);

                $start = $date->copy()->startOfDay();
                $end = $date->copy()->endOfDay();

                // DAILY REVENUE
                $dailyRevenue = Booking::whereBetween('created_at', [$start, $end])
                    ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->sum('total_price');

                // DAILY EXPENSES
                $dailyExpenses = CashTransaction::where('type', 'pay_out')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('amount');

                // DAILY PROFIT
                $dailyProfit = $dailyRevenue - $dailyExpenses;

                $financialTrend[] = [
                    'name' => $date->format('D'),
                    'revenue' => $dailyRevenue,
                    'expenses' => $dailyExpenses,
                    'profit' => $dailyProfit,
                ];
            }
            return response()->json([
                'stats' => [
                    'guests' => $totalGuests,
                    'rooms' => $totalRooms,
                    'bookings' => $activeBookings,
                    'revenue' => $totalRevenue,
                    'expenses' => $totalExpenses,

                    'profit' => $totalProfit,

                    'revenue_change' => round($revenueChange, 1),
                    'expenses_change' => round($expensesChange, 1),
                    'profit_change' => round($profitChange, 1),
                ],
                'recentBookings' => $recentBookings,
                'occupancy' => $occupancyRate,
                'roomStatus' => [
                    ['name' => 'Available', 'value' => $available, 'color' => '#2e7d64'],
                    ['name' => 'Occupied', 'value' => $occupied, 'color' => '#3b82f6'],
                    ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                    ['name' => 'Dirty',       'value' => $dirty,       'color' => '#8b5cf6'],
                    ['name' => 'Cleaning',    'value' => $cleaning,    'color' => '#f59e0b'],

                ],
                'trend' => $trend,
                'financialTrend' => $financialTrend,
            ]);
        });
    }
}
