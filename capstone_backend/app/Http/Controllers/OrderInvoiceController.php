<?php

namespace App\Http\Controllers;

use App\Models\OrderInvoice;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrderInvoiceController extends Controller
{
    // 🔹 GET ALL INVOICES
    public function index()
    {
        return response()->json(
            OrderInvoice::with('order')->get(),
            200
        );
    }

    // 🔹 GENERATE INVOICE
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id'
        ]);

        $order = Order::with(['items', 'items.menuItem', 'payments'])
            ->findOrFail($validated['order_id']);

        // 🔥 COMPUTE TOTALS

        // Items total
        $itemsTotal = $order->items->sum('subtotal');

        // Payments total
        $paidTotal = $order->payments->sum('amount');

        // Balance
        $balance = $itemsTotal - $paidTotal;

        // Prevent duplicate invoice
        if (OrderInvoice::where('order_id', $order->id)->exists()) {
            return response()->json([
                'message' => 'Invoice already exists for this order'
            ], 400);
        }

        $invoice = OrderInvoice::create([
            'order_id' => $order->id,
            'invoice_number' => 'ORD-INV-' . strtoupper(Str::random(6)),
            'items_total' => $itemsTotal,
            'paid_total' => $paidTotal,
            'balance' => $balance,
            'status' => $balance <= 0 ? 'paid' : 'unpaid'
        ]);

        return response()->json([
            'message' => 'Order invoice generated successfully',
            'data' => $invoice->load('order')
        ], 201);
    }

    // 🔹 GET SINGLE INVOICE
    public function show($id)
    {
        $invoice = OrderInvoice::with('order')->findOrFail($id);

        return response()->json($invoice, 200);
    }

    // 🔹 UPDATE (RARE)
    public function update(Request $request, $id)
    {
        $invoice = OrderInvoice::findOrFail($id);

        $validated = $request->validate([
            'items_total' => 'sometimes|numeric|min:0',
            'paid_total' => 'sometimes|numeric|min:0',
            'balance' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:paid,unpaid'
        ]);

        $invoice->update($validated);

        return response()->json([
            'message' => 'Invoice updated',
            'data' => $invoice
        ], 200);
    }

    // 🔹 DELETE INVOICE
    public function destroy($id)
    {
        $invoice = OrderInvoice::findOrFail($id);
        $invoice->delete();

        return response()->json([
            'message' => 'Invoice deleted'
        ], 200);
    }
}
