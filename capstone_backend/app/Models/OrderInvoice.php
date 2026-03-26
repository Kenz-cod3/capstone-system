<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderInvoice extends Model
{
    protected $fillable = [
        'order_id',
        'invoice_number',
        'total_amount',
        'amount_paid',
        'payment_method',
        'gcash_reference',
        'change_amount',
        'staff_id',
        'generated_date',
        'invoice_pdf_path'
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
