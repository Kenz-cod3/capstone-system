<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * Hard cap so a bad per_page value can't load the whole table.
     * The Excel export asks for per_page = total records, so keep this
     * higher than the number of bookings you expect to export at once.
     */
    private const MAX_PER_PAGE = 5000;

    /**
     * Returns paginated booking transactions.
     *
     * ONE ROW PER BOOKING, guaranteed:
     *  - The paginated query only touches `bookings` (+ guest lookups, which
     *    are 1:1), with NO joins to payments or rooms and NO groupBy.
     *  - Rooms and payments are loaded in two batched queries afterwards and
     *    combined in PHP, so multiple payments (extension, late checkout,
     *    early check-in fees) can never multiply the rows.
     */
    public function index(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 10);
        $perPage = max(1, min($perPage, self::MAX_PER_PAGE));

        // ── 1. Bookings only (1 row per booking) ─────────────────────────────
        $paginated = DB::table('bookings as b')
            ->leftJoin('users as u', function ($join) {
                $join->on('u.id', '=', 'b.user_id')
                    ->where('b.booking_type', '=', 'online');
            })
            ->leftJoin('walk_in_guests as wg', function ($join) {
                $join->on('wg.id', '=', 'b.walk_in_guest_id')
                    ->where('b.booking_type', '=', 'walk_in');
            })
            ->select([
                'b.id',
                'b.booking_reference',
                'b.booking_type',
                'b.total_price',
                'b.created_at',

                'u.first_name as user_first_name',
                'u.last_name as user_last_name',

                'wg.first_name as guest_first_name',
                'wg.middle_name as guest_middle_name',
                'wg.last_name as guest_last_name',
            ])
            ->orderByDesc('b.created_at')
            ->orderByDesc('b.id') // stable order when timestamps are equal
            ->paginate($perPage);

        $rows = collect($paginated->items());
        $ids = $rows->pluck('id')->all();

        // ── 2. Rooms for these bookings (one query) ──────────────────────────
        $staysByBooking = empty($ids)
            ? collect()
            : DB::table('booked_rooms as br')
            ->join('rooms as r', 'r.id', '=', 'br.room_id')
            ->leftJoin('room_types as rt', 'rt.id', '=', 'r.room_type_id')
            ->whereIn('br.booking_id', $ids)
            ->select([
                'br.booking_id',
                'br.room_id',
                'r.room_number',
                'rt.type_name as room_type',
                'br.check_in_date',
                'br.check_out_date',
                'br.stay_type',
                'br.subtotal',
                'br.status',
            ])
            ->orderBy('r.room_number')
            ->get()
            ->groupBy('booking_id');

        // ── 3. Payments for these bookings (one query) ───────────────────────
        $paymentsByBooking = empty($ids)
            ? collect()
            : DB::table('booking_payments')
            ->whereIn('booking_id', $ids)
            ->select([
                'id',
                'booking_id',
                'amount',
                'payment_status',
                'payment_method',
                'payment_date',
                'gcash_reference',
                'bank_reference',
            ])
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get()
            ->groupBy('booking_id');

        // ── 4. Combine ───────────────────────────────────────────────────────
        $items = $rows->map(function ($row) use ($staysByBooking, $paymentsByBooking) {

            $stays = $staysByBooking->get($row->id, collect());
            $payments = $paymentsByBooking->get($row->id, collect());

            $paid = $payments->where('payment_status', 'paid');
            $refunded = $payments->where('payment_status', 'refunded');

            $paidAmount = (float) $paid->sum(fn($p) => (float) $p->amount);
            $refundedAmount = (float) $refunded->sum(fn($p) => (float) $p->amount);

            $cancelledAmount = (float) $stays
                ->where('status', 'cancelled')
                ->sum(fn($s) => (float) $s->subtotal);

            // Most recent paid payment decides the displayed method / date
            $latestPaid = $paid
                ->sortByDesc(fn($p) => $p->payment_date ?? '')
                ->first();

            // All distinct references (gcash / bank) across paid payments
            $references = $paid
                ->map(fn($p) => $p->gcash_reference ?: $p->bank_reference)
                ->filter()
                ->unique()
                ->values();

            // "02 (Refunded), 07" style label, same as before
            $roomsLabel = $stays
                ->map(function ($s) {
                    return match ($s->status) {
                        'refunded'  => $s->room_number . ' (Refunded)',
                        'cancelled' => $s->room_number . ' (Cancelled)',
                        default     => (string) $s->room_number,
                    };
                })
                ->unique()
                ->values()
                ->implode(', ');

            return [
                'id' => $row->id,
                'booking_reference' => $row->booking_reference,
                'booking_type' => $row->booking_type === 'online' ? 'Online' : 'Walk-in',
                'guest' => $this->guestName($row),

                'rooms' => $roomsLabel,
                'total_rooms' => $stays->pluck('room_id')->unique()->count(),

                'total_price' => (float) $row->total_price,

                // What was actually collected, minus refunds
                'amount' => max(0, $paidAmount - $refundedAmount),
                'paid_amount' => $paidAmount,
                'refunded_amount' => $refundedAmount,
                'cancelled_amount' => $cancelledAmount,
                'payment_count' => $paid->count(),

                'payment_method' => $latestPaid->payment_method ?? null,
                'payment_date' => $latestPaid->payment_date ?? null,
                'payment_reference' => $references->isNotEmpty()
                    ? $references->implode(', ')
                    : '-',

                'check_in_date' => $stays->min('check_in_date'),
                'check_out_date' => $stays->max('check_out_date'),

                'date' => $row->created_at,

                // Drawer: room breakdown
                'stays' => $stays->map(fn($s) => [
                    'room_number' => $s->room_number,
                    'room_type' => $s->room_type,
                    'check_in_date' => $s->check_in_date,
                    'check_out_date' => $s->check_out_date,
                    'stay_type' => $s->stay_type,
                    'subtotal' => $s->subtotal,
                    'status' => $s->status,
                ])->values(),

                // Drawer: every payment (original + fees + refunds)
                'payments' => $payments->map(fn($p) => [
                    'amount' => $p->amount,
                    'payment_status' => $p->payment_status,
                    'payment_method' => $p->payment_method,
                    'payment_date' => $p->payment_date,
                    'reference' => $p->gcash_reference ?: $p->bank_reference,
                ])->values(),
            ];
        });

        return response()->json([
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Summary
     *
     * total_records = number of bookings (matches the table's pagination total)
     * total_revenue = all paid payments minus all refunds
     */
    public function summary()
    {
        $totalRecords = DB::table('bookings')->count();

        $totals = DB::table('booking_payments')
            ->selectRaw("
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
                COALESCE(SUM(CASE WHEN payment_status = 'refunded' THEN amount ELSE 0 END), 0) AS refunded
            ")
            ->first();

        return response()->json([
            'total_records' => (int) $totalRecords,
            'total_revenue' => (float) $totals->paid - (float) $totals->refunded,
        ]);
    }

    /**
     * Build the guest's full name without double spaces.
     */
    private function guestName(object $row): string
    {
        $parts = $row->booking_type === 'online'
            ? [$row->user_first_name, $row->user_last_name]
            : [$row->guest_first_name, $row->guest_middle_name, $row->guest_last_name];

        return trim(implode(' ', array_filter(
            $parts,
            fn($p) => $p !== null && trim((string) $p) !== ''
        )));
    }
}