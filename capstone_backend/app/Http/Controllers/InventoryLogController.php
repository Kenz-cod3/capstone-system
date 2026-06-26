<?php

namespace App\Http\Controllers;

use App\Models\InventoryLog;
use App\Models\MenuItem;
use Illuminate\Http\Request;

class InventoryLogController extends Controller
{
    // GET ALL LOGS
    public function index()
    {
        return response()->json(
            InventoryLog::with(['menuItem', 'user'])->get(),
            200
        );
    }

    // CREATE INVENTORY LOG
    public function store(Request $request)
    {
        $validated = $request->validate([
            'menu_item_id' => 'required|exists:menu_items,id',
            'user_id' => 'required|exists:users,id',
            'type' => 'required|in:IN,OUT',
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string'
        ]);

        $menuItem = MenuItem::findOrFail($validated['menu_item_id']);

        // STOCK LOGIC
        if ($validated['type'] === 'OUT') {
            if ($menuItem->stock < $validated['quantity']) {
                return response()->json([
                    'message' => 'Insufficient stock'
                ], 400);
            }

            $menuItem->decrement('stock', $validated['quantity']);
        } else {
            $menuItem->increment('stock', $validated['quantity']);
        }

        $log = InventoryLog::create($validated);

        return response()->json([
            'message' => 'Inventory updated successfully',
            'data' => $log->load(['menuItem', 'user'])
        ], 201);
    }

    // GET SINGLE LOG
    public function show($id)
    {
        $log = InventoryLog::with(['menuItem', 'user'])->findOrFail($id);

        return response()->json($log, 200);
    }

    // UPDATE LOG (RARE – usually not allowed)
    public function update(Request $request, $id)
    {
        $log = InventoryLog::findOrFail($id);

        $validated = $request->validate([
            'remarks' => 'sometimes|string'
        ]);

        $log->update($validated);

        return response()->json([
            'message' => 'Inventory log updated',
            'data' => $log
        ], 200);
    }

    // DELETE LOG (NOT RECOMMENDED)
    public function destroy($id)
    {
        $log = InventoryLog::findOrFail($id);
        $log->delete();

        return response()->json([
            'message' => 'Inventory log deleted'
        ], 200);
    }
}
