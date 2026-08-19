<?php

use App\Http\Controllers\CashCategoryController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CashTransactionController;
use App\Models\CashCategory;
use App\Models\User;
use Illuminate\Support\Facades\DB;

Route::middleware('auth:sanctum')->group(function () {

    // CASH
    Route::apiResource('/cash', CashTransactionController::class);

    Route::get('/cash/expenses/total', [CashTransactionController::class, 'totalExpenses']);

    // // CATEGORIES
    // Route::get('/cash-categories', function () {
    //     return CashCategory::all();
    // });
    // CATEGORIES
    Route::get('/cash-categories', [CashCategoryController::class, 'index']);
    Route::post('/cash-categories', [CashCategoryController::class, 'store']);

    // USERS (FILTERED ROLES)
    return User::whereIn(DB::raw('LOWER(role)'), [
        'staff',
        'housekeeper',
        'cashier'
    ])
        ->select('id', 'first_name', 'last_name', 'role')
        ->get();
});
