<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\MessageTarget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\MessageSent;

class MessageController extends Controller
{
    public function index()
    {
        return response()->json(
            Message::with(['targets.target'])->get(),
            200
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sender_id' => 'required|exists:users,id',
            'content' => 'required|string',
            'targets' => 'required|array',
            'targets.*.target_id' => 'required|integer|exists:users,id',
            'targets.*.target_type' => 'required|string'
        ]);

        $sender = \App\Models\User::findOrFail($validated['sender_id']);

        // VALIDATE ROLE RULES
        foreach ($validated['targets'] as $target) {

            $receiver = \App\Models\User::findOrFail(
                $target['target_id']
            );

            // guest → staff NOT allowed
            if (
                $sender->role === 'guest' &&
                $receiver->role === 'staff'
            ) {
                return response()->json([
                    'error' => 'Guest can only message admin'
                ], 403);
            }

            // staff → guest NOT allowed
            if (
                $sender->role === 'staff' &&
                $receiver->role === 'guest'
            ) {
                return response()->json([
                    'error' => 'Staff cannot message guest'
                ], 403);
            }

            // prevent self messaging
            if ($sender->id === $receiver->id) {
                return response()->json([
                    'error' => 'You cannot message yourself'
                ], 400);
            }
        }

        // CREATE MESSAGE
        $message = Message::create([
            'sender_id' => $validated['sender_id'],
            'message' => $validated['content']
        ]);

        // CREATE TARGETS
        foreach ($validated['targets'] as $target) {

            MessageTarget::create([
                'message_id' => $message->id,
                'target_id' => $target['target_id'],
                'target_type' => $target['target_type'],
                'is_read' => false
            ]);

            // REALTIME RECEIVER
            $message->receiver_id = $target['target_id'];

            // BROADCAST
            broadcast(new MessageSent($message));
        }

        return response()->json([
            'message' => 'Message sent successfully',
            'data' => $message->load([
                'targets.target',
                'sender'
            ])
        ], 201);
    }

    public function show($id)
    {
        $message = Message::with(['targets.target'])
            ->findOrFail($id);

        return response()->json($message, 200);
    }

    public function update(Request $request, $id)
    {
        $message = Message::findOrFail($id);

        $validated = $request->validate([
            'content' => 'sometimes|string'
        ]);

        $message->update($validated);

        return response()->json([
            'message' => 'Message updated',
            'data' => $message
        ], 200);
    }

    public function destroy($id)
    {
        $message = Message::findOrFail($id);

        $message->delete();

        return response()->json([
            'message' => 'Message deleted'
        ], 200);
    }

    public function markAllAsRead()
    {
        $userId = Auth::id();

        MessageTarget::where('target_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'message' => 'All messages marked as read'
        ]);
    }

    public function chatUsers()
    {
        $currentUser = Auth::user();

        if ($currentUser->role === 'guest') {

            // guest → admin only
            $users = \App\Models\User::where(
                'role',
                'admin'
            )->get();

        } elseif ($currentUser->role === 'admin') {

            // admin → guest + staff
            $users = \App\Models\User::whereIn(
                'role',
                ['guest', 'staff']
            )->get();

        } elseif ($currentUser->role === 'staff') {

            // staff → admin only
            $users = \App\Models\User::where(
                'role',
                'admin'
            )->get();

        } else {
            $users = [];
        }

        return response()->json($users);
    }

    public function conversations()
    {
        $currentUserId = Auth::id();

        if (!$currentUserId) {
            return response()->json([
                'error' => 'Unauthorized'
            ], 401);
        }

        $messages = MessageTarget::with([
            'message.sender',
            'target'
        ])
            ->where('target_type', 'App\\Models\\User')
            ->where(function ($q) use ($currentUserId) {

                // RECEIVED
                $q->where('target_id', $currentUserId)

                    // SENT
                    ->orWhereHas(
                        'message',
                        function ($q2) use ($currentUserId) {
                            $q2->where(
                                'sender_id',
                                $currentUserId
                            );
                        }
                    );
            })
            ->get();

        $conversations = $messages->groupBy(
            function ($item) use ($currentUserId) {

                return $item->message->sender_id
                    == $currentUserId
                    ? $item->target_id
                    : $item->message->sender_id;
            }
        )->map(function ($group) use ($currentUserId) {

            $sorted = $group->sortByDesc(
                'message.created_at'
            );

            $lastMessage = $sorted->first();

            $otherUser =
                $lastMessage->message->sender_id
                == $currentUserId
                    ? $lastMessage->target
                    : $lastMessage->message->sender;

            return [
                'user' => $otherUser,
                'last_message' =>
                    $lastMessage->message->message,
                'last_sender_id' =>
                    $lastMessage->message->sender_id,
                'unread' => $group
                    ->where(
                        'target_id',
                        $currentUserId
                    )
                    ->where('is_read', false)
                    ->count(),
                'created_at' =>
                    $lastMessage->message->created_at
            ];
        })
            ->sortByDesc('created_at')
            ->values();

        return response()->json($conversations);
    }
}