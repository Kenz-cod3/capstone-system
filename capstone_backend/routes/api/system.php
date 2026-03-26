<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    InventoryLogController,
    StaffActivityLogController,
    ReportController,
    ReviewController
};

Route::apiResource('inventory-logs', InventoryLogController::class);
Route::apiResource('staff-activity-logs', StaffActivityLogController::class);
Route::apiResource('reviews', ReviewController::class);

Route::get('/reports', [ReportController::class, 'index']);
