<?php

namespace App\Http\Controllers;

use App\Models\AddOn;
use Illuminate\Http\Request;

class AddOnController extends Controller
{
    //GET ALL ADD-ONS
    public function index()
    {
        return response()->json(
            AddOn::with('bookings')->get(),
            200
        );
    }

    //CREATE ADD-ON
    public function store(Request $request)
    {
        $validated = $request->validate([
            'add_on_name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0'
        ]);

        $addon = AddOn::create($validated);

        return response()->json([
            'message' => 'Add-on created successfully',
            'data' => $addon
        ], 201);
    }

    //GET SINGLE ADD-ON
    public function show($id)
    {
        $addon = AddOn::with('bookings')->findOrFail($id);

        return response()->json($addon, 200);
    }

    //UPDATE ADD-ON
    public function update(Request $request, $id)
    {
        $addon = AddOn::findOrFail($id);

        $validated = $request->validate([
            'add_on_name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0'
        ]);

        $addon->update($validated);

        return response()->json([
            'message' => 'Add-on updated successfully',
            'data' => $addon
        ], 200);
    }

    //DELETE ADD-ON
    public function destroy($id)
    {
        $addon = AddOn::findOrFail($id);

        // Optional: prevent delete if used in bookings
        if ($addon->bookings()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete add-on assigned to bookings'
            ], 400);
        }

        $addon->delete();

        return response()->json([
            'message' => 'Add-on deleted successfully'
        ], 200);
    }
}
