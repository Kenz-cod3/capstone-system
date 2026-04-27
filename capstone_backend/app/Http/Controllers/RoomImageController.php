<?php

namespace App\Http\Controllers;

use App\Models\RoomImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RoomImageController extends Controller
{
    // 📌 GET ALL
    public function index()
    {
        $images = RoomImage::with('room')->get()->map(function ($img) {
            return [
                'id' => $img->id,
                'room_id' => $img->room_id,
                'image_type' => $img->image_type,

                // 🔥 FULL URL (IMPORTANT)
                'image_url' => url('storage/' . $img->image_path),

                'room' => $img->room
            ];
        });

        return response()->json($images);
    }

    // 📌 STORE
    public function store(Request $request)
    {
        $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'image' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'image_type' => 'nullable|string'
        ]);

        $path = $request->file('image')->store('room_images', 'public');

        $roomImage = RoomImage::create([
            'room_id' => $request->room_id,
            'image_path' => $path,
            'image_type' => $request->image_type
        ]);

        return response()->json([
            ...$roomImage->toArray(),
            'image_url' => url('storage/' . $roomImage->image_path)
        ], 201);
    }

    // 📌 SHOW
    public function show($id)
    {
        $img = RoomImage::with('room')->findOrFail($id);

        return response()->json([
            'id' => $img->id,
            'room_id' => $img->room_id,
            'image_type' => $img->image_type,

            // 🔥 FULL URL
            'image_url' => url('storage/' . $img->image_path),

            'room' => $img->room
        ]);
    }

    // 📌 UPDATE
    public function update(Request $request, $id)
    {
        $roomImage = RoomImage::findOrFail($id);

        $request->validate([
            'room_id' => 'sometimes|exists:rooms,id',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'image_type' => 'nullable|string'
        ]);

        $data = [
            'room_id' => $request->room_id ?? $roomImage->room_id,
            'image_type' => $request->image_type ?? $roomImage->image_type
        ];

        if ($request->hasFile('image')) {
            if ($roomImage->image_path) {
                Storage::disk('public')->delete($roomImage->image_path);
            }

            $path = $request->file('image')->store('room_images', 'public');
            $data['image_path'] = $path;
        }

        $roomImage->update($data);

        return response()->json([
            ...$roomImage->toArray(),
            'image_url' => url('storage/' . $roomImage->image_path)
        ]);
    }

    // 📌 DELETE
    public function destroy($id)
    {
        $roomImage = RoomImage::findOrFail($id);

        if ($roomImage->image_path) {
            Storage::disk('public')->delete($roomImage->image_path);
        }

        $roomImage->delete();

        return response()->json([
            'message' => 'Room image deleted successfully'
        ]);
    }
}

// namespace App\Http\Controllers;

// use App\Models\RoomImage;
// use Illuminate\Http\Request;
// use Illuminate\Support\Facades\Storage;

// class RoomImageController extends Controller
// {
//     // 📌 GET ALL
//     public function index()
//     {
//         return response()->json(
//             RoomImage::with('room')->get()
//         );
//     }

//     // 📌 STORE (UPLOAD IMAGE)
//     public function store(Request $request)
//     {
//         $request->validate([
//             'room_id' => 'required|exists:rooms,id',
//             'image' => 'required|image|mimes:jpg,jpeg,png|max:2048',
//             'image_type' => 'nullable|string'
//         ]);

//         // 🔥 Upload image
//         $path = $request->file('image')->store('room_images', 'public');

//         $roomImage = RoomImage::create([
//             'room_id' => $request->room_id,
//             'image_path' => $path,
//             'image_type' => $request->image_type
//         ]);

//         return response()->json($roomImage, 201);
//     }

//     // 📌 SHOW ONE
//     public function show($id)
//     {
//         $roomImage = RoomImage::with('room')->findOrFail($id);
//         return response()->json($roomImage);
//     }

//     // 📌 UPDATE
//     public function update(Request $request, $id)
//     {
//         $roomImage = RoomImage::findOrFail($id);

//         $request->validate([
//             'room_id' => 'sometimes|exists:rooms,id',
//             'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
//             'image_type' => 'nullable|string'
//         ]);

//         $data = [
//             'room_id' => $request->room_id ?? $roomImage->room_id,
//             'image_type' => $request->image_type ?? $roomImage->image_type
//         ];

//         // 🔥 If new image uploaded
//         if ($request->hasFile('image')) {

//             // delete old image
//             if ($roomImage->image_path) {
//                 Storage::disk('public')->delete($roomImage->image_path);
//             }

//             // upload new
//             $path = $request->file('image')->store('room_images', 'public');

//             // ✅ SAVE NEW PATH
//             $data['image_path'] = $path;
//         }

//         $roomImage->update($data);

//         return response()->json($roomImage);
//     }
    // public function update(Request $request, $id)
    // {
    //     $roomImage = RoomImage::findOrFail($id);

    //     $request->validate([
    //         'room_id' => 'sometimes|exists:rooms,id',
    //         'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
    //         'image_type' => 'nullable|string'
    //     ]);

    //     // 🔥 If new image uploaded
    //     if ($request->hasFile('image')) {
    //         // delete old image
    //         if ($roomImage->image_path) {
    //             Storage::disk('public')->delete($roomImage->image_path);
    //         }

    //         $path = $request->file('image')->store('room_images', 'public');
    //         $roomImage->image_path = $path;
    //     }

    //     $roomImage->update([
    //         'room_id' => $request->room_id ?? $roomImage->room_id,
    //         'image_type' => $request->image_type ?? $roomImage->image_type
    //     ]);

    //     return response()->json($roomImage);
    // }

//     //DELETE
//     public function destroy($id)
//     {
//         $roomImage = RoomImage::findOrFail($id);

//         // delete image file
//         if ($roomImage->image_path) {
//             Storage::disk('public')->delete($roomImage->image_path);
//         }

//         $roomImage->delete();

//         return response()->json([
//             'message' => 'Room image deleted successfully'
//         ]);
//     }
// }
