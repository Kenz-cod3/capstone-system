<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'sender_id',
        'message',
        'image_type',
        'created_at'
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function targets()
    {
        return $this->hasMany(MessageTarget::class);
    }
}
