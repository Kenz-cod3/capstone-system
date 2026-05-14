<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_incidents', function (Blueprint $table) {
            $table->id();

            // ROOM
            $table->foreignId('room_id')
                ->constrained('rooms')
                ->cascadeOnDelete();

            // CLEANER / STAFF WHO REPORTED
            $table->foreignId('cleaner_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // STAFF WHO RESOLVED
            $table->foreignId('resolved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // OPTIONAL BOOKING REFERENCE
            $table->foreignId('booking_id')
                ->nullable()
                ->constrained('bookings')
                ->nullOnDelete();

            /*
             * damaged = broken item
             * lost    = missing item
             * found   = found item
             */
            $table->enum('report_type', [
                'damaged',
                'lost',
                'found',
            ]);

            /*
             * pending   = newly reported
             * repairing = under repair
             * resolved  = fixed/completed
             */
            $table->enum('status', [
                'pending',
                'repairing',
                'resolved',
            ])->default('pending');

            // DETAILS
            $table->text('note');

            // PHOTO EVIDENCE (multiple photos supported via JSON)
            $table->json('photos')->nullable();

            // DATES
            $table->timestamp('reported_at')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_incidents');
    }
};
