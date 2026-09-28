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

        return response()->json([
            'status'     => $res->json('data.attributes.status'),
            'payment_id' => $res->json('data.attributes.payments.0.id'),
        ], 200);
    }

    // WEBHOOK (restaurant orders only)
    public function webhook(Request $request)
    {
        if (! $this->verifySignature($request->getContent(), $request->header('Paymongo-Signature'))) {
            Log::warning('Order QR webhook: invalid signature');

            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $payload   = $request->all();
        $eventType = data_get($payload, 'data.attributes.type');

        if ($eventType !== 'payment.paid') {
            return response()->json(['message' => 'Event ignored'], 200);
        }

        $payment   = data_get($payload, 'data.attributes.data');
        $orderId   = data_get($payment, 'attributes.metadata.order_id');
        $reference = data_get($payment, 'id');
        $centavos  = data_get($payment, 'attributes.amount');

        // Not an order payment (e.g. a hotel booking) -> ignore
        if (! $orderId) {
            return response()->json(['message' => 'Not an order payment'], 200);
        }

        $order = Order::find($orderId);

        if (! $order || ! $reference || ! $centavos) {
            Log::warning('Order QR webhook: missing data', $payload);

            return response()->json(['message' => 'Missing data'], 200);
        }

        // Idempotency
        if (OrderPayment::where('gcash_reference', $reference)->exists()) {
            return response()->json(['message' => 'Already processed'], 200);
        }

        OrderPayment::create([
            'order_id'        => $order->id,
            'amount'          => $centavos / 100,
            'payment_method'  => 'qrph',
            'gcash_reference' => $reference,
            'user_id'         => $order->cashier_id,
            'change_amount'   => 0,
            'payment_date'    => now(),
        ]);

        $totalPaid = OrderPayment::where('order_id', $order->id)->sum('amount');

        if ($totalPaid >= $order->total_amount) {
            $order->update(['order_status' => 'paid']);
        }

        return response()->json(['message' => 'Order payment recorded'], 200);
    }

    private function verifySignature(string $payload, ?string $header): bool
    {
        if (! $header) {
            return false;
        }

        $parts = [];

        foreach (explode(',', $header) as $pair) {
            [$k, $v] = array_pad(explode('=', $pair, 2), 2, null);
            $parts[$k] = $v;
        }

        // test mode sends "te", live mode sends "li"
        $signature = ! empty($parts['li']) ? $parts['li'] : ($parts['te'] ?? null);

        if (! $signature || empty($parts['t'])) {
            return false;
        }

        $expected = hash_hmac(
            'sha256',
            $parts['t'] . '.' . $payload,
            config('services.paymongo.order_webhook_secret')
        );

        return hash_equals($expected, $signature);
    }
}