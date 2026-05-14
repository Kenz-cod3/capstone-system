<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    // ─── OPEN SHIFT ────────────────────────────────────────────────────────────────
    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'required|numeric|min:0'
        ]);

        $userId = Auth::id();

        // ─── CHECK FOR EXISTING OPEN SHIFT ─────────────────────────────────────────
        $existingShift = Shift::where('opened_by', $userId)
            ->whereNull('closed_at')
            ->first();

        if ($existingShift) {
            return response()->json([
                'message' => 'You already have an open shift'
            ], 400);
        }

        // ─── GET LAST CLOSED SHIFT FOR CONTINUITY ──────────────────────────────────
        $lastShift = Shift::where('opened_by', $userId)
            ->whereNotNull('closed_at')
            ->latest('closed_at')
            ->first();

        $startingCash = $lastShift
            ? $lastShift->closed_cash
            : $request->starting_cash;

        // ─── CREATE NEW SHIFT ──────────────────────────────────────────────────────
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

    // ─── CLOSE SHIFT ───────────────────────────────────────────────────────────────
    public function close(Request $request, $id)
    {
        $request->validate([
            'closed_cash' => 'required|numeric|min:0'
        ]);

        $shift = Shift::findOrFail($id);

        // ─── SECURITY CHECK ────────────────────────────────────────────────────────
        if ($shift->opened_by !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // ─── CALCULATE CASH MOVEMENTS ──────────────────────────────────────────────
        $payIn = CashTransaction::where('shift_id', $id)
            ->where('type', 'pay_in')
            ->sum('amount');

        $payOut = CashTransaction::where('shift_id', $id)
            ->where('type', 'pay_out')
            ->sum('amount');

        $bookingPayments = \App\Models\BookingPayment::where('shift_id', $id)
            ->sum('amount');

        // ─── CALCULATE EXPECTED CASH ───────────────────────────────────────────────
        $expected = $shift->starting_cash + $bookingPayments + $payIn - $payOut;

        // ─── UPDATE SHIFT WITH CLOSING DETAILS ─────────────────────────────────────
        $shift->update([
            'expected_cash' => $expected,
            'closed_cash' => $expected,
            'closed_at' => now()
        ]);

        return response()->json([
            'message' => 'Shift closed successfully',
            'expected_cash' => $expected,
            'actual_cash' => $expected,
            'difference' => $request->closed_cash - $expected
        ]);
    }

    // ─── GET CURRENT ACTIVE SHIFT ─────────────────────────────────────────────────
    public function current()
    {
        $user = Auth::user();

        // ─── ROLE CHECK ───────────────────────────────────────────────────────────
        if (strtolower($user->role) !== 'staff') {
            return response()->json([
                'message' => 'No shift access'
            ], 403);
        }

        // ─── FETCH ACTIVE SHIFT ────────────────────────────────────────────────────
        $shift = Shift::where('opened_by', $user->id)
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        if (!$shift) {
            return response()->json([
                'message' => 'No active shift'
            ], 404);
        }

        // ─── CALCULATE SHIFT METRICS ───────────────────────────────────────────────
        $bookingPayments = \App\Models\BookingPayment::where('shift_id', $shift->id)
            ->sum('amount');

        $bookingCount = \App\Models\BookingPayment::where('shift_id', $shift->id)
            ->count();

        return response()->json([
            'id' => $shift->id,
            'shift_number' => $shift->shift_number,
            'opened_at' => $shift->opened_at,
            'expected_cash' => $shift->starting_cash + $bookingPayments,
            'handled_bookings' => $bookingCount,
        ]);
    }

    // ─── GET ALL SHIFTS WITH PAGINATION (ADMIN ONLY) ──────────────────────────────
    public function index()
    {
        $user = Auth::user();

        // ─── ADMIN ROLE CHECK ──────────────────────────────────────────────────────
        if (strtolower($user->role) !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // ─── FETCH PAGINATED SHIFTS ────────────────────────────────────────────────
        $shifts = Shift::with(['openedBy:id,first_name,last_name'])
            ->latest('opened_at')
            ->paginate(10);

        // ─── TRANSFORM SHIFT DATA ──────────────────────────────────────────────────
        $shifts->getCollection()->transform(function ($shift) {
            $payments = \App\Models\BookingPayment::where('shift_id', $shift->id)
                ->sum('amount');

            $bookings = \App\Models\BookingPayment::where('shift_id', $shift->id)
                ->count();

            return [
                'id' => $shift->id,
                'shift_number' => $shift->shift_number,
                'staff_name' => optional($shift->openedBy)->first_name . ' ' . optional($shift->openedBy)->last_name,
                'opened_at' => $shift->opened_at,
                'closed_at' => $shift->closed_at,
                'cash_payments' => $payments,
                'expected_cash' => $shift->starting_cash + $payments,
                'handled_bookings' => $bookings,
            ];
        });

        return response()->json($shifts);
    }

    // ─── GET SINGLE SHIFT DETAILS ─────────────────────────────────────────────────
    public function show($id)
    {
        $shift = Shift::with('transactions')->findOrFail($id);

        return response()->json($shift);
    }
}