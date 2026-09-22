<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;

Route::prefix('auth')->group(function () {

    // PUBLIC ROUTES
    Route::post('/register', [AuthController::class, 'register']);
    // Route::post('/login', [AuthController::class, 'login']);
    Route::post('/mobile/login', [AuthController::class, 'mobileLogin']);
    Route::post('/login', [AuthController::class, 'adminLogin']);

    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:5,1');
    Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:3,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password',  [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    // PROTECTED ROUTES (need token)
    Route::middleware('auth:sanctum')->group(function () {

        // LOGOUT — uses AuthController so shift-closing logic actually runs
        Route::post('/logout', [AuthController::class, 'logout']);

        // OPTIONAL: GET CURRENT USER
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// use Illuminate\Support\Facades\Route;
// use Illuminate\Http\Request;
// use App\Http\Controllers\AuthController;

// Route::prefix('auth')->group(function () {

//     // PUBLIC ROUTES
//     Route::post('/register', [AuthController::class, 'register']);
//     // Route::post('/login', [AuthController::class, 'login']);
//     Route::post('/mobile/login', [AuthController::class, 'mobileLogin']);
//     Route::post('/login', [AuthController::class, 'adminLogin']);

//     Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);

//     // PROTECTED ROUTES (need token)
//     Route::middleware('auth:sanctum')->group(function () {

//         // LOGOUT
//         Route::post('/logout', function (Request $request) {
//             // delete current token
//             $request->user()->currentAccessToken()->delete();

//             return response()->json([
//                 'message' => 'Logged out successfully'
//             ]);
//         });

//         // OPTIONAL: GET CURRENT USER
//         Route::get('/me', function (Request $request) {
//             return response()->json($request->user());
//         });
//     });
// });