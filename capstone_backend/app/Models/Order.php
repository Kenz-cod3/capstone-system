<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'order_number',
        'cashier_id',
        'booking_id',
        'order_date',
        'total_amount',
        'order_status',
    ];

    protected $casts = [
        'order_date'   => 'date',
        'total_amount' => 'decimal:2',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(OrderPayment::class);
    }

    // -----------------------------------------------------------------------
    // Helper: total paid amount (base sa paid payments lang)
    // -----------------------------------------------------------------------
    public function getTotalPaidAttribute(): float
    {
        return (float) $this->payments()
            ->where('payment_status', 'paid')
            ->sum('amount');
    }

    // -----------------------------------------------------------------------
    // Helper: total pending amount
    // -----------------------------------------------------------------------
    public function getTotalPendingAttribute(): float
    {
        return (float) $this->payments()
            ->where('payment_status', 'pending')
            ->sum('amount');
    }

    // -----------------------------------------------------------------------
    // Helper: remaining balance
    // -----------------------------------------------------------------------
    public function getRemainingBalanceAttribute(): float
    {
        $paid = $this->total_paid;

        return max(0, (float) $this->total_amount - $paid);
    }

    // -----------------------------------------------------------------------
    // Helper: is fully paid?
    // -----------------------------------------------------------------------
    public function getIsFullyPaidAttribute(): bool
    {
        return $this->total_paid >= (float) $this->total_amount;
    }
}