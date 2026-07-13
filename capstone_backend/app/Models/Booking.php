<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use DateTimeInterface;

class Booking extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'walk_in_guest_id',
        'created_by',
        'booking_type',
        'booking_reference',
        'total_price',
        'archived_at',
    ];

    protected $casts = [
        'archived_at' => 'datetime',
    ];

    protected $appends = [
        'guest_name',
        'check_in_date',
        'check_out_date',
    ];

    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    // USER (ONLINE)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // WALK-IN GUEST
    public function walkInGuest()
    {
        return $this->belongsTo(WalkInGuest::class);
    }

    // CREATED BY USER
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // BOOKED ROOMS
    public function bookedRooms()
    {
        return $this->hasMany(BookedRoom::class);
    }

    // PAYMENTS
    public function payments()
    {
        return $this->hasMany(BookingPayment::class);
    }

    // INVOICE
    public function invoice()
    {
        return $this->hasOne(BookingInvoice::class);
    }

    // ORDERS
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    // HISTORY
    public function histories()
    {
        return $this->hasMany(BookingHistory::class)
            ->orderByDesc('changed_at');
    }

    // REVIEW
    public function review()
    {
        return $this->hasOne(Review::class);
    }

    // GUEST NAME
    public function getGuestNameAttribute()
    {
        if ($this->user) {
            return $this->user->first_name . ' ' . $this->user->last_name;
        }

        if ($this->walkInGuest) {
            return $this->walkInGuest->full_name;
        }

        return null;
    }

    // CHECK-IN DATE
    public function getCheckInDateAttribute()
    {
        return $this->bookedRooms()
            ->orderBy('check_in_date')
            ->value('check_in_date');
    }

    // CHECK-OUT DATE
    public function getCheckOutDateAttribute()
    {
        return $this->bookedRooms()
            ->orderByDesc('check_out_date')
            ->value('check_out_date');
    }

    public function latestPayment()
    {
        return $this->hasOne(BookingPayment::class)
            ->latestOfMany('payment_date');
    }
}
