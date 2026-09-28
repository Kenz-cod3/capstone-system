<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingPayment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'booking_id',
        'shift_id',
        'receipt_number',
        'amount',
        'split_group_id',
        'split_sequence',
        'amount_due_at_split',
        'payment_method',
        'payment_status',
        'gcash_reference',
        'bank_reference',
        'is_split_payment',
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

    /**
     * All payment rows that belong to the same split checkout as this one.
     */
    public function splitSiblings()
    {
        return self::where('split_group_id', $this->split_group_id)
            ->when($this->split_group_id === null, fn ($q) => $q->whereRaw('0 = 1'))
            ->orderBy('split_sequence');
    }
}