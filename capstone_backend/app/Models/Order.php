<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_number',
        'staff_id',
        'order_date',
        'total_amount',
        'order_status'
    ];

    // 🔥 RELATION: STAFF (cashier)
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    // 🔥 RELATION: ORDER ITEMS
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // 🔥 RELATION: PAYMENTS
    public function payments()
    {
        return $this->hasMany(OrderPayment::class);
    }

    // 🔥 RELATION: INVOICE
    public function invoice()
    {
        return $this->hasOne(OrderInvoice::class);
    }
}