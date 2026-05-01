<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Room;

class Booking extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'walk_in_guest_id',
        'created_by',
        'booking_type',
        'stay_type',
        'check_in_date',
        'check_out_date',
        'check_in_time',
        'booking_reference',
        'total_price',
        'booking_status'
    ];

    protected $appends = ['guest_name'];

    // 🔹 USER (ONLINE)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // 🔹 WALK-IN GUEST
    public function walkInGuest()
    {
        return $this->belongsTo(WalkInGuest::class);
    }

    // 🔹 CREATED BY USER (WHO CREATED THIS BOOKING)
    public function createdBy()  // ✅ ADD THIS METHOD
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // 🔹 BOOKED ROOMS (PIVOT TABLE)
    public function bookedRooms()
    {
        return $this->hasMany(BookedRoom::class);
    }

    // 🔹 ROOMS (MAIN RELATION - IMPORTANT)
    public function rooms()
    {
        return $this->belongsToMany(
            Room::class,
            'booked_rooms',
            'booking_id',
            'room_id'
        )->withPivot('price_at_time_of_booking', 'subtotal', 'stay_type', 'check_out_time');
    }

    // 🔹 ADD ONS (HAS MANY)
    public function bookingAddOns()
    {
        return $this->hasMany(BookingAddOn::class);
    }

    // 🔹 ADD ONS (MANY TO MANY)
    public function addOns()
    {
        return $this->belongsToMany(
            AddOn::class,
            'booking_add_ons',
            'booking_id',
            'add_on_id'
        )->withPivot('quantity', 'subtotal');
    }

    // 🔹 PAYMENTS
    public function payments()
    {
        return $this->hasMany(BookingPayment::class);
    }

    // 🔹 INVOICE
    public function invoice()
    {
        return $this->hasOne(BookingInvoice::class);
    }

    // 🔥 RELATION: ORDERS (restaurant orders)
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    // 🔹 HISTORY (VERY IMPORTANT)
    public function histories()
    {
        return $this->hasMany(BookingHistory::class)
            ->orderByDesc('changed_at');
    }

    // 🔹 REVIEW
    public function review()
    {
        return $this->hasOne(Review::class);
    }

    public function getGuestNameAttribute()
    {
        // 🔹 ONLINE USER
        if ($this->user) {
            return $this->user->first_name . ' ' . $this->user->last_name;
        }

        // 🔹 WALK-IN GUEST
        if ($this->walkInGuest) {
            return $this->walkInGuest->guest_name;
        }

        return null;
    }
}
