<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalkInGuest extends Model
{
    protected $fillable = [
        'created_by',
        'guest_name',
        'contact_number',
        'address'
    ];

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
