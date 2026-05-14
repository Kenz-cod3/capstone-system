<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomIncident extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'cleaner_id',
        'resolved_by',
        'booking_id',
        'report_type',
        'status',
        'note',
        'photos',
        'reported_at',
        'resolved_at',
    ];

    protected $casts = [
        'photos' => 'array',
        'reported_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    // Relationships
    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function cleaner()
    {
        return $this->belongsTo(User::class, 'cleaner_id');
    }

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}