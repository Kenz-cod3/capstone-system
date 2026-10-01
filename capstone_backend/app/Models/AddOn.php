<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AddOn extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'add_on_name',
        'price',
        'stock',
    ];

    public function bookingAddOns()
    {
        return $this->hasMany(BookingAddOn::class);
    }
}
