<?php

namespace App\Http\Controllers;

use App\Models\EmailVerification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class EmailVerificationController extends Controller
{
    // 🔹 GET ALL VERIFICATIONS
    public function index()
    {
        return response()->json(
            EmailVerification::with('user')->get(),
            200
        );
    }

    // 🔹 CREATE EMAIL VERIFICATION
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $user = User::findOrFail($validated['user_id']);

        // 🔥 DELETE OLD TOKENS
        EmailVerification::where('user_id', $user->id)->delete();

        // 🔥 CREATE TOKEN
        $verification = EmailVerification::create([
            'user_id' => $user->id,
            'token' => Str::random(60),
            'expires_at' => Carbon::now()->addMinutes(5),
        ]);

        return response()->json([
            'message' => 'Verification token created',
            'data' => $verification
        ], 201);
    }

    // 🔹 GET SINGLE VERIFICATION
    public function show($id)
    {
        $verification = EmailVerification::with('user')
            ->findOrFail($id);

        return response()->json($verification, 200);
    }

    // 🔹 VERIFY EMAIL TOKEN
    public function verify($token)
    {
        $verification = EmailVerification::where('token', $token)
            ->first();

        // ❌ INVALID TOKEN
        if (!$verification) {
            return response()->json([
                'message' => 'Invalid token'
            ], 400);
        }

        // ❌ ALREADY VERIFIED
        if ($verification->verified_at) {
            return response()->json([
                'message' => 'Email already verified'
            ], 400);
        }

        // ❌ EXPIRED
        if (Carbon::now()->greaterThan($verification->expires_at)) {
            return response()->json([
                'message' => 'Token expired'
            ], 400);
        }

        // 🔥 MARK VERIFIED
        $verification->update([
            'verified_at' => Carbon::now()
        ]);

        // 🔥 UPDATE USER
        $verification->user->update([
            'is_verified' => true,
            'email_verified_at' => Carbon::now()
        ]);

        return response()->json([
            'message' => 'Email verified successfully'
        ], 200);
    }

    // 🔹 UPDATE VERIFICATION
    public function update(Request $request, $id)
    {
        $verification = EmailVerification::findOrFail($id);

        $validated = $request->validate([
            'verified_at' => 'sometimes|date'
        ]);

        $verification->update($validated);

        return response()->json([
            'message' => 'Verification updated',
            'data' => $verification
        ], 200);
    }

    // 🔹 DELETE VERIFICATION
    public function destroy($id)
    {
        $verification = EmailVerification::findOrFail($id);

        $verification->delete();

        return response()->json([
            'message' => 'Verification deleted'
        ], 200);
    }
}