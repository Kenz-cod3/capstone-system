<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingPayment extends Model
{
    protected $fillable = [
        'booking_id',
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
}
