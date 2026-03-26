<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomType extends Model
{
    protected $fillable = [
        'type_name',
        'description',
        'max_occupancy',
        'base_price'
    ];

    public function rooms()
    {
        return $this->hasMany(Room::class);
    }
}
