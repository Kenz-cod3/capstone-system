<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\RoomDamageReport;

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
    ];

    protected $casts = [
        'has_damage' => 'boolean',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'damage_summary',
    ];

    // ROOM STATUS
    const STATUS_AVAILABLE = 'available';
    const STATUS_OCCUPIED = 'occupied';
    const STATUS_MAINTENANCE = 'maintenance';
    const STATUS_DIRTY = 'dirty';
    const STATUS_CLEANING = 'cleaning';
    const STATUS_CLEAN = 'clean';

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    // ROOM TYPE
    public function roomType()
    {
        return $this->belongsTo(RoomType::class, 'room_type_id', 'id');
    }

    // ROOM IMAGES
    public function images()
    {
        return $this->hasMany(RoomImage::class, 'room_id');
    }

    // BOOKINGS
    public function bookings()
    {
        return $this->belongsToMany(
            Booking::class,
            'booked_rooms',
            'room_id',
            'booking_id'
        )->withPivot(
            'price_at_time_of_booking',
            'subtotal',
            'stay_type',
            'check_out_time'
        );
    }

    // CLEANER
    public function cleaner()
    {
        return $this->belongsTo(User::class, 'cleaned_by');
    }

    // DAMAGE REPORTS
    public function damageReports()
    {
        return $this->hasMany(RoomDamageReport::class);
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESSORS
    |--------------------------------------------------------------------------
    */

    // LATEST DAMAGE SUMMARY
    public function getDamageSummaryAttribute()
    {
        $latestReport = $this->damageReports()
            ->with([
                'cleaner',
                'booking.user',
                'booking.walkInGuest'
            ])
            ->latest()
            ->first();

        if (!$latestReport) {
            return null;
        }

        $guestName = null;

        if ($latestReport->booking?->user) {

            $guestName =
                $latestReport->booking->user->first_name . ' ' .
                $latestReport->booking->user->last_name;

        } elseif ($latestReport->booking?->walkInGuest) {

            $guestName =
                $latestReport->booking->walkInGuest->guest_name;
        }

        return [

            'id' => $latestReport->id,

            'report_type' => $latestReport->report_type,

            'status' => $latestReport->status,

            'note' => $latestReport->note,

            'photos' => $latestReport->photos,

            'reported_at' => $latestReport->reported_at,

            'resolved_at' => $latestReport->resolved_at,

            'reported_by' => $latestReport->cleaner
                ? $latestReport->cleaner->first_name . ' ' .
                  $latestReport->cleaner->last_name
                : null,

            'booking_id' => $latestReport->booking_id,

            'booking_reference' =>
                $latestReport->booking?->booking_reference,

            'guest' => $guestName,
        ];
    }
}