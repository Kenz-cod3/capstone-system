<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'title',
        'message',
        'is_read',
        'created_at'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
