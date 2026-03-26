<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

// ✅ IMPORT CORRECTLY
use Database\Seeders\UserSeeder;
use Database\Seeders\RoomTypeSeeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            RoomTypeSeeder::class,
        ]);
    }
}