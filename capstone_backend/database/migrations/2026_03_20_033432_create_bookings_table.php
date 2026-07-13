<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users');

            $table->foreignId('walk_in_guest_id')
                ->nullable()
                ->constrained('walk_in_guests');

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('booking_reference')->unique();

            $table->enum('booking_type', [
                'online',
                'walk_in'
            ]);

            // Total amount of all booked rooms
            $table->decimal('total_price', 10, 2)->default(0);

            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
