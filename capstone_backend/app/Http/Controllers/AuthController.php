<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Shift;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class AuthController extends Controller
{
    //REGISTER
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email',
            'password'   => 'required|string|min:8|confirmed',
            'contact_number' => 'nullable|string',
            'address' => 'nullable|string',
        ], [
            'password.confirmed' => 'Passwords do not match.',
            'password.min' => 'Password must be at least 8 characters.',
        ]);

        //FORCE ROLE AS GUEST
        $validated['role'] = 'guest';
        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = true;

        $existingUser = User::where('email', $request->email)->first();

        if ($existingUser) {

            // IF VERIFIED → BLOCK
            if ($existingUser->is_verified) {
                return response()->json([
                    'message' => 'Email already registered'
                ], 400);
            }

            // IF NOT VERIFIED → RESEND OTP
            $otp = rand(100000, 999999);

            $existingUser->otp = $otp;
            $existingUser->save();

            $mail = new PHPMailer(true);

            try {
                $mail->isSMTP();
                $mail->Host = 'smtp.gmail.com';
                $mail->SMTPAuth = true;

                $mail->Username = 'sipralim105@gmail.com';
                $mail->Password = 'cvaw bwzw emjm bzif';

                $mail->SMTPSecure = 'tls';
                $mail->Port = 587;

                $mail->setFrom('sipralim105@gmail.com', "Lynn Ennia's Travelers Inn");
                $mail->addAddress($existingUser->email);

                $mail->isHTML(true);
                $mail->Subject = 'Your OTP Code';
                $mail->Body = "<h1>$otp</h1>";

                $mail->send();
            } catch (\Exception $e) {
                Log::error("Mail Error: " . $mail->ErrorInfo);
            }

            return response()->json([
                'message' => 'Account not verified. OTP resent.',
                'email' => $existingUser->email
            ], 200);
        }

        $user = User::create($validated);

        $otp = rand(100000, 999999);

        $user->otp = $otp;
        $user->save();

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;

            $mail->Username = 'sipralim105@gmail.com';
            $mail->Password = 'cvaw bwzw emjm bzif';

            $mail->SMTPSecure = 'tls';
            $mail->Port = 587;

            $mail->setFrom('sipralim105@gmail.com', "Lynn Ennia's Travelers' Inn");
            $mail->addAddress($user->email);

            $mail->isHTML(true);
            $mail->Subject = 'Welcome!';
            $mail->Body = "
                        <h2>Your OTP Code</h2>
                        <p>Your verification code is:</p>
                        <h1>$otp</h1>
                        <p>Do not share this code.</p>
                    ";

            $mail->send();
        } catch (\Exception $e) {
            Log::error("Mail Error: " . $mail->ErrorInfo);
        }


        return response()->json([
            'message' => 'OTP sent to email',
            'email'   => $user->email
        ], 201);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        if ($user->otp != $request->otp) {
            return response()->json([
                'message' => 'Invalid OTP'
            ], 400);
        }

        // SUCCESS
        $user->otp = null;
        $user->is_verified = true;
        $user->email_verified_at = now();
        $user->save();

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'message' => 'OTP Verified successfully',
            'user' => $user,
            'token' => $token
        ]);
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

        // ONLY ADMIN + STAFF
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

        // ADD THIS
        $user->last_login = now();
        $user->save();

        if (
            strtolower($user->role) === 'staff'
        ) {

            $existingShift = Shift::where(
                'opened_by',
                $user->id
            )
                ->whereNull('closed_at')
                ->first();

            if (!$existingShift) {

                $lastShift = Shift::where(
                    'opened_by',
                    $user->id
                )
                    ->whereNotNull('closed_at')
                    ->latest('closed_at')
                    ->first();

                $startingCash = $lastShift
                    ? $lastShift->closed_cash
                    : 0;

                Shift::create([
                    'shift_number' =>
                    'SHIFT-' . now()->format('Ymd-His'),

                    'opened_by' =>
                    $user->id,

                    'starting_cash' =>
                    $startingCash,

                    'expected_cash' =>
                    $startingCash,

                    'opened_at' => now(),
                ]);
            }
        }

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

        // if ($user->role !== 'guest') {
        //     return response()->json([
        //         'message' => 'Access Denied'
        //     ], 403);
        // }
        if (!in_array($user->role, ['guest', 'housekeeper'])) {
            return response()->json([
                'message' => 'Access Denied'
            ], 403);
        }

        // ADD THIS (CRITICAL FIX)
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Account inactive'
            ], 403);
        }

        // $user->tokens()->delete();

        // ADD THIS
        $user->last_login = now();
        $user->save();


        if (!$user->is_verified && $user->role === 'guest') {

            $otp = rand(100000, 999999);
            $user->otp = $otp;
            $user->save();

            // SEND EMAIL
            $mail = new PHPMailer(true);

            try {
                $mail->isSMTP();
                $mail->Host = 'smtp.gmail.com';
                $mail->SMTPAuth = true;

                $mail->Username = 'sipralim105@gmail.com';
                $mail->Password = 'cvaw bwzw emjm bzif';

                $mail->SMTPSecure = 'tls';
                $mail->Port = 587;

                $mail->setFrom('sipralim105@gmail.com', "Lynn Ennia's Travelers Inn");
                $mail->addAddress($user->email);

                $mail->isHTML(true);
                $mail->Subject = 'Your OTP Code';
                $mail->Body = "<h1>$otp</h1>";

                $mail->send();
            } catch (\Exception $e) {
                Log::error("Mail Error: " . $mail->ErrorInfo);
            }

            return response()->json([
                'message' => 'OTP sent. Please verify your account',
                'email' => $user->email
            ], 403);
        }

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
        $user = $request->user();
        $shift = Shift::where(
            'opened_by',
            $user->id
        )
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        if ($shift) {

            $payIn = \App\Models\CashTransaction::where(
                'shift_id',
                $shift->id
            )
                ->where('type', 'pay_in')
                ->sum('amount');

            $payOut = \App\Models\CashTransaction::where(
                'shift_id',
                $shift->id
            )
                ->where('type', 'pay_out')
                ->sum('amount');

            $bookingPayments =
                \App\Models\BookingPayment::where(
                    'shift_id',
                    $shift->id
                )->sum('amount');

            $expected =
                $shift->starting_cash +
                $bookingPayments +
                $payIn -
                $payOut;

            $shift->update([

                'expected_cash' =>
                $expected,

                'closed_cash' =>
                $expected,

                'closed_at' => now(),
            ]);
        }

        $user->tokens()->delete();

        return response()->json([
            'message' =>
            'Logged out successfully'
        ]);
    }

    //GET AUTH USER (optional)
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
