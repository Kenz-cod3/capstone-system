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
        Schema::create('booking_payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained('bookings');

            $table->foreignId('shift_id')
                ->nullable()
                ->constrained('shifts')
                ->nullOnDelete();

            $table->string('receipt_number')->unique();

            $table->decimal('amount', 10, 2);

            $table->uuid('split_group_id')->nullable()->index();
            $table->unsignedTinyInteger('split_sequence')->nullable();
            $table->decimal('amount_due_at_split', 10, 2)->nullable();

            $table->string('payment_method');

            $table->enum('payment_status', [
                'pending',
                'paid',
                'refunded',
                'failed'
            ])->default('pending');

            $table->string('gcash_reference')->nullable();
            $table->string('bank_reference')->nullable();

            $table->boolean('is_split_payment')->default(false);

            $table->foreignId('received_by')
                ->nullable()
                ->constrained('users');

            $table->timestamp('payment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_payments');
    }
};