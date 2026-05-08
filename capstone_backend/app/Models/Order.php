<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    // Enable timestamps if your table has created_at and updated_at
    // public $timestamps = true; // This is default, remove the false line
    
    // If your migration has timestamps(), keep this as true or remove the line
    public $timestamps = true;

    protected $fillable = [
        'order_number',
        'cashier_id',    
        'booking_id',
        'order_date',
        'total_amount',
        'order_status'
    ];

    protected $casts = [
        'order_date' => 'date',
        'total_amount' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    // Relationship: Order Items
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Relationship: Payments
    public function payments()
    {
        return $this->hasMany(OrderPayment::class);
    }

    // Relationship: Invoice
    public function invoice()
    {
        return $this->hasOne(OrderInvoice::class);
    }
}