<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomType extends Model
{
    protected $fillable = [
        'type_name',
        'description',
        'max_occupancy',
        'base_price',
        'short_stay_price',
        'short_stay_hours',
        'overnight_checkout_time',
        'standard_checkin_time',
        'early_checkin_fee',
        'late_checkout_fee',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'short_stay_price' => 'decimal:2',
        'early_checkin_fee' => 'decimal:2',
        'late_checkout_fee' => 'decimal:2',
    ];

    public function rooms()
    {
        return $this->hasMany(Room::class);
    }
}
