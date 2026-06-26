<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\UserController;

// ✅ PROTECTED USER ROUTES (RESOURCE)
Route::middleware('auth:sanctum')->group(function () {

    Route::apiResource('users', UserController::class);

    // 🔥 extra custom routes
    Route::patch('users/{id}/status', [UserController::class, 'updateStatus']);
    Route::post('/change-password', [UserController::class, 'changePassword']);

    Route::get('/user/status', function (Request $request) {
        return response()->json([
            'id' => $request->user()->id,
            'is_active' => (bool) $request->user()->is_active,
        ]);
    });
});


