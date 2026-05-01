<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    RoomController,
    RoomTypeController,
    RoomStatusHistoryController,
    RoomImageController
};

Route::get('/rooms/damaged', [RoomController::class, 'damaged']);

Route::apiResource('rooms', RoomController::class);
Route::apiResource('room-types', RoomTypeController::class);
Route::apiResource('room-status-history', RoomStatusHistoryController::class);
Route::apiResource('room-images', RoomImageController::class);

Route::get('/occupancy', [RoomController::class, 'occupancy']);
Route::get('/occupancy-trend', [RoomController::class, 'occupancyTrend']);
