<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    MenuItemController,
    OrderController,
    OrderItemController,
    OrderPaymentController,
    OrderInvoiceController
};

Route::apiResource('menu-items', MenuItemController::class);
Route::get('menu-items-available', [MenuItemController::class, 'available']);

Route::apiResource('orders', OrderController::class);
Route::apiResource('order-items', OrderItemController::class);
Route::apiResource('order-payments', OrderPaymentController::class);
// Route::apiResource('order-invoices', OrderInvoiceController::class);

