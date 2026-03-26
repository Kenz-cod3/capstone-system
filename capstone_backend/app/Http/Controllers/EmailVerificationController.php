<?php

namespace App\Http\Controllers;

use App\Models\EmailVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

class EmailVerificationController extends Controller
{
    public function index()
    {
        return response()->json(
            EmailVerification::with('user')->get(),
            200
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $validated['token'] = Str::random(60);
        $validated['expires_at'] = Carbon::now()->addMinutes(60);

        $verification = EmailVerification::create($validated);

        return response()->json([
            'message' => 'Verification token created',
            'data' => $verification
        ], 201);
    }

    public function show($id)
    {
        $verification = EmailVerification::with('user')->findOrFail($id);

        return response()->json($verification, 200);
    }

    public function verify($token)
    {
        $verification = EmailVerification::where('token', $token)->first();

        if (!$verification) {
            return response()->json(['message' => 'Invalid token'], 400);
        }

        if ($verification->isExpired()) {
            return response()->json(['message' => 'Token expired'], 400);
        }

        $verification->update([
            'verified_at' => Carbon::now()
        ]);

        return response()->json([
            'message' => 'Email verified successfully'
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $verification = EmailVerification::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'sometimes|exists:users,id',
            'verified_at' => 'sometimes|date'
        ]);

        $verification->update($validated);

        return response()->json([
            'message' => 'Verification updated',
            'data' => $verification
        ], 200);
    }

    public function destroy($id)
    {
        $verification = EmailVerification::findOrFail($id);
        $verification->delete();

        return response()->json([
            'message' => 'Verification deleted'
        ], 200);
    }
}
