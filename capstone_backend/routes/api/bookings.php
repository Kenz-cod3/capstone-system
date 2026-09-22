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
    Route::get('/', [BookingController::class, 'index']);
    Route::get('/active', [BookingController::class, 'active']);
    Route::get('/history', [BookingController::class, 'history']);
    Route::get('/trash', [BookingController::class, 'trash']);
    Route::get('/bookings/reference/{reference}', [BookingController::class, 'findByReference']);
    // Route::get('/all', [BookingController::class, 'all']);

    Route::post('/', [BookingController::class, 'store']);
    Route::get('/{id}', [BookingController::class, 'show']);
    Route::put('/{id}', [BookingController::class, 'update']);
    Route::delete('/{id}', [BookingController::class, 'destroy']);

    Route::post('/{id}/restore', [BookingController::class, 'restore']);
    Route::delete('/{id}/force-delete', [BookingController::class, 'forceDelete']);

    Route::post(
        '/{bookingId}/extend/{bookedRoomId}',
        [BookingController::class, 'extend']
    );
});

Route::prefix('booked-rooms')->group(function () {

    Route::get('/history', [BookedRoomController::class, 'history']);

    Route::get('/trash', [BookedRoomController::class, 'trash']);

    Route::post('/{id}/restore', [BookedRoomController::class, 'restore']);

    Route::delete('/{id}/force-delete', [BookedRoomController::class, 'forceDelete']);
});

// BOOKING DETAILS
Route::apiResource('booked-rooms', BookedRoomController::class);
Route::apiResource('booking-addons', BookingAddOnController::class);
Route::post(
    'booking-payments/refund',
    [BookingPaymentController::class, 'refund']
);
Route::apiResource('booking-payments', BookingPaymentController::class);
Route::apiResource('booking-invoices', BookingInvoiceController::class);
Route::apiResource('booking-histories', BookingHistoryController::class);


// RECEIPTS (WEB)
Route::get('/receipts/{payment}', [ReceiptController::class, 'show']);
// RECEIPTS (MOBILE)
Route::get('/bookings/{bookingId}/receipt', [ReceiptController::class, 'bookingReceipt']);

// WALK-IN GUESTS
Route::prefix('walk-in-guests')->group(function () {
    Route::get('/', [WalkInGuestController::class, 'index']);
    Route::post('/', [WalkInGuestController::class, 'store']);

    Route::get('/search', [WalkInGuestController::class, 'search']);
    Route::post('/guest', [WalkInGuestController::class, 'storeGuest']);
    Route::post('/checkin', [WalkInGuestController::class, 'checkin']);

    // NEW: QR Ph confirm (called after polling succeeds)
    Route::post('/{bookingId}/confirm-qr', [WalkInGuestController::class, 'confirmQr']);

    // NEW: Admin reconciliation list of pending walk-in payments
    Route::get('/pending-payments', [WalkInGuestController::class, 'pendingPayments']);

    Route::post('/{bookingId}/checkout', [WalkInGuestController::class, 'checkOut']);
    Route::get('/{id}/details', [WalkInGuestController::class, 'getGuestDetails']);
    Route::get('/bookings/{bookingId}', [WalkInGuestController::class, 'getBookingDetails']);
    Route::delete('/{id}', [WalkInGuestController::class, 'destroy']);
});

// Alternative: If you want to keep RESTful structure but with custom methods
// Route::apiResource('walk-in-guests', WalkInGuestController::class);
// Route::post('walk-in-guests/{bookingId}/checkout', [WalkInGuestController::class, 'checkOut']);