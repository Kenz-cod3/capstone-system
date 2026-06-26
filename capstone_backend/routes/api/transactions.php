<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TransactionController;

Route::prefix('transactions')->group(function () {
    Route::get('/', [TransactionController::class, 'index']);
    Route::get('/summary', [TransactionController::class, 'summary']);
});