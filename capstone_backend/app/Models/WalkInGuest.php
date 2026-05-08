<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalkInGuest extends Model
{
    protected $fillable = [
        'created_by',
        'first_name',
        'middle_name',
        'last_name',
        'contact_number',
        'address',
    ];

    protected $appends = ['full_name'];

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function getFullNameAttribute()
    {
        return trim(
            $this->first_name . ' ' .
            ($this->middle_name ? $this->middle_name . ' ' : '') .
            $this->last_name
        );
    }
}