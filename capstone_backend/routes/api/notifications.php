<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NotificationController;

// BASIC CRUD
Route::apiResource('notifications', NotificationController::class);

// CUSTOM ROUTES (GROUPED)
Route::prefix('notifications')->group(function () {

    // per user
    Route::get('/user', [NotificationController::class, 'getCurrentUserNotifications']);
    Route::get('/user/{id}', [NotificationController::class, 'getByUser']);
    Route::get('/user/{id}/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/user/{id}/read-all', [NotificationController::class, 'markAllAsRead']);

    // single notification
    Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
});

// use Illuminate\Support\Facades\Route;
// use App\Http\Controllers\NotificationController;

// Route::apiResource('notifications', NotificationController::class);
// Route::get('notifications/user/{id}', [NotificationController::class, 'getByUser']);

// Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
// Route::get('notifications/user/{id}/unread-count', [NotificationController::class, 'unreadCount']);

// Route::put('/notifications/user/{id}/read-all', [NotificationController::class, 'markAllAsRead']);
