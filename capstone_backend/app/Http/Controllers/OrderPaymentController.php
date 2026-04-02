<?php

namespace App\Http\Controllers;

use App\Models\OrderPayment;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'amount' => 'required|numeric|min:0'
        ]);

        $order = Order::findOrFail($validated['order_id']);

        // ❌ Prevent zero payment
        if ($validated['amount'] <= 0) {
            return response()->json([
                'message' => 'Invalid cash amount'
            ], 400);
        }

        // 💵 COMPUTE CHANGE
        $change = 0;

        if ($validated['amount'] > $order->total_amount) {
            $change = $validated['amount'] - $order->total_amount;
        }

        // 💰 SAVE PAYMENT (FIXED 🔥)
        $payment = OrderPayment::create([
            'order_id' => $order->id,
            'amount' => $validated['amount'],
            'payment_method' => 'cash',
            'user_id' => Auth::id() ?? 2, // 🔥 FIX
            'change_amount' => $change,
            'payment_date' => now()
        ]);

        // 🔥 UPDATE ORDER STATUS (FIXED)
        $order->update([
            'order_status' => 'paid'
        ]);

        return response()->json([
            'message' => 'Payment successful',
            'data' => $payment,
            'change' => $change
        ], 200);
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
