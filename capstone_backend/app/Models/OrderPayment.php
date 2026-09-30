<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderPayment extends Model
{
    protected $fillable = [
        'order_id',
        'amount',
        'payment_method',
        'payment_status', 
        'gcash_reference',
        'payment_date',
        'change_amount',
        'user_id',
    ];

    protected $casts = [
        'amount'        => 'decimal:2',
        'change_amount' => 'decimal:2',
        'payment_date'  => 'datetime',
    ];

    public $timestamps = false;

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopePending($query)
    {
        return $query->where('payment_status', 'pending');
    }

    public function scopeFailed($query)
    {
        return $query->where('payment_status', 'failed');
    }

    public function scopeRefunded($query)
    {
        return $query->where('payment_status', 'refunded');
    }
}