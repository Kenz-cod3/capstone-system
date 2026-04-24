<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        return Cache::remember('dashboard_data', 10, function () {

            // USERS
            $totalGuests = User::where('role', 'guest')->count();

            // ROOMS (exclude maintenance para realistic occupancy)
            $totalRooms = Room::whereNull('deleted_at')
                ->where('status', '!=', 'maintenance')
                ->count();

            // BOOKINGS
            $activeBookings = Booking::whereNull('deleted_at')
                ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
                ->count();

            // REVENUE
            $totalRevenue = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                ->sum('total_price');

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

            for ($i = 6; $i >= 0; $i--) {

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
            return response()->json([
                'stats' => [
                    'guests' => $totalGuests,
                    'rooms' => $totalRooms,
                    'bookings' => $activeBookings,
                    'revenue' => $totalRevenue
                ],
                'recentBookings' => $recentBookings,
                'occupancy' => $occupancyRate,
                'roomStatus' => [
                    ['name' => 'Available', 'value' => $available, 'color' => '#2e7d64'],
                    ['name' => 'Occupied', 'value' => $occupied, 'color' => '#3b82f6'],
                    ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                ],
                'trend' => $trend
            ]);
        });
    }
}
