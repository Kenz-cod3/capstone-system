<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    BookingController,
    BookedRoomController,
    BookingAddOnController,
    BookingPaymentController,
    BookingInvoiceController,
    BookingHistoryController,
    ReceiptController,
    WalkInGuestController
};

// BOOKINGS
Route::prefix('bookings')->group(function () {
    // VIEW (allowed in View Only mode)
    Route::get('/', [BookingController::class, 'index']);
    Route::get('/active', [BookingController::class, 'active']);
    Route::get('/history', [BookingController::class, 'history']);
    Route::get('/trash', [BookingController::class, 'trash']);
    Route::get('/reference/{reference}', [BookingController::class, 'findByReference']); // fixed
    Route::get('/{id}', [BookingController::class, 'show']);

    // WRITE (needs open shift for staff)
    Route::middleware('shift.open')->group(function () {
        Route::post('/', [BookingController::class, 'store']);
        Route::put('/{id}', [BookingController::class, 'update']);
        Route::delete('/{id}', [BookingController::class, 'destroy']);
        Route::post('/{id}/restore', [BookingController::class, 'restore']);
        Route::delete('/{id}/force-delete', [BookingController::class, 'forceDelete']);
        Route::post('/{bookingId}/extend/{bookedRoomId}', [BookingController::class, 'extend']);
    });
});

Route::prefix('booked-rooms')->group(function () {
    Route::get('/history', [BookedRoomController::class, 'history']);
    Route::get('/trash', [BookedRoomController::class, 'trash']);

    Route::middleware('shift.open')->group(function () {
        Route::post('/{id}/restore', [BookedRoomController::class, 'restore']);
        Route::delete('/{id}/force-delete', [BookedRoomController::class, 'forceDelete']);
    });
});

// BOOKING DETAILS
// View routes (index, show) stay open; write routes need an open shift
Route::apiResource('booked-rooms', BookedRoomController::class)->only(['index', 'show']);
Route::apiResource('booked-rooms', BookedRoomController::class)->except(['index', 'show'])->middleware('shift.open');

Route::apiResource('booking-addons', BookingAddOnController::class)->only(['index', 'show']);
Route::apiResource('booking-addons', BookingAddOnController::class)->except(['index', 'show'])->middleware('shift.open');
Route::get('/booking-add-ons/transactions', [BookingAddOnController::class, 'transactions']);

Route::post('booking-payments/refund', [BookingPaymentController::class, 'refund'])
    ->middleware('shift.open');
Route::apiResource('booking-payments', BookingPaymentController::class)->only(['index', 'show']);
Route::apiResource('booking-payments', BookingPaymentController::class)->except(['index', 'show'])->middleware('shift.open');

Route::apiResource('booking-invoices', BookingInvoiceController::class);
Route::apiResource('booking-histories', BookingHistoryController::class);

// RECEIPTS (WEB)
Route::get('/receipts/{payment}', [ReceiptController::class, 'show']);
// RECEIPTS (MOBILE)
Route::get('/bookings/{bookingId}/receipt', [ReceiptController::class, 'bookingReceipt']);

// WALK-IN GUESTS
Route::prefix('walk-in-guests')->group(function () {
    // VIEW
    Route::get('/', [WalkInGuestController::class, 'index']);
    Route::get('/search', [WalkInGuestController::class, 'search']);
    Route::get('/pending-payments', [WalkInGuestController::class, 'pendingPayments']);
    Route::get('/{bookingId}/payment-status', [WalkInGuestController::class, 'paymentStatus']);
    Route::get('/{id}/details', [WalkInGuestController::class, 'getGuestDetails']);
    Route::get('/bookings/{bookingId}', [WalkInGuestController::class, 'getBookingDetails']);

    // WRITE
    Route::middleware('shift.open')->group(function () {
        Route::post('/', [WalkInGuestController::class, 'store']);
        Route::post('/guest', [WalkInGuestController::class, 'storeGuest']);
        Route::post('/checkin', [WalkInGuestController::class, 'checkin']);
        Route::post('/{bookingId}/switch-to-cash', [WalkInGuestController::class, 'switchToCash']);
        Route::post('/payments/{paymentId}/cancel-qr', [WalkInGuestController::class, 'cancelQr']);
        Route::post('/payments/{paymentId}/change-to-cash', [WalkInGuestController::class, 'changeToCash']);
        Route::post('/payments/{paymentId}/resplit', [WalkInGuestController::class, 'resplit']);
        Route::post('/{bookingId}/checkout', [WalkInGuestController::class, 'checkOut']);
        Route::delete('/{id}', [WalkInGuestController::class, 'destroy']);
    });
});