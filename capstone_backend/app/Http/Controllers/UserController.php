<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    //GET ALL USERS (ADMIN ONLY via middleware)
    public function index(Request $request)
    {
        $query = User::with(['bookings', 'reviews', 'messages']);

        // ✅ FILTER GUESTS ONLY
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // ✅ SEARCH
        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                    ->orWhere('last_name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        return response()->json($query->paginate(10), 200);
    }

    //CREATE USER (ADMIN ONLY via middleware)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|min:6',
            'role'       => 'required|in:admin,staff,guest'
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created successfully',
            'data' => $user
        ], 201);
    }

    //GET SINGLE USER (ADMIN or OWNER)
    public function show($id)
    {
        $authUser = Auth::user();

        if ($authUser->role !== 'admin' && $authUser->id != $id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::with(['bookings', 'reviews', 'messages'])->findOrFail($id);

        return response()->json($user, 200);
    }

    //UPDATE USER (ADMIN or OWNER)
    public function update(Request $request, $id)
    {
        $authUser = Auth::user();

        if ($authUser->role !== 'admin' && $authUser->id != $id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'email'      => 'sometimes|email|unique:users,email,' . $id,
            'password'   => 'sometimes|min:6',
            'role'       => 'sometimes|in:admin,staff,guest'
        ]);

        // only admin can change role
        if ($authUser->role !== 'admin') {
            unset($validated['role']);
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'data' => $user
        ], 200);
    }

    //DELETE USER (ADMIN ONLY via middleware)
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Cannot delete admin user'
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ], 200);
    }
}




// class UserController extends Controller
// {
//     //GET ALL USERS (ADMIN ONLY)
//     public function index(Request $request)
//     {
//         if (Auth::user()->role !== 'admin') {
//             return response()->json(['message' => 'Forbidden'], 403);
//         }

//         $query = User::with(['bookings', 'reviews', 'messages']);

//         //Search FIXED
//         if ($request->has('search')) {
//             $query->where(function ($q) use ($request) {
//                 $q->where('first_name', 'like', '%' . $request->search . '%')
//                     ->orWhere('last_name', 'like', '%' . $request->search . '%')
//                     ->orWhere('email', 'like', '%' . $request->search . '%');
//             });
//         }

//         return response()->json($query->paginate(10), 200);
//     }

//     //CREATE USER (ADMIN ONLY)
//     public function store(Request $request)
//     {
//         if (Auth::user()->role !== 'admin') {
//             return response()->json(['message' => 'Forbidden'], 403);
//         }

//         $validated = $request->validate([
//             'first_name' => 'required|string|max:255',
//             'last_name'  => 'required|string|max:255',
//             'email'      => 'required|email|unique:users,email',
//             'password'   => 'required|min:6',
//             'role'       => 'required|in:admin,staff,guest'
//         ]);

//         $validated['password'] = Hash::make($validated['password']);

//         $user = User::create($validated);

//         return response()->json([
//             'message' => 'User created successfully',
//             'data' => $user
//         ], 201);
//     }

//     //GET SINGLE USER (ADMIN or OWNER)
//     public function show($id)
//     {
//         $authUser = Auth::user();

//         if ($authUser->role !== 'admin' && $authUser->id != $id) {
//             return response()->json(['message' => 'Forbidden'], 403);
//         }

//         $user = User::with(['bookings', 'reviews', 'messages'])->findOrFail($id);

//         return response()->json($user, 200);
//     }

//     //UPDATE USER (ADMIN or OWNER)
//     public function update(Request $request, $id)
//     {
//         $authUser = Auth::user();

//         if ($authUser->role !== 'admin' && $authUser->id != $id) {
//             return response()->json(['message' => 'Forbidden'], 403);
//         }

//         $user = User::findOrFail($id);

//         $validated = $request->validate([
//             'first_name' => 'sometimes|string|max:255',
//             'last_name'  => 'sometimes|string|max:255',
//             'email'      => 'sometimes|email|unique:users,email,' . $id,
//             'password'   => 'sometimes|min:6',
//             'role'       => 'sometimes|in:admin,staff,customer'
//         ]);

//         //Only admin can change role
//         if ($authUser->role !== 'admin') {
//             unset($validated['role']);
//         }

//         if (isset($validated['password'])) {
//             $validated['password'] = Hash::make($validated['password']);
//         }

//         $user->update($validated);

//         return response()->json([
//             'message' => 'User updated successfully',
//             'data' => $user
//         ], 200);
//     }

//     //DELETE USER (ADMIN ONLY)
//     public function destroy($id)
//     {
//         $authUser = Auth::user();

//         if ($authUser->role !== 'admin') {
//             return response()->json(['message' => 'Forbidden'], 403);
//         }

//         $user = User::findOrFail($id);

//         if ($user->role === 'admin') {
//             return response()->json([
//                 'message' => 'Cannot delete admin user'
//             ], 403);
//         }

//         $user->delete();

//         return response()->json([
//             'message' => 'User deleted successfully'
//         ], 200);
//     }
// }
