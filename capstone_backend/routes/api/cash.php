<?php

use App\Http\Controllers\CashCategoryController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CashTransactionController;
use App\Models\User;
use Illuminate\Support\Facades\DB;

Route::middleware('auth:sanctum')->group(function () {

    // CASH (view)
    Route::apiResource('/cash', CashTransactionController::class)->only(['index', 'show']);
    Route::get('/cash/expenses/total', [CashTransactionController::class, 'totalExpenses']);

    // CASH (write: pay in / pay out)
    Route::apiResource('/cash', CashTransactionController::class)
        ->except(['index', 'show'])
        ->middleware('shift.open');

    // CATEGORIES
    Route::get('/cash-categories', [CashCategoryController::class, 'index']);
    Route::post('/cash-categories', [CashCategoryController::class, 'store']);

    // USERS (FILTERED ROLES)
    Route::get('/cash-users', function () {
        return User::whereIn(DB::raw('LOWER(role)'), ['staff', 'housekeeper', 'cashier'])
            ->select('id', 'first_name', 'last_name', 'role')
            ->get();
    });
});