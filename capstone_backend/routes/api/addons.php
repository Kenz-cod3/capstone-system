<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddOnController;

Route::get('/add-ons', [AddOnController::class, 'index']);
Route::post('/add-ons', [AddOnController::class, 'store']);
Route::get('/add-ons/{id}', [AddOnController::class, 'show']);
Route::put('/add-ons/{id}', [AddOnController::class, 'update']);
Route::delete('/add-ons/{id}', [AddOnController::class, 'destroy']);