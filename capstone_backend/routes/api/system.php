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

// =============================================
// ALL REPORTS - Lahat nasa ReportController
// =============================================
Route::prefix('reports')->controller(ReportController::class)->group(function () {
    // Booking reports
    Route::get('/', 'index');
    
    // Guest reports
    Route::get('/guests', 'guests');
    
    // Transaction reports
    Route::get('/transactions', 'transactions');
    Route::get('/transactions/summary', 'transactionSummary');
    
    // Incident reports
    Route::get('/incidents', 'incidents');
    
    // Financial trend
    Route::get('/financial-trend', 'financialTrend');
    
    // Revenue by date
    Route::get('/revenue', 'revenueByDate');
    
    // Guest reviews
    Route::get('/reviews', 'reviews');
    
    // Occupancy reports
    Route::get('/occupancy', 'occupancy');
    
    // Housekeeping reports
    Route::get('/housekeeping', 'housekeeping');
    
    // Maintenance reports
    Route::get('/maintenance', 'maintenance');
});