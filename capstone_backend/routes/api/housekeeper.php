<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\HousekeeperController;
use App\Http\Controllers\RoomIncidentController;

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
    | ROOM INCIDENTS
    |--------------------------------------------------------------------------
    */

    // GET ALL INCIDENTS
    Route::get('/incidents', [
        RoomIncidentController::class,
        'index'
    ]);

    // GET SINGLE INCIDENT
    Route::get('/incidents/{id}', [
       RoomIncidentController::class,
        'show'
    ]);

    // CREATE INCIDENT
    Route::post('/incidents', [
        RoomIncidentController::class,
        'store'
    ]);

    // UPDATE STATUS
    Route::put('/incidents/{id}/status', [
        RoomIncidentController::class,
        'updateStatus'
    ]);
});