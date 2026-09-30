<?php

namespace App\Http\Controllers;

use App\Models\OrderPayment;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class OrderPaymentController extends Controller
{
    // DEFAULT PER PAGE — ito ang magiging default kapag walang per_page sa request
    private const DEFAULT_PER_PAGE = 10;

    // GET ALL PAYMENTS (may SERVER-SIDE PAGINATION)
    public function index(Request $request)
    {
        // Default 10 kung walang per_page sa request
        $perPage = (int) $request->input('per_page', self::DEFAULT_PER_PAGE);

        // Siguraduhing hindi lalampas sa 100 (safety limit)
        if ($perPage < 1) $perPage = self::DEFAULT_PER_PAGE;
        if ($perPage > 100) $perPage = 100;

        $search = $request->input('search');
        $status = $request->input('payment_status');

        $query = OrderPayment::with([
                'order.items.menuItem',
                'order.cashier',
                'user',
            ])
            ->latest('id');

        // Search by reference, order #, o cashier name
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('gcash_reference', 'LIKE', "%{$search}%")
                  ->orWhere('order_id', $search)
                  ->orWhereHas('order', function ($orderQuery) use ($search) {
                      $orderQuery->where('order_number', 'LIKE', "%{$search}%");
                  })
                  ->orWhereHas('order.cashier', function ($cashierQuery) use ($search) {
                      $cashierQuery->where('first_name', 'LIKE', "%{$search}%")
                                   ->orWhere('last_name', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Filter by payment_status
        if (!empty($status) && $status !== 'all') {
            $query->where('payment_status', $status);
        }

        // ✅ PAGINATE — default 10 items per page
        return response()->json($query->paginate($perPage), 200);
    }

    // CREATE PAYMENT (cash / gcash / qrph)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id'        => 'required|exists:orders,id',
            'amount'          => 'required|numeric|min:0',
            'payment_method'  => 'required|in:cash,gcash,qrph',
            'gcash_reference' => 'nullable|string',
        ]);

        $order = Order::findOrFail($validated['order_id']);

        if ($validated['amount'] <= 0) {
            return response()->json([
                'message' => 'Invalid payment amount'
            ], 400);
        }

        if ($order->order_status === 'paid') {
            return response()->json([
                'message' => 'Order is already fully paid',
                'data'    => null,
                'change'  => 0,
            ], 200);
        }

        if (
            ! empty($validated['gcash_reference']) &&
            OrderPayment::where('gcash_reference', $validated['gcash_reference'])->exists()
        ) {
            Log::info('OrderPayment: already processed', [
                'gcash_reference' => $validated['gcash_reference'],
            ]);

            return response()->json([
                'message' => 'Payment already recorded',
                'data'    => null,
                'change'  => 0,
            ], 200);
        }

        $alreadyPaid = OrderPayment::where('order_id', $order->id)
            ->where('payment_status', 'paid')
            ->sum('amount');

        $due = max(0, $order->total_amount - $alreadyPaid);

        if ($due <= 0) {
            return response()->json([
                'message' => 'Order is already fully paid',
                'data'    => null,
                'change'  => 0,
            ], 200);
        }

        $paymentStatus = 'pending';

        if ($validated['payment_method'] === 'cash') {
            $paymentStatus = 'paid';
        } elseif (
            in_array($validated['payment_method'], ['qrph', 'gcash']) &&
            ! empty($validated['gcash_reference'])
        ) {
            $paymentStatus = 'paid';
        }

        $change = max(0, $validated['amount'] - $due);

        $payment = OrderPayment::create([
            'order_id'        => $order->id,
            'amount'          => $validated['amount'],
            'payment_method'  => $validated['payment_method'],
            'payment_status'  => $paymentStatus,
            'gcash_reference' => $validated['gcash_reference'] ?? null,
            'user_id'         => Auth::id() ?? $order->cashier_id ?? 2,
            'change_amount'   => $change,
            'payment_date'    => now(),
        ]);

        if ($paymentStatus === 'paid') {
            $totalPaid = OrderPayment::where('order_id', $order->id)
                ->where('payment_status', 'paid')
                ->sum('amount');

            if ($totalPaid >= $order->total_amount) {
                $order->update(['order_status' => 'paid']);

                Log::info('OrderPayment: order marked as paid', [
                    'order_id'   => $order->id,
                    'total_paid' => $totalPaid,
                    'total_due'  => $order->total_amount,
                    'method'     => $validated['payment_method'],
                ]);
            }
        } else {
            Log::info('OrderPayment: pending payment recorded', [
                'order_id'    => $order->id,
                'amount'      => $validated['amount'],
                'method'      => $validated['payment_method'],
                'has_ref'     => ! empty($validated['gcash_reference']),
            ]);
        }

        return response()->json([
            'message' => $paymentStatus === 'paid'
                ? 'Payment successful'
                : 'Payment recorded as pending',
            'data'    => $payment->load(['order', 'user']),
            'change'  => $change,
        ], 200);
    }

    // UPDATE PAYMENT
    public function update(Request $request, $id)
    {
        $payment = OrderPayment::findOrFail($id);

        $validated = $request->validate([
            'amount'          => 'sometimes|numeric|min:0',
            'payment_method'  => 'sometimes|in:cash,gcash,qrph',
            'payment_status'  => 'sometimes|in:pending,paid,failed,refunded',
            'gcash_reference' => 'nullable|string',
        ]);

        $payment->update($validated);

        if (isset($validated['payment_status'])) {
            $order = $payment->order;

            $totalPaid = OrderPayment::where('order_id', $order->id)
                ->where('payment_status', 'paid')
                ->sum('amount');

            if ($totalPaid >= $order->total_amount) {
                $order->update(['order_status' => 'paid']);
            } elseif ($order->order_status === 'paid') {
                $order->update(['order_status' => 'pending']);
            }
        }

        return response()->json([
            'message' => 'Payment updated',
            'data'    => $payment->load(['order', 'user']),
        ], 200);
    }

    // DELETE PAYMENT
    public function destroy($id)
    {
        $payment = OrderPayment::findOrFail($id);
        $order   = $payment->order;

        $payment->delete();

        $totalPaid = OrderPayment::where('order_id', $order->id)
            ->where('payment_status', 'paid')
            ->sum('amount');

        if ($totalPaid >= $order->total_amount) {
            $order->update(['order_status' => 'paid']);
        } else {
            $order->update(['order_status' => 'pending']);
        }

        return response()->json([
            'message' => 'Payment deleted'
        ], 200);
    }
}