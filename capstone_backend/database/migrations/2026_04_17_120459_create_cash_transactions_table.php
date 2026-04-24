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
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('shift_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->enum('type', ['pay_in', 'pay_out']);
            $table->decimal('amount', 10, 2);

            $table->string('description');

            $table->foreignId('category_id')
                ->nullable()
                ->constrained('cash_categories')
                ->nullOnDelete();

            $table->foreignId('recorded_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
