<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomImage extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'room_id',
        'image_path',
        'image_type',
        'created_at'
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
