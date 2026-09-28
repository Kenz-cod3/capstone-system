<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\{
    MenuItemController,
    OrderController,
    OrderItemController,
    OrderPaymentController,
    OrderInvoiceController,
    OrderQrController
};

Route::apiResource('menu-items', MenuItemController::class);

Route::get(
    'menu-items-available',
    [MenuItemController::class, 'available']
);

Route::apiResource('orders', OrderController::class);

Route::apiResource(
    'order-items',
    OrderItemController::class
);

Route::apiResource(
    'order-payments',
    OrderPaymentController::class
);

// Restaurant QRPH
Route::post(
    'orders/{order}/qrph',
    [OrderQrController::class, 'createQr']
);

Route::get(
    'orders/qr-status/{paymentIntentId}',
    [OrderQrController::class, 'checkStatus']
);

Route::post(
    'orders/qr-webhook',
    [OrderQrController::class, 'webhook']
);