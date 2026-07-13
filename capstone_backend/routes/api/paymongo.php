<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PayMongoController;

Route::prefix('paymongo')->group(function () {

    Route::post('/create-payment', [PayMongoController::class, 'createPayment']);

    Route::post('/webhook', [PayMongoController::class, 'webhook']);

});