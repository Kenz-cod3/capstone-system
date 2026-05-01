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
        'cleaned_by',
        'has_damage',
        'damage_note',
        'damage_photo',
    ];

    protected $casts = [
        'has_damage' => 'boolean',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'damage_photo_url',
        'damage_summary',
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

    public function getDamagePhotoUrlAttribute()
    {
        return $this->damage_photo
            ? asset('storage/' . $this->damage_photo)
            : null;
    }

    public function getDamageSummaryAttribute()
    {
        $damageHistory = \App\Models\BookingHistory::with([
            'booking.user',
            'booking.walkInGuest'
        ])
            ->whereNotNull('booking_id')
            ->whereHas('booking.rooms', function ($q) {
                $q->where('rooms.id', $this->id);
            })
            ->latest('changed_at')
            ->first();

        return [
            'has_damage' => $this->has_damage,
            'note' => $this->damage_note,
            'photo' => $this->damage_photo_url,

            'reported_by' => $this->cleaner
                ? $this->cleaner->first_name . ' ' . $this->cleaner->last_name
                : null,

            'booking_reference' => $damageHistory?->booking?->booking_reference,
            'booking_id' => $damageHistory?->booking?->id,

            'guest' =>
            $damageHistory?->booking?->user
                ? $damageHistory->booking->user->first_name . ' ' . $damageHistory->booking->user->last_name
                : ($damageHistory?->booking?->walkInGuest?->guest_name ?? 'N/A'),
        ];
    }
}
