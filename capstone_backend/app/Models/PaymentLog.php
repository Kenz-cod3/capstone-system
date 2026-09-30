<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentLog extends Model
{
    protected $guarded = [];

    protected $casts = ['paid_at' => 'datetime'];
}