<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    // 🔥 OPEN SHIFT
    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'required|numeric|min:0'
        ]);

        $userId = Auth::id();

        $existingShift = Shift::where('opened_by', $userId)
            ->whereNull('closed_at')
            ->first();

        if ($existingShift) {
            return response()->json([
                'message' => 'You already have an open shift'
            ], 400);
        }

        $shift = Shift::create([
            'shift_number' => 'SHIFT-' . now()->timestamp,
            'opened_by' => $userId,
            'starting_cash' => $request->starting_cash
        ]);

        return response()->json([
            'message' => 'Shift opened successfully',
            'data' => $shift
        ]);
    }

    // 🔚 CLOSE SHIFT
    public function close(Request $request, $id)
    {
        $request->validate([
            'closed_cash' => 'required|numeric|min:0'
        ]);

        $shift = Shift::findOrFail($id);

        // 🔒 SECURITY
        if ($shift->opened_by !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $payIn = CashTransaction::where('shift_id', $id)
            ->where('type', 'pay_in')
            ->sum('amount');

        $payOut = CashTransaction::where('shift_id', $id)
            ->where('type', 'pay_out')
            ->sum('amount');

        $expected = $shift->starting_cash + $payIn - $payOut;

        $shift->update([
            'expected_cash' => $expected,
            'closed_cash' => $request->closed_cash,
            'closed_at' => now()
        ]);

        return response()->json([
            'message' => 'Shift closed successfully',
            'expected_cash' => $expected,
            'actual_cash' => $request->closed_cash,
            'difference' => $request->closed_cash - $expected
        ]);
    }

    // 📋 CURRENT SHIFT (logged user)
    public function current()
    {
        $shift = Shift::where('opened_by', Auth::id())
            ->whereNull('closed_at')
            ->first();

        return response()->json($shift);
    }

    // 📊 SHIFT DETAILS
    public function show($id)
    {
        $shift = Shift::with('transactions')->findOrFail($id);

        return response()->json($shift);
    }
}