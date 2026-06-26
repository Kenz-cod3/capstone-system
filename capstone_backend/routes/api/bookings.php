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
    // Route::get('/all', [BookingController::class, 'all']);

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

// WALK-IN GUESTS
Route::prefix('walk-in-guests')->group(function () {
    // Existing routes
    Route::get('/', [WalkInGuestController::class, 'index']);
    Route::post('/', [WalkInGuestController::class, 'store']); // Keep original for backward compatibility if needed
    
    // New routes for guest search and management
    Route::get('/search', [WalkInGuestController::class, 'search']);           // Search existing guests
    Route::post('/guest', [WalkInGuestController::class, 'storeGuest']);      // Create guest only (no booking)
    Route::post('/checkin', [WalkInGuestController::class, 'checkin']);       // Check-in with existing or new guest
    
    // Checkout route
    Route::post('/{bookingId}/checkout', [WalkInGuestController::class, 'checkOut']);
    
    // GET GUEST DETAILS WITH BOOKINGS AND TOTAL SPENT
    Route::get('/{id}/details', [WalkInGuestController::class, 'getGuestDetails']); // NEW: Get guest with booking history and total spent
    
    // Get booking details with add-ons (for viewing inside modal)
    Route::get('/bookings/{bookingId}', [WalkInGuestController::class, 'getBookingDetails']);
    
    // Delete guest
    Route::delete('/{id}', [WalkInGuestController::class, 'destroy']);
});

// Alternative: If you want to keep RESTful structure but with custom methods
// Route::apiResource('walk-in-guests', WalkInGuestController::class);
// Route::post('walk-in-guests/{bookingId}/checkout', [WalkInGuestController::class, 'checkOut']);