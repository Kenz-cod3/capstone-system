<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    MessageController,
    MessageTargetController
};

// CUSTOM ROUTES FIRST
Route::put('/messages/read-all', [MessageController::class, 'markAllAsRead']);
Route::get('/messages/conversations', [MessageController::class, 'conversations']);
Route::get('/chat/users', [MessageController::class, 'chatUsers']);

Route::get('/messages/user/{id}', [MessageTargetController::class, 'getByUser']);
Route::get('/messages/conversation/{user1}/{user2}', [MessageTargetController::class, 'getConversation']);
Route::put('/messages/read/{user1}/{user2}', [MessageTargetController::class, 'markAsRead']);


// THEN RESOURCE (LAST)
Route::apiResource('messages', MessageController::class);
Route::apiResource('message-targets', MessageTargetController::class);