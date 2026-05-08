<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\HousekeeperController;
use App\Http\Controllers\RoomDamageReportController;

Route::prefix('housekeeper')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | HOUSEKEEPER TASKS
    |--------------------------------------------------------------------------
    */

    Route::get('/tasks', [
        HousekeeperController::class,
        'tasks'
    ]);

    Route::post('/tasks/{id}/start', [
        HousekeeperController::class,
        'start'
    ]);

    Route::post('/tasks/{id}/complete', [
        HousekeeperController::class,
        'complete'
    ]);

    Route::get('/history', [
        HousekeeperController::class,
        'history'
    ]);

    /*
    |--------------------------------------------------------------------------
    | DAMAGE REPORTS
    |--------------------------------------------------------------------------
    */

    // GET ALL REPORTS
    Route::get('/damage-reports', [
        RoomDamageReportController::class,
        'index'
    ]);

    // GET SINGLE REPORT
    Route::get('/damage-reports/{id}', [
        RoomDamageReportController::class,
        'show'
    ]);

    // CREATE REPORT
    Route::post('/damage-reports', [
        RoomDamageReportController::class,
        'store'
    ]);

    // UPDATE STATUS
    Route::put('/damage-reports/{id}/status', [
        RoomDamageReportController::class,
        'updateStatus'
    ]);
});