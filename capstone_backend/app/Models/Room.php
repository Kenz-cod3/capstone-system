<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'room_type_id',
        'room_number',
        'status'
    ];

    public function roomType()
    {
        return $this->belongsTo(RoomType::class, 'room_type_id', 'id');
    }

    public function images()
    {
        return $this->hasMany(RoomImage::class, 'room_id');
    }

    public function bookings()
    {
        return $this->belongsToMany(
            \App\Models\Booking::class,
            'booked_rooms', // ⚠️ IMPORTANT (ito table mo)
            'room_id',
            'booking_id'
        );
    }
}
