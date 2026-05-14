<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct($message)
    {
        $this->message = $message;
    }

    /**
     * Broadcast channel
     */
    public function broadcastOn(): array
    {
        return [
            new Channel(
                'chat.' . $this->message->receiver_id
            ),
        ];
    }

    /**
     * Event name
     */
    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    /**
     * Data sent to frontend
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message
        ];
    }
}
