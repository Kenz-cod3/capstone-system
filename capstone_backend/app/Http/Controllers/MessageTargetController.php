<?php

namespace App\Http\Controllers;

use App\Models\MessageTarget;
use Illuminate\Http\Request;

class MessageTargetController extends Controller
{
    //  GET ALL TARGETS
    public function index()
    {
        return response()->json(
            MessageTarget::with(['message', 'user'])->get(),
            200
        );
    }

    // CREATE TARGET (RARE – usually from MessageController)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message_id' => 'required|exists:messages,id',
            'target_id' => 'required|exists:users,id',
        ]);

        $validated['is_read'] = false;

        $target = MessageTarget::create($validated);

        return response()->json([
            'message' => 'Target created',
            'data' => $target->load(['message', 'user'])
        ], 201);
    }

    // GET SINGLE TARGET
    public function show($id)
    {
        $target = MessageTarget::with(['message', 'user'])->findOrFail($id);

        return response()->json($target, 200);
    }

    // UPDATE TARGET (MARK AS READ/UNREAD)
    public function update(Request $request, $id)
    {
        $target = MessageTarget::findOrFail($id);

        $validated = $request->validate([
            'is_read' => 'required|boolean'
        ]);

        // If marked as read → set timestamp
        if ($validated['is_read']) {
            $validated['read_at'] = now();
        }

        $target->update($validated);

        return response()->json([
            'message' => 'Message target updated',
            'data' => $target
        ], 200);
    }

    // DELETE TARGET
    public function destroy($id)
    {
        $target = MessageTarget::findOrFail($id);
        $target->delete();

        return response()->json([
            'message' => 'Message target deleted'
        ], 200);
    }

    // CUSTOM: GET MESSAGES FOR A SPECIFIC TARGET (VERY IMPORTANT)
    public function getByTarget($target_id)
    {
        $messages = MessageTarget::where('target_id', $target_id)
            ->with('message')
            ->get();

        return response()->json($messages, 200);
    }

    public function getByUser($id)
    {
        return response()->json(
            MessageTarget::where('target_id', $id)
                ->with(['message.sender'])
                ->join('messages', 'messages.id', '=', 'message_targets.message_id')
                ->orderBy('messages.created_at', 'desc')
                ->select('message_targets.*')
                ->get(),
            200
        );
    }

    public function getConversation($user1, $user2)
    {
        $messages = MessageTarget::with(['message.sender'])
            ->where(function ($query) use ($user1, $user2) {

                $query->where(function ($q) use ($user1, $user2) {
                    // user1 → user2
                    $q->where('target_id', $user2)
                        ->whereHas('message', function ($q2) use ($user1) {
                            $q2->where('sender_id', $user1);
                        });
                })
                    ->orWhere(function ($q) use ($user1, $user2) {
                        // user2 → user1
                        $q->where('target_id', $user1)
                            ->whereHas('message', function ($q2) use ($user2) {
                                $q2->where('sender_id', $user2);
                            });
                    });
            })
            ->join('messages', 'messages.id', '=', 'message_targets.message_id')
            ->orderBy('messages.created_at', 'asc')
            ->select('message_targets.*')
            ->get();

        return response()->json($messages);
    }

    public function markAsRead($user1, $user2)
    {
        MessageTarget::where('target_id', $user1)
            ->whereHas('message', function ($q) use ($user2) {
                $q->where('sender_id', $user2);
            })
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json(['message' => 'Marked as read']);
    }
}
