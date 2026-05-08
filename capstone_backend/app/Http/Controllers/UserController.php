<?php

namespace App\Http\Controllers;

use App\Events\UserStatusChanged;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class UserController extends Controller
{
    //GET ALL USERS (ADMIN ONLY via middleware)
    public function index(Request $request)
    {
        $query = User::with(['messages'])
            ->withCount('bookings')
            ->withSum('bookings', 'total_price');

        // FILTER
        if ($request->has('role')) {
            $roles = explode(',', $request->role);
            $query->whereIn('role', $roles);
        }

        // SEARCH
        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                    ->orWhere('last_name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        $users = $query->paginate(10);

        // 🔥 IMPORTANT
        $users->getCollection()->transform(function ($user) {
            $user->total_bookings = $user->bookings_count;
            $user->total_spent = $user->bookings_sum_total_price ?? 0;
            return $user;
        });

        return response()->json($users, 200);
    }

    //CREATE USER (ADMIN ONLY via middleware)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|min:6',
            'role' => 'required|in:admin,staff,guest,cashier,housekeeper'
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
            'password'   => 'nullable|min:8|confirmed',
            'role'       => 'sometimes|in:admin,staff,guest',

            'contact_number' => [
                'nullable',
                'regex:/^09\d{9}$/'
            ],

            'profile_image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
        ], [
            'contact_number.regex' => 'Phone number must be 11 digits and start with 09.',
        ]);

        // ✅ only admin can change role
        if ($authUser->role !== 'admin') {
            unset($validated['role']);
        }

        // ✅ HANDLE PASSWORD
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // ✅ HANDLE IMAGE UPLOAD
        if ($request->hasFile('profile_image')) {

            // delete old image
            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
            }

            if ($request->hasFile('profile_image')) {

                // delete old image
                if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                    Storage::disk('public')->delete($user->profile_image);
                }

                $image = $request->file('profile_image');

                $manager = new ImageManager(new Driver());
                $img = $manager->read($image)->cover(300, 300);

                $filename = time() . '.jpg';

                Storage::disk('public')->put(
                    "profiles/$filename",
                    (string) $img->toJpeg(70)
                );

                // ✅ SAVE PATH ONLY
                $user->profile_image = "profiles/$filename";
            }
        }

        // ✅ UPDATE OTHER FIELDS
        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'data' => $user,
            'phone' => $user->contact_number, // ✅ important for frontend
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

    public function updateStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $user->is_active = $request->is_active;
        $user->save();

        event(new UserStatusChanged($user));

        return response()->json([
            'message' => 'Status updated',
            'user' => $user
        ]);
    }

    public function changePassword(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 400);
        }

        $user->password = bcrypt($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password updated successfully']);
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
