<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomStatusHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'room_id',
        'status',
        'changed_by',
        'changed_at'
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
