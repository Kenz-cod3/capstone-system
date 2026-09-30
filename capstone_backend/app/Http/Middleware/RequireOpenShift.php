<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Shift;

class RequireOpenShift
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only staff are shift-bound (admin/cashier pass through)
        if ($user && strtolower($user->role) === 'staff') {
            $hasShift = Shift::where('opened_by', $user->id)
                ->whereNull('closed_at')
                ->exists();

            if (!$hasShift) {
                return response()->json([
                    'message' => 'View only mode: please open a shift first.',
                    'code'    => 'SHIFT_REQUIRED',
                ], 403);
            }
        }

        return $next($request);
    }
}