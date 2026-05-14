<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingPayment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'booking_id',
        'shift_id',
        'amount',
        'payment_method',
        'gcash_reference',
        'bank_reference',
        'received_by',
        'payment_date'
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }
}