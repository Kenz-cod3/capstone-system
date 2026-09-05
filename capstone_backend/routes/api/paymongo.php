<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PayMongoController;

Route::prefix('paymongo')->group(function () {

    // OLD — Checkout Session (hosted page)
    Route::post('/create-payment', [PayMongoController::class, 'createPayment']);

    // NEW — Dynamic QR Ph (Payment Intent), renders inside our own page
    Route::post('/qr/create', [PayMongoController::class, 'createQrPayment']);
    Route::get('/qr/status/{paymentIntentId}', [PayMongoController::class, 'checkQrStatus']);

});