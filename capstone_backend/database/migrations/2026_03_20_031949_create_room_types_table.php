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
        Schema::create('room_types', function (Blueprint $table) {
            $table->id();
            $table->string('type_name');
            $table->text('description')->nullable();
            $table->integer('max_occupancy');
            $table->decimal('base_price', 10, 2);
            $table->decimal('short_stay_price', 10, 2)->nullable();
            $table->unsignedInteger('short_stay_hours')->default(3);
            $table->time('overnight_checkout_time')->default('11:00:00');
            $table->time('standard_checkin_time')->default('14:00:00');      
            $table->decimal('early_checkin_fee', 10, 2)->default(0);          
            $table->decimal('late_checkout_fee', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_types');
    }
};
