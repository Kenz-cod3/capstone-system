<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingAddOn extends Model
{
    protected $fillable = [
        'booked_room_id',
        'add_on_id',
        'quantity',
        'subtotal',
    ];

    public function bookedRoom()
    {
        return $this->belongsTo(BookedRoom::class);
    }

    public function addOn()
    {
        return $this->belongsTo(AddOn::class);
    }
}