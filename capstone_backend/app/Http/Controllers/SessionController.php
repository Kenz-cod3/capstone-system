<?php

namespace App\Http\Controllers;

use App\Models\Session;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index()
    {
        return response()->json(
            Session::with('user')->get(),
            200
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
            'payload' => 'nullable|string',
            'last_activity' => 'required|integer'
        ]);

        $session = Session::create($validated);

        return response()->json([
            'message' => 'Session created',
            'data' => $session
        ], 201);
    }

    public function show($id)
    {
        $session = Session::with('user')->findOrFail($id);

        return response()->json($session, 200);
    }

    public function update(Request $request, $id)
    {
        $session = Session::findOrFail($id);

        $validated = $request->validate([
            'ip_address' => 'sometimes|string',
            'user_agent' => 'sometimes|string',
            'payload' => 'sometimes|string',
            'last_activity' => 'sometimes|integer'
        ]);

        $session->update($validated);

        return response()->json([
            'message' => 'Session updated',
            'data' => $session
        ], 200);
    }

    public function destroy($id)
    {
        $session = Session::findOrFail($id);
        $session->delete();

        return response()->json([
            'message' => 'Session deleted'
        ], 200);
    }
}
