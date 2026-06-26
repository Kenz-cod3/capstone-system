<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Order;
use App\Models\MenuItem;
use Illuminate\Http\Request;

class OrderItemController extends Controller
{
    // 🔹 GET ALL ORDER ITEMS
    public function index()
    {
        return response()->json(
            OrderItem::with(['order', 'menuItem'])->get(),
            200
        );
    }

    // 🔹 ADD ITEM TO ORDER
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'menu_item_id' => 'required|exists:menu_items,id',
            'quantity' => 'required|integer|min:1'
        ]);

        $menuItem = MenuItem::findOrFail($validated['menu_item_id']);

        $price = $menuItem->price;
        $subtotal = $price * $validated['quantity'];

        $orderItem = OrderItem::create([
            'order_id' => $validated['order_id'],
            'menu_item_id' => $menuItem->id,
            'quantity' => $validated['quantity'],
            'price_at_time_of_order' => $price, // FIX
            'subtotal' => $subtotal
        ]);

        // Update order total
        $order = Order::findOrFail($validated['order_id']);
        $newTotal = $order->items()->sum('subtotal');
        $order->update(['total_amount' => $newTotal]);

        return response()->json([
            'message' => 'Item added to order',
            'data' => $orderItem->load(['order', 'menuItem'])
        ], 201);
    }

    // GET SINGLE ITEM
    public function show($id)
    {
        $item = OrderItem::with(['order', 'menuItem'])->findOrFail($id);

        return response()->json($item, 200);
    }

    // UPDATE ITEM (CHANGE QUANTITY)
    public function update(Request $request, $id)
    {
        $item = OrderItem::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1'
        ]);

        // FIX: gamitin tamang column
        $subtotal = $item->price_at_time_of_order * $validated['quantity'];

        $item->update([
            'quantity' => $validated['quantity'],
            'subtotal' => $subtotal
        ]);

        // Update order total
        $order = $item->order;
        $newTotal = $order->items()->sum('subtotal');
        $order->update(['total_amount' => $newTotal]);

        return response()->json([
            'message' => 'Order item updated',
            'data' => $item
        ], 200);
    }

    // 🔹 DELETE ITEM
    public function destroy($id)
    {
        $item = OrderItem::findOrFail($id);
        $order = $item->order;

        $item->delete();

        // 🔥 Update order total
        $newTotal = $order->items()->sum('subtotal');
        $order->update(['total_amount' => $newTotal]);

        return response()->json([
            'message' => 'Order item deleted'
        ], 200);
    }
}
