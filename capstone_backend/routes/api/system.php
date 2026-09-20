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

    // ── Booking reports ──
    Route::get('/', 'index');                  // GET /api/reports
    Route::get('/bookings', 'index');          // GET /api/reports/bookings (alias)

    // ── Guest reports ──
    Route::get('/guests', 'guests');           // GET /api/reports/guests

    // ── Transaction reports ──
    Route::get('/transactions', 'transactions');
    Route::get('/transactions/summary', 'transactionSummary');

    // ── Incident reports ──
    Route::get('/incidents', 'incidents');

    // ── Financial ──
    Route::get('/financial-trend', 'financialTrend');
    Route::get('/revenue', 'revenueByDate');

    // ── Guest reviews ──
    Route::get('/reviews', 'reviews');

    // ── Occupancy ──
    Route::get('/occupancy', 'occupancy');

    // ── Housekeeping ──
    Route::get('/housekeeping', 'housekeeping');

    // ── Maintenance ──
    Route::get('/maintenance', 'maintenance');
});