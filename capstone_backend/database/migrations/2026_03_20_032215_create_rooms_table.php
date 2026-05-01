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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_type_id')->constrained('room_types');
            $table->string('room_number')->unique();
            $table->enum('status', [
                'available',
                'occupied',
                'maintenance',
                'dirty',
                'cleaning'
            ])->default('available');

            $table->foreignId('cleaned_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->boolean('has_damage')->default(false);
            $table->text('damage_note')->nullable();

            $table->string('damage_photo')->nullable();

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
