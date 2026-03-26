<?php

namespace App\Http\Controllers;

use App\Models\PasswordResetToken;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

class PasswordResetTokenController extends Controller
{
    public function index()
    {
        return response()->json(
            PasswordResetToken::all(),
            200
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        $validated['token'] = Str::random(60);

        $validated['created_at'] = Carbon::now();

        $token = PasswordResetToken::create($validated);

        return response()->json([
            'message' => 'Reset token created',
            'data' => $token
        ], 201);
    }

    public function show($id)
    {
        $token = PasswordResetToken::findOrFail($id);

        return response()->json($token, 200);
    }

    public function update(Request $request, $id)
    {
        $token = PasswordResetToken::findOrFail($id);

        $validated = $request->validate([
            'email' => 'sometimes|email|exists:users,email',
            'token' => 'sometimes|string'
        ]);

        $token->update($validated);

        return response()->json([
            'message' => 'Token updated',
            'data' => $token
        ], 200);
    }

    public function destroy($id)
    {
        $token = PasswordResetToken::findOrFail($id);
        $token->delete();

        return response()->json([
            'message' => 'Token deleted'
        ], 200);
    }
}
