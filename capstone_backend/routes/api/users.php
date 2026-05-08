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

// use Illuminate\Support\Facades\Route;
// use App\Http\Controllers\UserController;

// // ✅ PROTECTED USER ROUTES
// Route::middleware('auth:sanctum')->prefix('users')->group(function () {

//     Route::get('/', [UserController::class, 'index']);
//     Route::get('/{id}', [UserController::class, 'show']);

//     Route::post('/', [UserController::class, 'store']);
//     Route::post('/{id}', [UserController::class, 'update']);
//     Route::delete('/{id}', [UserController::class, 'destroy']);
//     Route::patch('/{id}/status', [UserController::class, 'updateStatus']);
// });

// // ✅ CHANGE PASSWORD
// Route::middleware('auth:sanctum')->post('/change-password', [UserController::class, 'changePassword']);

// use Illuminate\Support\Facades\Route;
// use App\Http\Controllers\UserController;

// Route::prefix('users')->group(function () {

//     Route::get('/', [UserController::class, 'index']);
//     Route::get('/{id}', [UserController::class, 'show']);

//     Route::middleware('role:admin')->group(function () {
//         Route::post('/', [UserController::class, 'store']);
//         Route::put('/{id}', [UserController::class, 'update']);
//         Route::delete('/{id}', [UserController::class, 'destroy']);
//     });
// });
