<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'room_type_id',
        'room_number',
        'status',
        'completed_at', 
        'cleaned_by'  
    ];

    const STATUS_AVAILABLE = 'available';
    const STATUS_OCCUPIED = 'occupied';
    const STATUS_MAINTENANCE = 'maintenance';
    const STATUS_DIRTY = 'dirty';
    const STATUS_CLEANING = 'cleaning';
    const STATUS_CLEAN = 'clean';

    public function roomType()
    {
        return $this->belongsTo(RoomType::class, 'room_type_id', 'id');
    }

    public function images()
    {
        return $this->hasMany(RoomImage::class, 'room_id');
    }

    public function bookings()
    {
        return $this->belongsToMany(
            \App\Models\Booking::class,
            'booked_rooms',
            'room_id',
            'booking_id'
        );
    }

    public function cleaner()
    {
        return $this->belongsTo(User::class, 'cleaned_by');
    }
}