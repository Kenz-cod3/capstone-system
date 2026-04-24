<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashTransaction extends Model
{
    protected $fillable = [
        'shift_id',
        'type',
        'amount',
        'description',
        'category_id',
        'recorded_by'
    ];

    // CATEGORY
    public function category()
    {
        return $this->belongsTo(CashCategory::class);
    }

    // USER (STAFF / HOUSEKEEPER / CASHIER)
    public function user()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}