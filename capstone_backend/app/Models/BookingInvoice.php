<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingInvoice extends Model
{
    protected $fillable = [
        'booking_id',
        'invoice_number',
        'room_total',
        'add_on_total',
        'grand_total',
        'paid_total',
        'balance',
        'payment_status',
        'created_by',
        'generated_date',
        'invoice_pdf_path'
    ];

    protected $casts = [
        'generated_date' => 'datetime'
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
