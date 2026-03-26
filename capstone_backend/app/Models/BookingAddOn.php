<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingAddOn extends Model
{
    protected $fillable = [
        'booking_id',
        'add_on_id',
        'quantity',
        'subtotal'
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function addOn()
    {
        return $this->belongsTo(AddOn::class);
    }
}
