<?php

namespace App\Http\Controllers;

use App\Models\StaffActivityLog;
use Illuminate\Http\Request;

class CashierActivityLogController extends Controller
{
    //  GET ALL LOGS
    public function index()
    {
        return response()->json(
            StaffActivityLog::with('user')->latest()->get(),
            200
        );
    }

    // CREATE LOG (MANUAL OR SYSTEM TRIGGERED)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'action' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $log = StaffActivityLog::create($validated);

        return response()->json([
            'message' => 'Activity logged successfully',
            'data' => $log
        ], 201);
    }

    // GET SINGLE LOG
    public function show($id)
    {
        $log = StaffActivityLog::with('user')->findOrFail($id);

        return response()->json($log, 200);
    }

    // UPDATE (DISABLED FOR AUDIT INTEGRITY)
    public function update(Request $request, $id)
    {
        return response()->json([
            'message' => 'Updating logs is not allowed'
        ], 403);
    }

    // DELETE (DISABLED FOR AUDIT INTEGRITY)
    public function destroy($id)
    {
        return response()->json([
            'message' => 'Deleting logs is not allowed'
        ], 403);
    }
}
