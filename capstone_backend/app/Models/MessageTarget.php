<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageTarget extends Model
{   
    public $timestamps = false;
    
    protected $fillable = [
        'message_id',
        'target_id',
        'target_type',
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

    public function target()
    {
        return $this->morphTo();
    }
}
