<?php

namespace App\Http\Controllers;

use App\Models\RoomType;
use Illuminate\Http\Request;

class RoomTypeController extends Controller
{
    // GET ALL ROOM TYPES
    public function index()
    {
        return response()->json(
            RoomType::with('rooms', 'amenities')->get(),
            200
        );
    }

    // CREATE ROOM TYPE
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_price' => 'required|numeric|min:0',
            'short_stay_price' => 'nullable|numeric|min:0',
            'max_occupancy' => 'required|integer|min:1',
            'amenities' => 'nullable|array',
            'amenities.*' => 'exists:amenities,id',
        ]);

        $amenities = $validated['amenities'] ?? [];
        unset($validated['amenities']);

        $roomType = RoomType::create($validated);
        $roomType->amenities()->sync($amenities);
        $roomType->load('amenities');

        return response()->json([
            'message' => 'Room type created successfully',
            'data' => $roomType
        ], 201);
    }

    // GET SINGLE ROOM TYPE
    public function show($id)
    {
        $roomType = RoomType::with('rooms', 'amenities')->findOrFail($id);

        return response()->json($roomType, 200);
    }

    // UPDATE ROOM TYPE
    public function update(Request $request, $id)
    {
        $roomType = RoomType::findOrFail($id);

        $validated = $request->validate([
            'type_name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'base_price' => 'sometimes|numeric|min:0',
            'short_stay_price' => 'nullable|numeric|min:0',
            'max_occupancy' => 'sometimes|integer|min:1',
            'amenities' => 'nullable|array',
            'amenities.*' => 'exists:amenities,id',
        ]);

        $amenities = $validated['amenities'] ?? null;
        unset($validated['amenities']);

        $roomType->update($validated);

        if ($amenities !== null) {
            $roomType->amenities()->sync($amenities);
        }

        $roomType->load('amenities');

        return response()->json([
            'message' => 'Room type updated successfully',
            'data' => $roomType
        ], 200);
    }

    // DELETE ROOM TYPE
    public function destroy($id)
    {
        $roomType = RoomType::findOrFail($id);

        // Optional: prevent delete if may rooms pa
        if ($roomType->rooms()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete room type with existing rooms'
            ], 400);
        }

        $roomType->delete();

        return response()->json([
            'message' => 'Room type deleted successfully'
        ], 200);
    }
}
