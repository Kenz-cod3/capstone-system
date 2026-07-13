<?php

namespace App\Http\Controllers;

use App\Models\EmailVerification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Shift;

use PHPMailer\PHPMailer\PHPMailer;

class AuthController extends Controller
{


    private function sendOtpEmail(User $user, string $subject = 'Your OTP Code', ?string $bodyOverride = null): bool
    {
        $otp = rand(100000, 999999);

        EmailVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'verification_code' => $otp,
                'verified_at' => null,
                'expires_at' => now()->addSeconds(100),
            ]
        );

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = config('mail.mailers.smtp.host', env('MAIL_HOST'));
            $mail->SMTPAuth = true;

            $mail->Username = env('MAIL_USERNAME');
            $mail->Password = env('MAIL_PASSWORD');

            $mail->SMTPSecure = env('MAIL_ENCRYPTION', 'tls');
            $mail->Port = env('MAIL_PORT', 587);

            $mail->setFrom(
                env('MAIL_FROM_ADDRESS'),
                env('MAIL_FROM_NAME')
            );
            $mail->addAddress($user->email);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $bodyOverride ?? "
            <div style='font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #e5e7eb; border-radius:10px;'>

                    <h2 style='color:#16a34a; text-align:center;'>
                        Lynn Ennia's Travelers Inn
                    </h2>

                    <p>Hello,</p>

                    <p>Your One-Time Password (OTP) for email verification is:</p>

                <div style='
                    text-align:center;
                    font-size:36px;
                    font-weight:bold;
                    letter-spacing:8px;
                    color:#16a34a;
                    margin:25px 0;
                '>
                    {$otp}
                </div>

                <p>
                    This OTP will expire in
                    <strong>100 seconds</strong>.
                </p>

                <p>
                    If you did not request this verification, you can safely ignore this email.
                </p>

                <hr>

                <small style='color:#6b7280;'>
                    Please do not share this code with anyone.
                </small>

            </div> ";
            $mail->send();

            return true;
        } catch (\Exception $e) {
            Log::error("Mail Error: " . $mail->ErrorInfo);

            return false;
        }
    }

    //REGISTER
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
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

            $verification = EmailVerification::where('user_id', $existingUser->id)->first();

            if (
                $verification &&
                now()->lessThan($verification->expires_at)
            ) {
                return response()->json([
                    'message' => 'OTP is still active. Please wait until it expires.',
                    'expires_at' => $verification->expires_at,
                    'email' => $existingUser->email,
                ], 429);
            }

            $sent = $this->sendOtpEmail($existingUser);

            return response()->json([
                'message' => $sent
                    ? 'Account not verified. OTP resent.'
                    : 'Account not verified. We could not send the OTP email, please try again shortly.',
                'email' => $existingUser->email
            ], $sent ? 200 : 502);
        }

        $user = User::create($validated);

        $sent = $this->sendOtpEmail($user, 'Welcome!');

        return response()->json([
            'message' => $sent
                ? 'OTP sent to email'
                : 'Account created, but the OTP email failed to send. Please request a new code.',
            'email'   => $user->email
        ], $sent ? 201 : 502);
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

        $verification = EmailVerification::where('user_id', $user->id)->first();

        if (!$verification) {
            return response()->json([
                'message' => 'OTP not found'
            ], 404);
        }

        if ($verification->verification_code != $request->otp) {
            return response()->json([
                'message' => 'Invalid OTP'
            ], 400);
        }

        if (now()->greaterThan($verification->expires_at)) {
            return response()->json([
                'message' => 'OTP expired'
            ], 400);
        }

        $verification->update([
            'verified_at' => now(),
        ]);

        $user->update([
            'is_verified' => true,
            'email_verified_at' => now(),
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'message' => 'OTP Verified successfully',
            'user' => $user,
            'token' => $token
        ]);
    }

    public function resendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        if ($user->is_verified) {
            return response()->json([
                'message' => 'Account already verified'
            ], 400);
        }

        $verification = EmailVerification::where('user_id', $user->id)->first();

        if (
            $verification &&
            now()->lessThan($verification->expires_at)
        ) {
            return response()->json([
                'message' => 'OTP is still active. Please wait until it expires.',
                'expires_at' => $verification->expires_at,
            ], 429);
        }

        $sent = $this->sendOtpEmail($user);

        return response()->json([
            'message' => $sent
                ? 'OTP has been resent to your email'
                : 'We could not send the OTP email, please try again shortly.',
            'email' => $user->email
        ], $sent ? 200 : 502);
    }

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

        $user->last_login = now();
        $user->save();

        if (strtolower($user->role) === 'staff') {

            $existingShift = Shift::where('opened_by', $user->id)
                ->whereNull('closed_at')
                ->first();

            if (!$existingShift) {

                $lastShift = Shift::where('opened_by', $user->id)
                    ->whereNotNull('closed_at')
                    ->latest('closed_at')
                    ->first();

                $startingCash = $lastShift
                    ? $lastShift->closed_cash
                    : 0;

                Shift::create([
                    'shift_number' => 'SHIFT-' . now()->format('Ymd-His'),
                    'opened_by' => $user->id,
                    'starting_cash' => $startingCash,
                    'expected_cash' => $startingCash,
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

        if (!in_array($user->role, ['guest', 'housekeeper'])) {
            return response()->json([
                'message' => 'Access Denied'
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Account inactive'
            ], 403);
        }

        $user->last_login = now();
        $user->save();

        if (!$user->is_verified && $user->role === 'guest') {

            $verification = EmailVerification::where('user_id', $user->id)->first();

            if (
                $verification &&
                now()->lessThan($verification->expires_at)
            ) {
                return response()->json([
                    'message' => 'Account not verified. Your current OTP is still valid.',
                    'expires_at' => $verification->expires_at,
                    'email' => $user->email,
                ], 403);
            }

            $sent = $this->sendOtpEmail($user);

            return response()->json([
                'message' => $sent
                    ? 'OTP sent. Please verify your account'
                    : 'Account not verified, and the OTP email failed to send. Please try again shortly.',
                'email' => $user->email
            ], 403);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    //LOGOUT
    public function logout(Request $request)
    {
        $user = $request->user();
        $shift = Shift::where('opened_by', $user->id)
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();

        if ($shift) {

            $payIn = \App\Models\CashTransaction::where('shift_id', $shift->id)
                ->where('type', 'pay_in')
                ->sum('amount');

            $payOut = \App\Models\CashTransaction::where('shift_id', $shift->id)
                ->where('type', 'pay_out')
                ->sum('amount');

            $bookingPayments = \App\Models\BookingPayment::where('shift_id', $shift->id)
                ->sum('amount');

            $expected = $shift->starting_cash + $bookingPayments + $payIn - $payOut;

            $shift->update([
                'expected_cash' => $expected,
                'closed_cash' => $expected,
                'closed_at' => now(),
            ]);
        }

        $user->tokens()->delete();

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
