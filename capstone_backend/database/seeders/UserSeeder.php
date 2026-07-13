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
            'first_name' => 'Kenneth',
            'middle_name' => 'Carl',
            'last_name' => 'Milarpis',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('123456'),
            'role' => 'admin',
            'is_active' => true
        ]);

        // STAFF (HOTEL)
        User::create([
            'first_name' => 'Kenneth',
            'middle_name' => '',
            'last_name' => 'Staff',
            'email' => 'staff@gmail.com',
            'password' => Hash::make('123456'),
            'role' => 'staff',
            'is_active' => true
        ]);

        // CASHIER (RESTAURANT)
        User::create([
            'first_name' => 'Kenneth',
            'middle_name' => '',
            'last_name' => 'Cashier',
            'email' => 'cashier@gmail.com',
            'password' => Hash::make('123456'),
            'role' => 'cashier',
            'is_active' => true
        ]);
    }
}