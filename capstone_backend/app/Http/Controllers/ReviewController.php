<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Booking;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index()
    {
        return response()->json(
            Review::with(['booking', 'user'])->get(),
            200
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'user_id' => 'required|exists:users,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string'
        ]);

        $booking = Booking::findOrFail($validated['booking_id']);

        if ($booking->status !== 'checked_out') {
            return response()->json([
                'message' => 'You can only review after checkout'
            ], 400);
        }

        $exists = Review::where('booking_id', $validated['booking_id'])
            ->where('user_id', $validated['user_id'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Review already submitted for this booking'
            ], 400);
        }

        $review = Review::create($validated);

        return response()->json([
            'message' => 'Review submitted successfully',
            'data' => $review->load(['booking', 'user'])
        ], 201);
    }

    public function show($id)
    {
        $review = Review::with(['booking', 'user'])->findOrFail($id);

        return response()->json($review, 200);
    }

    public function update(Request $request, $id)
    {
        $review = Review::findOrFail($id);

        $validated = $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'sometimes|string'
        ]);

        $review->update($validated);

        return response()->json([
            'message' => 'Review updated',
            'data' => $review
        ], 200);
    }

    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        $review->delete();

        return response()->json([
            'message' => 'Review deleted'
        ], 200);
    }
}
