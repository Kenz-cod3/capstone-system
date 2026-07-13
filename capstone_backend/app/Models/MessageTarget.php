<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageTarget extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'message_id',
        'target_id',
        'is_read',
        'read_at'
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime'
    ];

    public function message()
    {
        return $this->belongsTo(Message::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'target_id');
    }
}
