<?php

use Illuminate\Support\Facades\Broadcast;

// IMPORTANT
Broadcast::routes([
    'middleware' => ['auth:sanctum'],
]);

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// NOTIFICATIONS
Broadcast::channel('notifications.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// CHAT
Broadcast::channel('chat.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});