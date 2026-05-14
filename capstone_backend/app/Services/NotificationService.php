<?php

namespace App\Services;

use App\Models\User;
use App\Models\Notification;
use App\Events\NotificationCreated;

class NotificationService
{
    public static function notifyAdmins($title, $message)
    {
        $users = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($users as $user) {

            // 🔥 CREATE NOTIFICATION
            $notification = Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'is_read' => false,
                'created_at' => now()
            ]);

            // 🔥 REALTIME BROADCAST
            broadcast(new NotificationCreated($notification));
        }
    }
}
