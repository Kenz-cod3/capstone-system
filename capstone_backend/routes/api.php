<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// PUBLIC
require __DIR__ . '/api/auth.php';

// PROTECTED
Route::middleware('auth:sanctum')->group(function () {
    require __DIR__ . '/api/users.php';
    require __DIR__ . '/api/bookings.php';
    require __DIR__ . '/api/rooms.php';
    require __DIR__ . '/api/messages.php';
    require __DIR__ . '/api/notifications.php';
    require __DIR__ . '/api/restaurant.php';
    require __DIR__ . '/api/system.php';

    Route::get('/dashboard', [DashboardController::class, 'index']);
});
