<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * Returns paginated booking transactions.
     */
    public function index(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 10);

        $query = DB::table('bookings as b')
            ->leftJoin('booked_rooms as br', 'br.booking_id', '=', 'b.id')
            ->leftJoin('rooms as r', 'r.id', '=', 'br.room_id')
            ->leftJoin('booking_payments as bp', function ($join) {
                $join->on('bp.booking_id', '=', 'b.id')
                    ->where('bp.payment_status', '=', 'paid');
            })

            ->leftJoin('users as u', function ($join) {
                $join->on('u.id', '=', 'b.user_id')
                    ->where('b.booking_type', '=', 'online');
            })

            ->leftJoin('walk_in_guests as wg', function ($join) {
                $join->on('wg.id', '=', 'b.walk_in_guest_id')
                    ->where('b.booking_type', '=', 'walk_in');
            })

            // ->where('br.status', '!=', 'cancelled')

            ->select([
                'b.id',
                'b.booking_reference',

                DB::raw("
                    CASE
                        WHEN b.booking_type = 'online' THEN 'Online'
                        ELSE 'Walk-in'
                    END AS booking_type
                "),

                DB::raw("
                    CASE
                        WHEN b.booking_type = 'online'
                            THEN CONCAT(
                                COALESCE(u.first_name,''),
                                ' ',
                                COALESCE(u.last_name,'')
                            )

                        WHEN b.booking_type = 'walk_in'
                            THEN CONCAT(
                                COALESCE(wg.first_name,''),
                                IF(
                                    wg.middle_name IS NOT NULL
                                    AND wg.middle_name <> '',
                                    CONCAT(' ', wg.middle_name),
                                    ''
                                ),
                                ' ',
                                COALESCE(wg.last_name,'')
                            )

                        ELSE ''
                    END AS guest
                "),

                // DB::raw("
                //     GROUP_CONCAT(
                //         DISTINCT r.room_number
                //         ORDER BY r.room_number
                //         SEPARATOR ', '
                //     ) AS rooms
                // "),
                DB::raw("
                        GROUP_CONCAT(
                            DISTINCT
                            CASE
                                WHEN br.status = 'refunded'
                                    THEN CONCAT(r.room_number, ' (Refunded)')
                                WHEN br.status = 'cancelled'
                                    THEN CONCAT(r.room_number, ' (Cancelled)')
                                ELSE r.room_number
                            END
                            ORDER BY r.room_number
                            SEPARATOR ', '
                        ) AS rooms
                    "),

                DB::raw("COUNT(DISTINCT br.room_id) AS total_rooms"),

                'b.total_price',
                'b.total_price AS amount',

                'bp.payment_method',
                'bp.payment_date',

                DB::raw("
                    COALESCE(
                        bp.gcash_reference,
                        bp.bank_reference,
                        '-'
                    ) AS payment_reference
                "),

                'bp.amount AS paid_amount',

                // FIXED
                DB::raw("MIN(br.check_in_date) AS check_in_date"),
                DB::raw("MAX(br.check_out_date) AS check_out_date"),

                'b.created_at AS date',
            ])

            ->groupBy(
                'b.id',
                'b.booking_reference',
                'b.booking_type',

                'u.first_name',
                'u.last_name',

                'wg.first_name',
                'wg.middle_name',
                'wg.last_name',

                'b.total_price',

                'bp.payment_method',
                'bp.payment_date',
                'bp.gcash_reference',
                'bp.bank_reference',
                'bp.amount',

                'b.created_at'
            )

            ->orderByDesc('b.created_at');

        $paginated = $query->paginate($perPage);

        $items = collect($paginated->items())->map(function ($item) {

            // Stay Information
            $item->stays = DB::table('booked_rooms as br')
                ->join('rooms as r', 'r.id', '=', 'br.room_id')
                ->where('br.booking_id', $item->id)
                ->select(
                    'r.room_number',
                    'br.check_in_date',
                    'br.check_out_date',
                    'br.stay_type',
                    'br.subtotal',
                    'br.status'
                )
                ->orderBy('r.room_number')
                ->get();

            // Total refunded amount
            $item->refunded_amount = DB::table('booking_payments')
                ->where('booking_id', $item->id)
                ->where('payment_status', 'refunded')
                ->sum('amount');
                
            $item->cancelled_amount = DB::table('booked_rooms')
                ->where('booking_id', $item->id)
                ->where('status', 'cancelled')
                ->sum('subtotal');

            return $item;
        });

        return response()->json([
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Summary
     */

    public function summary()
    {
        $totalRecords = DB::table('bookings')
            ->count();

        $paid = DB::table('booking_payments')
            ->where('payment_status', 'paid')
            ->sum('amount');

        $refunded = DB::table('booking_payments')
            ->where('payment_status', 'refunded')
            ->sum('amount');

        return response()->json([
            'total_records' => $totalRecords,
            'total_revenue' => $paid - $refunded,
        ]);
    }
    // public function summary()
    // {
    //     $row = DB::table('bookings as b')
    //         ->leftJoin('booked_rooms as br', 'br.booking_id', '=', 'b.id')
    //         ->whereNotIn('br.status', ['cancelled', 'refunded'])
    //         ->selectRaw("
    //             COUNT(DISTINCT b.id) AS total_records,
    //             COALESCE(SUM(DISTINCT b.total_price),0) AS total_revenue
    //         ")
    //         ->first();

    //     return response()->json([
    //         'total_records' => (int) $row->total_records,
    //         'total_revenue' => (float) $row->total_revenue,
    //     ]);
    // }
}
