<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // 🔹 GET ALL NOTIFICATIONS (ADMIN VIEW)
    public function index()
    {
        return response()->json(
            Notification::with('user')->latest('created_at')->get(),
            200
        );
    }

    // 🔹 CREATE NOTIFICATION
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $validated['is_read'] = false;
        $validated['created_at'] = now();

        $notification = Notification::create($validated);

        return response()->json([
            'message' => 'Notification created',
            'data' => $notification
        ], 201);
    }

    // 🔹 GET SINGLE NOTIFICATION
    public function show($id)
    {
        $notification = Notification::with('user')->findOrFail($id);

        return response()->json($notification, 200);
    }



    // 🔹 MARK AS READ
    public function update($id)
    {
        $notification = Notification::findOrFail($id);

        $notification->update([
            'is_read' => true
        ]);

        return response()->json([
            'message' => 'Marked as read'
        ]);
    }

    // 🔹 DELETE NOTIFICATION
    public function destroy($id)
    {
        $notification = Notification::findOrFail($id);
        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted'
        ], 200);
    }

    public function markAllAsRead($id)
    {
        Notification::where('user_id', $id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'message' => 'All notifications marked as read'
        ]);
    }

    public function markAsRead($id)
    {
        $notification = \App\Models\Notification::findOrFail($id);

        $notification->update([
            'is_read' => true
        ]);

        return response()->json([
            'message' => 'Marked as read'
        ]);
    }

    public function unreadCount($id)
    {
        return response()->json([
            'count' => Notification::where('user_id', $id)
                ->where('is_read', false)
                ->count()
        ]);
    }

    // 🔥 GET NOTIFICATIONS PER USER (ADMIN ONLY)
    public function getByUser($id)
    {
        return response()->json(
            Notification::where('user_id', $id)
                ->orderByDesc('created_at')
                ->limit(20)->get(),
            200
        );
    }
}
