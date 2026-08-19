<?php

namespace App\Http\Controllers;

use App\Models\RoomType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoomTypeController extends Controller
{
    // GET ALL ROOM TYPES WITH PAGINATION
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $sortBy = $request->input('sort_by', 'type_name');
        $sortDir = $request->input('sort_dir', 'asc');

        // Validate sort column to prevent SQL injection
        $allowedSortColumns = ['type_name', 'base_price', 'short_stay_price', 'max_occupancy'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'type_name';
        }

        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? $sortDir : 'asc';

        $roomTypes = RoomType::with('rooms')
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage);

        return response()->json([
            'data' => $roomTypes->items(),
            'meta' => [
                'current_page' => $roomTypes->currentPage(),
                'last_page' => $roomTypes->lastPage(),
                'per_page' => $roomTypes->perPage(),
                'total' => $roomTypes->total(),
                'from' => $roomTypes->firstItem(),
                'to' => $roomTypes->lastItem(),
            ]
        ], 200);
    }

    // CREATE ROOM TYPE
    public function store(Request $request)
    {
        // Remove extra spaces
        $request->merge([
            'type_name' => trim($request->type_name),
        ]);

        $validated = $request->validate([
            'type_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('room_types', 'type_name'),
            ],
            'description' => 'nullable|string',
            'base_price' => 'required|numeric|min:0',
            'short_stay_price' => 'nullable|numeric|min:0',
            'max_occupancy' => 'required|integer|min:1',
        ], [
            'type_name.unique' => 'This room type already exists.',
        ]);

        $roomType = RoomType::create($validated);

        return response()->json([
            'message' => 'Room type created successfully',
            'data' => $roomType
        ], 201);
    }
    // public function store(Request $request)
    // {
    //     $validated = $request->validate([
    //         'type_name' => 'required|string|max:255',
    //         'description' => 'nullable|string',
    //         'base_price' => 'required|numeric|min:0',
    //         'short_stay_price' => 'nullable|numeric|min:0',
    //         'max_occupancy' => 'required|integer|min:1',
    //     ]);

    //     $roomType = RoomType::create($validated);

    //     return response()->json([
    //         'message' => 'Room type created successfully',
    //         'data' => $roomType
    //     ], 201);
    // }

    // UPDATE ROOM TYPE
    public function update(Request $request, $id)
    {
        $roomType = RoomType::findOrFail($id);

        // Remove extra spaces
        $request->merge([
            'type_name' => trim($request->type_name),
        ]);

        $validated = $request->validate([
            'type_name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('room_types', 'type_name')->ignore($roomType->id),
            ],
            'description' => 'nullable|string',
            'base_price' => 'sometimes|numeric|min:0',
            'short_stay_price' => 'nullable|numeric|min:0',
            'max_occupancy' => 'sometimes|integer|min:1',
        ], [
            'type_name.unique' => 'This room type already exists.',
        ]);

        $roomType->update($validated);

        return response()->json([
            'message' => 'Room type updated successfully',
            'data' => $roomType
        ], 200);
    }
    // public function update(Request $request, $id)
    // {
    //     $roomType = RoomType::findOrFail($id);

    //     $validated = $request->validate([
    //         'type_name' => 'sometimes|string|max:255',
    //         'description' => 'nullable|string',
    //         'base_price' => 'sometimes|numeric|min:0',
    //         'short_stay_price' => 'nullable|numeric|min:0',
    //         'max_occupancy' => 'sometimes|integer|min:1',
    //     ]);

    //     $roomType->update($validated);

    //     return response()->json([
    //         'message' => 'Room type updated successfully',
    //         'data' => $roomType
    //     ], 200);
    // }

    // DELETE ROOM TYPE
    public function destroy($id)
    {
        $roomType = RoomType::findOrFail($id);

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
