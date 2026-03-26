<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\MenuItem;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    // 🔹 GET ALL ORDERS
    public function index()
    {
        return response()->json(
            Order::with(['items.menuItem'])->get(),
            200
        );
    }

    // 🔹 CREATE ORDER
    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'nullable|exists:bookings,id',
            'walk_in_guest_id' => 'nullable|exists:walk_in_guests,id',
            'items' => 'required|array',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1'
        ]);

        // Create order
        $order = Order::create([
            'booking_id' => $validated['booking_id'] ?? null,
            'walk_in_guest_id' => $validated['walk_in_guest_id'] ?? null,
            'total_amount' => 0
        ]);

        $total = 0;

        // Create order items
        foreach ($validated['items'] as $item) {
            $menuItem = MenuItem::findOrFail($item['menu_item_id']);

            $subtotal = $menuItem->price * $item['quantity'];

            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => $menuItem->id,
                'quantity' => $item['quantity'],
                'price' => $menuItem->price,
                'subtotal' => $subtotal
            ]);

            $total += $subtotal;
        }

        // Update total
        $order->update(['total_amount' => $total]);

        return response()->json([
            'message' => 'Order created successfully',
            'data' => $order->load(['items.menuItem'])
        ], 201);
    }

    // 🔹 GET SINGLE ORDER
    public function show($id)
    {
        $order = Order::with(['items.menuItem'])->findOrFail($id);

        return response()->json($order, 200);
    }

    // 🔹 UPDATE ORDER (RARE)
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'booking_id' => 'sometimes|exists:bookings,id',
            'walk_in_guest_id' => 'sometimes|exists:walk_in_guests,id'
        ]);

        $order->update($validated);

        return response()->json([
            'message' => 'Order updated',
            'data' => $order
        ], 200);
    }

    // 🔹 DELETE ORDER
    public function destroy($id)
    {
        $order = Order::findOrFail($id);

        // Delete related items first
        $order->items()->delete();

        $order->delete();

        return response()->json([
            'message' => 'Order deleted'
        ], 200);
    }
}
