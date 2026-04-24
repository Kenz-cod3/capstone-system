<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Booking;

class BookingHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'booking_id',
        'old_status',
        'new_status',
        'change_note',
        'override_reason',
        'is_override',
        'changed_by',
        'changed_at'
    ];

    // ✅ FIX: proper datetime
    protected $casts = [
        'changed_at' => 'datetime',
        'is_override' => 'boolean'
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    // ✅ FIX: no null crash (System fallback)
    public function user()
    {
        return $this->belongsTo(User::class, 'changed_by')
            ->withDefault([
                'first_name' => 'System'
            ]);
    }
}
