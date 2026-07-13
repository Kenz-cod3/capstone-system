<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'password',
        'contact_number',
        'address',
        'role',
        'is_active',
        'is_verified',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'is_verified' => 'boolean',
            'last_login' => 'datetime',
        ];
    }

    // RELATIONSHIPS

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function walkInGuests()
    {
        return $this->hasMany(WalkInGuest::class, 'created_by');
    }

    public function receivedPayments()
    {
        return $this->hasMany(BookingPayment::class, 'received_by');
    }

    public function bookingHistories()
    {
        return $this->hasMany(BookingHistory::class, 'changed_by');
    }

    public function createdInvoices()
    {
        return $this->hasMany(BookingInvoice::class, 'created_by');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'staff_id');
    }

    // public function orderInvoices()
    // {
    //     return $this->hasMany(OrderInvoice::class, 'staff_id');
    // }

    public function orderPayments()
    {
        return $this->hasMany(OrderPayment::class);
    }

    public function inventoryLogs()
    {
        return $this->hasMany(InventoryLog::class);
    }

    public function staffActivities()
    {
        return $this->hasMany(StaffActivityLog::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function respondedReviews()
    {
        return $this->hasMany(Review::class, 'response_by');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function messageTargets()
    {
        return $this->hasMany(MessageTarget::class, 'target_id');
    }
}
