<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'details',
        'ip_address',
        'total_amount',
        'timestamp'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
