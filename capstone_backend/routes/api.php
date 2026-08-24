<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PayMongoController;
use App\Http\Controllers\ReservationMonitorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// PUBLIC
require __DIR__ . '/api/auth.php';

Route::post('/paymongo/webhook', [PayMongoController::class, 'webhook']);

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

    // require __DIR__ . '/api/paymongo.php';
    Route::post('/paymongo/create-payment', [PayMongoController::class, 'createPayment']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/financial-range', [DashboardController::class, 'financialRange']);

    Route::get('/reservation-monitor', [ReservationMonitorController::class, 'index']);
});
