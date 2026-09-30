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
    // DEFAULT PER PAGE — ito ang magiging default kapag walang per_page sa request
    private const DEFAULT_PER_PAGE = 10;

    // GET ALL ORDERS (may pagination)
    public function index(Request $request)
    {
        // Default 10 kung walang per_page sa request
        $perPage = (int) $request->input('per_page', self::DEFAULT_PER_PAGE);

        // Safety limits
        if ($perPage < 1) $perPage = self::DEFAULT_PER_PAGE;
        if ($perPage > 100) $perPage = 100;

        $search = $request->input('search');
        $status = $request->input('order_status');

        $query = Order::with([
                'items.menuItem',
                'cashier',
                'payments',
            ])
            ->latest();

        // Search by order_number o id
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'LIKE', "%{$search}%")
                  ->orWhere('id', $search);
            });
        }

        // Filter by order_status
        if (!empty($status) && $status !== 'all') {
            $query->where('order_status', $status);
        }

        // ✅ PAGINATE — default 10 items per page
        return response()->json($query->paginate($perPage), 200);
    }

    // CREATE ORDER (POS)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if (empty($validated['items'])) {
            return response()->json([
                'message' => 'Order items cannot be empty'
            ], 400);
        }

        try {
            return DB::transaction(function () use ($validated) {
                $cashierId = Auth::id() ?? 2;

                $order = Order::create([
                    'order_number'  => 'ORD-' . strtoupper(uniqid()),
                    'cashier_id'    => $cashierId,
                    'booking_id'    => null,
                    'order_date'    => now()->toDateString(),
                    'order_status'  => 'pending',
                    'total_amount'  => 0,
                ]);

                $total = 0;

                foreach ($validated['items'] as $item) {
                    $menuItem = MenuItem::findOrFail($item['menu_item_id']);

                    if ($menuItem->stock_quantity < $item['quantity']) {
                        throw new \Exception("{$menuItem->name} is out of stock");
                    }

                    $menuItem->decrement('stock_quantity', $item['quantity']);
                    $newStock = $menuItem->fresh()->stock_quantity;

                    if ($newStock <= 0) {
                        $menuItem->update(['is_active' => false]);
                    }

                    InventoryLog::create([
                        'menu_item_id'    => $menuItem->id,
                        'user_id'         => $cashierId,
                        'change_type'     => 'OUT',
                        'quantity'        => $item['quantity'],
                        'quantity_change' => -$item['quantity'],
                        'new_stock_level' => $newStock,
                        'remarks'         => 'Order #' . $order->order_number,
                    ]);

                    $subtotal = $menuItem->price * $item['quantity'];

                    OrderItem::create([
                        'order_id'                => $order->id,
                        'menu_item_id'            => $menuItem->id,
                        'quantity'                => $item['quantity'],
                        'price_at_time_of_order'  => $menuItem->price,
                        'subtotal'                => $subtotal,
                    ]);

                    $total += $subtotal;
                }

                $order->update(['total_amount' => $total]);

                return response()->json([
                    'message' => 'Order created successfully',
                    'data'    => $order->load([
                        'items.menuItem',
                        'cashier',
                        'payments',
                    ]),
                ], 201);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to create order',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // GET SINGLE ORDER
    public function show($id)
    {
        $order = Order::with([
                'items.menuItem',
                'cashier',
                'payments',
            ])
            ->findOrFail($id);

        return response()->json($order, 200);
    }

    // UPDATE ORDER STATUS
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'order_status' => 'sometimes|in:pending,preparing,served,paid,cancelled',
        ]);

        $order->update($validated);

        return response()->json([
            'message' => 'Order updated',
            'data'    => $order->load([
                'items.menuItem',
                'cashier',
                'payments',
            ]),
        ], 200);
    }

    // DELETE ORDER (CANCEL + RESTORE STOCK)
    public function destroy($id)
    {
        try {
            $order = Order::with('items.menuItem')->findOrFail($id);

            DB::transaction(function () use ($order) {
                foreach ($order->items as $item) {
                    $menuItem = $item->menuItem;

                    if ($menuItem) {
                        $menuItem->increment('stock_quantity', $item->quantity);
                        $newStock = $menuItem->fresh()->stock_quantity;

                        if ($newStock > 0) {
                            $menuItem->update(['is_active' => true]);
                        }

                        $cashierId = Auth::id() ?? 2;

                        InventoryLog::create([
                            'menu_item_id'    => $menuItem->id,
                            'user_id'         => $cashierId,
                            'change_type'     => 'IN',
                            'quantity'        => $item->quantity,
                            'quantity_change' => $item->quantity,
                            'new_stock_level' => $newStock,
                            'remarks'         => 'Order cancelled #' . $order->order_number,
                        ]);
                    }
                }

                $order->payments()->delete();
                $order->items()->delete();
                $order->delete();
            });

            return response()->json([
                'message' => 'Order cancelled and stock restored'
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to cancel order',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // GET STATS
    public function stats()
    {
        $totalRevenue = Order::where('order_status', 'paid')
            ->sum('total_amount');

        $totalOrders = Order::where('order_status', 'paid')
            ->count();

        $topProducts = OrderItem::select(
                'menu_item_id',
                DB::raw('SUM(quantity) as total_sold')
            )
            ->with('menuItem')
            ->groupBy('menu_item_id')
            ->orderByDesc('total_sold')
            ->take(5)
            ->get();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_orders'  => $totalOrders,
            'top_products'  => $topProducts,
        ], 200);
    }
}