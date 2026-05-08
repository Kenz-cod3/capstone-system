<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuItemController extends Controller
{
    public function index()
    {
        $items = MenuItem::all()->map(function ($item) {
            $item->image_url = $item->image_path
                ? asset('storage/' . $item->image_path)
                : null;
            return $item;
        });

        return response()->json($items, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'description'         => 'nullable|string',
            'price'               => 'required|numeric|min:0',
            'category'            => 'required|string|max:100',
            'stock_quantity'      => 'required|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'is_active'           => 'required|boolean',
            'image'               => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('menu-images', 'public');
        }

        $menuItem = MenuItem::create([
            ...$validated,
            'image_path' => $imagePath,
        ]);

        $menuItem->image_url = $imagePath ? asset('storage/' . $imagePath) : null;

        return response()->json(['message' => 'Menu item created', 'data' => $menuItem], 201);
    }

    public function show($id)
    {
        $item = MenuItem::findOrFail($id);
        $item->image_url = $item->image_path
            ? asset('storage/' . $item->image_path)
            : null;

        return response()->json($item, 200);
    }

    public function update(Request $request, $id)
    {
        $item = MenuItem::findOrFail($id);

        $validated = $request->validate([
            'name'                => 'sometimes|string|max:255',
            'description'         => 'sometimes|nullable|string',
            'price'               => 'sometimes|numeric|min:0',
            'category'            => 'sometimes|string|max:100',
            'stock_quantity'      => 'sometimes|integer|min:0',
            'low_stock_threshold' => 'sometimes|nullable|integer|min:0',
            'is_active'           => 'sometimes|boolean',
            'image'               => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        // Handle new image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($item->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('menu-images', 'public');
        }

        // Remove 'image' key — not a DB column
        unset($validated['image']);

        $item->update($validated);

        $item->image_url = $item->image_path
            ? asset('storage/' . $item->image_path)
            : null;

        return response()->json(['message' => 'Menu item updated', 'data' => $item], 200);
    }

    public function destroy($id)
    {
        $item = MenuItem::findOrFail($id);

        if ($item->orderItems()->count() > 0) {
            return response()->json(['message' => 'Cannot delete menu item used in orders'], 400);
        }

        // Delete image from storage
        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
        }

        $item->delete();

        return response()->json(['message' => 'Menu item deleted'], 200);
    }

    public function available()
    {
        $items = MenuItem::where('is_active', true)->get()->map(function ($item) {
            $item->image_url = $item->image_path
                ? asset('storage/' . $item->image_path)
                : null;
            return $item;
        });

        return response()->json($items, 200);
    }
}
