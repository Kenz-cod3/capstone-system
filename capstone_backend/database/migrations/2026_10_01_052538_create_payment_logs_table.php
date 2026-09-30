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
        Schema::create('payment_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event');
            $table->string('payment_id')->nullable()->unique();
            $table->string('intent_id')->nullable();
            $table->unsignedBigInteger('booking_id')->nullable()->index();
            $table->string('booking_reference')->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->decimal('fee', 10, 2)->default(0);
            $table->decimal('net_amount', 10, 2)->default(0);
            $table->string('method')->nullable();
            $table->string('description')->nullable();
            $table->string('status')->default('paid');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_logs');
    }
};
