<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookedRoom extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'booking_id',
        'room_id',
        'price_at_time_of_booking',
        'subtotal',      
        'stay_type',
        'check_out_time'
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class)->withTrashed();
    }
}
