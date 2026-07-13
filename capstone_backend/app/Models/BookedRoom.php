<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookedRoom extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'booking_id',
        'room_id',
        'stay_type',
        'check_in_date',
        'check_out_date',
        'price_at_time_of_booking',
        'subtotal',
        'is_extended',
        'status',
        'check_in_time',
        'check_out_time',
        'overdue_started_at',
        'archived_at',
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_out_date' => 'date',
        'price_at_time_of_booking' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'is_extended' => 'boolean',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'overdue_started_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class)->withTrashed();
    }

    public function bookingAddOns()
    {
        return $this->hasMany(BookingAddOn::class);
    }
}
