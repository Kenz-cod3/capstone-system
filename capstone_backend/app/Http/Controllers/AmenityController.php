<?php

namespace App\Http\Controllers;

use App\Models\Amenity;
use Illuminate\Http\Request;

class AmenityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);

        $amenities = Amenity::orderBy('id', 'desc')
            ->paginate($perPage);

        return response()->json($amenities);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:amenities,name',
        ]);

        $amenity = Amenity::create($validated);

        return response()->json([
            'message' => 'Amenity created successfully',
            'data' => $amenity
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return response()->json(
            Amenity::findOrFail($id),
            200
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $amenity = Amenity::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:amenities,name,' . $id,
        ]);

        $amenity->update($validated);

        return response()->json([
            'message' => 'Amenity updated successfully',
            'data' => $amenity
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $amenity = Amenity::findOrFail($id);

        if ($amenity->rooms()->exists()) {
            return response()->json([
                'message' => 'Cannot delete amenity because it is assigned to one or more rooms.'
            ], 400);
        }

        $amenity->delete();

        return response()->json([
            'message' => 'Amenity deleted successfully'
        ]);
    }
}
