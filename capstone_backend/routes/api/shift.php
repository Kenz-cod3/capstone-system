<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShiftController;

Route::post('/shift/open', [ShiftController::class, 'open']);
Route::post('/shift/close/{id}', [ShiftController::class, 'close']);
Route::get('/shift/current', [ShiftController::class, 'current']);
Route::get('/shift/{id}', [ShiftController::class, 'show']);