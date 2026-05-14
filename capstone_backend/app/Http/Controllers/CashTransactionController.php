<?php

namespace App\Http\Controllers;

use App\Events\DashboardUpdated;
use App\Models\CashTransaction;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashTransactionController extends Controller
{
    // 📥 GET ALL
    public function index()
    {
        return CashTransaction::with([
            'category',
            'user:id,first_name,last_name,role'
        ])
            ->latest()
            ->get();
    }

    // 💸 STORE
    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:pay_in,pay_out',
            'amount' => 'required|numeric|min:1',
            'category_id' => 'required|exists:cash_categories,id',
            'recorded_by' => 'nullable|exists:users,id',
            'description' => 'nullable|string'
        ]);

        // 🔥 AUTO SHIFT
        $shift = Shift::where('opened_by', Auth::id())
            ->whereNull('closed_at')
            ->first();

        if (!$shift) {
            return response()->json([
                'message' => 'Please open shift first'
            ], 400);
        }

        $transaction = CashTransaction::create([
            'shift_id' => $shift->id,
            'type' => $request->type,
            'amount' => $request->amount,
            'category_id' => $request->category_id,
            'description' => $request->description ?? 'Manual entry',
            'recorded_by' => $request->recorded_by ?? Auth::id(),
        ]);

        // ✅ UPDATE expected_cash IN REAL TIME
        $payIn = CashTransaction::where('shift_id', $shift->id)
            ->where('type', 'pay_in')
            ->sum('amount');

        $payOut = CashTransaction::where('shift_id', $shift->id)
            ->where('type', 'pay_out')
            ->sum('amount');

        $shift->update([
            'expected_cash' => $shift->starting_cash + $payIn - $payOut
        ]);

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Transaction added',
            'data' => $transaction->load([
                'category',
                'user:id,first_name,last_name,role'
            ])
        ], 201);
    }

    // ✏️ UPDATE
    public function update(Request $request, $id)
    {
        $request->validate([
            'type' => 'required|in:pay_in,pay_out',
            'amount' => 'required|numeric|min:1',
            'category_id' => 'required|exists:cash_categories,id',
            'recorded_by' => 'nullable|exists:users,id',
        ]);

        $transaction = CashTransaction::findOrFail($id);

        $transaction->update([
            'type' => $request->type,
            'amount' => $request->amount,
            'category_id' => $request->category_id,
            'recorded_by' => $request->recorded_by ?? $transaction->recorded_by,
        ]);

        // ✅ RECALCULATE expected_cash AFTER UPDATE
        $shift = Shift::findOrFail($transaction->shift_id);

        $payIn = CashTransaction::where('shift_id', $shift->id)
            ->where('type', 'pay_in')
            ->sum('amount');

        $payOut = CashTransaction::where('shift_id', $shift->id)
            ->where('type', 'pay_out')
            ->sum('amount');

        $shift->update([
            'expected_cash' => $shift->starting_cash + $payIn - $payOut
        ]);

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Transaction updated',
            'data' => $transaction->load([
                'category',
                'user:id,first_name,last_name,role'
            ])
        ]);
    }

    // 🗑 DELETE
    public function destroy($id)
    {
        $transaction = CashTransaction::findOrFail($id);
        $shiftId = $transaction->shift_id;

        $transaction->delete();

        // ✅ RECALCULATE expected_cash AFTER DELETE
        $shift = Shift::findOrFail($shiftId);

        $payIn = CashTransaction::where('shift_id', $shiftId)
            ->where('type', 'pay_in')
            ->sum('amount');

        $payOut = CashTransaction::where('shift_id', $shiftId)
            ->where('type', 'pay_out')
            ->sum('amount');

        $shift->update([
            'expected_cash' => $shift->starting_cash + $payIn - $payOut
        ]);

        // 🔥 REALTIME DASHBOARD UPDATE
        broadcast(new DashboardUpdated())->toOthers();

        return response()->json([
            'message' => 'Transaction deleted'
        ]);
    }

    // 💰 TOTAL EXPENSES (FOR DASHBOARD)
    public function totalExpenses()
    {
        $total = CashTransaction::where('type', 'pay_out')
            ->sum('amount');

        return response()->json([
            'total_expenses' => $total
        ]);
    }
}
