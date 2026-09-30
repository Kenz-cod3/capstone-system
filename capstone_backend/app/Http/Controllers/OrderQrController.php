<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrderQrController extends Controller
{
    private const BASE = 'https://api.paymongo.com/v1';

    // CREATE QRPH FOR A POS ORDER
    public function createQr(Request $request, Order $order)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        if ($order->order_status === 'paid') {
            return response()->json(['message' => 'Order is already paid'], 400);
        }

        if ($validated['amount'] > $order->total_amount) {
            return response()->json(['message' => 'Amount exceeds order total'], 422);
        }

        // 1) Payment intent
        $intentRes = Http::withBasicAuth(config('services.paymongo.secret_key'), '')
            ->post(self::BASE . '/payment_intents', [
                'data' => ['attributes' => [
                    'amount'                 => (int) round($validated['amount'] * 100),
                    'currency'               => 'PHP',
                    'payment_method_allowed' => ['qrph'],
                    'description'            => "Restaurant Order {$order->order_number}",
                    'metadata'               => [
                        'order_id'       => (string) $order->id,
                        'payment_method' => 'qrph',
                        'source'         => 'restaurant_pos',
                    ],
                ]],
            ]);

        if ($intentRes->failed()) {
            Log::error('Order QR: intent failed', $intentRes->json() ?? []);

            return response()->json([
                'message' => 'Failed to create payment intent',
                'error'   => $intentRes->json(),
            ], $intentRes->status());
        }

        $intentId  = $intentRes->json('data.id');
        $clientKey = $intentRes->json('data.attributes.client_key');

        // 2) QRPH payment method
        $methodRes = Http::withBasicAuth(config('services.paymongo.public_key'), '')
            ->post(self::BASE . '/payment_methods', [
                'data' => ['attributes' => [
                    'type'           => 'qrph',
                    'expiry_seconds' => 1800,
                ]],
            ]);

        if ($methodRes->failed()) {
            Log::error('Order QR: method failed', $methodRes->json() ?? []);

            return response()->json([
                'message' => 'Failed to create QRPH method',
                'error'   => $methodRes->json(),
            ], $methodRes->status());
        }

        // 3) Attach
        $attachRes = Http::withBasicAuth(config('services.paymongo.public_key'), '')
            ->post(self::BASE . "/payment_intents/{$intentId}/attach", [
                'data' => ['attributes' => [
                    'payment_method' => $methodRes->json('data.id'),
                    'client_key'     => $clientKey,
                ]],
            ]);

        if ($attachRes->failed()) {
            Log::error('Order QR: attach failed', $attachRes->json() ?? []);

            return response()->json([
                'message' => 'Failed to generate QRPH',
                'error'   => $attachRes->json(),
            ], $attachRes->status());
        }

        $qrImage = $attachRes->json('data.attributes.next_action.code.image_url');

        if (! $qrImage) {
            return response()->json(['message' => 'PayMongo did not return a QR code'], 422);
        }

        return response()->json([
            'message'           => 'QRPH generated',
            'payment_intent_id' => $intentId,
            'client_key'        => $clientKey,
            'amount'            => $validated['amount'],
            'qr_image_url'      => $qrImage,
            'test_url'          => $attachRes->json('data.attributes.next_action.code.test_url'),
            'expiry_seconds'    => 1800,
        ], 200);
    }

    // POLLED BY THE POS
    public function checkStatus(Request $request, string $paymentIntentId)
    {
        $clientKey = $request->query('client_key');

        if (! $clientKey) {
            return response()->json(['message' => 'client_key is required'], 400);
        }

        $res = Http::withBasicAuth(config('services.paymongo.public_key'), '')
            ->get(self::BASE . "/payment_intents/{$paymentIntentId}", [
                'client_key' => $clientKey,
            ]);

        if ($res->failed()) {
            return response()->json([
                'message' => 'Failed to fetch status',
                'error'   => $res->json(),
            ], $res->status());
        }

        // Kunin ang status at payments array
        $status   = $res->json('data.attributes.status');
        $payments = $res->json('data.attributes.payments') ?? [];
        $metadata = $res->json('data.attributes.metadata') ?? [];

        // Hanapin ang payment ID (pwedeng array o object)
        $paymentId = null;

        if (! empty($payments)) {
            // Case 1: payments is a direct array
            if (isset($payments[0]['id'])) {
                $paymentId = $payments[0]['id'];
            }
            // Case 2: payments has a 'data' key (nested)
            elseif (isset($payments['data'][0]['id'])) {
                $paymentId = $payments['data'][0]['id'];
            }
        }

        // Kunin din ang order_status mula sa DB
        $orderId     = $metadata['order_id'] ?? null;
        $orderStatus = null;

        if ($orderId) {
            $order = Order::find($orderId);
            $orderStatus = $order?->order_status;
        }

        // Debug log
        Log::info('OrderQrController@checkStatus', [
            'payment_intent_id' => $paymentIntentId,
            'status'            => $status,
            'payment_id'        => $paymentId,
            'order_id'          => $orderId,
            'order_status'      => $orderStatus,
            'raw_payments'      => $payments,
        ]);

        return response()->json([
            'status'       => $status,
            'payment_id'   => $paymentId,
            'order_id'     => $orderId,
            'order_status' => $orderStatus,
        ], 200);
    }

    // WEBHOOK (restaurant orders only)
    //
    // HINDI na ito nagve-verify ng signature dahil ang
    // PayMongoController@webhook na ang gumagawa nun.
    // Ang method na ito ay tinatawag lang ng PayMongoController
    // kapag ang metadata.source ay 'restaurant_pos'.
    public function webhook(Request $request)
    {
        Log::info('OrderQrController: webhook received (routed from PayMongoController)');

        $payload   = $request->all();
        $eventType = data_get($payload, 'data.attributes.type');

        // Tanggapin ang parehong event types para sigurado
        if (! in_array($eventType, ['payment.paid', 'checkout_session.payment.paid'])) {
            Log::info('Order QR webhook: event type ignored', ['type' => $eventType]);
            return response()->json(['message' => 'Event ignored'], 200);
        }

        $payment   = data_get($payload, 'data.attributes.data');
        $orderId   = data_get($payment, 'attributes.metadata.order_id');
        $reference = data_get($payment, 'id');
        $centavos  = data_get($payment, 'attributes.amount');

        Log::info('Order QR webhook: parsed payload', [
            'order_id'  => $orderId,
            'reference' => $reference,
            'amount'    => $centavos,
        ]);

        // Not an order payment (e.g. a hotel booking) -> ignore
        if (! $orderId) {
            Log::warning('Order QR webhook: no order_id in metadata');
            return response()->json(['message' => 'Not an order payment'], 200);
        }

        $order = Order::find($orderId);

        if (! $order) {
            Log::warning('Order QR webhook: order not found', ['order_id' => $orderId]);
            return response()->json(['message' => 'Order not found'], 200);
        }

        if (! $reference || ! $centavos) {
            Log::warning('Order QR webhook: missing reference or amount', $payload);
            return response()->json(['message' => 'Missing data'], 200);
        }

        // Idempotency: kung na-process na, wag nang ulitin
        if (OrderPayment::where('gcash_reference', $reference)->exists()) {
            Log::info('Order QR webhook: already processed', ['reference' => $reference]);
            return response()->json(['message' => 'Already processed'], 200);
        }

        // -------------------------------------------------------------------
        // I-save ang payment as PAID (confirmed na ng PayMongo webhook)
        // -------------------------------------------------------------------
        OrderPayment::create([
            'order_id'        => $order->id,
            'amount'          => $centavos / 100,
            'payment_method'  => 'qrph',
            'payment_status'  => 'paid',
            'gcash_reference' => $reference,
            'user_id'         => $order->cashier_id,
            'change_amount'   => 0,
            'payment_date'    => now(),
        ]);

        // -------------------------------------------------------------------
        // I-update ang order status kung fully PAID na
        // -------------------------------------------------------------------
        $totalPaid = OrderPayment::where('order_id', $order->id)
            ->where('payment_status', 'paid')
            ->sum('amount');

        if ($totalPaid >= $order->total_amount) {
            $order->update(['order_status' => 'paid']);

            Log::info('Order QR webhook: order marked as paid', [
                'order_id'   => $order->id,
                'total_paid' => $totalPaid,
                'total_due'  => $order->total_amount,
            ]);
        } else {
            Log::info('Order QR webhook: partial payment recorded', [
                'order_id'   => $order->id,
                'total_paid' => $totalPaid,
                'total_due'  => $order->total_amount,
            ]);
        }

        return response()->json(['message' => 'Order payment recorded'], 200);
    }
}