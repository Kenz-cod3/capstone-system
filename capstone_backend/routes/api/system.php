<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    CashierActivityLogController,
    InventoryLogController,
    ReportController,
    ReviewController
};

Route::apiResource('inventory-logs', InventoryLogController::class);
Route::apiResource('staff-activity-logs', CashierActivityLogController::class);
Route::apiResource('reviews', ReviewController::class);

Route::get('/reports', [ReportController::class, 'index']);
