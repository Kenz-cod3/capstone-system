<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    //REGISTER
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|min:6',
            'contact_number' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        //FORCE ROLE AS GUEST
        $validated['role'] = 'guest';
        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = true;

        $user = User::create($validated);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user'    => $user,
            'token'   => $token
        ], 201);
    }

    // public function login(Request $request)
    // {
    //     $request->validate([
    //         'email'    => 'required',
    //         'password' => 'required'
    //     ]);

    //     $user = User::where('email', $request->email)->first();

    //     if (!$user || !Hash::check($request->password, $user->password)) {
    //         return response()->json([
    //             'message' => 'Invalid email or password'
    //         ], 401);
    //     }

    //     // ✅ ALLOW ADMIN + STAFF
    //     if (!in_array($user->role, ['admin', 'staff', 'guest'])) {
    //         return response()->json([
    //             'message' => 'Access denied.'
    //         ], 403);
    //     }

    //     if (!$user->is_active) {
    //         return response()->json([
    //             'message' => 'Account inactive'
    //         ], 403);
    //     }

    //     $user->tokens()->delete();

    //     $token = $user->createToken('auth_token')->plainTextToken;

    //     return response()->json([
    //         'user' => $user,
    //         'token' => $token
    //     ]);
    // }

    public function adminLogin(Request $request)
    {
        $request->validate([
            'email'    => 'required',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password'
            ], 401);
        }

        // ✅ ONLY ADMIN + STAFF
        if (!in_array($user->role, ['admin', 'staff', 'cashier'])) {
            return response()->json([
                'message' => 'Access Denied'
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Account inactive'
            ], 403);
        }

        // $user->tokens()->delete();

        // ✅ ADD THIS
        $user->last_login = now();
        $user->save();

        $token = $user->createToken('admin')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    public function mobileLogin(Request $request)
    {
        $request->validate([
            'email' => 'required',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->role !== 'guest') {
            return response()->json([
                'message' => 'Access Denied'
            ], 403);
        }

        // 🔥 ADD THIS (CRITICAL FIX)
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Account inactive'
            ], 403);
        }

        // $user->tokens()->delete();

        // ✅ ADD THIS
        $user->last_login = now();
        $user->save();

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    // //LOGIN
    // public function login(Request $request)
    // {
    //     $credentials = $request->validate([
    //         'email'    => 'required|email',
    //         'password' => 'required'
    //     ]);

    //     if (!Auth::attempt($credentials)) {
    //         return response()->json([
    //             'error' => 'Unauthorized'
    //         ], 401);
    //     }

    //     /** @var \App\Models\User $user */
    //     $user = Auth::user();

    //     //Check if inactive
    //     if (!$user->is_active) {
    //         return response()->json([
    //             'message' => 'Account is inactive'
    //         ], 403);
    //     }

    //     //UPDATE LAST LOGIN
    //     $user->last_login = now();
    //     $user->save();

    //     //CREATE TOKEN
    //     $token = $user->createToken('auth_token')->plainTextToken;

    //     return response()->json([
    //         'user'  => $user,
    //         'token' => $token
    //     ]);
    // }

    //LOGOUT
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    //GET AUTH USER (optional)
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
