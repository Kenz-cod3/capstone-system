<?php

namespace App\Http\Controllers;

use App\Models\CashCategory;
use Illuminate\Http\Request;

class CashCategoryController extends Controller
{
    public function index()
    {
        return CashCategory::all();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:cash_categories,name',
        ]);

        $category = CashCategory::create([
            'name' => $request->name,
        ]);

        return response()->json([
            'message' => 'Category added successfully',
            'data' => $category,
        ], 201);
    }
}