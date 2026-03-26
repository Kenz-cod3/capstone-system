<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NotificationController;

Route::apiResource('notifications', NotificationController::class);
Route::get('notifications/user/{id}', [NotificationController::class, 'getByUser']);

Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
Route::get('notifications/user/{id}/unread-count', [NotificationController::class, 'unreadCount']);

Route::put('/notifications/user/{id}/read-all', [NotificationController::class, 'markAllAsRead']);
