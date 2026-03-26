<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index()
    {
        return Cache::remember('dashboard_data', 60, function () {

            // USERS
            $totalGuests = User::where('role', 'guest')->count();

            // ROOMS
            $totalRooms = Room::count();

            // BOOKINGS
            $activeBookings = Booking::whereNull('deleted_at')
                ->whereNotIn('booking_status', ['checked_out', 'cancelled'])
                ->count();

            // REVENUE
            $totalRevenue = Booking::whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                ->sum('total_price');

            // RECENT BOOKINGS
            $recentBookings = Booking::with(['user', 'walkInGuest', 'rooms'])
                ->latest()
                ->limit(5)
                ->get();

            // ROOM STATUS
            $occupied = Room::where('status', 'occupied')->count();
            $available = Room::where('status', 'available')->count();
            $maintenance = Room::where('status', 'maintenance')->count();

            $occupancyRate = $totalRooms > 0
                ? round(($occupied / $totalRooms) * 100, 2)
                : 0;

            // TREND
            $trend = [];

            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i)->format('Y-m-d');

                $occupiedRooms = Booking::whereDate('created_at', $date)
                    ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                    ->with('rooms')
                    ->get()
                    ->pluck('rooms')
                    ->flatten()
                    ->count();

                $rate = $totalRooms > 0
                    ? round(($occupiedRooms / $totalRooms) * 100, 2)
                    : 0;

                $trend[] = [
                    'day' => \Carbon\Carbon::parse($date)->format('D'),
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
