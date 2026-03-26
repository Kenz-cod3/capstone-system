<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ADMIN
        User::create([
            'first_name' => 'John',
            'last_name' => 'Jaranilla',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('123456'),
            'role' => 'admin',
            'is_active' => true
        ]);

        // STAFF
        User::create([
            'first_name' => 'John',
            'last_name' => 'Jaranilla',
            'email' => 'staff@gmail.com',
            'password' => Hash::make('123456'),
            'role' => 'staff',
            'is_active' => true
        ]);
    }
}
