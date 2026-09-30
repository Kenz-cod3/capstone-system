<?php

namespace App\Services;

use App\Models\User;
use App\Models\Notification;
use App\Events\NotificationCreated;
use Illuminate\Support\Facades\Auth;

class NotificationService
{
    public static function notifyAdmins($title, $message, $bookingId = null)
    {
        // Huwag padalhan ng notification ang mismong gumawa ng action
        $actorId = Auth::id();

        $users = User::whereIn('role', ['admin', 'staff'])
            ->when($actorId, fn($q) => $q->where('id', '!=', $actorId))
            ->get();

        foreach ($users as $user) {

            // CREATE NOTIFICATION
            $notification = Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'booking_id' => $bookingId,
                'is_read' => false,
                'created_at' => now()
            ]);

            // REALTIME BROADCAST
            broadcast(new NotificationCreated($notification));
        }
    }
}
