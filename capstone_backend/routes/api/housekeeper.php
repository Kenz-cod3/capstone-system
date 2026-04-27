<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HousekeeperController;

Route::prefix('housekeeper')->group(function () {

    Route::get('/tasks', [HousekeeperController::class, 'tasks']);

    Route::post('/tasks/{id}/start', [HousekeeperController::class, 'start']);

    Route::post('/tasks/{id}/complete', [HousekeeperController::class, 'complete']);

    Route::get('/history', [HousekeeperController::class, 'history']);

});