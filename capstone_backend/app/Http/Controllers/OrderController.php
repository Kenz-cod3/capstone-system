<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\MenuItem;
use App\Models\InventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    // 🔹 GET ALL ORDERS
    public function index()
    {
        return response()->json(
            Order::with(['items.menuItem', 'staff'])
                ->orderBy('id', 'desc') // ✅ FIX
                ->get(),
            200
        );
    }

    // 🔹 CREATE ORDER (POS)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1'
        ]);

        if (empty($validated['items'])) {
            return response()->json([
                'message' => 'Order items cannot be empty'
            ], 400);
        }

        try {
            return DB::transaction(function () use ($validated) {

                // 🔥 STAFF (fallback habang dev)
                $staffId = Auth::id() ?? 2;

                // 🔥 CREATE ORDER
                $order = Order::create([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'staff_id' => $staffId,
                    'order_date' => now(),
                    'order_status' => 'pending',
                    'total_amount' => 0
                ]);

                $total = 0;

                foreach ($validated['items'] as $item) {

                    $menuItem = MenuItem::findOrFail($item['menu_item_id']);

                    // 🔥 STOCK CHECK
                    if ($menuItem->stock_quantity < $item['quantity']) {
                        return response()->json([
                            'message' => "{$menuItem->name} is out of stock"
                        ], 400);
                    }

                    // 🔥 DEDUCT STOCK
                    $menuItem->decrement('stock_quantity', $item['quantity']);
                    $newStock = $menuItem->fresh()->stock_quantity;

                    if ($menuItem->stock_quantity <= 0) {
                        $menuItem->update(['is_active' => false]);
                    }

                    // 🔥 INVENTORY LOG
                    InventoryLog::create([
                        'menu_item_id' => $menuItem->id,
                        'user_id' => $staffId,
                        'change_type' => 'OUT',
                        'quantity' => $item['quantity'],
                        'quantity_change' => -$item['quantity'],
                        'new_stock_level' => $newStock, // ✅ FINAL FIX
                        'remarks' => 'Order #' . $order->order_number
                    ]);

                    // 🔥 SUBTOTAL
                    $subtotal = $menuItem->price * $item['quantity'];

                    OrderItem::create([
                        'order_id' => $order->id,
                        'menu_item_id' => $menuItem->id,
                        'quantity' => $item['quantity'],
                        'price_at_time_of_order' => $menuItem->price,
                        'subtotal' => $subtotal
                    ]);

                    $total += $subtotal;
                }

                // 🔥 UPDATE TOTAL
                $order->update(['total_amount' => $total]);

                return response()->json([
                    'message' => 'Order created successfully',
                    'data' => $order->load(['items.menuItem', 'staff'])
                ], 201);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // 🔹 GET SINGLE ORDER
    public function show($id)
    {
        $order = Order::with(['items.menuItem', 'staff'])->findOrFail($id);

        return response()->json($order, 200);
    }

    // 🔹 UPDATE ORDER STATUS
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'order_status' => 'sometimes|in:pending,preparing,served,paid,cancelled'
        ]);

        $order->update($validated);

        return response()->json([
            'message' => 'Order updated',
            'data' => $order
        ], 200);
    }

    // 🔹 DELETE ORDER (CANCEL + RESTORE STOCK)
    public function destroy($id)
    {
        try {
            $order = Order::with('items.menuItem')->findOrFail($id);

            DB::transaction(function () use ($order) {

                foreach ($order->items as $item) {

                    $menuItem = $item->menuItem;

                    if ($menuItem) {

                        // 🔥 RESTORE STOCK
                        $menuItem->increment('stock_quantity', $item->quantity);
                        $newStock = $menuItem->fresh()->stock_quantity;

                        if ($menuItem->stock_quantity > 0) {
                            $menuItem->update(['is_active' => true]);
                        }

                        $staffId = Auth::id() ?? 2;

                        // 🔥 INVENTORY LOG
                        InventoryLog::create([
                            'menu_item_id' => $menuItem->id,
                            'user_id' => $staffId,
                            'change_type' => 'IN',
                            'quantity' => $item->quantity,
                            'quantity_change' => $item->quantity,
                            'new_stock_level' => $newStock, // ✅ FINAL FIX
                            'remarks' => 'Order cancelled #' . $order->order_number
                        ]);
                    }
                }

                $order->items()->delete();
                $order->delete();
            });

            return response()->json([
                'message' => 'Order cancelled and stock restored'
            ], 200);
        } catch (\Throwable $e) {
            dd($e->getMessage());
        }
    }

    public function stats()
    {
        // 💰 TOTAL REVENUE (PAID ONLY)
        $totalRevenue = Order::where('order_status', 'paid')
            ->sum('total_amount');

        // 📦 TOTAL PAID ORDERS
        $totalOrders = Order::where('order_status', 'paid')
            ->count();

        // 🍔 TOP PRODUCTS
        $topProducts = OrderItem::select('menu_item_id', DB::raw('SUM(quantity) as total_sold'))
            ->with('menuItem')
            ->groupBy('menu_item_id')
            ->orderByDesc('total_sold')
            ->take(5)
            ->get();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_orders' => $totalOrders,
            'top_products' => $topProducts
        ]);
    }
}
