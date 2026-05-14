<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = [
        'shift_number',
        'opened_by',
        'starting_cash',
        'expected_cash',
        'closed_cash',
        'opened_at',
        'closed_at'
    ];

    public function transactions()
    {
        return $this->hasMany(CashTransaction::class);
    }

    public function payments()
    {
        return $this->hasMany(BookingPayment::class);
    }

    public function openedBy()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }
}