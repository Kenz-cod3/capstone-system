<?php

namespace App\Models;

use Carbon\Carbon;
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
        'expected_checkout_at',
        'checkout_status',
        'is_early_checkin',
        'early_checkin_fee',
        'is_late_checkout',
        'late_checkout_fee',
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
        'expected_checkout_at' => 'datetime',
        'is_early_checkin' => 'boolean',
        'early_checkin_fee' => 'decimal:2',
        'is_late_checkout' => 'boolean',
        'late_checkout_fee' => 'decimal:2',
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
