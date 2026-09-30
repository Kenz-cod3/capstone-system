<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    // Open shift
    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'required|numeric|min:0'
        ]);

        $userId = Auth::id();

        // Check if ANY staff has an open shift
        $activeShift = Shift::with('openedBy:id,first_name,last_name')
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        if ($activeShift) {
            if ($activeShift->opened_by === $userId) {
                return response()->json([
                    'message' => 'You already have an open shift'
                ], 400);
            }

            return response()->json([
                'message' => 'Another staff already has an open shift',
                'active_shift' => [
                    'shift_number' => $activeShift->shift_number,
                    'staff_name' => trim(
                        optional($activeShift->openedBy)->first_name . ' ' .
                            optional($activeShift->openedBy)->last_name
                    ),
                    'opened_at' => $activeShift->opened_at,
                ],
            ], 409);
        }

        // Shared cash drawer: last closed shift of ANYONE
        $lastShift = Shift::whereNotNull('closed_at')
            ->latest('closed_at')
            ->first();

        $startingCash = $lastShift
            ? $lastShift->closed_cash
            : $request->starting_cash;

        // Create the shift record
        $shift = Shift::create([
            'shift_number' => 'SHIFT-' . now()->format('Ymd-His'),
            'opened_by' => $userId,
            'starting_cash' => $startingCash,
            'expected_cash' => $startingCash,
            'opened_at' => now(),
        ]);

        return response()->json([
            'message' => 'Shift opened successfully',
            'data' => $shift
        ]);
    }

    // Close shift
    public function close(Request $request, $id)
    {
        $request->validate([
            'closed_cash' => 'required|numeric|min:0'
        ]);

        $shift = Shift::findOrFail($id);

        // Only the staff who opened the shift can close it
        if ($shift->opened_by !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Check if shift is already closed
        if ($shift->closed_at !== null) {
            return response()->json([
                'message' => 'Shift is already closed'
            ], 400);
        }

        // Get cash transactions
        $payIn = CashTransaction::where('shift_id', $id)
            ->where('type', 'pay_in')
            ->sum('amount');

        $payOut = CashTransaction::where('shift_id', $id)
            ->where('type', 'pay_out')
            ->sum('amount');

        // Get cash payments
        $payments = \App\Models\BookingPayment::where('shift_id', $id)
            ->where('payment_status', 'paid')
            ->where('payment_method', 'cash')
            ->sum('amount');

        // Get cash refunds
        $refunds = \App\Models\BookingPayment::where('shift_id', $id)
            ->where('payment_status', 'refunded')
            ->where('payment_method', 'cash')
            ->sum('amount');

        // Calculate expected cash
        $expected = $shift->starting_cash
            + $payments
            + $payIn
            - $payOut
            - $refunds;

        // Get the actual cash counted by staff
        $actualCash = (float) $request->closed_cash;

        // Update the shift
        $shift->update([
            'expected_cash' => $expected,
            'closed_cash' => $actualCash,
            'closed_at' => now()
        ]);

        // Calculate difference
        $difference = $actualCash - $expected;

        return response()->json([
            'message' => 'Shift closed successfully',
            'expected_cash' => $expected,
            'actual_cash' => $actualCash,
            'difference' => $difference
        ]);
    }

    // Get current active shift
    public function current()
    {
        $user = Auth::user();

        // Only staff can access current shift
        if (strtolower($user->role) !== 'staff') {
            return response()->json([
                'message' => 'No shift access'
            ], 403);
        }

        // Get active shift
        $shift = Shift::where('opened_by', $user->id)
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        if (!$shift) {

            $lastShift = Shift::with('openedBy:id,first_name,last_name')
                ->whereNotNull('closed_at')
                ->latest('closed_at')
                ->first();

            $activeShift = Shift::with('openedBy:id,first_name,last_name')
                ->whereNull('closed_at')
                ->where('opened_by', '!=', $user->id)
                ->latest('opened_at')
                ->first();

            // 200 (not 404): "no shift" is a normal state, not an error
            return response()->json([
                'has_shift' => false,
                'message' => 'No active shift',

                'active_shift' => $activeShift ? [
                    'shift_number' => $activeShift->shift_number,
                    'staff_name' => trim(
                        optional($activeShift->openedBy)->first_name . ' ' .
                            optional($activeShift->openedBy)->last_name
                    ),
                    'opened_at' => $activeShift->opened_at,
                ] : null,

                'previous_shift' => $lastShift ? [
                    'shift_number' => $lastShift->shift_number,
                    'staff_name' => trim(
                        optional($lastShift->openedBy)->first_name . ' ' .
                            optional($lastShift->openedBy)->last_name
                    ),
                    'closed_at' => $lastShift->closed_at,
                    'closed_cash' => $lastShift->closed_cash,
                ] : null,
            ]);
        }

        // Count payments handled by staff
        $bookingCount = \App\Models\BookingPayment::where('shift_id', $shift->id)
            ->where('received_by', $user->id)
            ->where('payment_status', 'paid')
            ->count();

        return response()->json([
            'has_shift' => true,
            'id' => $shift->id,
            'shift_number' => $shift->shift_number,
            'opened_at' => $shift->opened_at,
            'starting_cash' => $shift->starting_cash,
            'expected_cash' => $shift->expected_cash,
            'handled_bookings' => $bookingCount,
        ]);
    }

    // Get all shift records
    public function index()
    {
        $user = Auth::user();

        // Only admin can view all shifts
        if (strtolower($user->role) !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $shifts = Shift::with([
            'openedBy:id,first_name,last_name,role'
        ])
            ->whereHas('openedBy', function ($q) {
                $q->where('role', 'staff');
            })
            ->latest('opened_at')
            ->paginate(10);

        $shifts->getCollection()->transform(function ($shift) {

            // Get payments handled by staff
            $payments = \App\Models\BookingPayment::where(
                'shift_id',
                $shift->id
            )
                ->where('received_by', $shift->opened_by)
                ->where('payment_status', 'paid')
                ->sum('amount');

            // Count bookings handled
            $bookings = \App\Models\BookingPayment::where(
                'shift_id',
                $shift->id
            )
                ->where('received_by', $shift->opened_by)
                ->where('payment_status', 'paid')
                ->count();

            return [
                'id' => $shift->id,
                'shift_number' => $shift->shift_number,
                'staff_name' =>
                optional($shift->openedBy)->first_name
                    . ' '
                    . optional($shift->openedBy)->last_name,
                'opened_at' => $shift->opened_at,
                'closed_at' => $shift->closed_at,
                'payments_handled' => $payments,
                'starting_cash' => $shift->starting_cash,
                'expected_cash' => $shift->expected_cash,
                'closed_cash' => $shift->closed_cash,
                'handled_bookings' => $bookings,
                'status' => $shift->closed_at ? 'closed' : 'open',
            ];
        });

        return response()->json($shifts);
    }

    // Staff's own handled summary (bookings + payments received)
    public function handledSummary(Request $request)
    {
        $user = Auth::user();

        if (strtolower($user->role) !== 'staff') {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $period = $request->query('period', 'today');

        // Only payments received by THIS staff
        $base = \App\Models\BookingPayment::where('received_by', $user->id);

        switch ($period) {
            case 'shift':
                $currentShift = Shift::where('opened_by', $user->id)
                    ->whereNull('closed_at')
                    ->latest('opened_at')
                    ->first();

                $base->where('shift_id', $currentShift?->id ?? 0);
                break;

            case 'today':
                $base->whereDate('payment_date', today());
                break;

            case 'week':
                $base->whereBetween('payment_date', [
                    now()->startOfWeek(),
                    now()->endOfWeek(),
                ]);
                break;

            case 'month':
                $base->whereBetween('payment_date', [
                    now()->startOfMonth(),
                    now()->endOfMonth(),
                ]);
                break;

            default:
                $period = 'all';
                break;
        }

        // Paid payments only
        $paid = (clone $base)->where('payment_status', 'paid');

        // Unique bookings handled
        $bookingsHandled = (clone $paid)
            ->distinct()
            ->count('booking_id');

        // Count + total per payment method
        $byMethod = (clone $paid)
            ->select(
                'payment_method',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');

        $method = function (string $key) use ($byMethod) {
            return [
                'count' => (int) ($byMethod[$key]->count ?? 0),
                'total' => (float) ($byMethod[$key]->total ?? 0),
            ];
        };

        $cash  = $method('cash');
        $gcash = $method('gcash');
        $bank  = $method('bank');
        $qrph  = $method('qrph');

        $online = [
            'count' => $gcash['count'] + $bank['count'] + $qrph['count'],
            'total' => $gcash['total'] + $bank['total'] + $qrph['total'],
            'gcash' => $gcash,
            'bank'  => $bank,
            'qrph'  => $qrph,
        ];

        // Refunds processed by this staff
        $refunds = (clone $base)
            ->where('payment_status', 'refunded')
            ->select(
                DB::raw('COUNT(*) as count'),
                DB::raw('COALESCE(SUM(amount), 0) as total')
            )
            ->first();

        // Recent payments
        $recentPaginator = (clone $paid)
            ->with('booking:id,booking_reference')
            ->orderByDesc('payment_date')
            ->paginate((int) $request->query('per_page', 10));

        $recent = $recentPaginator->getCollection()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'receipt_number' => $p->receipt_number,
                    'booking_reference' => optional($p->booking)->booking_reference,
                    'amount' => (float) $p->amount,
                    'payment_method' => $p->payment_method,
                    'payment_date' => $p->payment_date,
                ];
            });

        return response()->json([
            'period' => $period,
            'bookings_handled' => $bookingsHandled,
            'total_collected' => $cash['total'] + $online['total'],
            'payments_count' => $cash['count'] + $online['count'],
            'cash' => $cash,
            'online' => $online,
            'refunds' => [
                'count' => (int) ($refunds->count ?? 0),
                'total' => (float) ($refunds->total ?? 0),
            ],
            'recent' => $recent->values(),
            'pagination' => [
                'current_page' => $recentPaginator->currentPage(),
                'last_page' => $recentPaginator->lastPage(),
                'per_page' => $recentPaginator->perPage(),
                'total' => $recentPaginator->total(),
                'from' => $recentPaginator->firstItem(),
                'to' => $recentPaginator->lastItem(),
            ],
        ]);
    }

    // Get one shift
    public function show($id)
    {
        $shift = Shift::with('transactions')
            ->findOrFail($id);

        return response()->json($shift);
    }
}
