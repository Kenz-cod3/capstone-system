<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public $userId;
    public $isActive;

    public function __construct($user)
    {
        $this->userId = $user->id;
        $this->isActive = $user->is_active;
    }

    public function broadcastOn()
    {
        return new Channel('users');
    }

    // IMPORTANT (event name)
    public function broadcastAs()
    {
        return 'UserStatusChanged';
    }

    // OPTIONAL but clearer payload
    public function broadcastWith()
    {
        return [
            'userId' => $this->userId,
            'isActive' => $this->isActive,
        ];
    }
}