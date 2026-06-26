<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * Returns paginated per-room transaction rows.
     *
     * Paginates on the pivot table directly so every page has exactly
     * `per_page` rows, regardless of how many rooms a booking has.
     * A single query with joins replaces the N+1 loop.
     */
    public function index(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 10);

        $query = DB::table('booked_rooms as br')  // Fixed: correct table name
            ->join('bookings as b', 'b.id', '=', 'br.booking_id')
            ->leftJoin('users as u', function ($join) {
                $join->on('u.id', '=', 'b.user_id')
                     ->where('b.booking_type', '=', 'online');
            })
            ->leftJoin('walk_in_guests as wg', function ($join) {
                $join->on('wg.id', '=', 'b.walk_in_guest_id')
                     ->where('b.booking_type', '=', 'walk_in');
            })
            ->leftJoin('rooms as r', 'r.id', '=', 'br.room_id')
            ->leftJoin('room_types as rt', 'rt.id', '=', 'r.room_type_id')
            ->whereNotIn('b.booking_status', ['cancelled', 'refunded']) // Also exclude refunded
            ->orderBy('b.created_at', 'desc')
            ->orderBy('br.id', 'desc')
            ->select([
                'b.id',
                DB::raw("CONCAT(b.id, '-', br.room_id) as `key`"),
                'b.booking_reference',
                DB::raw("
                    CASE
                        WHEN b.booking_type = 'online'
                            THEN CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))
                        WHEN b.booking_type = 'walk_in' AND wg.id IS NOT NULL
                            THEN CONCAT(
                                COALESCE(wg.first_name,''),
                                IF(wg.middle_name IS NOT NULL AND wg.middle_name != '', CONCAT(' ', wg.middle_name), ''),
                                ' ',
                                COALESCE(wg.last_name,'')
                            )
                        ELSE ''
                    END as guest
                "),
                'r.room_number as room',
                'rt.type_name as room_type',
                DB::raw('CAST(br.price_at_time_of_booking AS DECIMAL(15,2)) as base_price'),
                DB::raw("
                    CASE
                        WHEN COALESCE(br.stay_type, b.stay_type) = 'short_stay' THEN 'Short Stay'
                        ELSE 'Overnight'
                    END as type
                "),
                DB::raw('CAST(br.subtotal AS DECIMAL(15,2)) as amount'),
                'b.booking_status',
                'r.status as room_status',
                'b.created_at as date',
            ]);

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'         => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'per_page'     => $paginated->perPage(),
            'total'        => $paginated->total(),
        ]);
    }

    /**
     * Grand totals — a single aggregating SQL query.
     */
    public function summary()
    {
        $row = DB::table('booked_rooms as br')  // Fixed: correct table name
            ->join('bookings as b', 'b.id', '=', 'br.booking_id')
            ->whereNotIn('b.booking_status', ['cancelled', 'refunded']) // Also exclude refunded
            ->selectRaw('COUNT(br.id) as total_records, COALESCE(SUM(br.subtotal), 0) as total_revenue')
            ->first();

        return response()->json([
            'total_records' => (int)   ($row->total_records ?? 0),
            'total_revenue' => (float) ($row->total_revenue ?? 0.0),
        ]);
    }
}