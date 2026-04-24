<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    BookingController,
    BookedRoomController,
    BookingAddOnController,
    BookingPaymentController,
    BookingInvoiceController,
    BookingHistoryController,
    WalkInGuestController
};

// BOOKINGS
Route::prefix('bookings')->group(function () {
    Route::get('/', [BookingController::class, 'index']);
    Route::get('/active', [BookingController::class, 'active']);
    Route::get('/history', [BookingController::class, 'history']);
    Route::get('/trash', [BookingController::class, 'trash']);
    Route::get('/all', [BookingController::class, 'all']);

    Route::post('/', [BookingController::class, 'store']);
    Route::put('/{id}', [BookingController::class, 'update']);
    Route::delete('/{id}', [BookingController::class, 'destroy']);

    Route::post('/{id}/restore', [BookingController::class, 'restore']);
    Route::delete('/{id}/force-delete', [BookingController::class, 'forceDelete']);

    Route::post('/{id}/extend', [BookingController::class, 'extend']);
});

// BOOKING DETAILS
Route::apiResource('booked-rooms', BookedRoomController::class);
Route::apiResource('booking-addons', BookingAddOnController::class);
Route::apiResource('booking-payments', BookingPaymentController::class);
Route::apiResource('booking-invoices', BookingInvoiceController::class);
Route::apiResource('booking-histories', BookingHistoryController::class);

// WALK-IN
Route::apiResource('walk-in-guests', WalkInGuestController::class);
Route::post('walk-in-guests/{bookingId}/checkout', [WalkInGuestController::class, 'checkOut']);
