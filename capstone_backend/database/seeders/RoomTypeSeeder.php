<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RoomType;

class RoomTypeSeeder extends Seeder
{
    public function run(): void
    {
        RoomType::insert([
            [
                'type_name' => 'Standard',
                'description' => 'Basic room with bed and bathroom',
                'max_occupancy' => 2,
                'base_price' => 1000
            ],
            [
                'type_name' => 'Deluxe',
                'description' => 'Spacious room with better amenities',
                'max_occupancy' => 3,
                'base_price' => 2000
            ],
            [
                'type_name' => 'Suite',
                'description' => 'Luxury room with living area',
                'max_occupancy' => 5,
                'base_price' => 5000
            ]
        ]);
    }
}