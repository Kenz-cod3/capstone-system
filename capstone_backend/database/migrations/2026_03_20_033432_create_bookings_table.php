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
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('walk_in_guest_id')->nullable()->constrained('walk_in_guests');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null'); 
            $table->enum('booking_type', ['online', 'walk_in']);
            $table->enum('stay_type', ['short_stay', 'overnight']);
            $table->date('check_in_date');
            $table->date('check_out_date')->nullable();
            $table->timestamp('check_in_time')->nullable();
            $table->string('booking_reference')->unique();
            $table->decimal('total_price', 10, 2)->default(0);
            $table->enum('booking_status', ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']);
            $table->timestamps();
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
