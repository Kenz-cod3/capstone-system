<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use App\Models\BookedRoom;
use App\Models\BookingPayment;
use App\Models\CashTransaction;
use App\Models\WalkInGuest;
use App\Models\RoomIncident;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /* ===================================================================== */
    /*  HELPERS                                                              */
    /* ===================================================================== */

    /**
     * Normalize a YYYY-MM-DD (or datetime) string to [startOfDay, endOfDay].
     * Returns null when the input is empty so callers can skip the filter.
     */
    private function range(?string $from, ?string $to): array
    {
        $start = $from ? Carbon::parse($from)->startOfDay() : null;
        $end   = $to   ? Carbon::parse($to)->endOfDay()     : null;

        return [$start, $end];
    }

    /**
     * Net payments (paid - refunded) for the given payment_date range.
     * Either bound may be null for an open-ended range.
     */
    private function netPaymentsInRange(?Carbon $start, ?Carbon $end): array
    {
        $paidQ = BookingPayment::where('payment_status', 'paid');
        $refQ  = BookingPayment::where('payment_status', 'refunded');

        if ($start) {
            $paidQ->where('payment_date', '>=', $start);
            $refQ->where('payment_date', '>=', $start);
        }
        if ($end) {
            $paidQ->where('payment_date', '<=', $end);
            $refQ->where('payment_date', '<=', $end);
        }

        $paid     = (float) $paidQ->sum('amount');
        $refunded = (float) $refQ->sum('amount');

        return [
            'paid'     => $paid,
            'refunded' => $refunded,
            'net'      => $paid - $refunded,
        ];
    }

    /**
     * Net payments for a specific set of booking IDs (paid - refunded).
     */
    private function netPaymentsForBookings(array $bookingIds): array
    {
        if (empty($bookingIds)) {
            return ['paid' => 0.0, 'refunded' => 0.0, 'net' => 0.0];
        }

        $paid = (float) BookingPayment::where('payment_status', 'paid')
            ->whereIn('booking_id', $bookingIds)
            ->sum('amount');

        $refunded = (float) BookingPayment::where('payment_status', 'refunded')
            ->whereIn('booking_id', $bookingIds)
            ->sum('amount');

        return [
            'paid'     => $paid,
            'refunded' => $refunded,
            'net'      => $paid - $refunded,
        ];
    }

    /* ===================================================================== */
    /*  BOOKING REPORT                                                       */
    /*  GET /api/reports                                                     */
    /* ===================================================================== */

    public function index(Request $request)
    {
        $startDate   = $request->start_date;
        $endDate     = $request->end_date;
        $perPage     = (int) ($request->per_page ?? 10);
        $perPage     = max(1, min($perPage, 5000));
        $search      = $request->search;
        $status      = $request->status;
        $bookingType = $request->booking_type;

        [$rangeStart, $rangeEnd] = $this->range($startDate, $endDate);

        $bookingQuery = Booking::with([
            'user',
            'walkInGuest',
            'createdBy',
            'bookedRooms' => function ($q) {
                $q->whereNull('archived_at')
                    ->with([
                        'room' => fn($r) => $r->withTrashed(),
                        'bookingAddOns.addOn',
                    ]);
            },
            'payments.receiver',
            'payments.shift',
        ])->whereNull('deleted_at');

        // ── Date range filter (check_in_date, inclusive) ──
        if ($rangeStart) {
            $bookingQuery->whereHas(
                'bookedRooms',
                fn($q) =>
                $q->whereDate('check_in_date', '>=', $rangeStart->toDateString())
            );
        }
        if ($rangeEnd) {
            $bookingQuery->whereHas(
                'bookedRooms',
                fn($q) =>
                $q->whereDate('check_in_date', '<=', $rangeEnd->toDateString())
            );
        }

        // ── Status filter ──
        if (!empty($status) && $status !== 'all') {
            $bookingQuery->whereHas(
                'bookedRooms',
                fn($q) =>
                $q->where('status', $status)->whereNull('archived_at')
            );
        }

        // ── Booking type filter ──
        if (!empty($bookingType) && $bookingType !== 'all') {
            $bookingQuery->where('booking_type', $bookingType);
        }

        // ── Search ──
        if (!empty($search)) {
            $bookingQuery->where(function ($q) use ($search) {
                $q->where('booking_reference', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($u) use ($search) {
                        $u->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            );
                    })
                    ->orWhereHas('walkInGuest', function ($w) use ($search) {
                        $w->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhereRaw(
                                "CONCAT(first_name, ' ', last_name) LIKE ?",
                                ["%{$search}%"]
                            );
                    })
                    ->orWhereHas(
                        'bookedRooms.room',
                        fn($r) =>
                        $r->where('room_number', 'LIKE', "%{$search}%")
                    );

                if (is_numeric($search)) {
                    $q->orWhere('id', (int) $search);
                }
            });
        }

        // ── Booking IDs matching the filter (used for aggregate queries) ──
        // Using pluck on the id column keeps this light: it does NOT hydrate
        // full Booking models.
        $filteredIds = (clone $bookingQuery)->pluck('id')->all();

        // ── CANONICAL revenue: paid - refunded on the filtered bookings ──
        $totals       = $this->netPaymentsForBookings($filteredIds);
        $totalRevenue = $totals['net'];

        // ── Status counts based on the filtered booking set ──
        $statusCounts = [
            'checked_in'  => 0,
            'checked_out' => 0,
            'pending'     => 0,
            'confirmed'   => 0,
            'cancelled'   => 0,
            'refunded'    => 0,
        ];

        if (!empty($filteredIds)) {
            $roomStatusRows = BookedRoom::whereNull('archived_at')
                ->whereIn('booking_id', $filteredIds)
                ->select('status', DB::raw('COUNT(*) as c'))
                ->groupBy('status')
                ->pluck('c', 'status');

            foreach ($statusCounts as $key => $_) {
                $statusCounts[$key] = (int) ($roomStatusRows[$key] ?? 0);
            }
        }

        $checkedInCount = $statusCounts['checked_in'];

        // ── Booking type counts (walk-in vs online) on the FILTERED set ──
        $walkInCount = 0;
        $onlineCount = 0;

        if (!empty($filteredIds)) {
            $typeCounts = Booking::whereIn('id', $filteredIds)
                ->selectRaw("CASE WHEN walk_in_guest_id IS NOT NULL THEN 'walk_in' ELSE 'online' END as booking_type_group, COUNT(*) as c")
                ->groupBy('booking_type_group')
                ->pluck('c', 'booking_type_group');

            $walkInCount  = (int) ($typeCounts['walk_in'] ?? 0);
            $onlineCount  = (int) ($typeCounts['online'] ?? 0);
        }

        // ── Paginated list ──
        $paginatedBookings = (clone $bookingQuery)
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        $paginatedBookings->getCollection()->transform(function ($booking) {
            return $this->transformBookingRow($booking);
        });

        // ── Recent bookings (activity feed) ──
        $recentBookings = (clone $bookingQuery)
            ->orderByDesc('updated_at')
            ->take(10)
            ->get()
            ->map(fn($b) => $this->transformBookingRow($b));

        return response()->json([
            'total_revenue'   => $totalRevenue,
            'total_bookings'  => count($filteredIds),
            'checked_in'      => $checkedInCount,
            'summary'         => [
                'total_bookings' => count($filteredIds),
                'checked_in'     => $statusCounts['checked_in'],
                'checked_out'    => $statusCounts['checked_out'],
                'pending'        => $statusCounts['pending'],
                'confirmed'      => $statusCounts['confirmed'],
                'cancelled'      => $statusCounts['cancelled'],
                'refunded'       => $statusCounts['refunded'],
                'total_revenue'  => $totalRevenue,
                'walk_in_count'  => $walkInCount,
                'online_count'   => $onlineCount,
            ],
            'bookings'        => $paginatedBookings,
            'recent_bookings' => $recentBookings,
        ]);
    }

    /**
     * Shared transformer for a Booking row.
     * Adds: guest_name, room_numbers, rooms[], check-in/check-out times,
     * aggregate_status, booking_status, booking_type.
     */
    private function transformBookingRow(Booking $booking): Booking
    {
        $booking->rooms = $booking->bookedRooms->map(fn($br) => [
            'id'                   => $br->id,
            'room_number'          => $br->room?->room_number ?? 'N/A',
            'status'               => $br->status,
            'stay_type'            => $br->stay_type,
            'check_in_date'        => $br->check_in_date,
            'check_out_date'       => $br->check_out_date,
            'check_in_time'        => $br->check_in_time,
            'check_out_time'       => $br->check_out_time,
            'subtotal'             => $br->subtotal,
            'is_extended'          => $br->is_extended,
            'expected_checkout_at' => $br->expected_checkout_at,
            'overdue_started_at'   => $br->overdue_started_at,
            'checkout_status'      => $br->checkout_status,
        ]);

        $booking->earliest_check_in = $booking->bookedRooms
            ->whereNotNull('check_in_time')
            ->min('check_in_time');

        $booking->latest_check_out = $booking->bookedRooms
            ->whereNotNull('check_out_time')
            ->max('check_out_time');

        $guestName = $booking->booking_type === 'walk_in'
            ? trim(($booking->walkInGuest->first_name ?? '') . ' ' .
                ($booking->walkInGuest->last_name ?? ''))
            : trim(($booking->user->first_name ?? '') . ' ' .
                ($booking->user->last_name ?? ''));

        $booking->guest_name = $guestName !== '' ? $guestName : 'N/A';

        $booking->room_numbers = $booking->bookedRooms
            ->pluck('room.room_number')
            ->filter()
            ->implode(', ');

        $statuses = $booking->bookedRooms->pluck('status')->unique()->values();
        $booking->aggregate_status = $statuses->count() === 1
            ? $statuses->first()
            : 'mixed';

        $firstBookedRoom = $booking->bookedRooms->first();
        $booking->booking_status = $firstBookedRoom?->status ?? 'pending';
        $booking->room_number    = $firstBookedRoom?->room?->room_number;
        $booking->booking_type   = $booking->walk_in_guest_id ? 'walk_in' : 'online';

        return $booking;
    }

    /* ===================================================================== */
    /*  GUEST REPORTS                                                        */
    /*  GET /api/reports/guests                                              */
    /* ===================================================================== */

    public function guests(Request $request)
    {
        try {
            $search  = $request->search;
            $start   = $request->start_date;
            $end     = $request->end_date;
            $perPage = (int) ($request->per_page ?? 50);
            $perPage = max(1, min($perPage, 5000));

            [$rangeStart, $rangeEnd] = $this->range($start, $end);

            // ── Online users ──
            // Aggregate stays and spend in subqueries FIRST, so joining rooms
            // or payments cannot inflate the booking count.
            $onlineQuery = DB::table('users')
                ->selectRaw("
                    users.id                                     AS id,
                    'online'                                     AS guest_type,
                    users.first_name                             AS first_name,
                    users.last_name                              AS last_name,
                    users.email                                  AS email,
                    ''                                           AS phone,
                    COALESCE(stats.total_stays, 0)               AS total_stays,
                    COALESCE(stats.total_spent, 0)               AS total_spent,
                    stats.last_visit                             AS last_visit
                ")
                ->leftJoinSub(
                    $this->guestStatsSub($rangeStart, $rangeEnd, 'bookings.user_id'),
                    'stats',
                    'stats.user_id',
                    '=',
                    'users.id'
                )
                ->where('users.role', '=', 'guest');

            if ($search) {
                $onlineQuery->where(function ($q) use ($search) {
                    $q->where('users.first_name', 'LIKE', "%{$search}%")
                        ->orWhere('users.last_name', 'LIKE', "%{$search}%")
                        ->orWhere('users.email', 'LIKE', "%{$search}%");
                });
            }

            // ── Walk-in guests ──
            $walkInQuery = DB::table('walk_in_guests')
                ->selectRaw("
                    walk_in_guests.id                            AS id,
                    'walk_in'                                    AS guest_type,
                    walk_in_guests.first_name                    AS first_name,
                    walk_in_guests.last_name                     AS last_name,
                    ''                                           AS email,
                    walk_in_guests.contact_number                AS phone,
                    COALESCE(stats.total_stays, 0)               AS total_stays,
                    COALESCE(stats.total_spent, 0)               AS total_spent,
                    stats.last_visit                             AS last_visit
                ")
                ->leftJoinSub(
                    $this->guestStatsSub($rangeStart, $rangeEnd, 'bookings.walk_in_guest_id'),
                    'stats',
                    'stats.walk_in_guest_id',
                    '=',
                    'walk_in_guests.id'
                );

            if ($search) {
                $walkInQuery->where(function ($q) use ($search) {
                    $q->where('walk_in_guests.first_name', 'LIKE', "%{$search}%")
                        ->orWhere('walk_in_guests.last_name', 'LIKE', "%{$search}%")
                        ->orWhere('walk_in_guests.contact_number', 'LIKE', "%{$search}%");
                });
            }

            // ── Union & paginate ──
            $union = $onlineQuery->unionAll($walkInQuery);

            $rows = DB::table(DB::raw("({$union->toSql()}) as guests"))
                ->mergeBindings($union)
                ->orderByDesc('last_visit')
                ->paginate($perPage);

            return response()->json($rows);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
            ], 500);
        }
    }

    /**
     * Subquery returning per-guest aggregates (total_stays, total_spent,
     * last_visit) so multi-room bookings are not double-counted.
     *
     * @param  string  $joinColumn  'bookings.user_id' or 'bookings.walk_in_guest_id'
     */
    private function guestStatsSub(?Carbon $rangeStart, ?Carbon $rangeEnd, string $joinColumn)
    {
        $guestKey = str_contains($joinColumn, 'walk_in') ? 'walk_in_guest_id' : 'user_id';

        $bookings = DB::table('bookings')
            ->select('id', $guestKey, 'created_at')
            ->whereNull('deleted_at')
            ->whereNotNull($guestKey);

        if ($rangeStart) {
            $bookings->where('created_at', '>=', $rangeStart);
        }
        if ($rangeEnd) {
            $bookings->where('created_at', '<=', $rangeEnd);
        }

        // One row per booking, aggregated later — count distinct bookings,
        // not booked_rooms.
        return DB::table($bookings, 'b')
            ->selectRaw("
            b.{$guestKey}                                   AS {$guestKey},
            COUNT(DISTINCT b.id)                            AS total_stays,
            COALESCE(SUM(p.paid_amount), 0)
                - COALESCE(SUM(p.refunded_amount), 0)       AS total_spent,
            MAX(br.last_check_in)                           AS last_visit
        ")
            ->leftJoinSub(
                DB::table('booking_payments')
                    ->selectRaw("
                    booking_id,
                    SUM(CASE WHEN payment_status = 'paid'     THEN amount ELSE 0 END) AS paid_amount,
                    SUM(CASE WHEN payment_status = 'refunded' THEN amount ELSE 0 END) AS refunded_amount
                ")
                    ->groupBy('booking_id'),
                'p',
                'p.booking_id',
                '=',
                'b.id'
            )
            ->leftJoinSub(
                DB::table('booked_rooms')
                    ->selectRaw("booking_id, MAX(check_in_date) AS last_check_in")
                    ->whereNull('archived_at')
                    ->groupBy('booking_id'),
                'br',
                'br.booking_id',
                '=',
                'b.id'
            )
            ->groupBy("b.{$guestKey}");
    }

    /* ===================================================================== */
    /*  TRANSACTION REPORTS                                                  */
    /*  GET /api/reports/transactions                                        */
    /* ===================================================================== */

    /**
     * Returns one row PER PAYMENT (not per booking). This is what makes
     * multi-payment bookings appear correctly.
     */
    public function transactions(Request $request)
    {
        try {
            $perPage = (int) ($request->per_page ?? 50);
            $perPage = max(1, min($perPage, 5000));
            $start   = $request->start_date;
            $end     = $request->end_date;

            [$rangeStart, $rangeEnd] = $this->range($start, $end);

            $query = DB::table('booking_payments as p')
                ->join('bookings as b', 'b.id', '=', 'p.booking_id')
                ->leftJoin('users as u', function ($j) {
                    $j->on('u.id', '=', 'b.user_id')
                        ->where('b.booking_type', '=', 'online');
                })
                ->leftJoin('walk_in_guests as wg', function ($j) {
                    $j->on('wg.id', '=', 'b.walk_in_guest_id')
                        ->where('b.booking_type', '=', 'walk_in');
                });

            if ($rangeStart) {
                $query->where('p.payment_date', '>=', $rangeStart);
            }
            if ($rangeEnd) {
                $query->where('p.payment_date', '<=', $rangeEnd);
            }

            $paginated = $query
                ->select([
                    'p.id                as payment_id',
                    'p.booking_id        as booking_id',
                    'p.amount            as amount',
                    'p.payment_status    as payment_status',
                    'p.payment_method    as payment_method',
                    'p.payment_date      as payment_date',
                    'p.gcash_reference   as gcash_reference',
                    'p.bank_reference    as bank_reference',
                    'b.booking_reference as booking_reference',
                    'b.booking_type      as booking_type',
                    'b.total_price       as total_price',
                    'b.created_at        as booking_created_at',
                    'u.first_name        as user_first_name',
                    'u.last_name         as user_last_name',
                    'wg.first_name       as guest_first_name',
                    'wg.middle_name      as guest_middle_name',
                    'wg.last_name        as guest_last_name',
                ])
                ->orderByDesc('p.payment_date')
                ->orderByDesc('p.id')
                ->paginate($perPage);

            $rows       = collect($paginated->items());
            $bookingIds = $rows->pluck('booking_id')->unique()->all();

            // Batched room lookup for the bookings on this page.
            $staysByBooking = empty($bookingIds)
                ? collect()
                : DB::table('booked_rooms as br')
                ->join('rooms as r', 'r.id', '=', 'br.room_id')
                ->leftJoin('room_types as rt', 'rt.id', '=', 'r.room_type_id')
                ->whereIn('br.booking_id', $bookingIds)
                ->whereNull('br.archived_at')
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

            $items = $rows->map(function ($row) use ($staysByBooking) {
                $stays = $staysByBooking->get($row->booking_id, collect());

                $guest = $row->booking_type === 'online'
                    ? trim(($row->user_first_name ?? '') . ' ' . ($row->user_last_name ?? ''))
                    : trim(
                        ($row->guest_first_name ?? '') . ' ' .
                            ($row->guest_middle_name ?? '') . ' ' .
                            ($row->guest_last_name ?? '')
                    );

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

                $reference = $row->gcash_reference ?: $row->bank_reference ?: '-';

                // "amount" is the raw payment amount (which may be a refund).
                // Frontends display it using payment_status to decide sign.
                $amount        = (float) $row->amount;
                $isRefund      = $row->payment_status === 'refunded';
                $refundAmount  = $isRefund ? $amount : 0.0;
                $cancelledAmt  = (float) $stays->where('status', 'cancelled')->sum('subtotal');

                return [
                    'id'                => $row->payment_id,
                    'booking_id'        => $row->booking_id,
                    'booking_reference' => $row->booking_reference,
                    'booking_type'      => $row->booking_type === 'online' ? 'Online' : 'Walk-in',
                    'guest'             => $guest ?: '—',
                    'rooms'             => $roomsLabel,
                    'total_rooms'       => $stays->pluck('room_id')->unique()->count(),
                    'total_price'       => (float) $row->total_price,
                    'amount'            => $amount,
                    'payment_status'    => $row->payment_status,
                    'payment_method'    => $row->payment_method,
                    'payment_date'      => $row->payment_date,
                    'payment_reference' => $reference,
                    'refunded_amount'   => $refundAmount,
                    'cancelled_amount'  => $cancelledAmt,
                    'check_in_date'     => $stays->min('check_in_date'),
                    'check_out_date'    => $stays->max('check_out_date'),
                    'date'              => $row->payment_date ?? $row->booking_created_at,
                    'stays'             => $stays->values(),
                ];
            });

            return response()->json([
                'data'         => $items,
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
                'file'  => $e->getFile(),
            ], 500);
        }
    }

    /**
     * Summary for the SAME date range as the transaction list.
     */
    public function transactionSummary(Request $request)
    {
        [$rangeStart, $rangeEnd] = $this->range(
            $request->start_date,
            $request->end_date
        );

        $base = BookingPayment::query();
        if ($rangeStart) $base->where('payment_date', '>=', $rangeStart);
        if ($rangeEnd)   $base->where('payment_date', '<=', $rangeEnd);

        $totalRecords = (int) (clone $base)->count();

        $paid = (float) (clone $base)
            ->where('payment_status', 'paid')
            ->sum('amount');

        $refunded = (float) (clone $base)
            ->where('payment_status', 'refunded')
            ->sum('amount');

        return response()->json([
            'total_records' => $totalRecords,
            'total_revenue' => $paid - $refunded,
        ]);
    }

    /* ===================================================================== */
    /*  INCIDENT REPORTS                                                     */
    /*  GET /api/reports/incidents                                           */
    /* ===================================================================== */

    public function incidents(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 50);
        $perPage = max(1, min($perPage, 5000));
        $start   = $request->start_date;
        $end     = $request->end_date;

        [$rangeStart, $rangeEnd] = $this->range($start, $end);

        $incidents = RoomIncident::with([
            'room',
            'cleaner',
            'resolvedBy',
            'booking.user',
            'booking.walkInGuest',
        ]);

        if ($rangeStart) $incidents->where('reported_at', '>=', $rangeStart);
        if ($rangeEnd)   $incidents->where('reported_at', '<=', $rangeEnd);

        return response()->json(
            $incidents->orderByDesc('reported_at')->paginate($perPage)
        );
    }

    /* ===================================================================== */
    /*  FINANCIAL TREND                                                      */
    /*  GET /api/reports/financial-trend                                     */
    /* ===================================================================== */

    public function financialTrend(Request $request)
    {
        $from = $request->from;
        $to   = $request->to;

        if (!$from || !$to) {
            $from = Carbon::now()->subDays(30)->startOfDay();
            $to   = Carbon::now()->endOfDay();
        } else {
            $from = Carbon::parse($from)->startOfDay();
            $to   = Carbon::parse($to)->endOfDay();
        }

        $dailyPaidRaw = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$from, $to])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyRefundRaw = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$from, $to])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyExpensesRaw = CashTransaction::where('type', 'pay_out')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $trend   = [];
        $current = $from->copy();
        while ($current->lte($to)) {
            $dateStr = $current->toDateString();
            $gross  = (float) ($dailyPaidRaw[$dateStr] ?? 0);
            $refund = (float) ($dailyRefundRaw[$dateStr] ?? 0);
            $rev    = $gross - $refund;
            $exp    = (float) ($dailyExpensesRaw[$dateStr] ?? 0);

            $trend[] = [
                'name'          => $current->format('M d'),
                'date'          => $dateStr,
                'gross_revenue' => $gross,
                'refunds'       => $refund,
                'revenue'       => $rev,
                'expenses'      => $exp,
                'profit'        => $rev - $exp,
            ];

            $current->addDay();
        }

        return response()->json(['financialRangeTrend' => $trend]);
    }

    /* ===================================================================== */
    /*  REVENUE BY DATE                                                      */
    /*  GET /api/reports/revenue                                             */
    /* ===================================================================== */

    public function revenueByDate(Request $request)
    {
        $from = $request->from;
        $to   = $request->to;

        [$rangeStart, $rangeEnd] = $this->range($from, $to);

        // Build a daily paid/refunded map for the period.
        $paidQ = BookingPayment::where('payment_status', 'paid')
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total, COUNT(*) as cnt')
            ->groupBy('date');

        $refQ = BookingPayment::where('payment_status', 'refunded')
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total, COUNT(*) as cnt')
            ->groupBy('date');

        if ($rangeStart) {
            $paidQ->where('payment_date', '>=', $rangeStart);
            $refQ->where('payment_date', '>=', $rangeStart);
        }
        if ($rangeEnd) {
            $paidQ->where('payment_date', '<=', $rangeEnd);
            $refQ->where('payment_date', '<=', $rangeEnd);
        }

        $paidMap = $paidQ->get()->keyBy('date');
        $refMap  = $refQ->get()->keyBy('date');

        $dates = collect($paidMap->keys())
            ->merge($refMap->keys())
            ->unique()
            ->sort()
            ->values();

        $revenueData = $dates->map(function ($date) use ($paidMap, $refMap) {
            $paid     = (float) ($paidMap[$date]->total ?? 0);
            $refunded = (float) ($refMap[$date]->total  ?? 0);
            $count    = (int) (($paidMap[$date]->cnt ?? 0) + ($refMap[$date]->cnt ?? 0));

            return [
                'date'  => $date,
                'total' => $paid - $refunded,
                'count' => $count,
            ];
        })->values()->all();

        return response()->json($revenueData);
    }

    /* ===================================================================== */
    /*  GUEST REVIEWS                                                        */
    /*  GET /api/reports/reviews                                             */
    /* ===================================================================== */

    public function reviews(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 50);
        $perPage = max(1, min($perPage, 5000));
        $search  = $request->search;
        $start   = $request->start_date;
        $end     = $request->end_date;

        [$rangeStart, $rangeEnd] = $this->range($start, $end);

        $reviews = Review::with(['booking.user', 'booking.walkInGuest', 'room']);

        if ($rangeStart) $reviews->where('created_at', '>=', $rangeStart);
        if ($rangeEnd)   $reviews->where('created_at', '<=', $rangeEnd);

        if ($search) {
            $reviews->where(function ($q) use ($search) {
                $q->where('review', 'LIKE', "%{$search}%")
                    ->orWhere('guest_name', 'LIKE', "%{$search}%");
            });
        }

        return response()->json(
            $reviews->orderByDesc('created_at')->paginate($perPage)
        );
    }

    /* ===================================================================== */
    /*  DASHBOARD SUMMARY (for Reports module)                               */
    /*  GET /api/reports/dashboard                                          */
    /* ===================================================================== */

    public function dashboardSummary(Request $request)
    {
        $start = $request->start_date ?? $request->from;
        $end   = $request->end_date ?? $request->to;

        [$rangeStart, $rangeEnd] = $this->range($start, $end);

        $today = Carbon::today();

        // ── Room status counts ──
        $counts = Room::whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $occupied    = (int) ($counts['occupied']    ?? 0);
        $available   = (int) ($counts['available']   ?? 0);
        $reserved    = (int) ($counts['reserved']    ?? 0);
        $maintenance = (int) ($counts['maintenance'] ?? 0);
        $ongoing     = (int) ($counts['ongoing']     ?? 0);
        $preparing   = (int) ($counts['preparing']   ?? 0);

        $usableRooms = $occupied + $available + $ongoing + $preparing;
        $occupancyRate = $usableRooms > 0
            ? round(($occupied / $usableRooms) * 100, 2)
            : 0;

        // ── Guests count ──
        $totalGuests = User::where('role', 'guest')->count()
            + WalkInGuest::count();

        // ── Bookings count (respecting the date range if given) ──
        $bookingsQuery = Booking::whereNull('deleted_at');
        if ($rangeStart) $bookingsQuery->where('created_at', '>=', $rangeStart);
        if ($rangeEnd)   $bookingsQuery->where('created_at', '<=', $rangeEnd);
        $totalBookings = $bookingsQuery->count();

        // ── Revenue / Expenses (respecting the date range if given) ──
        $revenue = $this->netPaymentsInRange($rangeStart, $rangeEnd)['net'];

        $expensesQuery = CashTransaction::where('type', 'pay_out');
        if ($rangeStart) $expensesQuery->where('created_at', '>=', $rangeStart);
        if ($rangeEnd)   $expensesQuery->where('created_at', '<=', $rangeEnd);
        $expenses = (float) $expensesQuery->sum('amount');

        $profit = $revenue - $expenses;

        // ── Quick stats (accurate counts, not limited to a "recent 5") ──
        $checkInsToday = BookedRoom::whereDate('check_in_time', $today)
            ->where('status', 'checked_in')
            ->count();

        $checkOutsToday = BookedRoom::whereDate('check_out_time', $today)
            ->where('status', 'checked_out')
            ->count();

        $pendingBookings = Booking::whereNull('deleted_at')
            ->whereHas('bookedRooms', function ($q) {
                $q->whereNull('archived_at')->where('status', 'pending');
            })
            ->count();

        $roomsAvailable = $available + $preparing;

        // ── Financial trend (defaults to last 30 days if no range given) ──
        $trendFrom = $rangeStart ?? Carbon::today()->subDays(29)->startOfDay();
        $trendTo   = $rangeEnd   ?? Carbon::today()->endOfDay();

        $dailyPaidRaw = BookingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$trendFrom, $trendTo])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyRefundRaw = BookingPayment::where('payment_status', 'refunded')
            ->whereBetween('payment_date', [$trendFrom, $trendTo])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dailyExpensesRaw = CashTransaction::where('type', 'pay_out')
            ->whereBetween('created_at', [$trendFrom, $trendTo])
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $trend = [];
        $cursor = $trendFrom->copy()->startOfDay();
        $lastDay = $trendTo->copy()->startOfDay();
        while ($cursor->lte($lastDay)) {
            $dateStr = $cursor->toDateString();
            $gross  = (float) ($dailyPaidRaw[$dateStr] ?? 0);
            $refund = (float) ($dailyRefundRaw[$dateStr] ?? 0);
            $rev    = $gross - $refund;
            $exp    = (float) ($dailyExpensesRaw[$dateStr] ?? 0);
            $trend[] = [
                'name'          => $cursor->format('M d'),
                'date'          => $dateStr,
                'gross_revenue' => $gross,
                'refunds'       => $refund,
                'revenue'       => $rev,
                'expenses'      => $exp,
                'profit'        => $rev - $exp,
            ];
            $cursor->addDay();
        }

        // ── Recent bookings (full list within range, for the activity feed) ──
        $recentBookingsQuery = Booking::with([
            'user',
            'walkInGuest',
            'bookedRooms.room',
        ])->whereNull('deleted_at');

        if ($rangeStart) $recentBookingsQuery->where('created_at', '>=', $rangeStart);
        if ($rangeEnd)   $recentBookingsQuery->where('created_at', '<=', $rangeEnd);

        $recentBookings = $recentBookingsQuery
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(function ($booking) {
                $booking->booking_status = $booking->bookedRooms->first()?->status ?? 'pending';
                return $booking;
            });

        return response()->json([
            'stats' => [
                'guests'   => $totalGuests,
                'rooms'    => $usableRooms,
                'bookings' => $totalBookings,
                'revenue'  => $revenue,
                'expenses' => $expenses,
                'profit'   => $profit,
            ],
            'occupancy'      => $occupancyRate,
            'quickStats'     => [
                'check_ins_today'  => $checkInsToday,
                'check_outs_today' => $checkOutsToday,
                'pending_bookings' => $pendingBookings,
                'rooms_available'  => $roomsAvailable,
            ],
            'financialTrend' => $trend,
            'recentBookings' => $recentBookings,
        ]);
    }

    /* ===================================================================== */
    /*  OCCUPANCY                                                            */
    /*  GET /api/reports/occupancy                                           */
    /* ===================================================================== */

    public function occupancy(Request $request)
    {
        $start = $request->start_date;
        $end   = $request->end_date;

        // Canonical snapshot: usable = occupied + available + ongoing + preparing
        $counts = Room::whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $occupied    = (int) ($counts['occupied']    ?? 0);
        $available   = (int) ($counts['available']   ?? 0);
        $reserved    = (int) ($counts['reserved']    ?? 0);
        $maintenance = (int) ($counts['maintenance'] ?? 0);
        $ongoing     = (int) ($counts['ongoing']     ?? 0);
        $preparing   = (int) ($counts['preparing']   ?? 0);

        $usable = $occupied + $available + $ongoing + $preparing;

        $occupancyRate = $usable > 0
            ? round(($occupied / $usable) * 100, 2)
            : 0;

        $occupancyData = [
            'total_rooms'       => $usable,
            'occupied_rooms'    => $occupied,
            'available_rooms'   => $available,
            'reserved_rooms'    => $reserved,
            'preparing_rooms'   => $preparing,
            'ongoing_rooms'     => $ongoing,
            'maintenance_rooms' => $maintenance,
            'occupancy_rate'    => $occupancyRate,
            'room_status'       => [
                ['name' => 'Available',   'value' => $available,   'color' => '#2e7d64'],
                ['name' => 'Reserved',    'value' => $reserved,    'color' => '#fbbf24'],
                ['name' => 'Occupied',    'value' => $occupied,    'color' => '#3b82f6'],
                ['name' => 'Maintenance', 'value' => $maintenance, 'color' => '#ef4444'],
                ['name' => 'Preparing',   'value' => $preparing,   'color' => '#8b5cf6'],
                ['name' => 'Ongoing',     'value' => $ongoing,     'color' => '#f59e0b'],
            ],
        ];

        // Optional period metrics — canonical net revenue (paid - refunded)
        if ($start && $end) {
            [$rangeStart, $rangeEnd] = $this->range($start, $end);

            $occupancyData['period_bookings'] = Booking::whereBetween(
                'created_at',
                [$rangeStart, $rangeEnd]
            )->count();

            $paid     = (float) BookingPayment::where('payment_status', 'paid')
                ->whereBetween('payment_date', [$rangeStart, $rangeEnd])
                ->sum('amount');

            $refunded = (float) BookingPayment::where('payment_status', 'refunded')
                ->whereBetween('payment_date', [$rangeStart, $rangeEnd])
                ->sum('amount');

            $occupancyData['period_revenue'] = $paid - $refunded;
        }

        return response()->json($occupancyData);
    }

    /* ===================================================================== */
    /*  HOUSEKEEPING                                                         */
    /*  GET /api/reports/housekeeping                                        */
    /* ===================================================================== */

    public function housekeeping(Request $request)
    {
        $start = $request->start_date;
        $end   = $request->end_date;

        // Current live statuses (always returned, historical not modelled yet)
        $counts = Room::whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $housekeepingData = [
            'total_preparing_rooms' => (int) ($counts['preparing'] ?? 0),
            'total_ongoing_rooms'   => (int) ($counts['ongoing']   ?? 0),
            'total_available_rooms' => (int) ($counts['available'] ?? 0),
            'total_reserved_rooms'  => (int) ($counts['reserved']  ?? 0),
            'total_occupied_rooms'  => (int) ($counts['occupied']  ?? 0),
            'total_maintenance_rooms' => (int) ($counts['maintenance'] ?? 0),
        ];

        // Date filters accepted for API compatibility; current schema does
        // not store per-date housekeeping history, so no filter is applied.
        // (Left intentionally unchanged so the frontend still works.)
        if ($start && $end) {
            // Reserved for a future housekeeping history table.
        }

        return response()->json($housekeepingData);
    }

    /* ===================================================================== */
    /*  MAINTENANCE                                                          */
    /*  GET /api/reports/maintenance                                         */
    /* ===================================================================== */

    public function maintenance(Request $request)
    {
        $start = $request->start_date;
        $end   = $request->end_date;

        $maintenanceData = [
            'total_maintenance_rooms' => Room::whereNull('deleted_at')
                ->where('status', 'maintenance')
                ->count(),
        ];

        if ($start && $end) {
            // Reserved for a future maintenance history table.
        }

        return response()->json($maintenanceData);
    }
}
