<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AmenityController,
    RoomController,
    RoomTypeController,
    RoomStatusHistoryController,
    RoomImageController
};

Route::get('/rooms/damaged', [RoomController::class, 'damaged']);

Route::get('/rooms/status-grid', [RoomController::class, 'statusGrid']);

// ── NEW: Date-based availability endpoints ──
Route::get('/rooms/{id}/check-availability', [RoomController::class, 'checkAvailability']);
Route::get('/rooms/{id}/booked-dates', [RoomController::class, 'bookedDates']);

Route::get('/occupancy', [RoomController::class, 'occupancy']);
Route::get('/occupancy-trend', [RoomController::class, 'occupancyTrend']);

Route::apiResource('rooms', RoomController::class);
Route::apiResource('room-types', RoomTypeController::class);
Route::apiResource('amenities', AmenityController::class);
Route::apiResource('room-status-history', RoomStatusHistoryController::class);
Route::apiResource('room-images', RoomImageController::class);