<?php

namespace App\Http\Controllers;

use App\Models\OrderPayment;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderPaymentController extends Controller
{
    // 🔹 GET ALL PAYMENTS
    public function index()
    {
        return response()->json(
            OrderPayment::with('order')->get(),
            200
        );
    }

    // 🔹 CREATE PAYMENT
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'status' => 'required|in:pending,paid,failed'
        ]);

        $order = Order::findOrFail($validated['order_id']);

        // 🔥 Get total paid
        $totalPaid = OrderPayment::where('order_id', $order->id)->sum('amount');

        $newTotal = $totalPaid + $validated['amount'];

        // 🔥 Prevent overpayment
        if ($newTotal > $order->total_amount) {
            return response()->json([
                'message' => 'Overpayment not allowed'
            ], 400);
        }

        // Create payment
        $payment = OrderPayment::create($validated);

        // 🔥 Update order status
        if ($newTotal == $order->total_amount) {
            $order->update(['status' => 'paid']);
        } elseif ($newTotal > 0) {
            $order->update(['status' => 'partial']);
        }

        return response()->json([
            'message' => 'Payment recorded successfully',
            'data' => $payment->load('order')
        ], 201);
    }

    // 🔹 GET SINGLE PAYMENT
    public function show($id)
    {
        $payment = OrderPayment::with('order')->findOrFail($id);

        return response()->json($payment, 200);
    }

    // 🔹 UPDATE PAYMENT
    public function update(Request $request, $id)
    {
        $payment = OrderPayment::findOrFail($id);

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'payment_method' => 'sometimes|string',
            'status' => 'sometimes|in:pending,paid,failed'
        ]);

        $payment->update($validated);

        return response()->json([
            'message' => 'Payment updated',
            'data' => $payment
        ], 200);
    }

    // 🔹 DELETE PAYMENT
    public function destroy($id)
    {
        $payment = OrderPayment::findOrFail($id);
        $order = $payment->order;

        $payment->delete();

        // 🔥 Recalculate order status
        $totalPaid = OrderPayment::where('order_id', $order->id)->sum('amount');

        if ($totalPaid == 0) {
            $order->update(['status' => 'pending']);
        } elseif ($totalPaid < $order->total_amount) {
            $order->update(['status' => 'partial']);
        } else {
            $order->update(['status' => 'paid']);
        }

        return response()->json([
            'message' => 'Payment deleted'
        ], 200);
    }
}
