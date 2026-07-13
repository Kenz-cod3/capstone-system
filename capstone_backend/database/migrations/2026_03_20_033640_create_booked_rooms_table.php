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
        Schema::create('booked_rooms', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained('bookings')
                ->cascadeOnDelete();

            $table->foreignId('room_id')
                ->constrained('rooms');

            $table->enum('stay_type', [
                'short_stay',
                'overnight'
            ]);

            $table->date('check_in_date');
            $table->date('check_out_date')->nullable();

            $table->decimal('price_at_time_of_booking', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->boolean('is_extended')
                ->default(false);

            $table->enum('status', [
                'pending',
                'confirmed',
                'checked_in',
                'checked_out',
                'cancelled',
                'refunded'
            ])->default('pending');

            $table->timestamp('check_in_time')->nullable();
            $table->timestamp('check_out_time')->nullable();
            $table->timestamp('overdue_started_at')->nullable();
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
        Schema::dropIfExists('booked_rooms');
    }
};
