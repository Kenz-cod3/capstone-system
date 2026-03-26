<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use Illuminate\Http\Request;

class MenuItemController extends Controller
{
    // 🔹 GET ALL MENU ITEMS
    public function index()
    {
        return response()->json(
            MenuItem::all(),
            200
        );
    }

    // 🔹 CREATE MENU ITEM
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:available,unavailable'
        ]);

        $menuItem = MenuItem::create($validated);

        return response()->json([
            'message' => 'Menu item created',
            'data' => $menuItem
        ], 201);
    }

    // 🔹 GET SINGLE ITEM
    public function show($id)
    {
        $item = MenuItem::findOrFail($id);

        return response()->json($item, 200);
    }

    // 🔹 UPDATE MENU ITEM
    public function update(Request $request, $id)
    {
        $item = MenuItem::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:available,unavailable'
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Menu item updated',
            'data' => $item
        ], 200);
    }

    // 🔹 DELETE MENU ITEM
    public function destroy($id)
    {
        $item = MenuItem::findOrFail($id);

        // Optional: prevent delete if used in orders
        if ($item->orderItems()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete menu item used in orders'
            ], 400);
        }

        $item->delete();

        return response()->json([
            'message' => 'Menu item deleted'
        ], 200);
    }

    // 🔥 CUSTOM: GET AVAILABLE ITEMS
    public function available()
    {
        return response()->json(
            MenuItem::where('status', 'available')->get(),
            200
        );
    }
}
