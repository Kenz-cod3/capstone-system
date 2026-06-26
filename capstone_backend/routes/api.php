<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// PUBLIC
require __DIR__ . '/api/auth.php';

// PROTECTED
Route::middleware('auth:sanctum')->group(function () {
    require __DIR__ . '/api/users.php';
    require __DIR__ . '/api/bookings.php';
    require __DIR__ . '/api/transactions.php';
    require __DIR__ . '/api/rooms.php';
    require __DIR__ . '/api/addons.php';
    require __DIR__ . '/api/messages.php';
    require __DIR__ . '/api/notifications.php';
    require __DIR__ . '/api/restaurant.php';
    require __DIR__ . '/api/system.php';

    require __DIR__ . '/api/shift.php';
    require __DIR__ . '/api/cash.php';

    require __DIR__ . '/api/housekeeper.php';
    
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']); // ← ADD
});