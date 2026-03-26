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
        'booking_type',
        'stay_type',
        'check_in_date',
        'check_out_date',
        'booking_reference',
        'total_price',
        'booking_status'
    ];

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
        )->withPivot('price_at_time_of_booking');
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
}
